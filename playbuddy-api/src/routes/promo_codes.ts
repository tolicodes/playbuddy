import { Router, Request, Response } from 'express';
import { supabaseClient } from '../connections/supabaseClient.js'; // Adjust the import path to match your project
import { authenticateAdminRequest, AuthenticatedRequest } from '../middleware/authenticateRequest.js';
import { flushEvents } from '../helpers/flushCache.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    const { data, error } = await supabaseClient
        .from('promo_codes')
        .select(`*`)

    if (error) {
        console.error(`Error fetching promo codes`, error);
        throw error;
    }

    res.json(data);

});

router.post('/', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { promo_code, scope, discount, discount_type, organizer_id } = req.body;
    const { data, error } = await supabaseClient.from('promo_codes').insert({
        promo_code,
        organizer_id,
        discount,
        discount_type,
        scope,
    });

    if (error) {
        console.error(`Error inserting promo code`, error);
        throw error;
    }

    res.json(data);
});

router.put('/:id', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { promo_code, scope, discount, discount_type, organizer_id } = req.body;
    const { data, error } = await supabaseClient.from('promo_codes').update({ promo_code, scope, discount, discount_type, organizer_id }).eq('id', id);

    if (error) {
        console.error(`Error updating promo code`, error);
        throw error;
    }

    res.json(data);
});

router.delete('/:id', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { data, error } = await supabaseClient.from('promo_codes').delete().eq('id', id);

    if (error) {
        console.error(`Error deleting promo code`, error);
        throw error;
    }

    res.json(data);
});


// POST /promo_codes/events
// Adds a promo code to an event

router.post('/events', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { promo_code_id, event_id } = req.body;

    if (!promo_code_id || !event_id) {
        return res.status(400).json({ error: 'Missing promo_code_id or event_id' });
    }

    const { data, error, status, statusText } = await supabaseClient
        .from('promo_code_event')
        .insert({ promo_code_id, event_id })

    await flushEvents();

    if (error) {
        return res.status(status).json({ error: error });
    }

    return res.status(200).json(data);
});

// Removes a promo code from an event

router.delete('/events', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { promo_code_id, event_id } = req.body;

    if (!promo_code_id || !event_id) {
        return res.status(400).json({ error: 'Missing promo_code_id or event_id' });
    }

    const { error } = await supabaseClient
        .from('promo_code_event')
        .delete()
        .eq('promo_code_id', promo_code_id)
        .eq('event_id', event_id);

    await flushEvents();

    if (error) {
        console.log(error)
        return res.status(500).json({ error: error });
    }

    return res.status(200).json({ success: true });
});

export default router;