import express, { Response } from 'express';
import { AuthenticatedRequest, authenticateRequest } from '../middleware/authenticateRequest.js';
import { supabaseClient } from '../connections/supabaseClient.js';
import { classifyEventsInBatches } from '../scripts/event-classifier/classifyEvents.js';
import { flushEvents } from '../helpers/flushCache.js';

const router = express.Router();

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

router.get('/classify', async (req: AuthenticatedRequest, res: Response) => {
    const rawNeighborhood = req.query.neighborhoodOnly ?? req.query.neighborhood_only;
    const rawPrice = req.query.priceOnly ?? req.query.price_only;
    const neighborhoodOnly = rawNeighborhood === 'true' || rawNeighborhood === '1';
    const priceOnly = rawPrice === 'true' || rawPrice === '1';
    const events = await classifyEventsInBatches(10, { neighborhoodOnly, priceOnly });
    await flushEvents();
    return res.json({ message: 'Events classified successfully', events });
});

export default router;
