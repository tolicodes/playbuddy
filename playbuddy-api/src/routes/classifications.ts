import express, { Response } from 'express';
import { AuthenticatedRequest, authenticateRequest, authenticateAdminRequest } from '../middleware/authenticateRequest.js';
import { supabaseClient } from '../connections/supabaseClient.js';
import { classifyEventsInBatches } from '../scripts/event-classifier/classifyEvents.js';

const router = express.Router();

// POST /api/media
router.get('/', authenticateRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { data, error } = await supabaseClient
        .from('classifications')
        .select('*')

    if (error) {
        console.error('Error fetching classifications:', error);
        return res.status(500).json({ error: 'Failed to fetch classifications' });
    }

    return res.json(data);
});

// Fetch buddies
router.get('/', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const events = await classifyEventsInBatches();
    return res.json({ message: 'Events classified successfully', events });
});

export default router;
