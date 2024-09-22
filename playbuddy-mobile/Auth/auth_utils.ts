import { supabase } from "../supabaseClient";

// Function to fetch user profile from the custom `users` table
export const fetchUserProfile = async (authUserId: string) => {
    if (!authUserId) return null;

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', authUserId)
        .single();

    if (error) {
        throw new Error(`Fetching User Profile: ${error.message}`);
    }

    return data;
}

// Function to insert a user with a referral code
export const insertUserWithReferralCode = async (userId: string) => {
    const shareCode = Math.random().toString(36).substr(2, 6).toUpperCase(); // Generates a 6-char alphanumeric code
    const { data, error } = await supabase
        .from('users')
        .insert([{ user_id: userId, share_code: shareCode }]);

    if (error) {
        throw new Error(`insertUserWithReferralCode: ${error.message}`);
    }

    return data;
}