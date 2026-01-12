import { Response, Router, NextFunction, RequestHandler } from 'express';
import PQueue from 'p-queue';
import moment from 'moment-timezone';
import { connectRedisClient } from '../connections/redisClient.js';
import { supabaseClient } from '../connections/supabaseClient.js';
import { createIcal } from '../helpers/ical.js';
import { fetchAndCacheData } from '../helpers/cacheHelper.js';
import { Event } from '../commonTypes.js';
import { getMyPrivateCommunities } from './helpers/getMyPrivateCommunities.js';
import { authenticateAdminRequest, AuthenticatedRequest, optionalAuthenticateRequest } from '../middleware/authenticateRequest.js';
import { upsertEvent } from './helpers/writeEventsToDB/upsertEvent.js';
import { upsertEventsClassifyAndStats } from './helpers/upsertEventsBatch.js';
import { flushEvents } from '../helpers/flushCache.js';
import { transformMedia } from './helpers/transformMedia.js';
import scrapeRoutes from './eventsScrape.js';
import { ADMIN_EMAILS } from '../config.js';
import { fetchAllRows } from '../helpers/fetchAllRows.js';
import {
    forceGenerateWeeklyPicksImage,
    getCachedWeeklyPicksImage,
    getWeeklyPicksImageCacheStatus,
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

const extractWeeklyPicksImageOptions = (req: AuthenticatedRequest) => {
    const source = { ...(req.query || {}), ...(req.body || {}) } as Record<string, unknown>;
    const weekOffset = parseNumber(source.weekOffset);
    const width = parseNumber(source.width);
    const scale = parseNumber(source.scale);
    const limit = parseNumber(source.limit);
    const partCount = parsePartCount(source.partCount);
    return { weekOffset, width, scale, limit, partCount };
};

router.get('/weekly-picks/image/status', asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const options = extractWeeklyPicksImageOptions(req);
    const status = getWeeklyPicksImageCacheStatus(options);
    res.status(200).json({
        cacheKey: status.cacheKey,
        cached: status.cached,
        inProgress: status.inProgress,
        version: status.entry?.version ?? null,
        generatedAt: status.entry?.generatedAt ?? null,
        durationMs: status.entry?.durationMs ?? null,
        width: status.entry?.width ?? null,
        height: status.entry?.height ?? null,
        weekOffset: status.entry?.weekOffset ?? null,
        weekLabel: status.entry?.weekLabel ?? null,
        partCount: status.entry?.parts?.length ?? null,
        partHeights: status.entry?.parts?.map((part) => part.height) ?? null,
        splitAt: status.entry?.splitAt ?? null,
    });
}));

router.post('/weekly-picks/image/generate', authenticateAdminRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startedAt = Date.now();
    const options = extractWeeklyPicksImageOptions(req);
    const responseFormat = String((req.query.format ?? (req.body as Record<string, unknown>)?.format ?? 'json')).toLowerCase();
    const requestedPart = parsePart(req.query.part ?? (req.body as Record<string, unknown>)?.part);
    console.log(
        `[weekly-picks][generate] start width=${options.width ?? 'auto'} weekOffset=${options.weekOffset ?? 0} scale=${options.scale ?? 'auto'} limit=${options.limit ?? 'all'} parts=${options.partCount ?? 2}`
    );
    try {
        const { cacheKey, entry } = await forceGenerateWeeklyPicksImage(options);
        const durationMs = Date.now() - startedAt;
        const pngBytes = Buffer.isBuffer(entry.png) ? entry.png.length : 0;
        const jpgBytes = entry.parts.reduce((sum, part) => sum + part.jpg.length, 0);
        console.log(
            `[weekly-picks][generate] done cacheKey=${cacheKey} durationMs=${durationMs} generatedMs=${entry.durationMs} pngBytes=${pngBytes} jpgBytes=${jpgBytes}`
        );
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
            weekOffset: entry.weekOffset,
            weekLabel: entry.weekLabel,
            width: entry.width,
            height: entry.height,
            partCount: entry.parts.length,
            partHeights: entry.parts.map((part) => part.height),
            splitAt: entry.splitAt,
        });
    } catch (error) {
        const durationMs = Date.now() - startedAt;
        console.error(`[weekly-picks][generate] failed durationMs=${durationMs}`, error);
        throw error;
    }
}));

router.get('/weekly-picks/image', asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

router.get('/', optionalAuthenticateRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const cacheKeyBase = "events";
    const flushCache = req.query.flushCache === 'true'; // Check for the flushCache query param
    const nycMidnightUTC = moment.tz('America/New_York').startOf('day').format('YYYY-MM-DD HH:mm:ssZ');
    const calendarType = req.query.wishlist ? "wishlist" : "calendar";
    const includeHiddenOrganizers = req.query.includeHiddenOrganizers === 'true';
    const includeHiddenEvents = req.query.includeHidden === 'true';
    const cacheKey = includeHiddenEvents ? `${cacheKeyBase}:includeHidden` : cacheKeyBase;

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

        let response = JSON.parse(responseData);

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

router.post('/', authenticateAdminRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    console.log('post events')
    const event = req.body;
    const eventResult = await upsertEvent(event, req.authUserId, { ignoreFrozen: true })
    await flushEvents();

    res.json(eventResult);
}));


router.post('/bulk', authenticateAdminRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const events = req.body;
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
