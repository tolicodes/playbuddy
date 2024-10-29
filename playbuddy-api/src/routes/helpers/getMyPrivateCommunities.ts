import { supabaseClient } from "connections/supabaseClient.js";

export const getMyPrivateCommunities = async (authUserId?: string) => {
    if (!authUserId) {
        throw new Error('No userid provided for getMyPrivateCommunities')
    }

    const { data: memberships, error: membershipsError } = await supabaseClient
        .from('community_memberships')
        .select('community_id')
        .eq('auth_user_id', authUserId)
        .eq('role', 'private_member')
        .eq('status', 'approved');

    if (membershipsError) {
        throw new Error(`Error fetching memberships: ${membershipsError.message}`);
    }

    return memberships.map(community => {
        return community.community_id
    });
}

