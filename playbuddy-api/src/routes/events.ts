import { Response, Router } from 'express';
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

const router = Router();
const EXCLUDE_EVENT_IDS = [
    "e7179b3b-b4f8-40df-8d87-f205b0caaeb1", // New York LGBTQ+ Community Events Calendar
    "036f8010-9910-435f-8119-2025a046f452", // NYC Kink Community Events Calendar
];

router.use('/', scrapeRoutes);

router.get('/', optionalAuthenticateRequest, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const cacheKey = "events";
    const flushCache = req.query.flushCache === 'true'; // Check for the flushCache query param
    const nycMidnightUTC = moment.tz('America/New_York').startOf('day').format('YYYY-MM-DD HH:mm:ssZ');
    const calendarType = req.query.wishlist ? "wishlist" : "calendar";
    const includeHiddenOrganizers = req.query.includeHiddenOrganizers === 'true';
    const includeHiddenEvents = req.query.includeHidden === 'true';
    const visibilityParam = req.query.visibility;
    const hasCustomFlags = includeHiddenOrganizers || includeHiddenEvents || !!visibilityParam || calendarType !== 'calendar';
    const cacheKeyWithFlags = cacheKey; // always use base cache key

    console.log('cacheKeyWithFlags', cacheKeyWithFlags, 'hasCustomFlags', hasCustomFlags);

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

        const runQuery = () => {
            let query =
                // @ts-ignore
                supabaseClient
                    .from("events")
                    .select(`
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
        `)
                    .gte("start_date", nycMidnightUTC);

            if (!includeHiddenEvents) {
                query = query.eq('hidden', false);
            }

            return query;
        };

        let responseData: string;
        if (redisClient) {
            if (hasCustomFlags) {
                console.log(`Flushing cache for key: ${cacheKeyWithFlags} due to custom flags`, req.query);
                await redisClient.del(cacheKeyWithFlags);
                responseData = JSON.stringify((await runQuery()).data || []);
            } else {
                if (flushCache) {
                    console.log(`Flushing cache for key: ${cacheKeyWithFlags}`);
                    await redisClient.del(cacheKeyWithFlags);
                }
                responseData = await fetchAndCacheData(redisClient, cacheKeyWithFlags, runQuery, flushCache);
            }
        } else {
            responseData = JSON.stringify((await runQuery()).data || []);
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
        res.status(500).send({ error: error });
    }
});

router.post('/', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    console.log('post events')
    const event = req.body;
    const eventResult = await upsertEvent(event, req.authUserId)
    await flushEvents();

    res.json(eventResult);
});


router.post('/bulk', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const events = req.body;
    const skipExisting = req.query.skipExisting === 'true';

    const eventResults = await upsertEventsClassifyAndStats(events, req.authUserId, { skipExisting });
    res.json(eventResults);
});

router.put('/:id', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const event = req.body;
    const eventResult = await upsertEvent(event, req.authUserId)
    await flushEvents();

    res.json(eventResult);
});

router.put("/weekly-picks/:eventId", authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
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
});



export default router;
