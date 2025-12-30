import { Router, Response } from 'express';
import { authenticateAdminRequest, type AuthenticatedRequest } from '../middleware/authenticateRequest.js';
import { supabaseClient } from '../connections/supabaseClient.js';

const router = Router();

router.get('/', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const includeAll = req.query.includeAll === 'true' || req.query.include_all === 'true';

    let query = supabaseClient
        .from('import_sources')
        .select('*')
        .order('created_at', { ascending: false });

    if (!includeAll) {
        // Default: only approved (treat null as approved for backward compatibility)
        query = query.or('approval_status.eq.approved,approval_status.is.null');
    }

    const { data, error } = await query;

    if (error) {
        console.error('Failed to fetch import_sources', error);
        res.status(500).json({ error: error.message });
        return;
    }

    res.json(data || []);
});

router.post('/', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { id, source, method, identifier, identifier_type, metadata = {}, event_defaults = {}, approval_status, message_sent } = req.body || {};
    if (!source || !method || !identifier) {
        res.status(400).json({ error: 'source, method, and identifier are required' });
        return;
    }

    const shouldAutoApprove =
        approval_status === 'approved' ||
        (event_defaults && (event_defaults as any).approval_status === 'approved') ||
        (metadata && (metadata as any).approval_status === 'approved');

    const computedApproval = shouldAutoApprove
        ? 'approved'
        : (approval_status ?? null);

    const normalizedMessageSent = typeof message_sent === 'boolean' ? message_sent : undefined;

    const payload: any = {
        ...(id ? { id } : {}),
        source,
        method,
        identifier,
        identifier_type: identifier_type || null,
        metadata,
        event_defaults,
    };

    if (computedApproval) {
        payload.approval_status = computedApproval;
    } else if (!id) {
        payload.approval_status = 'pending';
    }
    if (normalizedMessageSent !== undefined) {
        payload.message_sent = normalizedMessageSent;
    }

    const { data, error } = await supabaseClient
        .from('import_sources')
        .upsert(payload)
        .select()
        .single();

    if (error) {
        console.error('Failed to insert import_source', error);
        res.status(500).json({ error: error.message });
        return;
    }

    res.json(data);
});

router.post('/:id/approve', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    if (!id) {
        res.status(400).json({ error: 'id is required' });
        return;
    }
    const { data, error } = await supabaseClient
        .from('import_sources')
        .update({ approval_status: 'approved' })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Failed to approve import_source', error);
        res.status(500).json({ error: error.message });
        return;
    }

    res.json(data);
});

router.post('/:id/message_sent', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { message_sent } = req.body || {};
    if (!id) {
        res.status(400).json({ error: 'id is required' });
        return;
    }
    const { data, error } = await supabaseClient
        .from('import_sources')
        .update({ message_sent: !!message_sent })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Failed to update message_sent for import_source', error);
        res.status(500).json({ error: error.message });
        return;
    }

    res.json(data);
});

export default router;
