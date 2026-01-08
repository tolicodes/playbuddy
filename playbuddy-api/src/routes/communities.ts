// routes/communities.ts

import { Request, Response, Router } from 'express';
import { supabaseClient } from '../connections/supabaseClient.js';
import { AuthenticatedRequest } from '../middleware/authenticateRequest.js';
import { authenticateRequest } from '../middleware/authenticateRequest.js';
import { Community } from '../commonTypes.js';
import { fetchAllRows } from '../helpers/fetchAllRows.js';

const router = Router();

const DEBUG_COMMUNITIES = process.env.DEBUG_COMMUNITIES === '1';

const summarizeCommunities = (
    communities: Array<{
        type?: string | null;
        visibility?: string | null;
        organizer_id?: string | number | null;
    }>
) => {
    const typeCounts: Record<string, number> = {};
    const visibilityCounts: Record<string, number> = {};
    let missingOrganizerId = 0;

    for (const community of communities) {
        const type = community.type || 'unknown';
        const visibility = community.visibility || 'unknown';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
        visibilityCounts[visibility] = (visibilityCounts[visibility] || 0) + 1;
        if (!community.organizer_id) {
            missingOrganizerId += 1;
        }
    }

    return {
        total: communities.length,
        typeCounts,
        visibilityCounts,
        missingOrganizerId,
    };
};

const logOrganizerCommunityMismatch = async (
    publicCommunities: Array<{
        type?: string | null;
        visibility?: string | null;
        organizer_id?: string | number | null;
    }>
) => {
    if (!DEBUG_COMMUNITIES) return;

    let organizers: Array<{ id: number | string }> = [];
    let communities: Array<{ organizer_id?: string | number | null; type?: string | null; visibility?: string | null }> = [];
    try {
        [organizers, communities] = await Promise.all([
            fetchAllRows({
                from: 'organizers',
                select: 'id',
                queryModifier: (query) => query.order('id', { ascending: true }),
            }),
            fetchAllRows({
                from: 'communities',
                select: 'organizer_id, type, visibility',
                queryModifier: (query) => query.order('id', { ascending: true }),
            }),
        ]);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn('[communities/public][organizer-mismatch] fetch error', message);
        return;
    }

    const organizerIds = new Set(
        (organizers || [])
            .map((row: { id: number | string }) => String(row.id))
            .filter(Boolean)
    );
    const publicOrganizerCommunityIds = new Set(
        (publicCommunities || [])
            .filter((community) => community.type === 'organizer_public_community' && community.organizer_id)
            .map((community) => String(community.organizer_id))
    );

    type OrganizerCommunityStats = {
        total: number;
        publicCount: number;
        organizerPublicTypeCount: number;
        organizerPublicVisibleCount: number;
    };
    const statsByOrganizer = new Map<string, OrganizerCommunityStats>();

    for (const community of communities || []) {
        if (!community.organizer_id) continue;
        const organizerId = String(community.organizer_id);
        const stats = statsByOrganizer.get(organizerId) || {
            total: 0,
            publicCount: 0,
            organizerPublicTypeCount: 0,
            organizerPublicVisibleCount: 0,
        };
        stats.total += 1;
        if (community.visibility === 'public') stats.publicCount += 1;
        if (community.type === 'organizer_public_community') stats.organizerPublicTypeCount += 1;
        if (community.type === 'organizer_public_community' && community.visibility === 'public') {
            stats.organizerPublicVisibleCount += 1;
        }
        statsByOrganizer.set(organizerId, stats);
    }

    const missingOrganizerIds = Array.from(organizerIds).filter(
        (id) => !publicOrganizerCommunityIds.has(id)
    );
    const missingNoCommunity = missingOrganizerIds.filter((id) => !statsByOrganizer.has(id));
    const missingNoPublic = missingOrganizerIds.filter((id) => {
        const stats = statsByOrganizer.get(id);
        return stats ? stats.publicCount === 0 : false;
    });
    const missingNoOrganizerPublicType = missingOrganizerIds.filter((id) => {
        const stats = statsByOrganizer.get(id);
        return stats ? stats.organizerPublicTypeCount === 0 : false;
    });
    const missingOrganizerPublicNotPublic = missingOrganizerIds.filter((id) => {
        const stats = statsByOrganizer.get(id);
        return stats ? stats.organizerPublicTypeCount > 0 && stats.organizerPublicVisibleCount === 0 : false;
    });
    const unexpected = missingOrganizerIds.filter((id) => {
        const stats = statsByOrganizer.get(id);
        return stats ? stats.organizerPublicVisibleCount > 0 : false;
    });

    console.log('[communities/public][organizer-mismatch]', {
        organizers: organizerIds.size,
        publicOrganizerCommunityIds: publicOrganizerCommunityIds.size,
        missing: missingOrganizerIds.length,
        missingNoCommunity: missingNoCommunity.length,
        missingNoPublic: missingNoPublic.length,
        missingNoOrganizerPublicType: missingNoOrganizerPublicType.length,
        missingOrganizerPublicNotPublic: missingOrganizerPublicNotPublic.length,
        unexpected: unexpected.length,
        sampleMissingNoCommunity: missingNoCommunity.slice(0, 10),
        sampleMissingNoPublic: missingNoPublic.slice(0, 10),
        sampleMissingNoOrganizerPublicType: missingNoOrganizerPublicType.slice(0, 10),
        sampleMissingOrganizerPublicNotPublic: missingOrganizerPublicNotPublic.slice(0, 10),
    });
};

const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

// Fetch all communities for the authenticated user
export const fetchMyCommunities = async (req: AuthenticatedRequest, res: Response) => {
    const { authUserId } = req;

    try {
        const memberships = await fetchAllRows({
            from: 'community_memberships',
            select: 'community_id',
            queryModifier: (query) =>
                query
                    .eq('auth_user_id', authUserId)
                    .eq('status', 'approved'),
        });

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

            if (DEBUG_COMMUNITIES) {
                const summary = summarizeCommunities(communities || []);
                const sampleMissingOrganizerId = (communities || [])
                    .filter((community) => !community.organizer_id)
                    .slice(0, 5)
                    .map((community) => ({
                        id: community.id,
                        type: community.type,
                        visibility: community.visibility,
                    }));
                console.log('[communities/my]', {
                    memberships: communityIds.length,
                    ...summary,
                    sampleMissingOrganizerId,
                });
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
    const status = (community.auth_type === 'code' || community.visibility === 'public')
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
    const { join_code, community_id, type } = req.body;

    try {
        if (!community_id && !join_code) {
            return res.status(400).json({ error: 'Missing community_id or join_code' });
        }

        if (community_id) {
            console.log('[joinCommunity] request', {
                community_id,
                join_code: Boolean(join_code),
                type,
            });
        }
        if (community_id && !join_code) {
            if (!isUuid(community_id)) {
                console.warn('[joinCommunity] non-uuid community_id', community_id);
                return res.status(400).json({ error: 'community_id must be a UUID' });
            }

            // Fetch the community by ID
            const { data: communityData, error: communityError } = await supabaseClient
                .from('communities')
                .select('id, visibility, type, name, auth_type')
                .eq('id', community_id)
                .single();

            if (communityError) {
                throw new Error(`Error Joining: ${communityError.message}`);
            }

            if (!communityData) {
                return res.status(404).json({ error: 'Community not found' });
            }

            const community = communityData as Community;

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
        const communities = await fetchAllRows({
            from: 'communities',
            select: 'id, name, type, visibility, code, organizer_id',
            queryModifier: (query) => query.eq('visibility', 'public'),
        });

        if (DEBUG_COMMUNITIES) {
            const summary = summarizeCommunities(communities || []);
            const sampleMissingOrganizerId = (communities || [])
                .filter((community) => !community.organizer_id)
                .slice(0, 5)
                .map((community) => ({
                    id: community.id,
                    type: community.type,
                    visibility: community.visibility,
                }));
            console.log('[communities/public]', {
                ...summary,
                sampleMissingOrganizerId,
            });
            await logOrganizerCommunityMismatch(communities || []);
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
