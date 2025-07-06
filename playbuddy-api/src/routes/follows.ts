import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateRequest } from '../middleware/authenticateRequest.js';
import { fetchAllRows } from '../helpers/fetchAllRows.js';
import { supabaseClient } from '../connections/supabaseClient.js';
import { FOLLOWEE_TYPES, FolloweeType, FollowPayload, Follow } from '../commonTypes.js';

const router = Router();

router.get('/', authenticateRequest, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result: Follow[] = await fetchAllRows({
            from: 'follows',
            select: 'followee_type, followee_id',
            where: `auth_user_id.eq.${req.authUserId}`,
        });

        const grouped = Object.fromEntries(
            FOLLOWEE_TYPES.map((type) => [type, []])
        ) as unknown as Record<FolloweeType, string[]>;

        for (const row of result) {
            if (grouped[row.followee_type]) {
                grouped[row.followee_type].push(row.followee_id);
            }
        }

        res.json(grouped);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch follows' });
    }
});

router.post('/', authenticateRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { followee_type, followee_id } = req.body as FollowPayload;

    if (!FOLLOWEE_TYPES.includes(followee_type)) {
        return res.status(400).json({ error: 'Invalid followee_type' });
    }

    if (!followee_id) {
        return res.status(400).json({ error: 'Missing followee_id' });
    }

    try {
        const { data, error } = await supabaseClient
            .from('follows')
            .insert([
                {
                    auth_user_id: req.authUserId,
                    followee_type,
                    followee_id,
                },
            ])
            .select(); // optional: fetch inserted row for confirmation

        if (error) throw error;

        res.status(201).json({ message: 'Followed successfully' });
    } catch (err) {
        console.error('Error in POST /follows:', err);
        res.status(500).json({ error: 'Failed to follow' });
    }
});

router.delete('/', authenticateRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { followee_type, followee_id } = req.body as FollowPayload;

    if (!FOLLOWEE_TYPES.includes(followee_type)) {
        return res.status(400).json({ error: 'Invalid followee_type' });
    }

    if (!followee_id) {
        return res.status(400).json({ error: 'Missing followee_id' });
    }

    try {
        const { data, error } = await supabaseClient
            .from('follows')
            .delete()
            .match({
                auth_user_id: req.authUserId,
                followee_type,
                followee_id,
            });

        if (error) throw error;

        res.status(200).json({ message: 'Unfollowed successfully' });
    } catch (err) {
        console.error('Error in DELETE /follows:', err);
        res.status(500).json({ error: 'Failed to unfollow' });
    }
});

export default router;
