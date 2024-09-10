import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert, AppState } from 'react-native';
import { supabase } from '../supabaseClient';
import axios from 'axios';

// Define the shape of the UserContext state
interface UserContextType {
    userId: string | null;
    userProfile: any;

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
    const [userProfile, setUserProfile] = useState<any>(null);
    const [authReady, setAuthReady] = useState(false);

    const user = session?.user || null;
    const userId = user?.id || null;

    // Fetch user profile from custom `users` table
    // TODO: convert to API call
    const fetchUserProfile = async (authUserId: string) => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', authUserId)
            .single();

        if (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
        return data;
    };

    // Sign up and sign in operations
    const signUpWithEmail = async (email: string, password: string, callback: () => void) => {
        const { data: { session }, error } = await supabase.auth.signUp({ email, password });

        if (!session?.user.id || error) {
            Alert.alert(`Sign up: ${error?.message}`);
        } else {
            await insertUserWithReferralCode(session?.user.id);

            setSession(session);
            callback();
        }
    };

    const signInWithEmail = async (email: string, password: string, callback: () => void) => {
        const { data: { session }, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            Alert.alert(`Sign in: ${error.message}`);
        } else {
            setSession(session);
            callback();
        }
    };

    const signOut = async (callback: () => void) => {
        supabase.auth.signOut();
        setSession(null);
        callback();
    }

    const generateReferralCode = () => {
        return Math.random().toString(36).substr(2, 6).toUpperCase(); // Generates a 6-char alphanumeric code
    };

    const insertUserWithReferralCode = async (userId: string) => {
        const shareCode = generateReferralCode();
        const { data, error } = await supabase
            .from('users')
            .insert([{ user_id: userId, share_code: shareCode }]);

        if (error) {
            console.error('Error inserting user:', error);
        } else {
            return data;
        }
        return data;
    };

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
            setUserProfile({
                ...profile,
                email: user?.email,
            });
        });
    }, [userId]);

    // Set up Axios interceptor for the token
    useEffect(() => {
        if (session?.access_token) {
            axios.defaults.headers.common["Authorization"] = `Bearer ${session?.access_token}`;
            setAuthReady(true);
        } else {
            // Optionally clear the Authorization header if the session is null
            delete axios.defaults.headers.common["Authorization"];
            setAuthReady(false);
        }
    }, [session?.access_token]);

    return (
        <UserContext.Provider value={{
            userId,
            userProfile,
            authReady,
            signInWithEmail,
            signUpWithEmail,
            signOut,
        }}>
            {children}
        </UserContext.Provider>
    );
};
