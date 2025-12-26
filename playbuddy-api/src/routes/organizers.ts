import { Router, Request, Response } from 'express';
import { supabaseClient } from '../connections/supabaseClient.js'; // Adjust the import path to match your project
import { authenticateAdminRequest, type AuthenticatedRequest } from '../middleware/authenticateRequest.js';

const router = Router();

// Fetch buddies
router.get('/', async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabaseClient
            .from('organizers')
            .select(`
                *,
                events:events(start_date)
            `);


        if (error) {
            console.error(`Error fetching organizers`, error);
            throw error;
        }


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
    const { name, url, original_id, aliases, hidden, fetlife_handle, instagram_handle, membership_app_url, membership_only } = req.body || {};
    const update: any = {};
    if (name !== undefined) update.name = name;
    if (url !== undefined) update.url = url;
    if (original_id !== undefined) update.original_id = original_id;
    if (aliases !== undefined) update.aliases = aliases;
    if (hidden !== undefined) update.hidden = hidden;
    if (fetlife_handle !== undefined) update.fetlife_handle = fetlife_handle;
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
        res.json(data);
    } catch (err: any) {
        console.error('Error updating organizer', err);
        res.status(500).json({ error: err?.message || 'Failed to update organizer' });
    }
});

export default router;
