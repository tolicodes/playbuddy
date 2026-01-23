import { Router, Request, Response } from 'express';
import { supabaseClient } from '../connections/supabaseClient.js'; // Adjust the import path to match your project
import { authenticateAdminRequest, type AuthenticatedRequest } from '../middleware/authenticateRequest.js';
import { flushEvents } from '../helpers/flushCache.js';
import { fetchAllRows } from '../helpers/fetchAllRows.js';

const router = Router();

const normalizeHandle = (val?: string | null) => (val || '').replace(/^@/, '').trim().toLowerCase();
const normalizeHandlesInput = (val: unknown) => {
    if (val === undefined) return undefined;
    const handles = Array.isArray(val) ? val : [val];
    const normalized = handles
        .map((handle) => (typeof handle === 'string' ? normalizeHandle(handle) : ''))
        .filter(Boolean);
    return Array.from(new Set(normalized));
};
const trimValue = (val?: string | null) => (val || '').trim();
const isBlank = (val?: string | null) => !trimValue(val);

const mergeStringList = (primary: Array<string | null | undefined>, extra: Array<string | null | undefined>) => {
    const results: string[] = [];
    const seen = new Set<string>();
    const add = (value?: string | null) => {
        const trimmed = trimValue(value);
        if (!trimmed) return;
        const key = trimmed.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        results.push(trimmed);
    };
    primary.forEach(add);
    extra.forEach(add);
    return results;
};

const mergeHandles = (primary: Array<string | null | undefined>, extra: Array<string | null | undefined>) => {
    const results: string[] = [];
    const seen = new Set<string>();
    const add = (value?: string | null) => {
        const normalized = normalizeHandle(value);
        if (!normalized) return;
        if (seen.has(normalized)) return;
        seen.add(normalized);
        results.push(normalized);
    };
    primary.forEach(add);
    extra.forEach(add);
    return results;
};

const mergeOrganizerPatch = (source: any, target: any) => {
    const patch: Record<string, any> = {};

    const targetAliases = Array.isArray(target.aliases) ? target.aliases : [];
    const sourceAliases = Array.isArray(source.aliases) ? source.aliases : [];
    const aliasExtras = source.name && source.name !== target.name ? [source.name] : [];
    const mergedAliases = mergeStringList(targetAliases, [...sourceAliases, ...aliasExtras]);
    if (mergedAliases.length && mergedAliases.join('|') !== mergeStringList(targetAliases, []).join('|')) {
        patch.aliases = mergedAliases;
    }

    const mergedFetlifeHandles = mergeHandles(
        [...(target.fetlife_handles || []), target.fetlife_handle],
        [...(source.fetlife_handles || []), source.fetlife_handle]
    );
    const currentFetlifeHandles = mergeHandles([...(target.fetlife_handles || []), target.fetlife_handle], []);
    if (mergedFetlifeHandles.length && mergedFetlifeHandles.join('|') !== currentFetlifeHandles.join('|')) {
        patch.fetlife_handles = mergedFetlifeHandles;
    }

    if (isBlank(target.fetlife_handle) && mergedFetlifeHandles[0]) {
        patch.fetlife_handle = mergedFetlifeHandles[0];
    }

    if (isBlank(target.instagram_handle) && !isBlank(source.instagram_handle)) {
        patch.instagram_handle = normalizeHandle(source.instagram_handle);
    }

    if (isBlank(target.url) && !isBlank(source.url)) {
        patch.url = trimValue(source.url);
    }

    if (isBlank(target.original_id) && !isBlank(source.original_id)) {
        patch.original_id = trimValue(source.original_id);
    }

    if (isBlank(target.membership_app_url) && !isBlank(source.membership_app_url)) {
        patch.membership_app_url = trimValue(source.membership_app_url);
    }

    if (target.membership_only === null || target.membership_only === undefined) {
        if (source.membership_only !== null && source.membership_only !== undefined) {
            patch.membership_only = source.membership_only;
        }
    }

    return patch;
};

// Fetch buddies
router.get('/', async (req: Request, res: Response) => {
    try {
        const data = await fetchAllRows({
            from: 'organizers',
            select: `
                *,
                events:events(start_date)
            `,
            queryModifier: (query) => query.order('id', { ascending: true }),
        });

        res.json(data);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: `Failed to fetch organizers: ${error.message}` });
        } else {
            res.status(500).json({ error: 'Failed to fetch organizers' });
        }
    }
});

router.patch('/:id', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const {
        name,
        url,
        original_id,
        aliases,
        hidden,
        fetlife_handle,
        fetlife_handles,
        instagram_handle,
        membership_app_url,
        membership_only,
    } = req.body || {};
    const update: any = {};
    if (name !== undefined) update.name = name;
    if (url !== undefined) update.url = url;
    if (original_id !== undefined) update.original_id = original_id;
    if (aliases !== undefined) update.aliases = aliases;
    if (hidden !== undefined) update.hidden = hidden;
    if (fetlife_handle !== undefined) update.fetlife_handle = normalizeHandle(fetlife_handle) || null;
    if (fetlife_handles !== undefined) {
        const normalizedHandles = normalizeHandlesInput(fetlife_handles) || [];
        update.fetlife_handles = normalizedHandles.length ? normalizedHandles : null;
        if (update.fetlife_handle === undefined) {
            update.fetlife_handle = normalizedHandles[0] ?? null;
        }
    }
    if (instagram_handle !== undefined) update.instagram_handle = instagram_handle;
    if (membership_app_url !== undefined) update.membership_app_url = membership_app_url;
    if (membership_only !== undefined) update.membership_only = membership_only;
    if (hidden !== undefined) update.hidden = hidden;

    try {
        const { data, error } = await supabaseClient
            .from('organizers')
            .update(update)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        await flushEvents();
        res.json(data);
    } catch (err: any) {
        console.error('Error updating organizer', err);
        res.status(500).json({ error: err?.message || 'Failed to update organizer' });
    }
});

router.delete('/:id/events', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const organizerId = Number(req.params.id);
    const onlyWithoutAttendees = req.query.onlyWithoutAttendees === 'true';
    if (!Number.isFinite(organizerId)) {
        res.status(400).json({ error: 'Organizer id must be a number' });
        return;
    }

    try {
        const { data: events, error: eventsError } = await supabaseClient
            .from('events')
            .select('id')
            .eq('organizer_id', organizerId);
        if (eventsError) throw eventsError;

        const eventIds = (events || [])
            .map((event: { id?: number | null }) => event?.id)
            .filter((id): id is number => Number.isFinite(id));

        if (!eventIds.length) {
            res.json({ organizerId, deleted: 0, skippedWithAttendees: 0 });
            return;
        }

        let deletableIds = eventIds;
        let skippedWithAttendees = 0;
        if (onlyWithoutAttendees) {
            const { data: wishlistRows, error: wishlistError } = await supabaseClient
                .from('event_wishlist')
                .select('event_id')
                .in('event_id', eventIds);
            if (wishlistError) throw wishlistError;
            const attendedSet = new Set(
                (wishlistRows || [])
                    .map((row: { event_id?: number | null }) => row?.event_id)
                    .filter((id): id is number => Number.isFinite(id))
            );
            deletableIds = eventIds.filter((id) => !attendedSet.has(id));
            skippedWithAttendees = eventIds.length - deletableIds.length;
        }

        if (!deletableIds.length) {
            res.json({ organizerId, deleted: 0, skippedWithAttendees });
            return;
        }

        const { error: promoError } = await supabaseClient
            .from('promo_code_event')
            .delete()
            .in('event_id', deletableIds);
        if (promoError) throw promoError;

        const { error: deepLinkError } = await supabaseClient
            .from('deep_links')
            .update({ featured_event_id: null })
            .in('featured_event_id', deletableIds);
        if (deepLinkError) throw deepLinkError;

        const { error: deleteError } = await supabaseClient
            .from('events')
            .delete()
            .in('id', deletableIds);
        if (deleteError) throw deleteError;

        await flushEvents();
        res.json({ organizerId, deleted: deletableIds.length, skippedWithAttendees });
    } catch (err: any) {
        console.error('Error deleting organizer events', err);
        res.status(500).json({ error: err?.message || 'Failed to delete organizer events' });
    }
});

router.post('/merge', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const body = req.body || {};
    const sourceId = Number(body.sourceOrganizerId ?? body.source_id ?? body.from_id ?? body.fromId ?? body.source);
    const targetId = Number(body.targetOrganizerId ?? body.target_id ?? body.to_id ?? body.toId ?? body.target);
    const deleteSource = body.deleteSource ?? body.delete_source ?? true;

    if (!Number.isFinite(sourceId) || !Number.isFinite(targetId)) {
        res.status(400).json({ error: 'sourceOrganizerId and targetOrganizerId are required' });
        return;
    }

    if (sourceId === targetId) {
        res.status(400).json({ error: 'sourceOrganizerId and targetOrganizerId must differ' });
        return;
    }

    const { data: source, error: sourceError } = await supabaseClient
        .from('organizers')
        .select('*')
        .eq('id', sourceId)
        .maybeSingle();
    if (sourceError || !source) {
        res.status(404).json({ error: sourceError?.message || 'Source organizer not found' });
        return;
    }

    const { data: target, error: targetError } = await supabaseClient
        .from('organizers')
        .select('*')
        .eq('id', targetId)
        .maybeSingle();
    if (targetError || !target) {
        res.status(404).json({ error: targetError?.message || 'Target organizer not found' });
        return;
    }

    const updatePatch = mergeOrganizerPatch(source, target);
    let mergedOrganizer = target;
    if (Object.keys(updatePatch).length) {
        const { data: updated, error: updateError } = await supabaseClient
            .from('organizers')
            .update(updatePatch)
            .eq('id', targetId)
            .select()
            .single();
        if (updateError) {
            res.status(500).json({ error: updateError.message });
            return;
        }
        mergedOrganizer = updated;
    }

    const warnings: { table: string; message: string }[] = [];
    const updateTable = async (table: string) => {
        const { error } = await supabaseClient
            .from(table)
            .update({ organizer_id: targetId })
            .eq('organizer_id', sourceId);
        if (error) {
            warnings.push({ table, message: error.message });
        }
    };

    await updateTable('events');
    await updateTable('communities');
    await updateTable('promo_codes');
    await updateTable('facilitators');
    await updateTable('deep_links');
    await updateTable('munches');

    const { data: importSources, error: importSourcesError } = await supabaseClient
        .from('import_sources')
        .select('id,event_defaults,metadata');
    if (importSourcesError) {
        warnings.push({ table: 'import_sources', message: importSourcesError.message });
    } else if (importSources && importSources.length) {
        for (const row of importSources) {
            const eventDefaults = row.event_defaults || {};
            const metadata = row.metadata || {};
            const eventDefaultsMatch =
                String(eventDefaults.organizer_id ?? eventDefaults.organizerId ?? '') === String(sourceId);
            const metadataMatch =
                String(metadata.organizer_id ?? metadata.organizerId ?? '') === String(sourceId);
            if (!eventDefaultsMatch && !metadataMatch) continue;
            const updatePayload: Record<string, any> = {};
            if (eventDefaultsMatch) {
                updatePayload.event_defaults = {
                    ...eventDefaults,
                    organizer_id: targetId,
                    organizerId: targetId,
                };
            }
            if (metadataMatch) {
                updatePayload.metadata = {
                    ...metadata,
                    organizer_id: targetId,
                    organizerId: targetId,
                };
            }
            const { error } = await supabaseClient
                .from('import_sources')
                .update(updatePayload)
                .eq('id', row.id);
            if (error) {
                warnings.push({ table: 'import_sources', message: error.message });
            }
        }
    }

    if (deleteSource) {
        const { error: deleteError } = await supabaseClient
            .from('organizers')
            .delete()
            .eq('id', sourceId);
        if (deleteError) {
            warnings.push({ table: 'organizers', message: deleteError.message });
        }
    }

    await flushEvents();

    res.json({
        merged_from: sourceId,
        merged_into: targetId,
        organizer: mergedOrganizer,
        warnings: warnings.length ? warnings : undefined,
    });
});

export default router;
