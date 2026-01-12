import { generateWeeklyPicksImage } from './weeklyPicksImage.js';
import type { WeeklyPicksImageOptions, WeeklyPicksImageResult } from './weeklyPicksImage.js';

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

const cache = new Map<string, WeeklyPicksImageCacheEntry>();
const inFlight = new Map<string, Promise<WeeklyPicksImageCacheEntry>>();

const normalizeNumber = (value?: number) =>
    Number.isFinite(value) ? Number(value) : undefined;

const normalizePartCount = (value?: number) => {
    if (!Number.isFinite(value)) return 2;
    return Math.round(value) === 1 ? 1 : 2;
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

const generateAndCacheWeeklyPicksImage = async (
    options: WeeklyPicksImageOptions,
    cacheKey: string
) => {
    const startedAt = Date.now();
    const result = await generateWeeklyPicksImage(options);
    const durationMs = Date.now() - startedAt;
    const entry: WeeklyPicksImageCacheEntry = {
        ...result,
        generatedAt: new Date().toISOString(),
        durationMs,
        version: buildVersion(),
    };
    cache.set(cacheKey, entry);
    const jpgBytes = entry.parts.reduce((sum, part) => sum + part.jpg.length, 0);
    console.log(`[weekly-picks] Generated image ${cacheKey} in ${durationMs}ms parts=${entry.parts.length} jpgBytes=${jpgBytes}`);
    return entry;
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

export const getCachedWeeklyPicksImage = (
    options: WeeklyPicksImageOptions
) => {
    const cacheKey = buildCacheKey(options);
    const entry = cache.get(cacheKey);
    return { cacheKey, entry, inProgress: inFlight.has(cacheKey) };
};

export const getOrGenerateWeeklyPicksImage = async (
    options: WeeklyPicksImageOptions
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

    const task = generateAndCacheWeeklyPicksImage(options, cacheKey);
    inFlight.set(cacheKey, task);
    try {
        const entry = await task;
        return { cacheKey, entry };
    } finally {
        inFlight.delete(cacheKey);
    }
};

export const forceGenerateWeeklyPicksImage = async (
    options: WeeklyPicksImageOptions
) => {
    const cacheKey = buildCacheKey(options);
    const existing = inFlight.get(cacheKey);
    if (existing) {
        await existing;
    }

    const task = generateAndCacheWeeklyPicksImage(options, cacheKey);
    inFlight.set(cacheKey, task);
    try {
        const entry = await task;
        return { cacheKey, entry };
    } finally {
        inFlight.delete(cacheKey);
    }
};

export const triggerWeeklyPicksImageGeneration = (
    options: WeeklyPicksImageOptions
) => {
    const cacheKey = buildCacheKey(options);
    if (inFlight.has(cacheKey)) {
        return {
            cacheKey,
            status: 'in_progress',
            entry: cache.get(cacheKey),
        };
    }

    const task = generateAndCacheWeeklyPicksImage(options, cacheKey)
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

export type { WeeklyPicksImageCacheEntry };
