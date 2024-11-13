import { AuthenticatedRequest } from "middleware/authenticateRequest.js";
import { supabaseClient } from "connections/supabaseClient.js";
import { Request, Response, Router } from 'express';


export const fetchLocationAreas = async (req: AuthenticatedRequest, res: Response) => {
    const { data, error } = await supabaseClient
        .from('location_areas')
        .select('id, name, code')
        .order('name');

    if (error) {
        throw new Error(`Error fetching location areas: ${error.message}`);
    }

    return res.json(data);
}

const router = Router();

router.get('/location-areas', fetchLocationAreas);

export default router;