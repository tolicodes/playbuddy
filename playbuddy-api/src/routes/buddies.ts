import { Router, Request, Response } from 'express';
import { supabaseClient } from '../connections/supabaseClient.js'; // Adjust the import path to match your project
import { AuthenticatedRequest, authenticateRequest } from '../middleware/authenticateRequest.js'; // Adjust the import path to match your project
import asyncHandler from './helpers/asyncHandler.js';


const router = Router();

// Fetch buddies
router.get('/', authenticateRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { data, error } = await supabaseClient
            .from('buddies')
            .select(`
                auth_user_id,
                buddy_auth_user_id,
                user_1:users!auth_user_id(
                    user_id,
                    name,
                    avatar_url,
                    share_code
                ),
                user_2:users!buddy_auth_user_id(
                    user_id,
                    name,
                    avatar_url,
                    share_code
                )
            `)
            .or(`auth_user_id.eq.${req.authUserId},buddy_auth_user_id.eq.${req.authUserId}`);


        if (error) {
            console.error(`Error fetching buddies`, error);
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
        throw error;
    }
}));

// Search for buddies
router.get('/search', authenticateRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!query || query.length < 2) {
        return res.status(200).json([]);
    }

    const { data: buddyRows, error: buddiesError } = await supabaseClient
        .from('buddies')
        .select('auth_user_id, buddy_auth_user_id')
        .or(`auth_user_id.eq.${req.authUserId},buddy_auth_user_id.eq.${req.authUserId}`);

    if (buddiesError) {
        console.error('Error fetching buddies for search', buddiesError);
        return res.status(500).json({ error: 'Failed to search buddies' });
    }

    const buddyIds = new Set<string>();
    for (const buddy of buddyRows || []) {
        const buddyId = buddy.buddy_auth_user_id === req.authUserId ? buddy.auth_user_id : buddy.buddy_auth_user_id;
        if (buddyId) buddyIds.add(buddyId);
    }
    if (req.authUserId) {
        buddyIds.add(req.authUserId);
    }

    const { data, error } = await supabaseClient
        .from('users')
        .select('user_id, name, avatar_url')
        .or(`name.ilike.%${query}%,share_code.ilike.%${query}%`)
        .limit(25);

    if (error) {
        console.error('Error searching buddies', error);
        return res.status(500).json({ error: 'Failed to search buddies' });
    }

    const filtered = (data || []).filter((user) => user?.user_id && !buddyIds.has(user.user_id));
    return res.status(200).json(filtered);
}));

// Add a new buddy
router.post('/add', authenticateRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    let { buddyUserId, shareCode } = req.body;

    if (shareCode) {
        const { data, error } = await supabaseClient
            .from('users')
            .select('user_id')
            .eq('share_code', shareCode);

        if (error) {
            console.log('error', error);
            throw error;
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'User not found with share code ' + shareCode });
        }

        buddyUserId = data[0].user_id;
    }

    if (!buddyUserId) {
        return res.status(400).json({ error: 'Buddy user ID is required' });
    }

    try {
        const { data, error } = await supabaseClient
            .from('buddies')
            .insert({ auth_user_id: req.authUserId, buddy_auth_user_id: buddyUserId });
        ``
        return res.status(201).json(data);
    } catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ error: error.message });
        } else {
            return res.status(500).json({ error: 'Failed to add buddy' });
        }
    }
}));

// Remove a buddy
router.delete('/:buddyUserId', authenticateRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { buddyUserId } = req.params;

    if (!buddyUserId) {
        return res.status(400).json({ error: 'Buddy user ID is required' });
    }

    try {
        const { error } = await supabaseClient
            .from('buddies')
            .delete()
            .or(
                `and(auth_user_id.eq.${req.authUserId},buddy_auth_user_id.eq.${buddyUserId}),` +
                `and(auth_user_id.eq.${buddyUserId},buddy_auth_user_id.eq.${req.authUserId})`
            );

        if (error) throw error;

        return res.status(200).json({ success: true });
    } catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Failed to remove buddy' });
    }
}));

// Fetch buddy lists with buddies
router.get('/lists', authenticateRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { data, error } = await supabaseClient
            .from('buddy_lists')
            .select('id, name, buddy_list_buddies(buddy_id:users(id, display_name, avatar_url))')
            .eq('user_id', req.authUserId);

        if (error) throw error;

        return res.json(data);
    } catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ error: error.message });
        } else {
            return res.status(500).json({ error: 'Failed to fetch buddy lists' });
        }
    }
}));

// Create a new buddy list
router.post('/lists', authenticateRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { listName } = req.body;

    try {
        const { data, error } = await supabaseClient
            .from('buddy_lists')
            .insert({ user_id: req.authUserId, name: listName });

        if (error) throw error;

        return res.status(201).json(data);
    } catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ error: error.message });
        } else {
            return res.status(500).json({ error: 'Failed to create buddy list' });
        }
    }
}));

// Add a buddy to a buddy list
router.post('/lists/:listId/buddies', authenticateRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { listId } = req.params;
    const { buddyId } = req.body;

    try {
        const { data, error } = await supabaseClient
            .from('buddy_list_buddies')
            .insert({ buddy_list_id: listId, buddy_id: buddyId });

        if (error) throw error;

        return res.status(201).json(data);
    } catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ error: error.message });
        } else {
            return res.status(500).json({ error: 'Failed to add buddy to list' });
        }
    }
}));

export default router;
