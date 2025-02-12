import { Request, Response, Router } from 'express';
import { supabaseClient } from '../connections/supabaseClient.js'; // Adjust the import path to match your project
import { AuthenticatedRequest, optionalAuthenticateRequest } from '../middleware/authenticateRequest.js'; // Adjust the import path to match your project
const router = Router();

router.post('/', optionalAuthenticateRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { event_name, event_props } = req.body;

    const { data, error } = await supabaseClient
        .from('user_events')
        .insert([{ event_name, event_props, auth_user_id: req.authUserId || null }]);

    if (error) {
        console.error(`Error recording user event: ${error.message}`);
        return res.status(500).json({ error: 'Failed to record user event' });
    }

    return res.status(200).json(data);
});

export default router;