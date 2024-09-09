import { Request, Response, Router } from 'express';
import moment from 'moment-timezone';
import { connectRedisClient } from '../connections/redisClient.js';
import { supabaseClient } from '../connections/supabaseClient.js';
import { createIcal } from '../helpers/ical.js';
import { fetchAndCacheData } from '../helpers/cacheHelper.js';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
    const cacheKey = "events";
    const flushCache = req.query.flushCache === 'true'; // Check for the flushCache query param
    const nycMidnightUTC = moment.tz('America/New_York').startOf('day').utc().format();
    const todayUTC = nycMidnightUTC.split("T")[0];

    try {
        const redisClient = await connectRedisClient();

        const responseData = await fetchAndCacheData(redisClient, cacheKey, () =>
            // @ts-ignore
            supabaseClient
                .from("events")
                .select("*, organizer:organizers(id, name, url)")
                .gte("start_date", todayUTC),
            flushCache // Pass the flushCache flag
        );

        if (req.query.format === "ical") {
            res
                .status(200)
                .set("Content-Type", "text/calendar")
                .send(createIcal(JSON.parse(responseData)));
        } else {
            res.status(200).send(responseData);
        }
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send({ error: error });
    }
});

export default router;
