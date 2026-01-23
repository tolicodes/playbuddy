import { Response, Router, NextFunction, RequestHandler } from 'express';
import PQueue from 'p-queue';
import moment from 'moment-timezone';
import { connectRedisClient } from '../connections/redisClient.js';
import { supabaseClient } from '../connections/supabaseClient.js';
import { createIcal } from '../helpers/ical.js';
import { fetchAndCacheData } from '../helpers/cacheHelper.js';
import type { Event, NormalizedEventInput } from '../commonTypes.js';
import { getMyPrivateCommunities } from './helpers/getMyPrivateCommunities.js';
import { authenticateAdminRequest, authenticateRequest, AuthenticatedRequest, optionalAuthenticateRequest } from '../middleware/authenticateRequest.js';
import { upsertEvent } from './helpers/writeEventsToDB/upsertEvent.js';
import { upsertEventsClassifyAndStats } from './helpers/upsertEventsBatch.js';
import { flushEvents } from '../helpers/flushCache.js';
import { transformMedia } from './helpers/transformMedia.js';
import scrapeRoutes from './eventsScrape.js';
import scrapeURLs from '../scrapers/helpers/scrapeURLs.js';
import { ADMIN_EMAILS } from '../config.js';
import { fetchAllRows } from '../helpers/fetchAllRows.js';
import { openai, MODEL } from '../scrapers/ai/config.js';
import type { WeeklyPicksImageLogger } from '../helpers/weeklyPicksImage.js';
import { notifyAdminsOfPendingEvents } from '../helpers/adminPushNotifications.js';
import { replayToLargeInstance } from '../middleware/replayToLargeInstance.js';
import {
    forceGenerateWeeklyPicksImage,
    getCachedWeeklyPicksImage,
    getWeeklyPicksImageCacheStatus,
    getWeeklyPicksImageLogStatus,
    getStoredWeeklyPicksImage,
} from '../helpers/weeklyPicksImageCache.js';

const router = Router();
const asyncHandler = (fn: RequestHandler) => (req: any, res: any, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
const EXCLUDE_EVENT_IDS = [
    "e7179b3b-b4f8-40df-8d87-f205b0caaeb1", // New York LGBTQ+ Community Events Calendar
    "036f8010-9910-435f-8119-2025a046f452", // NYC Kink Community Events Calendar
];

router.use('/', scrapeRoutes);

const parseNumber = (value: unknown) => {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const parsePart = (value: unknown) => {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return undefined;
    const normalized = Math.floor(parsed);
    return normalized > 0 ? normalized : undefined;
};

const parsePartCount = (value: unknown) => {
    const parsed = parsePart(value);
    if (!parsed) return undefined;
    return parsed === 1 ? 1 : 2;
};

const normalizeInputText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const normalizeOptionalInput = (value: unknown) => {
    const trimmed = normalizeInputText(value);
    return trimmed ? trimmed : undefined;
};

const parseIsoDateInput = (value: unknown) => {
    if (typeof value !== 'string' || !value) return null;
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    return date.toISOString();
};

const isValidUrl = (value: string) => /^https?:\/\/\S+$/i.test(value);
const normalizeUrlList = (payload: any): string[] => {
    const rawUrls = Array.isArray(payload?.urls) ? payload.urls : [];
    if (typeof payload?.url === 'string') rawUrls.push(payload.url);
    return rawUrls
        .map((url: any) => (typeof url === 'string' ? url.trim() : ''))
        .filter((url: string) => url && isValidUrl(url));
};

const fetchPreviewEvent = async (event: NormalizedEventInput) => {
    const select = '*, organizer:organizers(name)';

    if (event.original_id) {
        const { data, error } = await supabaseClient
            .from('events')
            .select(select)
            .eq('original_id', event.original_id)
            .maybeSingle();
        if (!error && data) return data;
    }

    if (event.start_date && event.name) {
        const { data, error } = await supabaseClient
            .from('events')
            .select(select)
            .eq('start_date', event.start_date)
            .eq('name', event.name)
            .maybeSingle();
        if (!error && data) return data;
    }

    return null;
};

const extractWeeklyPicksImageOptions = (req: AuthenticatedRequest) => {
    const source = { ...(req.query || {}), ...(req.body || {}) } as Record<string, unknown>;
    const weekOffset = parseNumber(source.weekOffset);
    const width = parseNumber(source.width);
    const scale = parseNumber(source.scale);
    const limit = parseNumber(source.limit);
    const partCount = parsePartCount(source.partCount);
    return { weekOffset, width, scale, limit, partCount };
};

type DuplicateMode = 'heuristic' | 'ai' | 'hybrid';
type DuplicateAiResult = {
    decision: 'duplicate' | 'not_duplicate' | 'unsure';
    confidence: number | null;
    rationale?: string | null;
    subjectMismatch?: boolean;
};
type DuplicateCandidate = {
    eventA: Event;
    eventB: Event;
    score: number;
    reasons: string[];
    ai?: DuplicateAiResult | null;
};

const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'at', 'with', 'by', 'from',
    'event', 'party', 'class', 'workshop', 'meetup', 'show', 'night', 'series',
]);

const trimValue = (val?: string | null) => (val || '').trim();
const isBlank = (val?: string | null) => !trimValue(val);
const normalizeText = (val?: string | null) =>
    (val || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const normalizeUrl = (val?: string | null) => {
    if (!val) return '';
    const lowered = val.trim().toLowerCase();
    const withoutHash = lowered.split('#')[0];
    const withoutQuery = withoutHash.split('?')[0];
    return withoutQuery.replace(/\/+$/, '');
};

const tokenize = (val?: string | null) => {
    const normalized = normalizeText(val);
    if (!normalized) return [];
    return normalized
        .split(' ')
        .map((token) => token.trim())
        .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
};


const jaccard = (a: string[], b: string[]) => {
    if (!a.length || !b.length) return 0;
    const setA = new Set(a);
    const setB = new Set(b);
    let intersection = 0;
    setA.forEach((token) => {
        if (setB.has(token)) intersection += 1;
    });
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
};

const diceCoefficient = (a: string, b: string) => {
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;
    const bigrams = new Map<string, number>();
    for (let i = 0; i < a.length - 1; i += 1) {
        const gram = a.slice(i, i + 2);
        bigrams.set(gram, (bigrams.get(gram) ?? 0) + 1);
    }
    let matches = 0;
    for (let i = 0; i < b.length - 1; i += 1) {
        const gram = b.slice(i, i + 2);
        const count = bigrams.get(gram) ?? 0;
        if (count > 0) {
            matches += 1;
            bigrams.set(gram, count - 1);
        }
    }
    return (2 * matches) / (a.length + b.length - 2);
};

const dateScore = (diffHours: number) => {
    if (!Number.isFinite(diffHours)) return 0;
    if (diffHours <= 3) return 1;
    if (diffHours <= 12) return 0.9;
    if (diffHours <= 24) return 0.75;
    if (diffHours <= 48) return 0.6;
    if (diffHours <= 72) return 0.45;
    if (diffHours <= 120) return 0.25;
    return 0;
};

const buildLocationTokens = (event: Event) => {
    const locationParts = [
        event.location,
        event.neighborhood,
        event.city,
        event.region,
        event.country,
    ].filter(Boolean) as string[];
    return tokenize(locationParts.join(' '));
};

const toTimestamp = (val?: string | null) => {
    if (!val) return null;
    const ts = new Date(val).getTime();
    return Number.isFinite(ts) ? ts : null;
};

const toDateKey = (timestamp: number | null) => {
    if (!timestamp) return null;
    return new Date(timestamp).toISOString().slice(0, 10);
};

type EventIndex = {
    event: Event;
    id: number;
    startTs: number | null;
    dateKey: string | null;
    nameNorm: string;
    nameTokens: string[];
    locationTokens: string[];
    urls: string[];
    originalId: string | null;
    organizerId: number | null;
};

const buildEventIndex = (event: Event): EventIndex => {
    const startTs = toTimestamp(event.start_date);
    return {
        event,
        id: event.id,
        startTs,
        dateKey: toDateKey(startTs),
        nameNorm: normalizeText(event.name),
        nameTokens: tokenize(event.name),
        locationTokens: buildLocationTokens(event),
        urls: [normalizeUrl(event.event_url), normalizeUrl(event.ticket_url)].filter(Boolean),
        originalId: event.original_id ?? null,
        organizerId: event.organizer?.id ?? null,
    };
};

const scoreCandidate = (a: EventIndex, b: EventIndex) => {
    const reasons: string[] = [];
    const matchingUrl = a.urls.find((url) => b.urls.includes(url));
    if (matchingUrl) {
        reasons.push('matching url');
        return { score: 1, reasons };
    }
    if (a.originalId && b.originalId && a.originalId === b.originalId) {
        reasons.push('matching original_id');
        return { score: 1, reasons };
    }

    const nameTokenScore = jaccard(a.nameTokens, b.nameTokens);
    const nameStringScore = diceCoefficient(a.nameNorm, b.nameNorm);
    const nameScore = Math.max(nameTokenScore, nameStringScore);
    if (nameScore >= 0.7) reasons.push(`name similarity ${nameScore.toFixed(2)}`);

    const diffHours = a.startTs && b.startTs ? Math.abs(a.startTs - b.startTs) / 36e5 : Number.POSITIVE_INFINITY;
    const timeScore = dateScore(diffHours);
    if (timeScore >= 0.6) reasons.push(`start time within ${Math.round(diffHours)}h`);

    const locationScore = jaccard(a.locationTokens, b.locationTokens);
    if (locationScore >= 0.6) reasons.push(`location overlap ${locationScore.toFixed(2)}`);

    const organizerScore = a.organizerId && b.organizerId && a.organizerId === b.organizerId ? 1 : 0;
    if (organizerScore) reasons.push('same organizer');

    const score = (nameScore * 0.6) + (timeScore * 0.2) + (locationScore * 0.1) + (organizerScore * 0.1);
    return { score, reasons };
};

const buildAiSummary = (event: Event) => ({
    id: event.id,
    name: event.name,
    start_date: event.start_date,
    end_date: event.end_date,
    location: event.location,
    neighborhood: event.neighborhood ?? null,
    city: event.city ?? null,
    region: event.region ?? null,
    country: event.country ?? null,
    organizer: event.organizer?.name ?? null,
    ticket_url: event.ticket_url ?? null,
    event_url: event.event_url ?? null,
    description: (event.custom_description || event.short_description || event.description || '').slice(0, 500),
});

const parseAiJson = (raw: string): DuplicateAiResult | null => {
    if (!raw) return null;
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
        const parsed = JSON.parse(match[0]);
        const decision = parsed.is_duplicate === true
            ? 'duplicate'
            : parsed.is_duplicate === false
                ? 'not_duplicate'
                : 'unsure';
        const confidence = Number.isFinite(Number(parsed.confidence)) ? Number(parsed.confidence) : null;
        return {
            decision,
            confidence,
            rationale: typeof parsed.reason === 'string' ? parsed.reason : null,
            subjectMismatch: parsed.subject_mismatch === true,
        };
    } catch {
        return null;
    }
};

const mergeStringList = (primary: Array<string | null | undefined>, extra: Array<string | null | undefined>) => {
    const results: string[] = [];
    const seen = new Set<string>();
    const add = (value?: string | null) => {
        const trimmed = trimValue(value);
        if (!trimmed) return;
        const key = trimmed.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        results.push(trimmed);
    };
    primary.forEach(add);
    extra.forEach(add);
    return results;
};

const mergeEventPatch = (source: any, target: any, preferSource: boolean) => {
    const patch: Record<string, any> = {};

    const applyString = (key: string) => {
        const sourceVal = typeof source[key] === 'string' ? trimValue(source[key]) : source[key];
        const targetVal = typeof target[key] === 'string' ? trimValue(target[key]) : target[key];
        if (preferSource) {
            if (!isBlank(sourceVal) && sourceVal !== targetVal) {
                patch[key] = sourceVal;
            }
            return;
        }
        if (isBlank(targetVal) && !isBlank(sourceVal)) {
            patch[key] = sourceVal;
        }
    };

    const applyValue = (key: string) => {
        const sourceVal = source[key];
        const targetVal = target[key];
        if (preferSource) {
            if (sourceVal !== undefined && sourceVal !== null && sourceVal !== targetVal) {
                patch[key] = sourceVal;
            }
            return;
        }
        if ((targetVal === undefined || targetVal === null || targetVal === '') && sourceVal !== undefined && sourceVal !== null && sourceVal !== '') {
            patch[key] = sourceVal;
        }
    };

    const applyBoolean = (key: string) => {
        const sourceVal = source[key];
        const targetVal = target[key];
        if (preferSource) {
            if (sourceVal !== undefined && sourceVal !== null && sourceVal !== targetVal) {
                patch[key] = sourceVal;
            }
            return;
        }
        if ((targetVal === undefined || targetVal === null) && sourceVal !== undefined && sourceVal !== null) {
            patch[key] = sourceVal;
        }
    };

    ['ticket_url', 'event_url', 'image_url', 'video_url', 'location', 'neighborhood', 'city', 'region', 'country',
        'price', 'short_price', 'description', 'short_description', 'custom_description', 'bio', 'vetting_url',
        'original_id', 'source_url', 'source_origination_group_id', 'source_origination_group_name',
        'source_origination_platform', 'source_ticketing_platform', 'dataset',
    ].forEach(applyString);

    if (preferSource) {
        ['name', 'start_date', 'end_date'].forEach(applyString);
    }

    ['type', 'recurring', 'visibility', 'approval_status', 'organizer_id', 'location_area_id', 'timestamp_scraped',
        'lat', 'lon',
    ].forEach(applyValue);

    ['frozen', 'facilitator_only', 'play_party', 'is_munch', 'non_ny', 'vetted', 'hidden', 'user_submitted'].forEach(applyBoolean);

    if (target.weekly_pick !== true && source.weekly_pick === true) {
        patch.weekly_pick = true;
    }

    const mergedTags = mergeStringList(target.tags || [], source.tags || []);
    if (mergedTags.length && mergedTags.join('|') !== mergeStringList(target.tags || [], []).join('|')) {
        patch.tags = mergedTags;
    }

    const mergedHosts = mergeStringList(target.hosts || [], source.hosts || []);
    if (mergedHosts.length && mergedHosts.join('|') !== mergeStringList(target.hosts || [], []).join('|')) {
        patch.hosts = mergedHosts;
    }

    return patch;
};

router.get('/weekly-picks/image/status', asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (replayToLargeInstance(req, res)) {
        return;
    }
    const options = extractWeeklyPicksImageOptions(req);
    const status = getWeeklyPicksImageCacheStatus(options);
    res.status(200).json({
        cacheKey: status.cacheKey,
        cached: status.cached,
        inProgress: status.inProgress,
        version: status.entry?.version ?? null,
        generatedAt: status.entry?.generatedAt ?? null,
        durationMs: status.entry?.durationMs ?? null,
        timings: status.entry?.timings ?? null,
        width: status.entry?.width ?? null,
        height: status.entry?.height ?? null,
        weekOffset: status.entry?.weekOffset ?? null,
        weekLabel: status.entry?.weekLabel ?? null,
        partCount: status.entry?.parts?.length ?? null,
        partHeights: status.entry?.parts?.map((part) => part.height) ?? null,
        splitAt: status.entry?.splitAt ?? null,
    });
}));

router.get('/weekly-picks/image/logs', authenticateAdminRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (replayToLargeInstance(req, res)) {
        return;
    }
    const options = extractWeeklyPicksImageOptions(req);
    const status = getWeeklyPicksImageLogStatus(options);
    res.status(200).json(status);
}));

router.post('/weekly-picks/image/generate', authenticateAdminRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (replayToLargeInstance(req, res)) {
        return;
    }
    const startedAt = Date.now();
    const options = extractWeeklyPicksImageOptions(req);
    const responseFormat = String((req.query.format ?? (req.body as Record<string, unknown>)?.format ?? 'json')).toLowerCase();
    const requestedPart = parsePart(req.query.part ?? (req.body as Record<string, unknown>)?.part);
    const logs: string[] = [];
    const logMessage: WeeklyPicksImageLogger = (level, message) => {
        logs.push(message);
        if (level === 'warn') {
            console.warn(message);
            return;
        }
        if (level === 'error') {
            console.error(message);
            return;
        }
        console.log(message);
    };
    logMessage('info',
        `[weekly-picks][generate] start width=${options.width ?? 'auto'} weekOffset=${options.weekOffset ?? 0} scale=${options.scale ?? 'auto'} limit=${options.limit ?? 'all'} parts=${options.partCount ?? 2}`
    );
    try {
        const { cacheKey, entry } = await forceGenerateWeeklyPicksImage(options, logMessage);
        const durationMs = Date.now() - startedAt;
        const pngBytes = Buffer.isBuffer(entry.png) ? entry.png.length : 0;
        const jpgBytes = entry.parts.reduce((sum, part) => sum + part.jpg.length, 0);
        logMessage('info',
            `[weekly-picks][generate] done cacheKey=${cacheKey} durationMs=${durationMs} generatedMs=${entry.durationMs} pngBytes=${pngBytes} jpgBytes=${jpgBytes}`
        );
        res.set('Cache-Control', 'no-store');
        res.set('X-Weekly-Picks-Cache-Key', cacheKey);
        res.set('X-Weekly-Picks-Version', entry.version);
        res.set('X-Weekly-Picks-Generated-At', entry.generatedAt);
        res.set('X-Weekly-Picks-Generate-Duration-Ms', String(entry.durationMs));
        res.set('X-Weekly-Picks-Raster-Ms', String(entry.timings.rasterMs));
        res.set('X-Weekly-Picks-Png-Encode-Ms', String(entry.timings.pngEncodeMs));
        res.set('X-Weekly-Picks-Jpg-Encode-Ms', String(entry.timings.jpgEncodeMs));
        res.set('X-Weekly-Picks-Week-Offset', String(entry.weekOffset));
        res.set('X-Weekly-Picks-Week-Label', entry.weekLabel);
        res.set('X-Weekly-Picks-Width', String(entry.width));
        res.set('X-Weekly-Picks-Height', String(entry.height));
        res.set('X-Weekly-Picks-Part-Count', String(entry.parts.length));
        res.set('X-Weekly-Picks-Part-Heights', entry.parts.map((part) => part.height).join(','));
        res.set('X-Weekly-Picks-Split-At', String(entry.splitAt));
        if (responseFormat === 'png') {
            res.set('Content-Type', 'image/png');
            res.status(200).send(entry.png);
            return;
        }
        if (responseFormat === 'jpg' || responseFormat === 'jpeg') {
            const partIndex = (requestedPart ?? 1) - 1;
            const part = entry.parts[partIndex];
            if (!part) {
                res.status(400).json({ error: 'Invalid part requested.' });
                return;
            }
            res.set('Content-Type', 'image/jpeg');
            res.set('X-Weekly-Picks-Part', String(partIndex + 1));
            res.set('X-Weekly-Picks-Part-Height', String(part.height));
            res.status(200).send(part.jpg);
            return;
        }
        res.status(200).json({
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
            logs,
        });
    } catch (error) {
        const durationMs = Date.now() - startedAt;
        const errorMessage = error instanceof Error ? error.message : String(error);
        logMessage('error', `[weekly-picks][generate] failed durationMs=${durationMs} error=${errorMessage}`);
        throw error;
    }
}));

router.get('/weekly-picks/image', asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (replayToLargeInstance(req, res)) {
        return;
    }
    const startedAt = Date.now();
    const options = extractWeeklyPicksImageOptions(req);
    const responseFormat = String(req.query.format ?? 'jpg').toLowerCase();
    const requestedPart = parsePart(req.query.part);
    const logPrefix = '[weekly-picks][image]';
    const { cacheKey, entry, inProgress } = getCachedWeeklyPicksImage(options);
    console.log(
        `${logPrefix} GET start cacheKey=${cacheKey} inProgress=${inProgress} width=${options.width ?? 'auto'} weekOffset=${options.weekOffset ?? 0} format=${responseFormat}`
    );
    if (!entry) {
        const stored = await getStoredWeeklyPicksImage(options, responseFormat, requestedPart);
        if (stored.ok) {
            const { manifest } = stored;
            res.set('Cache-Control', 'no-store');
            res.set('X-Weekly-Picks-Cache-Key', manifest.cacheKey ?? cacheKey);
            res.set('X-Weekly-Picks-Version', manifest.version);
            res.set('X-Weekly-Picks-Generated-At', manifest.generatedAt);
            res.set('X-Weekly-Picks-Generate-Duration-Ms', String(manifest.durationMs));
            res.set('X-Weekly-Picks-Week-Offset', String(manifest.weekOffset));
            res.set('X-Weekly-Picks-Week-Label', manifest.weekLabel);
            res.set('X-Weekly-Picks-Width', String(manifest.width));
            res.set('X-Weekly-Picks-Height', String(manifest.height));
            res.set('X-Weekly-Picks-Part-Count', String(manifest.partCount));
            res.set('X-Weekly-Picks-Part-Heights', manifest.partHeights.join(','));
            res.set('X-Weekly-Picks-Split-At', String(manifest.splitAt));
            res.set('X-Weekly-Picks-Cache-Source', 'storage');
            if (inProgress) {
                res.set('X-Weekly-Picks-Generating', 'true');
            }
            if (responseFormat === 'png') {
                console.log(
                    `${logPrefix} storage hit cacheKey=${cacheKey} pngBytes=${stored.buffer.length} generatedMs=${manifest.durationMs}`
                );
                res.set('Content-Type', stored.contentType);
                res.status(200).send(stored.buffer);
                const durationMs = Date.now() - startedAt;
                console.log(`${logPrefix} GET done cacheKey=${cacheKey} durationMs=${durationMs}`);
                return;
            }

            if (stored.partIndex && stored.partHeight) {
                res.set('Content-Type', stored.contentType);
                res.set('X-Weekly-Picks-Part', String(stored.partIndex));
                res.set('X-Weekly-Picks-Part-Height', String(stored.partHeight));
                console.log(
                    `${logPrefix} storage hit cacheKey=${cacheKey} part=${stored.partIndex} jpgBytes=${stored.buffer.length} generatedMs=${manifest.durationMs}`
                );
                res.status(200).send(stored.buffer);
                const durationMs = Date.now() - startedAt;
                console.log(`${logPrefix} GET done cacheKey=${cacheKey} durationMs=${durationMs}`);
                return;
            }
        }
        if (!stored.ok && stored.reason === 'invalid-part') {
            res.status(400).json({ error: 'Invalid part requested.' });
            return;
        }
        if (!stored.ok && stored.reason === 'download-failed') {
            res.status(500).json({ error: 'Failed to load stored weekly picks image.' });
            return;
        }
        const durationMs = Date.now() - startedAt;
        console.log(`${logPrefix} cache miss cacheKey=${cacheKey} durationMs=${durationMs}`);
        res.status(404).json({ error: 'No cached weekly picks image. Generate first.' });
        return;
    }

    res.set('Cache-Control', 'no-store');
    res.set('X-Weekly-Picks-Cache-Key', cacheKey);
    res.set('X-Weekly-Picks-Version', entry.version);
    res.set('X-Weekly-Picks-Generated-At', entry.generatedAt);
    res.set('X-Weekly-Picks-Generate-Duration-Ms', String(entry.durationMs));
    res.set('X-Weekly-Picks-Week-Offset', String(entry.weekOffset));
    res.set('X-Weekly-Picks-Week-Label', entry.weekLabel);
    res.set('X-Weekly-Picks-Width', String(entry.width));
    res.set('X-Weekly-Picks-Height', String(entry.height));
    res.set('X-Weekly-Picks-Part-Count', String(entry.parts.length));
    res.set('X-Weekly-Picks-Part-Heights', entry.parts.map((part) => part.height).join(','));
    res.set('X-Weekly-Picks-Split-At', String(entry.splitAt));
    if (inProgress) {
        res.set('X-Weekly-Picks-Generating', 'true');
    }
    if (responseFormat === 'png') {
        const pngSize = Buffer.isBuffer(entry.png) ? entry.png.length : 0;
        console.log(
            `${logPrefix} cache hit cacheKey=${cacheKey} pngBytes=${pngSize} generatedMs=${entry.durationMs}`
        );
        res.set('Content-Type', 'image/png');
        res.status(200).send(entry.png);
        const durationMs = Date.now() - startedAt;
        console.log(`${logPrefix} GET done cacheKey=${cacheKey} durationMs=${durationMs}`);
        return;
    }

    const partIndex = (requestedPart ?? 1) - 1;
    const part = entry.parts[partIndex];
    if (!part) {
        res.status(400).json({ error: 'Invalid part requested.' });
        return;
    }
    res.set('Content-Type', 'image/jpeg');
    res.set('X-Weekly-Picks-Part', String(partIndex + 1));
    res.set('X-Weekly-Picks-Part-Height', String(part.height));
    console.log(
        `${logPrefix} cache hit cacheKey=${cacheKey} part=${partIndex + 1} jpgBytes=${part.jpg.length} generatedMs=${entry.durationMs}`
    );
    res.status(200).send(part.jpg);
    const durationMs = Date.now() - startedAt;
    console.log(`${logPrefix} GET done cacheKey=${cacheKey} durationMs=${durationMs}`);
}));

router.post('/duplicates', authenticateAdminRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (replayToLargeInstance(req, res)) {
        return;
    }
    const body = req.body || {};
    const modeInput = String(body.mode ?? 'hybrid').toLowerCase();
    const mode: DuplicateMode = (['heuristic', 'ai', 'hybrid'] as const).includes(modeInput as DuplicateMode)
        ? (modeInput as DuplicateMode)
        : 'hybrid';
    const includeHidden = body.includeHidden ?? true;
    const includePrivate = body.includePrivate ?? true;
    const includeUnapproved = body.includeUnapproved ?? true;
    const maxHoursApart = 3;
    const minScore = parseNumber(body.minScore) ?? 0.72;
    const limit = Math.max(1, Math.min(parseNumber(body.limit) ?? 50, 200));
    const startDate = body.startDate ?? body.start_date ?? body.start;
    const endDate = body.endDate ?? body.end_date ?? body.end;
    const now = new Date();
    const nowIso = now.toISOString();
    const parsedStart = startDate ? new Date(startDate) : null;
    const effectiveStartDate = !parsedStart || !Number.isFinite(parsedStart.getTime()) || parsedStart.getTime() < now.getTime()
        ? nowIso
        : parsedStart.toISOString();

    const warnings: string[] = [];
    const events = await fetchAllRows({
        from: 'events',
        select: `
            *,
            organizer:organizers(id, name, hidden)
        `,
        queryModifier: (query) => {
            let scoped = query;
            if (!includeHidden) {
                scoped = scoped.eq('hidden', false);
            }
            if (!includePrivate) {
                scoped = scoped.eq('visibility', 'public');
            }
            if (!includeUnapproved) {
                scoped = scoped.or('approval_status.eq.approved,approval_status.is.null');
            }
            scoped = scoped.gte('start_date', effectiveStartDate);
            if (endDate) {
                scoped = scoped.lte('start_date', endDate);
            }
            return scoped;
        },
    });

    const indexed = (events || [])
        .map(buildEventIndex)
        .filter((item) => Number.isFinite(item.id));

    const dateMap = new Map<string, EventIndex[]>();
    indexed.forEach((item) => {
        if (!item.dateKey) return;
        const list = dateMap.get(item.dateKey) ?? [];
        list.push(item);
        dateMap.set(item.dateKey, list);
    });

    const shiftDateKey = (key: string, offset: number) => {
        const date = new Date(`${key}T00:00:00Z`);
        if (!Number.isFinite(date.getTime())) return key;
        date.setUTCDate(date.getUTCDate() + offset);
        return date.toISOString().slice(0, 10);
    };

    const pairMap = new Map<string, DuplicateCandidate>();
    const maxDayOffset = Math.max(0, Math.ceil(maxHoursApart / 24));
    const addCandidate = (a: EventIndex, b: EventIndex) => {
        if (a.id === b.id) return;
        if (!a.dateKey || !b.dateKey || a.dateKey !== b.dateKey) return;
        const key = a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;
        if (pairMap.has(key)) return;
        const diffHours = a.startTs && b.startTs ? Math.abs(a.startTs - b.startTs) / 36e5 : null;
        if (diffHours !== null && diffHours > maxHoursApart) {
            const { score } = scoreCandidate(a, b);
            if (score < 1) return;
        }
        const { score, reasons } = scoreCandidate(a, b);
        if (score < minScore) return;
        pairMap.set(key, {
            eventA: a.event,
            eventB: b.event,
            score,
            reasons,
        });
    };

    indexed.forEach((item) => {
        if (!item.dateKey) return;
        for (let offset = -maxDayOffset; offset <= maxDayOffset; offset += 1) {
            const key = shiftDateKey(item.dateKey, offset);
            const peers = dateMap.get(key) ?? [];
            peers.forEach((other) => {
                if (other.id <= item.id) return;
                if (item.startTs && other.startTs) {
                    const diffHours = Math.abs(item.startTs - other.startTs) / 36e5;
                    if (diffHours > maxHoursApart) return;
                }
                addCandidate(item, other);
            });
        }
    });

    const urlMap = new Map<string, EventIndex[]>();
    indexed.forEach((item) => {
        item.urls.forEach((url) => {
            const list = urlMap.get(url) ?? [];
            list.push(item);
            urlMap.set(url, list);
        });
    });

    urlMap.forEach((items) => {
        if (items.length < 2) return;
        for (let i = 0; i < items.length; i += 1) {
            for (let j = i + 1; j < items.length; j += 1) {
                addCandidate(items[i], items[j]);
            }
        }
    });

    const originalMap = new Map<string, EventIndex[]>();
    indexed.forEach((item) => {
        if (!item.originalId) return;
        const list = originalMap.get(item.originalId) ?? [];
        list.push(item);
        originalMap.set(item.originalId, list);
    });

    originalMap.forEach((items) => {
        if (items.length < 2) return;
        for (let i = 0; i < items.length; i += 1) {
            for (let j = i + 1; j < items.length; j += 1) {
                addCandidate(items[i], items[j]);
            }
        }
    });

    const candidates = Array.from(pairMap.values()).sort((a, b) => b.score - a.score);
    const totalCandidates = candidates.length;
    let limited = candidates.slice(0, limit);

    let effectiveMode: DuplicateMode = mode;
    if ((mode === 'ai' || mode === 'hybrid') && !process.env.OPENAI_API_KEY) {
        warnings.push('OPENAI_API_KEY not configured; returning heuristic matches only.');
        effectiveMode = 'heuristic';
    }

    if (effectiveMode !== 'heuristic' && limited.length) {
        const queue = new PQueue({ concurrency: 3 });
        await Promise.all(limited.map((candidate) => queue.add(async () => {
            const prompt = [
                'You are checking whether two event listings refer to the same real-world event.',
                'Compare the dates, name, location, organizer, URLs, and subject matter.',
                'Classify each event’s subject matter based on title/description.',
                'If the subject matter is clearly different, set is_duplicate=false and subject_mismatch=true.',
                'Return ONLY JSON: {"is_duplicate": true|false, "confidence": 0-1, "reason": "short", "subject_mismatch": true|false}',
                JSON.stringify({
                    eventA: buildAiSummary(candidate.eventA),
                    eventB: buildAiSummary(candidate.eventB),
                }),
            ].join('\n');
            try {
                const resp = await openai.chat.completions.create({
                    model: MODEL,
                    temperature: 0,
                    messages: [{ role: 'user', content: prompt }],
                });
                const raw = resp.choices[0]?.message?.content ?? '';
                candidate.ai = parseAiJson(raw);
            } catch (err: any) {
                warnings.push(`AI check failed for ${candidate.eventA.id}/${candidate.eventB.id}: ${err?.message || err}`);
                candidate.ai = { decision: 'unsure', confidence: null, rationale: 'AI request failed.' };
            }
        })));

        limited = limited.filter((candidate) => !candidate.ai?.subjectMismatch);
        if (effectiveMode === 'ai') {
            limited = limited.filter((candidate) => candidate.ai?.decision === 'duplicate');
        }
    }

    res.status(200).json({
        generatedAt: new Date().toISOString(),
        totalCandidates,
        mode: effectiveMode,
        candidates: limited,
        warnings: warnings.length ? warnings : undefined,
    });
}));

router.get('/', optionalAuthenticateRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const cacheKeyBase = "events";
    const flushCache = req.query.flushCache === 'true'; // Check for the flushCache query param
    const nycMidnightUTC = moment.tz('America/New_York').startOf('day').format('YYYY-MM-DD HH:mm:ssZ');
    const calendarType = req.query.wishlist ? "wishlist" : "calendar";
    const includeHiddenOrganizers = req.query.includeHiddenOrganizers === 'true';
    const includeHiddenEvents = req.query.includeHidden === 'true';
    const cacheKey = includeHiddenEvents ? `${cacheKeyBase}:includeHidden` : cacheKeyBase;

    if (flushCache) {
        await flushEvents();
    }

    if (req.query.visibility === 'private') {
        if (!req.authUserId) {
            console.error('User not specified for private events');
            res.status(401).send({ error: 'User not specified for private events' });
            return;
        }
    }

    try {
        let redisClient = null;
        try {
            redisClient = await connectRedisClient();
        } catch (err) {
            console.error('[events] redis unavailable, proceeding without cache', err);
        }

        const runQuery = () =>
            fetchAllRows({
                from: "events",
                select: `
          *,
          organizer:organizers(*, promo_codes(*)),
          communities!inner(id, name, organizer_id),
          location_area:location_areas(id, name),
          promo_code_event(
              promo_codes(*)
          ),
          event_media (
            id, sort_order, created_at,
            media: media ( * )
            ),
          classification:classifications(
                tags,
                experience_level,
                interactivity_level,
                inclusivity
            )
        `,
                queryModifier: (query) => {
                    let scoped = query.gte("start_date", nycMidnightUTC);
                    if (!includeHiddenEvents) {
                        scoped = scoped.eq('hidden', false);
                    }
                    return scoped.order('start_date', { ascending: true }).order('id', { ascending: true });
                },
            });

        let responseData: string;
        if (redisClient) {
            responseData = await fetchAndCacheData(redisClient, cacheKey, runQuery, flushCache);
        } else {
            responseData = JSON.stringify(await runQuery());
        }

        const parseEventsPayload = (raw: string) => {
            if (typeof raw !== 'string') return { ok: false, value: [] as any[] };
            try {
                const parsed = JSON.parse(raw);
                return { ok: Array.isArray(parsed), value: Array.isArray(parsed) ? parsed : [] };
            } catch {
                return { ok: false, value: [] as any[] };
            }
        };

        let parsed = parseEventsPayload(responseData);
        if (!parsed.ok && redisClient) {
            console.warn(`[events] cache parse failed for ${cacheKey}, refreshing`);
            responseData = await fetchAndCacheData(redisClient, cacheKey, runQuery, true);
            parsed = parseEventsPayload(responseData);
        }
        if (!parsed.ok) {
            throw new Error(`Invalid JSON in events cache for key ${cacheKey}`);
        }

        let response = parsed.value;

        const transformPromoCodes = (response: any) => {
            return response.map((responseItem: any) => {
                const promoCodes = responseItem.promo_code_event.map((code: any) => code.promo_codes);
                const newResponseItem = {
                    ...responseItem,
                    promo_codes: promoCodes
                }

                delete newResponseItem.promo_code_event;

                return newResponseItem;
            })
        }

        response.map((eventResponse: any) => {
            eventResponse.media = transformMedia(eventResponse.event_media);
            return eventResponse;
        })

        response = transformPromoCodes(response);

        const isAdmin = !!req.authUser && ADMIN_EMAILS.includes((req.authUser as any)?.email);
        let allowedStatuses: (string | null)[] = [null, 'approved'];
        const reqStatuses = req.query.approval_status as string | undefined;
        if (isAdmin && reqStatuses) {
            allowedStatuses = reqStatuses.split(',').map(s => s.trim()).filter(Boolean) as any[];
            if (allowedStatuses.includes('approved')) allowedStatuses.push(null);
        }
        response = response.filter((event: any) => allowedStatuses.includes((event.approval_status ?? null) as any));

        // filter out hidden organizers that we want to ignore but are still automatically ingested into the database
        const eventsWithVisibleOrganizers = includeHiddenOrganizers
            ? response
            : response.filter((event: Event) => !event.organizer.hidden);

        // If requesting private events, include both public and my private events
        if (req.query.visibility === 'private') {
            if (!req.authUserId) {
                console.error('User not specified');
                throw Error('User not specified');
            }

            const myPrivateCommunities = await getMyPrivateCommunities(req.authUserId);

            // must be in my private communities and be a private event
            const myPrivateCommunityEvents = eventsWithVisibleOrganizers.filter((event: Event) => {
                return event.communities?.find((community) => myPrivateCommunities.includes(community.id))
                    && event.visibility === 'private'
            })

            const publicEvents = eventsWithVisibleOrganizers.filter((event: Event) => event.visibility === 'public');
            const mergedById = [...publicEvents, ...myPrivateCommunityEvents].reduce<Record<string, Event>>((acc, ev: any) => {
                acc[String(ev.id)] = ev;
                return acc;
            }, {});
            res.status(200).send(Object.values(mergedById));
            return;
        }

        // Default: public events only
        const publicEvents = eventsWithVisibleOrganizers.filter((event: Event) => event.visibility === 'public');
        response = publicEvents;

        // if we request the wishlist, we need to filter the events
        if (calendarType === 'wishlist') {
            if (!req.query.authUserId) {
                throw Error('User not specified');
            }

            // @ts-ignore
            const { data: wishlistEvents, error } = await supabaseClient
                .from("event_wishlist")
                .select("event_id")
                .eq("user_id", req.query.authUserId);


            if (error) {
                throw new Error(`Error fetching wishlist events: ${error.message}`);
            }

            const wishlistEventIds = wishlistEvents?.map((event: { event_id: string }) => event.event_id) || [];

            response = response.filter((event: { id: string }) => {
                return wishlistEventIds.includes(event.id);
            });
        }

        if (req.query.format === "ical") {
            res
                .status(200)
                .set("Content-Type", "text/calendar")
                .send(createIcal(response, calendarType));
        } else {
            res.status(200).send(response);
        }
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
}));

router.post('/user-submissions/import-urls', authenticateRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (replayToLargeInstance(req, res)) {
        return;
    }
    const urls = normalizeUrlList(req.body || {});
    if (!urls.length) {
        res.status(400).json({ error: 'urls (array) or url (string) is required' });
        return;
    }

    const eventDefaults = {
        approval_status: 'pending' as const,
        user_submitted: true,
        source_origination_platform: 'user_submitted' as const,
    };

    try {
        const scraped = await scrapeURLs(urls, eventDefaults);
        const results = [];

        for (const ev of scraped) {
            ev.approval_status = 'pending';
            (ev as any).user_submitted = true;
            try {
                const upsertRes = await upsertEvent(ev, req.authUserId, {
                    ignoreFrozen: true,
                    skipExisting: true,
                    skipExistingNoApproval: true,
                });
                if (!upsertRes.event) {
                    try {
                        const previewEvent = await fetchPreviewEvent(ev);
                        if (previewEvent) {
                            results.push({ ...upsertRes, event: previewEvent });
                            continue;
                        }
                    } catch (previewError) {
                        console.warn('Failed to fetch preview event', previewError);
                    }
                }
                results.push(upsertRes);
            } catch (err: any) {
                results.push({ result: 'failed', event: null, error: err?.message || String(err) });
            }
        }

        await flushEvents();

        const insertedEvents = results.filter((item: any) => item?.result === 'inserted' && item?.event);
        const submissionCount = insertedEvents.length || scraped.length || urls.length || 1;
        const primaryEvent = insertedEvents[0]?.event ?? scraped[0] ?? null;
        void notifyAdminsOfPendingEvents({
            count: submissionCount,
            eventName: submissionCount === 1 ? primaryEvent?.name : undefined,
            eventId: insertedEvents.length === 1 ? insertedEvents[0]?.event?.id : undefined,
        }).catch((error) => {
            console.warn('[events] failed to notify admins of user submissions', error);
        });

        res.json({
            requested: urls.length,
            scraped: scraped.length,
            events: results,
        });
    } catch (err: any) {
        console.error('Failed to import user-submitted urls', err);
        res.status(500).json({ error: err?.message || 'failed to import user-submitted urls' });
    }
}));

router.post('/user-submissions', authenticateRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const body = req.body || {};

    const name = normalizeInputText(body.name);
    const organizerName = normalizeInputText(body.organizer_name ?? body.organizerName);
    const startDate = parseIsoDateInput(body.start_date ?? body.startDate);
    const location = normalizeInputText(body.location);
    const description = normalizeInputText(body.description);

    if (!name || !organizerName || !startDate || !location || !description) {
        res.status(400).json({ error: 'name, organizer_name, start_date, location, and description are required' });
        return;
    }

    const endDateInput = parseIsoDateInput(body.end_date ?? body.endDate);
    const endDate = endDateInput
        ?? new Date(new Date(startDate).getTime() + 4 * 60 * 60 * 1000).toISOString();

    const ticketUrl = normalizeOptionalInput(body.ticket_url ?? body.ticketUrl);
    const eventUrl = normalizeOptionalInput(body.event_url ?? body.eventUrl);
    const imageUrl = normalizeOptionalInput(body.image_url ?? body.imageUrl);
    const organizerUrl = normalizeOptionalInput(body.organizer_url ?? body.organizerUrl);

    const event = {
        name,
        start_date: startDate,
        end_date: endDate,
        ticket_url: ticketUrl ?? '',
        event_url: eventUrl ?? '',
        image_url: imageUrl,
        location,
        city: normalizeOptionalInput(body.city),
        region: normalizeOptionalInput(body.region),
        price: normalizeOptionalInput(body.price),
        description,
        organizer: {
            name: organizerName,
            url: organizerUrl,
        },
        approval_status: 'pending',
        user_submitted: true,
        source_origination_platform: 'user_submitted' as const,
        visibility: 'public',
        type: body.type ?? 'event',
    };

    const result = await upsertEvent(event as any, req.authUserId, {
        ignoreFrozen: true,
        skipExisting: true,
        skipExistingNoApproval: true,
    });
    await flushEvents();

    void notifyAdminsOfPendingEvents({
        count: 1,
        eventName: result?.event?.name || name,
        eventId: result?.event?.id ?? undefined,
    }).catch((error) => {
        console.warn('[events] failed to notify admins of user submission', error);
    });

    res.json(result);
}));

router.post('/', authenticateAdminRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    console.log('post events')
    const event = req.body || {};
    if (!event.source_origination_platform) {
        event.source_origination_platform = 'admin';
    }
    const eventResult = await upsertEvent(event, req.authUserId, { ignoreFrozen: true })
    await flushEvents();

    res.json(eventResult);
}));


router.post('/bulk', authenticateAdminRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (replayToLargeInstance(req, res)) {
        return;
    }
    const rawEvents = Array.isArray(req.body) ? req.body : [];
    const events = rawEvents.map((ev: any) => {
        if (!ev || ev.source_origination_platform) return ev;
        return { ...ev, source_origination_platform: 'admin' };
    });
    // Default to skipping existing events unless explicitly overridden with skipExisting=false
    const skipExisting = req.query.skipExisting !== 'false';
    const approveExisting = req.query.approveExisting === 'true';

    const approvalStatuses = Array.from(new Set((events || []).map((ev: any) => ev?.approval_status || 'approved')));
    console.log(`[events/bulk] skipExisting=${skipExisting} approveExisting=${approveExisting} approval_statuses=${approvalStatuses.join(',') || 'none'}`);

    const eventResults = await upsertEventsClassifyAndStats(events, req.authUserId, { skipExisting, approveExisting });
    res.json({
        ...eventResults,
        options: { skipExisting, approveExisting, approvalStatuses },
    });
}));

router.post('/merge', authenticateAdminRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const body = req.body || {};
    const sourceId = Number(body.sourceEventId ?? body.source_event_id ?? body.source_id ?? body.from_id ?? body.fromId ?? body.source);
    const targetId = Number(body.targetEventId ?? body.target_event_id ?? body.target_id ?? body.to_id ?? body.toId ?? body.target);
    const deleteSource = body.deleteSource ?? body.delete_source ?? true;
    const preferSource = body.preferSource ?? body.prefer_source ?? false;

    if (!Number.isFinite(sourceId) || !Number.isFinite(targetId)) {
        res.status(400).json({ error: 'sourceEventId and targetEventId are required' });
        return;
    }

    if (sourceId === targetId) {
        res.status(400).json({ error: 'sourceEventId and targetEventId must differ' });
        return;
    }

    const { data: source, error: sourceError } = await supabaseClient
        .from('events')
        .select('*')
        .eq('id', sourceId)
        .maybeSingle();
    if (sourceError || !source) {
        res.status(404).json({ error: sourceError?.message || 'Source event not found' });
        return;
    }

    const { data: target, error: targetError } = await supabaseClient
        .from('events')
        .select('*')
        .eq('id', targetId)
        .maybeSingle();
    if (targetError || !target) {
        res.status(404).json({ error: targetError?.message || 'Target event not found' });
        return;
    }

    const updatePatch = mergeEventPatch(source, target, Boolean(preferSource));
    let mergedEvent = target;
    if (Object.keys(updatePatch).length) {
        const { data: updated, error: updateError } = await supabaseClient
            .from('events')
            .update(updatePatch)
            .eq('id', targetId)
            .select()
            .single();
        if (updateError) {
            res.status(500).json({ error: updateError.message });
            return;
        }
        mergedEvent = updated;
    }

    const warnings: { table: string; message: string }[] = [];
    const warn = (table: string, error: any) => {
        warnings.push({ table, message: error?.message || String(error) });
    };

    const updateSimpleTable = async (table: string, column = 'event_id') => {
        const { error } = await supabaseClient
            .from(table)
            .update({ [column]: targetId })
            .eq(column, sourceId);
        if (error) warn(table, error);
    };

    const mergeJoinByKey = async (table: string, keyColumn: string) => {
        const { data: sourceRows, error: sourceRowsError } = await supabaseClient
            .from(table)
            .select(`${keyColumn}`)
            .eq('event_id', sourceId);
        if (sourceRowsError) {
            warn(table, sourceRowsError);
            return;
        }
        const { data: targetRows, error: targetRowsError } = await supabaseClient
            .from(table)
            .select(`${keyColumn}`)
            .eq('event_id', targetId);
        if (targetRowsError) {
            warn(table, targetRowsError);
            return;
        }

        const targetSet = new Set((targetRows || []).map((row: any) => row[keyColumn]).filter((value: any) => value !== null && value !== undefined));
        const sourceSet = new Set((sourceRows || []).map((row: any) => row[keyColumn]).filter((value: any) => value !== null && value !== undefined));
        const inserts = Array.from(sourceSet)
            .filter((value) => !targetSet.has(value))
            .map((value) => ({ event_id: targetId, [keyColumn]: value }));

        if (inserts.length) {
            const { error: insertError } = await supabaseClient
                .from(table)
                .insert(inserts);
            if (insertError) warn(table, insertError);
        }

        const { error: deleteError } = await supabaseClient
            .from(table)
            .delete()
            .eq('event_id', sourceId);
        if (deleteError) warn(table, deleteError);
    };

    const mergeWishlist = async () => {
        const table = 'event_wishlist';
        const { data: sourceRows, error: sourceError } = await supabaseClient
            .from(table)
            .select('id, user_id')
            .eq('event_id', sourceId);
        if (sourceError) {
            warn(table, sourceError);
            return;
        }
        const { data: targetRows, error: targetError } = await supabaseClient
            .from(table)
            .select('user_id')
            .eq('event_id', targetId);
        if (targetError) {
            warn(table, targetError);
            return;
        }
        const targetSet = new Set((targetRows || []).map((row: any) => row.user_id));
        const toUpdate = (sourceRows || []).filter((row: any) => !targetSet.has(row.user_id)).map((row: any) => row.id);
        const toDelete = (sourceRows || []).filter((row: any) => targetSet.has(row.user_id)).map((row: any) => row.id);
        if (toUpdate.length) {
            const { error } = await supabaseClient
                .from(table)
                .update({ event_id: targetId })
                .in('id', toUpdate);
            if (error) warn(table, error);
        }
        if (toDelete.length) {
            const { error } = await supabaseClient
                .from(table)
                .delete()
                .in('id', toDelete);
            if (error) warn(table, error);
        }
    };

    const mergePromoCodes = async () => {
        const table = 'promo_code_event';
        const { data: sourceRows, error: sourceError } = await supabaseClient
            .from(table)
            .select('id, promo_code_id')
            .eq('event_id', sourceId);
        if (sourceError) {
            warn(table, sourceError);
            return;
        }
        const { data: targetRows, error: targetError } = await supabaseClient
            .from(table)
            .select('promo_code_id')
            .eq('event_id', targetId);
        if (targetError) {
            warn(table, targetError);
            return;
        }
        const targetSet = new Set((targetRows || []).map((row: any) => row.promo_code_id));
        const toUpdate = (sourceRows || []).filter((row: any) => !targetSet.has(row.promo_code_id)).map((row: any) => row.id);
        const toDelete = (sourceRows || []).filter((row: any) => targetSet.has(row.promo_code_id)).map((row: any) => row.id);
        if (toUpdate.length) {
            const { error } = await supabaseClient
                .from(table)
                .update({ event_id: targetId })
                .in('id', toUpdate);
            if (error) warn(table, error);
        }
        if (toDelete.length) {
            const { error } = await supabaseClient
                .from(table)
                .delete()
                .in('id', toDelete);
            if (error) warn(table, error);
        }
    };

    const mergeEventMedia = async () => {
        const table = 'event_media';
        const { data: sourceRows, error: sourceError } = await supabaseClient
            .from(table)
            .select('media_id, sort_order')
            .eq('event_id', sourceId);
        if (sourceError) {
            warn(table, sourceError);
            return;
        }
        const { data: targetRows, error: targetError } = await supabaseClient
            .from(table)
            .select('media_id, sort_order')
            .eq('event_id', targetId);
        if (targetError) {
            warn(table, targetError);
            return;
        }
        const targetSet = new Set((targetRows || []).map((row: any) => row.media_id).filter((value: any) => value !== null && value !== undefined));
        const sourceSet = new Set((sourceRows || []).map((row: any) => row.media_id).filter((value: any) => value !== null && value !== undefined));
        const maxSort = (targetRows || []).reduce((max: number, row: any) => {
            const value = Number(row.sort_order);
            return Number.isFinite(value) ? Math.max(max, value) : max;
        }, -1);
        const inserts = Array.from(sourceSet)
            .filter((mediaId) => !targetSet.has(mediaId))
            .map((mediaId, idx) => ({
                event_id: targetId,
                media_id: mediaId,
                sort_order: maxSort + 1 + idx,
            }));
        if (inserts.length) {
            const { error: insertError } = await supabaseClient
                .from(table)
                .insert(inserts);
            if (insertError) warn(table, insertError);
        }
        const { error: deleteError } = await supabaseClient
            .from(table)
            .delete()
            .eq('event_id', sourceId);
        if (deleteError) warn(table, deleteError);
    };

    const mergeClassifications = async () => {
        const table = 'classifications';
        const { data: sourceRow, error: sourceError } = await supabaseClient
            .from(table)
            .select('*')
            .eq('event_id', sourceId)
            .maybeSingle();
        if (sourceError) {
            warn(table, sourceError);
            return;
        }
        if (!sourceRow) return;
        const { data: targetRow, error: targetError } = await supabaseClient
            .from(table)
            .select('id')
            .eq('event_id', targetId)
            .maybeSingle();
        if (targetError) {
            warn(table, targetError);
            return;
        }
        if (!targetRow) {
            const { error } = await supabaseClient
                .from(table)
                .update({ event_id: targetId })
                .eq('id', sourceRow.id);
            if (error) warn(table, error);
        } else {
            const { error } = await supabaseClient
                .from(table)
                .delete()
                .eq('id', sourceRow.id);
            if (error) warn(table, error);
        }
    };

    const mergeFacilitatorEvents = async () => {
        const table = 'facilitator_events';
        const { data: sourceRows, error: sourceError } = await supabaseClient
            .from(table)
            .select('facilitator_id')
            .eq('event_id', sourceId);
        if (sourceError) {
            warn(table, sourceError);
            return;
        }
        const { data: targetRows, error: targetError } = await supabaseClient
            .from(table)
            .select('facilitator_id')
            .eq('event_id', targetId);
        if (targetError) {
            warn(table, targetError);
            return;
        }
        const targetSet = new Set((targetRows || []).map((row: any) => row.facilitator_id));
        const inserts = (sourceRows || [])
            .filter((row: any) => !targetSet.has(row.facilitator_id))
            .map((row: any) => ({ event_id: targetId, facilitator_id: row.facilitator_id }));
        if (inserts.length) {
            const { error } = await supabaseClient
                .from(table)
                .insert(inserts);
            if (error) warn(table, error);
        }
        const { error: deleteError } = await supabaseClient
            .from(table)
            .delete()
            .eq('event_id', sourceId);
        if (deleteError) warn(table, deleteError);
    };

    const mergeDeepLinks = async () => {
        const table = 'deep_links';
        const { error } = await supabaseClient
            .from(table)
            .update({ featured_event_id: targetId })
            .eq('featured_event_id', sourceId);
        if (error) warn(table, error);

        const joinTable = 'deep_link_events';
        const { data: sourceRows, error: sourceError } = await supabaseClient
            .from(joinTable)
            .select('deep_link_id')
            .eq('event_id', sourceId);
        if (sourceError) {
            warn(joinTable, sourceError);
            return;
        }
        const { data: targetRows, error: targetError } = await supabaseClient
            .from(joinTable)
            .select('deep_link_id')
            .eq('event_id', targetId);
        if (targetError) {
            warn(joinTable, targetError);
            return;
        }
        const targetSet = new Set((targetRows || []).map((row: any) => row.deep_link_id));
        const toUpdate = (sourceRows || []).filter((row: any) => !targetSet.has(row.deep_link_id));
        const toDelete = (sourceRows || []).filter((row: any) => targetSet.has(row.deep_link_id));
        for (const row of toUpdate) {
            const { error } = await supabaseClient
                .from(joinTable)
                .update({ event_id: targetId })
                .match({ deep_link_id: row.deep_link_id, event_id: sourceId });
            if (error) warn(joinTable, error);
        }
        for (const row of toDelete) {
            const { error } = await supabaseClient
                .from(joinTable)
                .delete()
                .match({ deep_link_id: row.deep_link_id, event_id: sourceId });
            if (error) warn(joinTable, error);
        }
    };

    await mergeWishlist();
    await mergeJoinByKey('event_communities', 'community_id');
    await mergePromoCodes();
    await mergeEventMedia();
    await mergeClassifications();
    await mergeFacilitatorEvents();
    await mergeDeepLinks();
    await updateSimpleTable('swipe_mode_choices');
    await updateSimpleTable('event_popups');
    await updateSimpleTable('push_notifications');

    if (deleteSource) {
        const { error: deleteError } = await supabaseClient
            .from('events')
            .delete()
            .eq('id', sourceId);
        if (deleteError) warn('events', deleteError);
    }

    await flushEvents();

    res.json({
        merged_from: sourceId,
        merged_into: targetId,
        event: mergedEvent,
        warnings: warnings.length ? warnings : undefined,
    });
}));

router.delete('/:id', authenticateAdminRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const eventId = Number(req.params.id);
    if (!Number.isFinite(eventId)) {
        res.status(400).json({ error: 'event id is required' });
        return;
    }

    const { data: existing, error: existingError } = await supabaseClient
        .from('events')
        .select('id, name')
        .eq('id', eventId)
        .maybeSingle();
    if (existingError || !existing) {
        res.status(404).json({ error: existingError?.message || 'Event not found' });
        return;
    }

    const warnings: { table: string; message: string }[] = [];
    const warn = (table: string, error: any) => {
        warnings.push({ table, message: error?.message || String(error) });
    };

    const deleteByEventId = async (table: string, column = 'event_id') => {
        const { error } = await supabaseClient
            .from(table)
            .delete()
            .eq(column, eventId);
        if (error) warn(table, error);
    };

    const updateByEventId = async (table: string, column: string, updates: Record<string, any>) => {
        const { error } = await supabaseClient
            .from(table)
            .update(updates)
            .eq(column, eventId);
        if (error) warn(table, error);
    };

    await deleteByEventId('event_wishlist');
    await deleteByEventId('swipe_mode_choices');
    await deleteByEventId('event_communities');
    await deleteByEventId('promo_code_event');
    await deleteByEventId('event_media');
    await deleteByEventId('classifications');
    await deleteByEventId('facilitator_events');
    await deleteByEventId('event_popups');
    await deleteByEventId('push_notifications');
    await deleteByEventId('deep_link_events');
    await updateByEventId('deep_links', 'featured_event_id', { featured_event_id: null });

    const { error: deleteError } = await supabaseClient
        .from('events')
        .delete()
        .eq('id', eventId);
    if (deleteError) {
        res.status(500).json({ error: deleteError.message });
        return;
    }

    await flushEvents();

    res.status(200).json({
        deleted: eventId,
        event: existing,
        warnings: warnings.length ? warnings : undefined,
    });
}));

router.put('/:id', authenticateAdminRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const event = req.body;
    const eventResult = await upsertEvent(event, req.authUserId, { ignoreFrozen: true })
    await flushEvents();

    res.json(eventResult);
}));

router.put("/weekly-picks/:eventId", authenticateAdminRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { eventId } = req.params;
    const { status } = req.body;

    if (!eventId) {
        return res.status(400).json({ error: "eventId is required in URL" });
    }

    try {
        const { data, error } = await supabaseClient
            .from("events")
            .update({ weekly_pick: status })
            .eq("id", parseInt(eventId))
            .select()
            .single();

        if (error) {
            console.error("Supabase update error:", error);
            return res.status(500).json({ error: error.message });
        }

        await flushEvents();

        return res.status(200).json({ message: status ? "Event marked as weekly pick" : "Event removed from weekly picks", event: data });
    } catch (err) {
        console.error("Unexpected error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}));



export default router;
