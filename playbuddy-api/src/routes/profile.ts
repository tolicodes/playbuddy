import { Response, Router } from 'express';
import { supabaseClient } from '../connections/supabaseClient.js';
import { AuthenticatedRequest, authenticateRequest } from '../middleware/authenticateRequest.js';
import asyncHandler from './helpers/asyncHandler.js';

const router = Router();


// Fetch user profile by user_id
router.get('/me', authenticateRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { authUserId } = req;

    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('user_id, share_code, name, avatar_url, selected_community_id, selected_location_area_id')
            .eq('user_id', authUserId)
            .single();

        if (error) {
            console.error('Error fetching user profile:', error);
            return res.status(400).json({ error: error.message });
        }

        const userProfile = {
            // copy from session
            email: req.authUser?.email,
            phone: req.authUser?.phone,

            auth_user_id: data.user_id,

            share_code: data.share_code,
            name: data.name,
            avatar_url: data.avatar_url,
            selected_community_id: data.selected_community_id,
            selected_location_area_id: data.selected_location_area_id,
        };

        return res.json(userProfile)
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return res.status(500).json({ error: 'Error fetching user profile' });
    }
}));

// Update a user profile
router.put('/me', authenticateRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { authUserId } = req;

    try {
        // Fetch the user's share code and create it if it doesn't exist
        const { data: userData, error: fetchError } = await supabaseClient
            .from('users')
            .select('share_code')
            .eq('user_id', authUserId)
            .single();

        if (fetchError) {
            return res.status(400).json({ error: fetchError.message });
        }

        const shareCode = userData.share_code || Math.random().toString(36).substr(2, 6).toUpperCase(); // Generates a 6-char alphanumeric code if it doesn't exist

        const fieldsToUpdate = [
            'name',
            'avatar_url',
            'selected_location_area_id',
            'selected_community_id',
            'initial_deep_link_id',
        ];

        const updateFields: any = { share_code: shareCode };

        fieldsToUpdate.forEach(field => {
            if (req.body.hasOwnProperty(field)) {
                updateFields[field] = req.body[field];
            }
        });

        const { data, error } = await supabaseClient
            .from('users')
            .update(updateFields)
            .eq('user_id', authUserId);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.json({ message: 'User profile created successfully', data });
    } catch (error) {
        console.error('Error inserting user profile:', error);
        return res.status(500).json({ error: 'Error inserting user profile' });
    }
}));

// Upload image and update avatar URL for a user
router.post('/me/upload-avatar', authenticateRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
}));

router.post(
    '/me/deep-link',
    authenticateRequest,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { authUserId } = req;
        const { deep_link_id, claimed_on } = req.body;
        const row = {
            auth_user_id: authUserId,
            deep_link_id,
            claimed_on: claimed_on ?? null,
        };

        try {
            const { data, error } = await supabaseClient
                .from('user_deep_links')
                .upsert(
                    row,
                    {
                        // use a comma‑separated string, not an array
                        onConflict: 'auth_user_id,deep_link_id',
                        // optional: if you want to ignore duplicates rather than update
                        ignoreDuplicates: true,
                    }
                )
                .select()
                .single();

            if (error) throw error;

            // If you omitted `ignoreDuplicates`, upsert will UPDATE existing rows,
            // so you'll always get the record back (and bump updated_at).
            // If you keep `ignoreDuplicates: true`, you might get [] on existing rows,
            // so consider using .maybeSingle() or doing a fallback fetch.

            return res
                .status(data ? 201 : 200)
                .json(data ?? { message: 'Already claimed' });
        } catch (err: any) {
            console.error('Error handling deep link:', err);
            return res.status(500).json({ error: err.message });
        }
    })
);



export default router;
