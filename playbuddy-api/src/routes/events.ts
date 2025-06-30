import { Request, Response, Router } from 'express';
import moment from 'moment-timezone';
import { connectRedisClient } from '../connections/redisClient.js';
import { supabaseClient } from '../connections/supabaseClient.js';
import { createIcal } from '../helpers/ical.js';
import { fetchAndCacheData } from '../helpers/cacheHelper.js';
import { Event, EventMedia, FacilitatorMedia } from '../commonTypes.js';
import { getMyPrivateCommunities } from './helpers/getMyPrivateCommunities.js';
import { authenticateAdminRequest, AuthenticatedRequest, authenticateRequest, optionalAuthenticateRequest } from '../middleware/authenticateRequest.js';
import { upsertEvent } from './helpers/writeEventsToDB/upsertEvent.js';
import { flushEvents } from '../helpers/flushCache.js';
import { transformMedia } from './helpers/transformMedia.js';

const router = Router();

router.get('/', optionalAuthenticateRequest, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const cacheKey = "events";
    const flushCache = req.query.flushCache === 'true'; // Check for the flushCache query param
    const nycMidnightUTC = moment.tz('America/New_York').startOf('day').format('YYYY-MM-DD HH:mm:ssZ');
    const calendarType = req.query.wishlist ? "wishlist" : "calendar";

    if (req.query.visibility === 'private') {
        if (!req.authUserId) {
            console.error('User not specified for private events');
            res.status(401).send({ error: 'User not specified for private events' });
            return;
        }
    }

    try {
        const redisClient = await connectRedisClient();

        const responseData = await fetchAndCacheData(redisClient, cacheKey, () =>
            // @ts-ignore
            supabaseClient
                .from("events")
                .select(`
          *,
          organizer:organizers(id, name, url, hidden, promo_codes(id, promo_code, discount, discount_type, scope, organizer_id)),
          communities!inner(id, name, organizer_id),
          location_area:location_areas(id, name),
          promo_code_event(
              promo_codes(*)
          ),
          event_media (
            id, sort_order, created_at,
            media: media ( * )
          )
        `)
                .gte("start_date", nycMidnightUTC),
            flushCache
        );

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

        // filter out hidden organizers that we want to ignore but are still
        // automatically ingested into the database
        const eventsWithVisibleOrganizers = response
            .filter((event: Event) => !event.organizer.hidden)

        const publicEvents = eventsWithVisibleOrganizers.filter((event: Event) => event.visibility === 'public');
        response = publicEvents;

        // // all private events
        // const privateEvents = withVisibleOrganizers.filter((event: Event) => event.visibility === 'private')

        // we want to extract events only from their private communities
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

            res.status(200).send(myPrivateCommunityEvents);
            return;
        }

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
    const event = req.body;
    const eventResult = await upsertEvent(event, req.authUserId)
    await flushEvents();

    res.json(eventResult);
});

router.post('/bulk', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const events = req.body;

    const eventResults = [];
    for (const event of events) {
        const eventResult = await upsertEvent(event, req.authUserId);
        eventResults.push(eventResult);
    }
    await flushEvents();

    res.json(eventResults);
});

router.put('/:id', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
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
            .eq("id", parseInt(eventId));
        if (error) {
            console.error("Supabase update error:", error);
            return res.status(500).json({ error: error.message });
        }

        const { data: updatedEvent, error: updatedEventError } = await supabaseClient
            .from("events")
            .select("*")
            .eq("id", parseInt(eventId))
            .single();

        const redisClient = await connectRedisClient();
        await redisClient.del("events"); // Clear cache if flush is requested

        return res.status(200).json({ message: "Event marked as weekly pick", event: updatedEvent });
    } catch (err) {
        console.error("Unexpected error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});




export default router;
