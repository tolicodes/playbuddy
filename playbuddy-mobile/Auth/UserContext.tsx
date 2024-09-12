import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { Alert, AppState } from 'react-native';
import { supabase } from '../supabaseClient';
import axios from 'axios';

// Define the shape of the UserContext state
interface UserProfile {
    user_id: string;
    share_code: string;
    email?: string;
}

interface UserContextType {
    userId: string | null;
    userProfile: UserProfile | null;
    signInWithEmail: (email: string, password: string, callback: () => void) => Promise<void>;
    signUpWithEmail: (email: string, password: string, callback: () => void) => Promise<void>;
    signOut: (callback: () => void) => void;
    authReady: boolean;
}

// Create the UserContext
const UserContext = createContext<UserContextType | undefined>(undefined);

// Custom hook to use the UserContext
export const useUserContext = (): UserContextType => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUserContext must be used within a UserProvider');
    }
    return context;
};

// Main UserProvider component

// Sign Up Flow
// 1. User signs up with email and password
// 2. Supabase create a new user
// 3. Create user profile in the custom `users` table with a referral code
// 4. Fetch the user profile and set the session

// Sign In Flow
// 1. User signs in with email and password
// 2. Supabase signs in the user
// 3. Fetch the user profile and set the session

// Sign Out Flow
// 1. User signs out
// 2. Supabase signs out the user
// 3. Clear the session and user profile

// Other
// - Fetch user profile when the session changes
// - Axios Interceptor will add the token to the header if the session exists

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // The auth takes a few steps
    const [authReady, setAuthReady] = useState(false);

    // Supabase Session
    const [session, setSession] = useState<any>(null);

    // User Table Profile
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);


    // Derived state
    // User ID from the auth table
    const authUserId = session?.user?.id || null;

    // Function to fetch user profile from the custom `users` table
    const fetchUserProfile = useCallback(async (authUserId: string) => {
        if (!authUserId) return null;

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', authUserId)
            .single();

        if (error) {
            throw new Error(`Fetching User Profile: ${error.message}`);
        }

        return data as UserProfile;
    }, []);

    const fetchAndSetUserProfile = async (authUserId: string) => {
        if (!authReady || !authUserId) return;

        try {
            // we need to manually fetch the user profile before setting session
            const profile = await fetchUserProfile(authUserId)

            if (!profile) return;

            setUserProfile({
                user_id: authUserId,
                email: session?.user.email,
                share_code: profile.share_code,
            });
        } catch (error) {
            throw new Error(`Session Changed Fetching Profile: ${error.message}`);
        }
    }

    // Function to insert a user with a referral code
    const insertUserWithReferralCode = useCallback(async (userId: string) => {
        const shareCode = Math.random().toString(36).substr(2, 6).toUpperCase(); // Generates a 6-char alphanumeric code
        const { data, error } = await supabase
            .from('users')
            .insert([{ user_id: userId, share_code: shareCode }]);

        if (error) {
            throw new Error(`insertUserWithReferralCode: ${error.message}`);
        }

        return data;
    }, [authUserId]);

    // Sign up function
    const signUpWithEmail = useCallback(async (email: string, password: string, callback: () => void) => {
        try {
            // complete all of this
            setAuthReady(false);
            const { data: { session }, error } = await supabase.auth.signUp({ email, password });

            if (error || !session?.user.id) {
                throw new Error(error?.message || 'Sign up failed');
            }

            try {
                await insertUserWithReferralCode(session.user.id);
            } catch (error) {
                throw new Error(`Sign up Insert User: ${error.message}`);
            }

            try {
                await fetchAndSetUserProfile(session?.user?.id);
            } catch (error) {
                throw new Error(`fetchAndSetUserProfile: ${error.message}`);
            }

            setAuthReady(true);
            setSession(session);

            // for navigation
            callback();
        } catch (error) {
            Alert.alert(`Sign up: ${error.message}`);
        }
    }, [insertUserWithReferralCode, authUserId, fetchUserProfile]);

    // Sign in function
    const signInWithEmail = useCallback(async (email: string, password: string, callback: () => void) => {
        try {
            const { data: { session }, error } = await supabase.auth.signInWithPassword({ email, password });

            if (!session?.user?.id) {
                throw new Error('Sign in failed: no userID');
            }

            if (error) {
                throw new Error(`Sign in error: ${error.message}`);
            }

            await fetchAndSetUserProfile(session?.user?.id);

            setSession(session);
            callback();
        } catch (error) {
            Alert.alert(`Sign in: ${error.message}`);
        }
    }, []);

    // Sign out function
    const signOut = useCallback(async (callback: () => void) => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            Alert.alert(`Sign out: ${error.message}`);
            throw new Error(`Sign out error: ${error}`);
        }

        setSession(null);
        setUserProfile(null);

        // navigate back to home
        callback();
    }, []);

    // Fetch session and set up token refresh upon mount
    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);

            // Start auto-refreshing the token if a session exists
            supabase.auth.onAuthStateChange((_event, session) => setSession(session));

            if (session?.user?.id) {
                await fetchAndSetUserProfile(session.user.id);
            }
        };

        getSession();
    }, []);

    // Handle AppState to start/stop token refresh
    useEffect(() => {
        const appStateListener = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                supabase.auth.startAutoRefresh();
            } else {
                supabase.auth.stopAutoRefresh();
            }
        });

        return () => {
            appStateListener.remove();
        };
    }, []);

    // Set up Axios interceptor for the token
    useEffect(() => {
        if (session?.access_token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`;
            setAuthReady(true);
        } else {
            delete axios.defaults.headers.common['Authorization'];
            setAuthReady(false);
        }
    }, [session?.access_token]);

    const value = useMemo(() => ({
        userId: authUserId,
        userProfile,
        authReady,
        signInWithEmail,
        signUpWithEmail,
        signOut,
    }), [authUserId, userProfile, authReady, signInWithEmail, signUpWithEmail, signOut]);

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};
