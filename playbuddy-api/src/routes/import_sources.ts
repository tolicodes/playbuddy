import { Router, Response } from 'express';
import { authenticateAdminRequest, type AuthenticatedRequest } from '../middleware/authenticateRequest.js';
import { supabaseClient } from '../connections/supabaseClient.js';

const router = Router();

router.get('/', authenticateAdminRequest, async (_req: AuthenticatedRequest, res: Response) => {
    const { data, error } = await supabaseClient
        .from('import_sources')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Failed to fetch import_sources', error);
        res.status(500).json({ error: error.message });
        return;
    }

    res.json(data || []);
});

router.post('/', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { source, method, identifier, identifier_type, metadata = {}, event_defaults = {} } = req.body || {};
    if (!source || !method || !identifier) {
        res.status(400).json({ error: 'source, method, and identifier are required' });
        return;
    }

    const { data, error } = await supabaseClient
        .from('import_sources')
        .upsert({
            source,
            method,
            identifier,
            identifier_type: identifier_type || null,
            metadata,
            event_defaults,
        })
        .select()
        .single();

    if (error) {
        console.error('Failed to insert import_source', error);
        res.status(500).json({ error: error.message });
        return;
    }

    res.json(data);
});

export default router;
