import { Request, Response, Router } from 'express';
import moment from 'moment-timezone';
import { connectRedisClient } from '../connections/redisClient.js';
import { supabaseClient } from '../connections/supabaseClient.js';
import { createIcal } from '../helpers/ical.js';
import { fetchAndCacheData } from '../helpers/cacheHelper.js';
import { Event } from '../commonTypes.js';
import { getMyPrivateCommunities } from './helpers/getMyPrivateCommunities.js';
import { AuthenticatedRequest, optionalAuthenticateRequest } from '../middleware/authenticateRequest.js';

const router = Router();

router.get('/', optionalAuthenticateRequest, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const cacheKey = "events";
    const flushCache = req.query.flushCache === 'true'; // Check for the flushCache query param
    const nycMidnightUTC = moment.tz('America/New_York').startOf('day').format('YYYY-MM-DD HH:mm:ssZ');
    const calendarType = req.query.wishlist ? "wishlist" : "calendar";

    if (req.query.visibility === 'private') {
        if (!req.authUserId) {
            throw Error('User not specified for private events');
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
          organizer:organizers(id, name, url, hidden),
          communities!inner(id, name),
          location_area:location_areas(id, name)
        `)
                .gte("start_date", nycMidnightUTC),
            flushCache
        );

        let response = JSON.parse(responseData)

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



export default router;
