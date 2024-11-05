import { Response, Router } from 'express';
import { supabaseClient } from '../connections/supabaseClient.js';
import { AuthenticatedRequest, authenticateRequest } from '../middleware/authenticateRequest.js';

const router = Router();

// Fetch user profile by user_id
router.get('/me', authenticateRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { authUserId } = req;

    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('user_id, share_code, name, avatar_url')
            .eq('user_id', authUserId)
            .single();

        if (error) {
            console.error('Error fetching user profile:', error);
            return res.status(400).json({ error: error.message });
        }

        const userProfile = {
            // copy from session
            email: req.authUser?.email,

            auth_user_id: data.user_id,

            // copy from user table
            share_code: data.share_code,
            name: data.name,
            avatar_url: data.avatar_url,
        };

        return res.json(userProfile)
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return res.status(500).json({ error: 'Error fetching user profile' });
    }
});

// Insert a user profile with a referral code
router.post('/me', authenticateRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { authUserId } = req;
    const { name } = req.body;

    if (!authUserId || !name) {
        console.error('Missing required fields', authUserId, name)
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const shareCode = Math.random().toString(36).substr(2, 6).toUpperCase(); // Generates a 6-char alphanumeric code

    try {
        const { data, error } = await supabaseClient
            .from('users')
            .insert([{ user_id: authUserId, share_code: shareCode, name }]);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.json({ message: 'User profile created successfully', data });
    } catch (error) {
        console.error('Error inserting user profile:', error);
        return res.status(500).json({ error: 'Error inserting user profile' });
    }
});

// Upload image and update avatar URL for a user
router.post('/me/upload-avatar', authenticateRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { avatarPublicUrl } = req.params;

    if (!avatarPublicUrl) {
        return res.status(400).json({ error: 'No image file provided' });
    }

    try {
        // Update the user's avatar URL in the users table
        const { error: updateError } = await supabaseClient
            .from('users')
            .update({ avatar_url: avatarPublicUrl })
            .eq('user_id', req.authUserId);

        if (updateError) throw updateError;

        return res.json({ message: 'Avatar uploaded and updated successfully', url: avatarPublicUrl });
    } catch (error) {
        console.error('Error uploading avatar:', error);
        return res.status(500).json({ error: 'Failed to upload avatar' });
    }
});

// Update the avatar URL for a user
router.put('/me/update-avatar', authenticateRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { avatarUrl } = req.body;

    if (!avatarUrl) {
        return res.status(400).json({ error: 'No avatar URL provided' });
    }

    try {
        const { error } = await supabaseClient
            .from('users')
            .update({ avatar_url: avatarUrl })
            .eq('user_id', req.authUserId);

        if (error) throw error;

        return res.json({ message: 'Avatar updated successfully' });
    } catch (error) {
        console.error('Error updating avatar:', error);
        return res.status(500).json({ error: 'Failed to update avatar' });
    }
});

export default router;