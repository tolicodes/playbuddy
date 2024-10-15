// routes/communities.ts

import { Request, Response, Router } from 'express';
import { supabaseClient } from '../connections/supabaseClient.js';
import { AuthenticatedRequest } from '../middleware/authenticateRequest.js';

const router = Router();

// Fetch all communities for the authenticated user
export const fetchMyCommunities = async (req: AuthenticatedRequest, res: Response) => {
    const { authUserId } = req.query;

    try {
        const { data: memberships, error: membershipsError } = await supabaseClient
            .from('community_memberships')
            .select('community_id')
            .eq('auth_user_id', authUserId)
            .eq('status', 'approved')

        if (membershipsError) {
            throw new Error(`Error fetching memberships: ${membershipsError.message}`);
        }

        // Extract community_id values into an array
        const communityIds = memberships.map((membership: { community_id: string }) => membership.community_id);

        if (communityIds.length > 0) {
            const { data: communities, error: communitiesError } = await supabaseClient
                .from('communities')
                .select('id, name, type, visibility, code')
                .in('id', communityIds);

            if (communitiesError) {
                throw new Error(`Error fetching communities: ${communitiesError.message}`);
            }

            // Return fetched communities
            return res.status(200).json(communities);
        } else {
            // Return an empty array if no memberships are found
            return res.status(200).json([]);
        }
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        return res.status(500).json({ error: `Failed to fetch user communities: ${errorMessage}` });
    }
};

// Join a community
export const joinCommunity = async (req: AuthenticatedRequest, res: Response) => {
    const { community_id, authUserId, join_code } = req.body;

    try {
        // Fetch the community by ID
        const { data: community, error: communityError } = await supabaseClient
            .from('communities')
            .select('id, type, visibility, join_code')
            .eq('id', community_id)
            .single();

        if (communityError) {
            throw new Error(`Error fetching community: ${communityError.message}`);
        }

        if (!community) {
            return res.status(404).json({ error: 'Community not found' });
        }

        // Validate join code if the community is private
        if (community.visibility === 'private' && community.join_code !== join_code) {
            return res.status(403).json({ error: 'Invalid join code' });
        }

        // Insert the membership request
        const { error: insertError } = await supabaseClient
            .from('community_memberships')
            .insert({
                community_id,
                auth_user_id: authUserId,  // Use correct auth_user_id reference
                role: community.visibility === 'public' ? 'public_member' : 'private_member',
                status: community.visibility === 'public' ? 'approved' : 'pending',
            });

        if (insertError) {
            throw new Error(`Error joining community: ${insertError.message}`);
        }

        // Send success response
        return res.status(200).json({ message: 'Join request successful' });
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        console.log('errorMessage', errorMessage)
        return res.status(500).json({ error: `Failed to join community: ${errorMessage}` });
    }
};

// Leave a community
export const leaveCommunity = async (req: AuthenticatedRequest, res: Response) => {
    const { community_id, authUserId } = req.body;

    try {
        // Remove the membership
        const { error: deleteError } = await supabaseClient
            .from('community_memberships')
            .delete()
            .eq('community_id', community_id)
            .eq('auth_user_id', authUserId);

        if (deleteError) {
            throw new Error(`Error leaving community: ${deleteError.message}`);
        }

        // Send success response
        return res.status(200).json({ message: 'Leave request successful' });
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        return res.status(500).json({ error: `Failed to leave community: ${errorMessage}` });
    }
};



// routes/communities.ts

// Fetch all public communities
export const fetchPublicCommunities = async (req: Request, res: Response) => {
    try {
        const { data: communities, error: communitiesError } = await supabaseClient
            .from('communities')
            .select('id, name, type, visibility, code')
            .eq('visibility', 'public');

        if (communitiesError) {
            throw new Error(`Error fetching public communities: ${communitiesError.message}`);
        }

        res.status(200).json(communities);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        res.status(500).json({ error: `Failed to fetch public communities: ${errorMessage}` });
    }
};

router.get('/public', fetchPublicCommunities);
router.get('/my', fetchMyCommunities);

router.post('/join', joinCommunity);
router.post('/leave', leaveCommunity);
export default router;
