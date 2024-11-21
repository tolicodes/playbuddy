// routes/communities.ts

import { Request, Response, Router } from 'express';
import { supabaseClient } from '../connections/supabaseClient.js';
import { AuthenticatedRequest } from '../middleware/authenticateRequest.js';
import { authenticateRequest } from '../middleware/authenticateRequest.js';
import { Community } from 'commonTypes.js';

const router = Router();

// Fetch all communities for the authenticated user
export const fetchMyCommunities = async (req: AuthenticatedRequest, res: Response) => {
    const { authUserId } = req;

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
                .select('id, name, type, visibility, code, organizer_id')
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

const doJoinCommunity = async (authUserId: string, community: Community) => {
    const status = community.auth_type === 'code'
        ? 'approved'
        : 'pending';

    // Insert the membership request
    const { error: insertError } = await supabaseClient
        .from('community_memberships')
        .insert({
            community_id: community.id,
            auth_user_id: authUserId,  // Use correct auth_user_id reference
            role: community.visibility === 'public' ? 'public_member' : 'private_member',
            status,
        });

    if (insertError) {
        throw new Error(`Error joining community: ${insertError.message}`);
    }
};

// Join a community
export const joinCommunity = async (req: AuthenticatedRequest, res: Response) => {
    const { authUserId } = req;
    const { join_code, community_id } = req.body;

    try {
        if (community_id && !join_code) {
            // Fetch the community by ID
            const { data: community, error: communityError } = await supabaseClient
                .from('communities')
                .select('id, visibility')
                .eq('id', community_id)
                .single();

            if (communityError) {
                throw new Error(`Error Joining: ${communityError.message}`);
            }

            if (!community) {
                return res.status(404).json({ error: 'Community not found' });
            }

            if (community.visibility === 'private') {
                return res.status(403).json({ error: 'Community is private. Please use the join code to join.' });
            }

            await doJoinCommunity(authUserId!, community as Community);

            return res.status(200).json(community);
        }

        // Fetch the community by ID
        const { data: community, error: communityError } = await supabaseClient
            .from('communities')
            .select('id, type, name, visibility, join_code, auth_type')
            .eq('join_code', join_code)
            .single();

        if (communityError) {
            throw new Error(`Error Joining: ${communityError.message}`);
        }

        if (!community) {
            return res.status(404).json({ error: 'Community not found' });
        }

        // Validate join code if the community is private
        if (community.visibility === 'private' && community.join_code !== join_code) {
            return res.status(403).json({ error: 'Invalid join code' });
        }

        doJoinCommunity(authUserId!, community);

        // Send success response
        return res.status(200).json({
            community_id: community.id,
            name: community.name,
        });
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        console.log('errorMessage', errorMessage)
        return res.status(500).json({ error: `Failed to join community: ${errorMessage}` });
    }
};

// Leave a community
export const leaveCommunity = async (req: AuthenticatedRequest, res: Response) => {
    const { community_id } = req.body;
    const { authUserId } = req;
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
router.get('/my', authenticateRequest, fetchMyCommunities);

router.post('/join', authenticateRequest, joinCommunity);
router.post('/leave', authenticateRequest, leaveCommunity);
export default router;
