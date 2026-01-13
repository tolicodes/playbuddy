import express, { Response } from 'express';
import { AuthenticatedRequest, authenticateRequest } from '../middleware/authenticateRequest.js';
import { supabaseClient } from '../connections/supabaseClient.js';
import { classifyEventsInBatches } from '../scripts/event-classifier/classifyEvents.js';
import { flushEvents } from '../helpers/flushCache.js';

const router = express.Router();
const ALLOWED_RECLASSIFY_FIELDS = new Set([
    'type',
    'short_description',
    'tags',
    'experience_level',
    'interactivity_level',
    'inclusivity',
    'vetted',
    'vetting_url',
    'location',
    'neighborhood',
    'non_ny',
    'hosts',
    'price',
    'short_price',
]);
const normalizeField = (value: string) =>
    value.trim().toLowerCase().replace(/[\s-]+/g, '_');

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

router.post('/reclassify', authenticateRequest, async (req: AuthenticatedRequest, res: Response) => {
    const rawFields = Array.isArray(req.body?.fields) ? req.body.fields : [];
    const fields = Array.from(new Set(rawFields.map(String).map(normalizeField)))
        .filter((field) => ALLOWED_RECLASSIFY_FIELDS.has(field));
    const rawEventIds = Array.isArray(req.body?.eventIds) ? req.body.eventIds : [];
    const eventIds = rawEventIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id));
    const hasEventIds = eventIds.length > 0;
    if (!fields.length && !hasEventIds) {
        return res.status(400).json({ error: 'fields or eventIds is required' });
    }
    const batchSize = Number(req.body?.batchSize);
    const events = await classifyEventsInBatches(
        Number.isFinite(batchSize) && batchSize > 0 ? batchSize : 10,
        { fields: fields.length ? fields : undefined, eventIds: hasEventIds ? eventIds : undefined }
    );
    await flushEvents();
    return res.json({
        message: 'Events reclassified successfully',
        fields: fields.length ? fields : undefined,
        eventIds: hasEventIds ? eventIds : undefined,
        count: events.length,
        futureOnly: true,
    });
});

router.get('/reclassify/estimate', authenticateRequest, async (req: AuthenticatedRequest, res: Response) => {
    const nowIso = new Date().toISOString();
    const { count, error } = await supabaseClient
        .from('events')
        .select('id', { count: 'exact', head: true })
        .gte('start_date', nowIso);

    if (error) {
        console.error('Error estimating reclassify count:', error);
        return res.status(500).json({ error: 'Failed to estimate reclassify count' });
    }

    return res.json({
        count: count ?? 0,
        futureOnly: true,
        generatedAt: nowIso,
    });
});

export default router;
