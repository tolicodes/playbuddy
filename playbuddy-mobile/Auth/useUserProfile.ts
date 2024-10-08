import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from "../supabaseClient";
import { Session } from '@supabase/auth-js/src/lib/types'


// Function to fetch user profile from the custom `users` table
const fetchUserProfile = async (authUserId: string) => {
    if (!authUserId) return null;

    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', authUserId)
            .single();

        if (error) {
            throw new Error(`Fetching User Profile: ${error.message}`);
        }

        return {
            ...data,
            auth_user_id: data.user_id,
        };
    } catch (e) {
        throw new Error(`Error fetching user profile: ${e.message}`);
    }
};

// Hook to use in components
export const useFetchUserProfile = (session: Session | null) => {
    const authUserId = session?.user?.id;

    const { data: profile, error } = useQuery({
        queryKey: ['userProfile', authUserId],
        queryFn: () => fetchUserProfile(authUserId || ''),
        // due to hook limitations
        enabled: !!session && !!authUserId,
    });

    // not enough info
    if (!session || !authUserId || !profile) {
        return { data: null, error: null };
    }

    if (error || !profile) {
        throw new Error('User profile not found', error?.message);
    }

    const userProfile = {
        // copy from session
        auth_user_id: session.user.id,

        // we don't use this one
        // user_id: profile.id,
        email: session.user.email,

        // copy from user table
        share_code: profile.share_code,
        name: profile.name,
        avatar_url: profile.avatar_url,
    };

    return { data: userProfile, error }
};

// Function to insert a user with a referral code
export const insertUserProfile = async ({ authUserId, name }: { authUserId: string, name: string }) => {
    const shareCode = Math.random().toString(36).substr(2, 6).toUpperCase(); // Generates a 6-char alphanumeric code

    try {
        const data = await supabase
            .from('users')
            .insert([{ user_id: authUserId, share_code: shareCode, name }]);

        return data;;
    } catch (error) {
        throw new Error(`Error inserting profile: ${error.message}`);
    }
};

// Hook for the mutation
export const useInsertUserProfile = () => {
    return useMutation({
        mutationFn: ((userData: { authUserId: string; name: string }) =>
            insertUserProfile(userData)
        )
    });
};

