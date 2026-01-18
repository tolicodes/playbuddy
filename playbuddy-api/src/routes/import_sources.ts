import { Router, Response } from 'express';
import { authenticateAdminRequest, type AuthenticatedRequest } from '../middleware/authenticateRequest.js';
import { supabaseClient } from '../connections/supabaseClient.js';
import { flushEvents } from '../helpers/flushCache.js';

const router = Router();

const normalizeHandle = (val?: string | null) => (val || '').replace(/^@/, '').trim().toLowerCase();
const normalizeUrl = (val?: string | null) => {
    if (!val) return '';
    const lowered = val.trim().toLowerCase();
    if (!lowered) return '';
    const withoutHash = lowered.split('#')[0];
    const withoutQuery = withoutHash.split('?')[0];
    return withoutQuery.replace(/\/+$/, '');
};
const stripUrlScheme = (val: string) => val.replace(/^https?:\/\//i, '');
const buildUrlVariants = (value?: string | null) => {
    if (!value) return [];
    const raw = value.trim();
    if (!raw) return [];
    const lowered = raw.toLowerCase();
    const normalized = normalizeUrl(lowered);
    const withoutScheme = stripUrlScheme(normalized);
    const variants = new Set<string>();
    [lowered, normalized].forEach((entry) => {
        if (entry) variants.add(entry);
    });
    if (withoutScheme) {
        variants.add(withoutScheme);
        if (!withoutScheme.startsWith('http')) {
            variants.add(`https://${withoutScheme}`);
            variants.add(`http://${withoutScheme}`);
        }
    }
    return Array.from(variants);
};
const isUrlSource = (source: any) =>
    (source?.identifier_type || '').toLowerCase() === 'url' ||
    source?.source === 'eb_url' ||
    source?.source === 'url' ||
    /^https?:\/\//i.test(source?.identifier || '');

const collectOrganizerIdsForSource = async (source: any) => {
    const organizerIds = new Set<string>();
    const addOrganizerId = (val: any) => {
        if (val === undefined || val === null) return;
        const trimmed = String(val).trim();
        if (trimmed) organizerIds.add(trimmed);
    };

    const defaults = source?.event_defaults || {};
    const meta = source?.metadata || {};
    addOrganizerId(defaults.organizer_id);
    addOrganizerId(defaults.organizerId);
    addOrganizerId(meta.organizer_id);
    addOrganizerId(meta.organizerId);

    const isHandleSource =
        (source?.identifier_type || '').toLowerCase() === 'handle' ||
        source?.source === 'fetlife_handle';
    const normalizedHandle = isHandleSource ? normalizeHandle(source?.identifier) : '';
    if (normalizedHandle) {
        const { data: handleMatches, error: handleError } = await supabaseClient
            .from('organizers')
            .select('id')
            .ilike('fetlife_handle', normalizedHandle);
        if (handleError) throw handleError;
        (handleMatches || []).forEach((row: any) => addOrganizerId(row?.id));

        const { data: handleArrayMatches, error: handleArrayError } = await supabaseClient
            .from('organizers')
            .select('id')
            .contains('fetlife_handles', [normalizedHandle]);
        if (handleArrayError) throw handleArrayError;
        (handleArrayMatches || []).forEach((row: any) => addOrganizerId(row?.id));
    }

    return Array.from(organizerIds);
};

const resolveSourceEventApprovalStatus = (source: any): 'approved' | 'pending' | 'rejected' => {
    const status = source?.approval_status ?? null;
    if (status === 'rejected') return 'rejected';
    if (status === 'approved') return 'approved';
    if (status === null) return source?.is_excluded ? 'pending' : 'approved';
    return 'pending';
};

const updateEventsForSourceApproval = async (source: any, approval_status: 'approved' | 'pending' | 'rejected') => {
    const organizerIdList = await collectOrganizerIdsForSource(source);
    const urlVariants = isUrlSource(source) ? buildUrlVariants(source?.identifier) : [];
    const urlEventIds = new Set<string>();
    if (urlVariants.length) {
        const [ticketRes, eventRes, sourceRes] = await Promise.all([
            supabaseClient.from('events').select('id').in('ticket_url', urlVariants),
            supabaseClient.from('events').select('id').in('event_url', urlVariants),
            supabaseClient.from('events').select('id').in('source_url', urlVariants),
        ]);
        if (ticketRes.error) throw ticketRes.error;
        if (eventRes.error) throw eventRes.error;
        if (sourceRes.error) throw sourceRes.error;
        (ticketRes.data || []).forEach((row: any) => urlEventIds.add(String(row?.id)));
        (eventRes.data || []).forEach((row: any) => urlEventIds.add(String(row?.id)));
        (sourceRes.data || []).forEach((row: any) => urlEventIds.add(String(row?.id)));
    }
    if (!organizerIdList.length && !urlEventIds.size) return;
    if (organizerIdList.length) {
        const { error } = await supabaseClient
            .from('events')
            .update({ approval_status })
            .in('organizer_id', organizerIdList);
        if (error) throw error;
    }
    if (urlEventIds.size) {
        const { error } = await supabaseClient
            .from('events')
            .update({ approval_status })
            .in('id', Array.from(urlEventIds));
        if (error) throw error;
    }
    await flushEvents();
};

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
    const { id, source, method, identifier, identifier_type, metadata = {}, event_defaults = {}, approval_status, message_sent, is_festival, is_excluded } = req.body || {};
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
    const normalizedFestival = typeof is_festival === 'boolean' ? is_festival : undefined;
    const normalizedExcluded = typeof is_excluded === 'boolean' ? is_excluded : undefined;
    const resolvedExcluded = normalizedExcluded !== undefined
        ? normalizedExcluded
        : (!id ? computedApproval !== 'approved' : undefined);
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
    if (normalizedFestival !== undefined) {
        payload.is_festival = normalizedFestival;
    }
    if (resolvedExcluded !== undefined) {
        payload.is_excluded = resolvedExcluded;
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

    if (data) {
        try {
            const targetStatus = resolveSourceEventApprovalStatus(data);
            await updateEventsForSourceApproval(data, targetStatus);
        } catch (err: any) {
            console.error('Failed to update events for import_source', err);
            res.status(500).json({ error: err?.message || String(err) });
            return;
        }
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

    if (data) {
        try {
            const targetStatus = resolveSourceEventApprovalStatus(data);
            await updateEventsForSourceApproval(data, targetStatus);
        } catch (err: any) {
            console.error('Failed to approve events for import_source', err);
            res.status(500).json({ error: err?.message || String(err) });
            return;
        }
    }

    res.json(data);
});

router.delete('/:id', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    if (!id) {
        res.status(400).json({ error: 'id is required' });
        return;
    }

    const { data: source, error: fetchError } = await supabaseClient
        .from('import_sources')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (fetchError) {
        console.error('Failed to fetch import_source before delete', fetchError);
        res.status(500).json({ error: fetchError.message });
        return;
    }

    if (!source) {
        res.status(404).json({ error: 'import_source not found' });
        return;
    }

    const organizerIds = new Set<string>();
    const eventDefaults = (source as any).event_defaults || {};
    const metadata = (source as any).metadata || {};
    const addOrganizerId = (val: any) => {
        if (val === undefined || val === null) return;
        const trimmed = String(val).trim();
        if (trimmed) organizerIds.add(trimmed);
    };
    addOrganizerId(eventDefaults.organizer_id);
    addOrganizerId(eventDefaults.organizerId);
    addOrganizerId(metadata.organizer_id);
    addOrganizerId(metadata.organizerId);

    const isHandleSource =
        (source.identifier_type || '').toLowerCase() === 'handle' ||
        source.source === 'fetlife_handle';
    const normalizedHandle = isHandleSource ? normalizeHandle(source.identifier) : '';
    if (normalizedHandle) {
        const { data: handleMatches, error: handleError } = await supabaseClient
            .from('organizers')
            .select('id')
            .ilike('fetlife_handle', normalizedHandle);
        if (handleError) {
            console.error('Failed to lookup organizer by fetlife_handle', handleError);
            res.status(500).json({ error: handleError.message });
            return;
        }
        (handleMatches || []).forEach((row: any) => addOrganizerId(row?.id));

        const { data: handleArrayMatches, error: handleArrayError } = await supabaseClient
            .from('organizers')
            .select('id')
            .contains('fetlife_handles', [normalizedHandle]);
        if (handleArrayError) {
            console.error('Failed to lookup organizer by fetlife_handles', handleArrayError);
            res.status(500).json({ error: handleArrayError.message });
            return;
        }
        (handleArrayMatches || []).forEach((row: any) => addOrganizerId(row?.id));
    }

    const organizerIdList = Array.from(organizerIds);
    if (organizerIdList.length) {
        const { error: unapproveError } = await supabaseClient
            .from('events')
            .update({ approval_status: 'pending' })
            .in('organizer_id', organizerIdList)
            .or('approval_status.eq.approved,approval_status.is.null');
        if (unapproveError) {
            console.error('Failed to unapprove events for import_source', unapproveError);
            res.status(500).json({ error: unapproveError.message });
            return;
        }
    }

    const { data, error } = await supabaseClient
        .from('import_sources')
        .delete()
        .eq('id', id)
        .select()
        .maybeSingle();

    if (error) {
        console.error('Failed to delete import_source', error);
        res.status(500).json({ error: error.message });
        return;
    }

    if (!data) {
        res.status(404).json({ error: 'import_source not found' });
        return;
    }

    await flushEvents();

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
