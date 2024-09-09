import { Request, Response, Router } from 'express';
import { connectRedisClient } from '../connections/redisClient.js';
import { supabaseClient } from '../connections/supabaseClient.js';
import { fetchAndCacheData } from '../helpers/cacheHelper.js';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
    const cacheKey = "kinks";
    const flushCache = req.query.flushCache === 'true'; // Check for the flushCache query param

    try {
        const redisClient = await connectRedisClient();

        const responseData = await fetchAndCacheData(redisClient, cacheKey, () =>
            supabaseClient.from("kinks").select("*"),
            flushCache // Pass the flushCache flag
        );

        res.status(200).send(responseData);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send({ error: error });
    }
});

export default router;
