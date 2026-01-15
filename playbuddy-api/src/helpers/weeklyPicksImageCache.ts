import { generateWeeklyPicksImage, logWeeklyPicksMessage } from './weeklyPicksImage.js';
import type {
    WeeklyPicksImageLogger,
    WeeklyPicksImageOptions,
    WeeklyPicksImageResult,
} from './weeklyPicksImage.js';

type WeeklyPicksImageCacheEntry = WeeklyPicksImageResult & {
    generatedAt: string;
    durationMs: number;
    version: string;
};

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
