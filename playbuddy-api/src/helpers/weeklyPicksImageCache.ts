import { generateWeeklyPicksImage, logWeeklyPicksMessage } from './weeklyPicksImage.js';
import type {
    WeeklyPicksImageLogger,
    WeeklyPicksImageLogLevel,
    WeeklyPicksImageOptions,
    WeeklyPicksImageResult,
} from './weeklyPicksImage.js';
import { supabaseClient } from '../connections/supabaseClient.js';

type WeeklyPicksImageCacheEntry = WeeklyPicksImageResult & {
    generatedAt: string;
    durationMs: number;
    version: string;
};

type WeeklyPicksImageStorageManifest = {
    cacheKey: string;
    version: string;
    generatedAt: string;
    durationMs: number;
    timings?: WeeklyPicksImageResult['timings'];
    weekOffset: number;
    weekLabel: string;
    width: number;
    height: number;
    partCount: number;
    partHeights: number[];
    splitAt: number;
    bucket: string;
    pngPath: string;
    parts: Array<{
        path: string;
        height: number;
    }>;
};

export type StoredWeeklyPicksImageResult =
    | {
        ok: true;
        cacheKey: string;
        manifest: WeeklyPicksImageStorageManifest;
        buffer: Buffer;
        contentType: string;
        partIndex?: number;
        partHeight?: number;
    }
    | { ok: false; reason: 'missing' | 'invalid-part' | 'download-failed' };

type WeeklyPicksImageCacheStatus = {
    cacheKey: string;
    cached: boolean;
    inProgress: boolean;
    entry?: WeeklyPicksImageCacheEntry;
};

type WeeklyPicksImageLogState = {
    cacheKey: string;
    status: 'running' | 'completed' | 'failed';
    startedAt: string | null;
    finishedAt: string | null;
    error: string | null;
    logs: string[];
};

type WeeklyPicksImageLogStatus = {
    cacheKey: string;
    status: 'idle' | 'running' | 'completed' | 'failed';
    inProgress: boolean;
    startedAt: string | null;
    finishedAt: string | null;
    error: string | null;
    logs: string[];
};

const cache = new Map<string, WeeklyPicksImageCacheEntry>();
const inFlight = new Map<string, Promise<WeeklyPicksImageCacheEntry>>();
const logStore = new Map<string, WeeklyPicksImageLogState>();
const MAX_WEEKLY_PICKS_LOGS = 500;
const WEEKLY_PICKS_BUCKET = process.env.WEEKLY_PICKS_BUCKET ?? 'weekly-picks';

const normalizeNumber = (value?: number) =>
    Number.isFinite(value) ? Number(value) : undefined;

const normalizePartCount = (value?: number) => {
    if (!Number.isFinite(value)) return 2;
    const normalized = Number(value);
    return Math.round(normalized) === 1 ? 1 : 2;
};

const buildCacheKey = (options: WeeklyPicksImageOptions) => {
    const weekOffset = normalizeNumber(options.weekOffset) ?? 0;
    const width = normalizeNumber(options.width);
    const scale = normalizeNumber(options.scale);
    const limit = normalizeNumber(options.limit);
    const partCount = normalizePartCount(options.partCount);
    return [
        `week=${weekOffset}`,
        `width=${width ?? 'auto'}`,
        `scale=${scale ?? 'auto'}`,
        `limit=${limit ?? 'all'}`,
        `parts=${partCount}`,
    ].join('|');
};

const buildVersion = () =>
    `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

const nowIso = () => new Date().toISOString();
const encodeCacheKey = (cacheKey: string) => encodeURIComponent(cacheKey);

const buildStoragePrefix = (cacheKey: string, version: string) =>
    `${encodeCacheKey(cacheKey)}/${version}`;

const buildManifestPath = (cacheKey: string) =>
    `${encodeCacheKey(cacheKey)}/latest.json`;

const startLogState = (cacheKey: string) => {
    const state: WeeklyPicksImageLogState = {
        cacheKey,
        status: 'running',
        startedAt: nowIso(),
        finishedAt: null,
        error: null,
        logs: [],
    };
    logStore.set(cacheKey, state);
    return state;
};

const ensureLogState = (cacheKey: string) =>
    logStore.get(cacheKey) ?? startLogState(cacheKey);

const pushLogLine = (cacheKey: string, line: string) => {
    if (!line) return;
    const state = ensureLogState(cacheKey);
    state.logs.push(line);
    if (state.logs.length > MAX_WEEKLY_PICKS_LOGS) {
        state.logs.splice(0, state.logs.length - MAX_WEEKLY_PICKS_LOGS);
    }
};

const finalizeLogState = (cacheKey: string, status: 'completed' | 'failed', error?: string | null) => {
    const state = ensureLogState(cacheKey);
    state.status = status;
    state.finishedAt = nowIso();
    state.error = error ?? null;
};

const buildLogSink = (cacheKey: string, logger?: WeeklyPicksImageLogger): WeeklyPicksImageLogger =>
    (level, message) => {
        pushLogLine(cacheKey, message);
        if (logger) {
            logger(level, message);
            return;
        }
        logWeeklyPicksMessage(undefined, level, message);
    };

const toBuffer = async (data: unknown): Promise<Buffer> => {
    if (!data) return Buffer.alloc(0);
    if (Buffer.isBuffer(data)) return data;
    if (data instanceof ArrayBuffer) return Buffer.from(data);
    const maybeBlob = data as { arrayBuffer?: () => Promise<ArrayBuffer> };
    if (typeof maybeBlob.arrayBuffer === 'function') {
        return Buffer.from(await maybeBlob.arrayBuffer());
    }
    return Buffer.from(data as any);
};

const uploadStorageObject = async (path: string, body: Buffer, contentType: string) => {
    const { error } = await supabaseClient.storage
        .from(WEEKLY_PICKS_BUCKET)
        .upload(path, body, {
            contentType,
            upsert: true,
            cacheControl: '3600',
        });
    if (error) {
        throw error;
    }
};

const storeWeeklyPicksImage = async (
    cacheKey: string,
    entry: WeeklyPicksImageCacheEntry,
    logger?: WeeklyPicksImageLogger
) => {
    const log = (level: WeeklyPicksImageLogLevel, message: string) =>
        logWeeklyPicksMessage(logger, level, message);
    const prefix = buildStoragePrefix(cacheKey, entry.version);
    const pngPath = `${prefix}/weekly-picks.png`;
    const parts = entry.parts.map((part, index) => ({
        path: `${prefix}/weekly-picks-part-${index + 1}.jpg`,
        height: part.height,
    }));
    const uploadStart = Date.now();
    log('info', `[weekly-picks] Storage upload start cacheKey=${cacheKey} bucket=${WEEKLY_PICKS_BUCKET}`);
    const stallInterval = setInterval(() => {
        const elapsed = Date.now() - uploadStart;
        log('info', `[weekly-picks] Storage upload still running cacheKey=${cacheKey} ms=${elapsed}`);
    }, 15000);
    try {
        await uploadStorageObject(pngPath, entry.png, 'image/png');
        await Promise.all(
            parts.map((part, index) => uploadStorageObject(part.path, entry.parts[index].jpg, 'image/jpeg'))
        );
        const manifest: WeeklyPicksImageStorageManifest = {
            cacheKey,
            version: entry.version,
            generatedAt: entry.generatedAt,
            durationMs: entry.durationMs,
            timings: entry.timings,
            weekOffset: entry.weekOffset,
            weekLabel: entry.weekLabel,
            width: entry.width,
            height: entry.height,
            partCount: entry.parts.length,
            partHeights: entry.parts.map((part) => part.height),
            splitAt: entry.splitAt,
            bucket: WEEKLY_PICKS_BUCKET,
            pngPath,
            parts,
        };
        await uploadStorageObject(
            buildManifestPath(cacheKey),
            Buffer.from(JSON.stringify(manifest)),
            'application/json'
        );
        const uploadMs = Date.now() - uploadStart;
        log('info', `[weekly-picks] Storage upload done cacheKey=${cacheKey} ms=${uploadMs}`);
    } finally {
        clearInterval(stallInterval);
    }
};

const fetchStoredManifest = async (
    cacheKey: string
): Promise<WeeklyPicksImageStorageManifest | null> => {
    const manifestPath = buildManifestPath(cacheKey);
    const { data, error } = await supabaseClient.storage
        .from(WEEKLY_PICKS_BUCKET)
        .download(manifestPath);
    if (error || !data) {
        return null;
    }
    const raw = await toBuffer(data);
    try {
        return JSON.parse(raw.toString('utf8')) as WeeklyPicksImageStorageManifest;
    } catch {
        return null;
    }
};

const downloadStoredObject = async (path: string): Promise<Buffer | null> => {
    const { data, error } = await supabaseClient.storage
        .from(WEEKLY_PICKS_BUCKET)
        .download(path);
    if (error || !data) {
        return null;
    }
    return toBuffer(data);
};

const generateAndCacheWeeklyPicksImage = async (
    options: WeeklyPicksImageOptions,
    cacheKey: string,
    logger?: WeeklyPicksImageLogger
) => {
    const startedAt = Date.now();
    startLogState(cacheKey);
    const logSink = buildLogSink(cacheKey, logger);
    try {
        const result = await generateWeeklyPicksImage(options, logSink);
        const durationMs = Date.now() - startedAt;
        const entry: WeeklyPicksImageCacheEntry = {
            ...result,
            generatedAt: new Date().toISOString(),
            durationMs,
            version: buildVersion(),
        };
        cache.set(cacheKey, entry);
        const jpgBytes = entry.parts.reduce((sum, part) => sum + part.jpg.length, 0);
        logSink(
            'info',
            `[weekly-picks] Generated image ${cacheKey} in ${durationMs}ms parts=${entry.parts.length} jpgBytes=${jpgBytes}`
        );
        try {
            await storeWeeklyPicksImage(cacheKey, entry, logSink);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logSink('error', `[weekly-picks] Storage upload failed ${cacheKey} error=${errorMessage}`);
        }
        finalizeLogState(cacheKey, 'completed');
        return entry;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logSink('error', `[weekly-picks] Generation failed ${cacheKey} error=${errorMessage}`);
        finalizeLogState(cacheKey, 'failed', errorMessage);
        throw error;
    }
};

export const getWeeklyPicksImageCacheStatus = (
    options: WeeklyPicksImageOptions
): WeeklyPicksImageCacheStatus => {
    const cacheKey = buildCacheKey(options);
    const entry = cache.get(cacheKey);
    return {
        cacheKey,
        cached: !!entry,
        inProgress: inFlight.has(cacheKey),
        entry,
    };
};

export const getWeeklyPicksImageLogStatus = (
    options: WeeklyPicksImageOptions
): WeeklyPicksImageLogStatus => {
    const cacheKey = buildCacheKey(options);
    const inProgress = inFlight.has(cacheKey);
    const state = logStore.get(cacheKey);
    if (!state) {
        return {
            cacheKey,
            status: inProgress ? 'running' : 'idle',
            inProgress,
            startedAt: null,
            finishedAt: null,
            error: null,
            logs: [],
        };
    }
    const status = inProgress ? 'running' : state.status;
    return {
        cacheKey,
        status,
        inProgress,
        startedAt: state.startedAt,
        finishedAt: state.finishedAt,
        error: state.error,
        logs: state.logs,
    };
};

export const getCachedWeeklyPicksImage = (
    options: WeeklyPicksImageOptions
) => {
    const cacheKey = buildCacheKey(options);
    const entry = cache.get(cacheKey);
    return { cacheKey, entry, inProgress: inFlight.has(cacheKey) };
};

export const getStoredWeeklyPicksImage = async (
    options: WeeklyPicksImageOptions,
    format: string,
    requestedPart?: number
): Promise<StoredWeeklyPicksImageResult> => {
    const cacheKey = buildCacheKey(options);
    const manifest = await fetchStoredManifest(cacheKey);
    if (!manifest) {
        return { ok: false, reason: 'missing' };
    }

    if (format === 'png') {
        const buffer = await downloadStoredObject(manifest.pngPath);
        if (!buffer) return { ok: false, reason: 'download-failed' };
        return {
            ok: true,
            cacheKey,
            manifest,
            buffer,
            contentType: 'image/png',
        };
    }

    const partIndex = (requestedPart ?? 1) - 1;
    const part = manifest.parts[partIndex];
    if (!part) {
        return { ok: false, reason: 'invalid-part' };
    }
    const buffer = await downloadStoredObject(part.path);
    if (!buffer) return { ok: false, reason: 'download-failed' };
    return {
        ok: true,
        cacheKey,
        manifest,
        buffer,
        contentType: 'image/jpeg',
        partIndex: partIndex + 1,
        partHeight: part.height,
    };
};

export const getOrGenerateWeeklyPicksImage = async (
    options: WeeklyPicksImageOptions,
    logger?: WeeklyPicksImageLogger
) => {
    const cacheKey = buildCacheKey(options);
    const cached = cache.get(cacheKey);
    if (cached) {
        return { cacheKey, entry: cached };
    }

    const existing = inFlight.get(cacheKey);
    if (existing) {
        return { cacheKey, entry: await existing };
    }

    const task = generateAndCacheWeeklyPicksImage(options, cacheKey, logger);
    inFlight.set(cacheKey, task);
    try {
        const entry = await task;
        return { cacheKey, entry };
    } finally {
        inFlight.delete(cacheKey);
    }
};

export const forceGenerateWeeklyPicksImage = async (
    options: WeeklyPicksImageOptions,
    logger?: WeeklyPicksImageLogger
) => {
    const cacheKey = buildCacheKey(options);
    const existing = inFlight.get(cacheKey);
    if (existing) {
        await existing;
    }

    const task = generateAndCacheWeeklyPicksImage(options, cacheKey, logger);
    inFlight.set(cacheKey, task);
    try {
        const entry = await task;
        return { cacheKey, entry };
    } finally {
        inFlight.delete(cacheKey);
    }
};

export const triggerWeeklyPicksImageGeneration = (
    options: WeeklyPicksImageOptions,
    logger?: WeeklyPicksImageLogger
) => {
    const cacheKey = buildCacheKey(options);
    if (inFlight.has(cacheKey)) {
        return {
            cacheKey,
            status: 'in_progress',
            entry: cache.get(cacheKey),
        };
    }

    const task = generateAndCacheWeeklyPicksImage(options, cacheKey, logger)
        .catch((error) => {
            console.error(`[weekly-picks] Generation failed for ${cacheKey}`, error);
            throw error;
        })
        .finally(() => {
            inFlight.delete(cacheKey);
        });
    inFlight.set(cacheKey, task);

    return {
        cacheKey,
        status: 'started',
        entry: cache.get(cacheKey),
    };
};

export type { WeeklyPicksImageCacheEntry, WeeklyPicksImageLogStatus };
