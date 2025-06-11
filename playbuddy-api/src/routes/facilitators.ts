// routes/facilitators.ts

import { Router, Request, Response } from 'express';
import { supabaseClient } from '../connections/supabaseClient.js';
import type { Facilitator } from '../common/types/commonTypes.js';
import { authenticateAdminRequest, authenticateRequest, type AuthenticatedRequest } from '../middleware/authenticateRequest.js';

const router = Router();

const facilitatorFields = `
  id,
  name,
  bio,
  title,
  profile_image_url,
  intro_video_url,
  instagram_handle,
  fetlife_handle,
  website,
  location,
  verified,
  created_at,
  updated_at,

  facilitator_tags (
    tag:tags ( id, name, entity, type )
  ),
  facilitator_media (
    id, type, url, sort_order, created_at
  ),
  facilitator_events ( event_id ),
  facilitator_followers ( auth_user_id )
`;

async function fetchFacilitators(authUserId?: string) {
    let query = supabaseClient
        .from('facilitators')
        .select(facilitatorFields)
        .order('name', { ascending: true });

    if (authUserId) {
        query = query.eq('facilitator_followers.auth_user_id', authUserId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((f: any) => {
        const event_ids = (f.facilitator_events ?? []).map((fe: any) => fe.event_id);
        const follower_ids = (f.facilitator_followers ?? []).map((ff: any) => ff.auth_user_id);
        return {
            id: f.id,
            name: f.name,
            bio: f.bio,
            title: f.title,
            profile_image_url: f.profile_image_url,
            intro_video_url: f.intro_video_url,
            instagram_handle: f.instagram_handle,
            fetlife_handle: f.fetlife_handle,
            website: f.website,
            location: f.location,
            verified: f.verified,
            created_at: f.created_at,
            updated_at: f.updated_at,

            tags: (f.facilitator_tags ?? []).map((ft: any) => ft.tag),
            media: f.facilitator_media ?? [],

            event_ids,
            follower_ids,
            is_following: authUserId ? follower_ids.includes(authUserId) : false,
        } as Facilitator;
    });
}

// GET /api/facilitators
router.get(
    '/',
    async (_req: Request, res: Response<Facilitator[] | { error: string }>) => {
        try {
            const result = await fetchFacilitators();
            return res.json(result);
        } catch (err: any) {
            console.error('Failed to fetch facilitators:', err);
            return res.status(500).json({ error: err.message || 'Internal server error' });
        }
    }
);

// GET /api/facilitators/my
router.get(
    '/my',
    authenticateRequest,
    async (req: AuthenticatedRequest, res: Response<Facilitator[] | { error: string }>) => {
        try {
            const authUserId = req.authUser?.id;
            if (!authUserId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }
            const result = await fetchFacilitators(authUserId);
            return res.json(result);
        } catch (err: any) {
            console.error('Failed to fetch my facilitators:', err);
            return res.status(500).json({ error: err.message || 'Internal server error' });
        }
    }
);


// POST /api/facilitators/:facilitator_id/events
// Body: { event_id: number }
router.post(
    '/:facilitator_id/events',
    authenticateAdminRequest,
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { facilitator_id } = req.params;
            const { event_id } = req.body;
            const authUserId = req.authUser?.id;
            if (!authUserId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }
            if (!event_id) {
                return res.status(400).json({ error: 'Missing event_id' });
            }

            const { data, error } = await supabaseClient
                .from('facilitator_events')
                .insert([{ facilitator_id, event_id }]);

            if (error) throw error;
            return res.status(201).json(data);
        } catch (err: any) {
            console.error('Error adding event to facilitator:', err);
            return res.status(500).json({ error: err.message || 'Internal server error' });
        }
    }
);

// DELETE /api/facilitators/:facilitator_id/events/:event_id
router.delete(
    '/:facilitator_id/events/:event_id',
    authenticateAdminRequest,
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { facilitator_id, event_id } = req.params;
            const authUserId = req.authUser?.id;
            if (!authUserId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const { data, error } = await supabaseClient
                .from('facilitator_events')
                .delete()
                .eq('facilitator_id', facilitator_id)
                .eq('event_id', Number(event_id));

            if (error) throw error;
            return res.status(200).json(data);
        } catch (err: any) {
            console.error('Error removing event from facilitator:', err);
            return res.status(500).json({ error: err.message || 'Internal server error' });
        }
    }
);

// admin

// list of fields we accept on create/update
const FAC_FIELDS = [
    'name',
    'title',
    'bio',
    'profile_image_url',
    'intro_video_url',
    'location',
    'verified',
    'ig_handle',
    'fetlife_handle',
    'website'
];

// helper to get or create a tag, returns tag id
async function findOrCreateTag(name: string) {
    const normalized = name.trim().toLowerCase();
    // try to fetch existing
    let { data: existing, error: selectErr } = await supabaseClient
        .from('tags')
        .select('id')
        .eq('name', normalized)
        .single();
    if (selectErr && selectErr.code !== 'PGRST116') throw selectErr;
    if (existing) return existing.id;
    // otherwise insert new
    let { data: newTags, error: insertErr } = await supabaseClient
        .from('tags')
        .insert({ name: normalized, entity: 'facilitator' })
        .select();
    if (insertErr) throw insertErr;
    return newTags ? newTags[0]?.id : null;
}


// helper: sync tags for a facilitator
async function syncTags(facilitatorId: string, tags = []) {
    // resolve tag IDs
    const tagIds = await Promise.all(tags.map(findOrCreateTag));
    // clear existing links
    await supabaseClient
        .from('facilitator_tags')
        .delete()
        .eq('facilitator_id', facilitatorId);

    // insert new links
    if (tagIds.length) {
        const records = tagIds.map(tag_id => ({ facilitator_id: facilitatorId, tag_id }));
        await supabaseClient
            .from('facilitator_tags')
            .insert(records);
    }
}

// helper: sync media for a facilitator
async function syncMedia(facilitatorId: string, media = []) {
    try {
        // clear existing links
        const { data, error } = await supabaseClient
            .from('facilitator_media')
            .delete()
            .eq('facilitator_id', facilitatorId);
        if (error) throw error;

        // insert new links
        if (media.length) {
            console.log('media', media)
            const records = media.map(url => ({
                facilitator_id: facilitatorId,
                url,
                type: 'image'
            }));
            const { data, error } = await supabaseClient
                .from('facilitator_media')
                .insert(records);

            console.log('error', error)
            if (error) throw error;
        }
    } catch (err: any) {
        console.error('Error syncing media:', err);
    }
}

/**
 * Create or update facilitator fields from request
 */
function buildFacilitatorPayload(body: any) {
    const payload: any = {};
    for (const key of FAC_FIELDS) {
        if (body[key] !== undefined) payload[key] = body[key];
    }
    return payload;
}

/**
 * POST /api/facilitators
 * Create a new facilitator + tags
 */
router.post(
    '/',
    authenticateAdminRequest,
    async (req, res) => {
        try {
            const { tags = [] } = req.body;
            const facFields = buildFacilitatorPayload(req.body);

            // insert facilitator
            const { data: fac, error: facErr } = await supabaseClient
                .from('facilitators')
                .insert([facFields])
                .select()
                .single();
            if (facErr) throw facErr;

            if (!fac) throw new Error('Facilitator not found');

            // sync tags
            await syncTags(fac.id!, tags);
            await syncMedia(fac.id!, req.body.media)


            return res.status(201).json(fac);
        } catch (err: any) {
            console.error(err);
            return res.status(400).json({ error: err.message });
        }
    }
);

/**
 * PUT /api/facilitators/:id
 * Update facilitator + tags
 */
router.put(
    '/:id',
    authenticateAdminRequest,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { tags = [] } = req.body;
            const facFields = buildFacilitatorPayload(req.body);

            // update facilitator
            const { data: fac, error: facErr } = await supabaseClient
                .from('facilitators')
                .update(facFields)
                .eq('id', id)
                .select()
                .single();
            if (facErr) throw facErr;

            if (!fac) throw new Error('Facilitator not found');

            // sync tags
            await syncTags(fac.id!, tags);
            await syncMedia(fac.id!, req.body.media)

            return res.json(fac);
        } catch (err: any) {
            console.error(err);
            return res.status(400).json({ error: err.message });
        }
    }
);

/**
 * PATCH /api/facilitators/:id/media
 * Update facilitator media URLs (photo and/or intro video)
 * Expects JSON body with optional 'profile_image_url' and 'intro_video_url'.
 */
router.patch('/:id/media', authenticateAdminRequest, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    try {
        const { data, error } = await supabaseClient
            .from('facilitators')
            .update(updates)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error updating facilitator media:', error);
            return res.status(400).json({ error: error.message });
        }

        return res.json(data);
    } catch (err: any) {
        console.error('Unexpected error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});


export default router;
