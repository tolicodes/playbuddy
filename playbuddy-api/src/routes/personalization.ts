import { AuthenticatedRequest } from "middleware/authenticateRequest.js";
import { supabaseClient } from "connections/supabaseClient.js";
import { Request, Response, Router } from 'express';
import { connectRedisClient } from '../connections/redisClient.js';
import { fetchAndCacheData } from '../helpers/cacheHelper.js';

export const fetchLocationAreas = async (req: AuthenticatedRequest, res: Response) => {
    const cacheKey = 'locationAreas';
    const redisClient = await connectRedisClient();
    const responseData = await fetchAndCacheData(redisClient, cacheKey, async () => {
        const { data, error } = await supabaseClient
            .from('location_areas')
            .select('id, name, code')
            .order('name');

        if (error) {
            throw new Error(`Error fetching location areas: ${error.message}`);
        }
        return data;
    });

    return res.json(responseData);
}

const router = Router();

router.get('/location-areas', fetchLocationAreas);

export default router;