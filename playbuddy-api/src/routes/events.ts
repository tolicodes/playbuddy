import { Request, Response, Router } from 'express';
import moment from 'moment-timezone';
import { connectRedisClient } from '../connections/redisClient.js';
import { supabaseClient } from '../connections/supabaseClient.js';
import { createIcal } from '../helpers/ical.js';
import { fetchAndCacheData } from '../helpers/cacheHelper.js';
import { optionalAuthenticateRequest } from 'middleware/authenticateRequest.js';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
    const cacheKey = "events";
    const flushCache = req.query.flushCache === 'true'; // Check for the flushCache query param
    const nycMidnightUTC = moment.tz('America/New_York').startOf('day').format('YYYY-MM-DD HH:mm:ssZ');
    const calendarType = req.query.wishlist ? "wishlist" : "calendar";

    try {
        const redisClient = await connectRedisClient();

        const responseData = await fetchAndCacheData(redisClient, cacheKey, () =>
            // @ts-ignore
            supabaseClient
                .from("events")
                .select("*, organizer:organizers(id, name, url, hidden)")
                .gte("start_date", nycMidnightUTC),
            // .eq("organizer.hidden", true),
            flushCache // Pass the flushCache flag
        );

        let response = JSON.parse(responseData)

        // filter out hidden organizers
        // TODO: Fix in query abobe
        response = response.filter((event: { organizer: { hidden: boolean } }) => !event.organizer.hidden);

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
