import { Router, Request, Response } from 'express';
import { supabaseClient } from '../connections/supabaseClient.js'; // Adjust the import path to match your project
import { AuthenticatedRequest, authenticateRequest } from '../middleware/authenticateRequest.js'; // Adjust the import path to match your project


const router = Router();

// Fetch buddies
router.get('/', authenticateRequest, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { data, error } = await supabaseClient
            .from('buddies')
            .select('auth_user_id, buddy_auth_user_id, user_1:users!auth_user_id(user_id, name, avatar_url), user_2:users!buddy_auth_user_id(user_id, name, avatar_url)')
            .or(`auth_user_id.eq.${req.authUserId},buddy_auth_user_id.eq.${req.authUserId}`);


        if (error) {
            throw error;
        }
        const buddies = data.map(buddy =>
            buddy.buddy_auth_user_id === req.authUserId ? buddy.user_1 : buddy.user_2
        );

        res.json(buddies);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: `Failed to fetch buddies: ${error.message}` });
        } else {
            res.status(500).json({ error: 'Failed to fetch buddies' });
        }
    }
});

// Add a new buddy
router.post('/add', authenticateRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { buddyUserId } = req.body;

    try {
        const { data, error } = await supabaseClient
            .from('buddies')
            .insert({ auth_user_id: req.authUserId, buddy_auth_user_id: buddyUserId });

        if (error) throw error;

        res.status(201).json(data);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Failed to add buddy' });
        }
    }
});

// Fetch buddy lists with buddies
router.get('/lists', authenticateRequest, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { data, error } = await supabaseClient
            .from('buddy_lists')
            .select('id, name, buddy_list_buddies(buddy_id:users(id, display_name, avatar_url))')
            .eq('user_id', req.authUserId);

        if (error) throw error;

        res.json(data);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Failed to fetch buddy lists' });
        }
    }
});

// Create a new buddy list
router.post('/lists', authenticateRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { listName } = req.body;

    try {
        const { data, error } = await supabaseClient
            .from('buddy_lists')
            .insert({ user_id: req.authUserId, name: listName });

        if (error) throw error;

        res.status(201).json(data);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Failed to create buddy list' });
        }
    }
});

// Add a buddy to a buddy list
router.post('/lists/:listId/buddies', authenticateRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { listId } = req.params;
    const { buddyId } = req.body;

    try {
        const { data, error } = await supabaseClient
            .from('buddy_list_buddies')
            .insert({ buddy_list_id: listId, buddy_id: buddyId });

        if (error) throw error;

        res.status(201).json(data);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Failed to add buddy to list' });
        }
    }
});

export default router;