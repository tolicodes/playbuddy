import { Request, Response, Router } from 'express';
import { connectRedisClient } from '../connections/redisClient.js';
import { fetchAndCacheData } from '../helpers/cacheHelper.js';
import { fetchAllRows } from '../helpers/fetchAllRows.js';
import asyncHandler from './helpers/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const cacheKey = "kinks";
    const flushCache = req.query.flushCache === 'true'; // Check for the flushCache query param

    try {
        const redisClient = await connectRedisClient();

        const responseData = await fetchAndCacheData(
            redisClient,
            cacheKey,
            () =>
                fetchAllRows({
                    from: "kinks",
                    select: "*",
                    queryModifier: (query) => query.order('id', { ascending: true }),
                }),
            flushCache // Pass the flushCache flag
        );

        res.status(200).send(responseData);
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
}));

export default router;
