import { AuthenticatedRequest } from "../middleware/authenticateRequest.js";
import { supabaseClient } from "../connections/supabaseClient.js";
import { Request, Response, Router } from 'express';
import { connectRedisClient } from '../connections/redisClient.js';
import { fetchAndCacheData } from '../helpers/cacheHelper.js';

export const fetchLocationAreas = async (req: AuthenticatedRequest, res: Response) => {
    const cacheKey = 'locationAreas';
    const redisClient = await connectRedisClient();
    const responseData = await fetchAndCacheData(redisClient, cacheKey, () => {
        return supabaseClient
            .from('location_areas')
            .select('id, name, code')
            .order('name');
    });

    res.json(JSON.parse(responseData));
}

const router = Router();

router.get('/location-areas', fetchLocationAreas);

export default router;