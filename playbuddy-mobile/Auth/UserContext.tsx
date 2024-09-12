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
export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<any>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [authReady, setAuthReady] = useState(false);

    const user = session?.user || null;
    const userId = user?.id || null;

    // Function to fetch user profile from the custom `users` table
    const fetchUserProfile = useCallback(async (authUserId: string) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('user_id', authUserId)
                .single();

            if (error) {
                throw new Error(error.message);
            }

            return data as UserProfile;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
    }, []);

    // Function to insert a user with a referral code
    const insertUserWithReferralCode = useCallback(async (userId: string) => {
        const shareCode = Math.random().toString(36).substr(2, 6).toUpperCase(); // Generates a 6-char alphanumeric code
        const { data, error } = await supabase
            .from('users')
            .insert([{ user_id: userId, share_code: shareCode }]);

        if (error) {
            throw new Error(error.message);
        }

        return data;
    }, []);

    // Sign up function
    const signUpWithEmail = useCallback(async (email: string, password: string, callback: () => void) => {
        try {
            const { data: { session }, error } = await supabase.auth.signUp({ email, password });

            if (error || !session?.user.id) {
                throw new Error(error?.message || 'Sign up failed');
            }

            await insertUserWithReferralCode(session.user.id);
            setSession(session);
            callback();
        } catch (error) {
            Alert.alert(`Sign up: ${error.message}`);
        }
    }, [insertUserWithReferralCode]);

    // Sign in function
    const signInWithEmail = useCallback(async (email: string, password: string, callback: () => void) => {
        try {
            const { data: { session }, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                throw new Error(error.message);
            }

            setSession(session);
            callback();
        } catch (error) {
            Alert.alert(`Sign in: ${error.message}`);
        }
    }, []);

    // Sign out function
    const signOut = useCallback(async (callback: () => void) => {
        await supabase.auth.signOut();
        setSession(null);
        callback();
    }, []);

    // Fetch session and set up token refresh
    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);

            // Start auto-refreshing the token if a session exists
            supabase.auth.onAuthStateChange((_event, session) => setSession(session));
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

    // Fetch user profile when session changes
    useEffect(() => {
        if (!userId) return;

        fetchUserProfile(userId).then((profile) => {
            if (!profile) return;
            setUserProfile({
                user_id: profile.user_id,
                email: user.email,
                share_code: profile.share_code,
            });
        });
    }, [fetchUserProfile, userId]);

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
        userId,
        userProfile,
        authReady,
        signInWithEmail,
        signUpWithEmail,
        signOut,
    }), [userId, userProfile, authReady, signInWithEmail, signUpWithEmail, signOut]);

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};
