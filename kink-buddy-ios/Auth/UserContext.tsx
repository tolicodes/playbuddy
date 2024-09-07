import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabaseCiient'; // Adjust this to the correct path
import { Alert, AppState } from 'react-native';

// Define the shape of the UserContext state
interface UserContextType {
    user: any; // This will hold the entire user object from Supabase, including shareCode and custom fields
    userId: string | null;
    loading: boolean;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string) => Promise<void>;
    setUserId: (id: string | null) => Promise<void>;
}

// Create the context with a default value
const UserContext = createContext<UserContextType | undefined>(undefined);

// Custom hook to use the UserContext
export const useUserContext = (): UserContextType => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUserContext must be used within a UserProvider');
    }
    return context;
};

// AsyncStorage key constants
const USER_ID_STORAGE_KEY = '@userId';

// Provider component
export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any>(null); // Holds the current user from Supabase, including shareCode and custom fields
    const [userId, setUserIdState] = useState<string | null>(null);
    const [loading, setLoading] = useState(false); // Track loading state for user fetch

    // Load userId from AsyncStorage on initial render
    useEffect(() => {
        const loadUserId = async () => {
            try {
                const storedUserId = await AsyncStorage.getItem(USER_ID_STORAGE_KEY);
                if (storedUserId) {
                    setUserIdState(storedUserId);
                }
            } catch (error) {
                console.error('Failed to load userId from AsyncStorage:', error);
            }
        };
        loadUserId();
    }, []);

    // Function to set the userId in both state and AsyncStorage
    const setUserId = async (id: string | null) => {
        try {
            if (id) {
                await AsyncStorage.setItem(USER_ID_STORAGE_KEY, id);
            } else {
                await AsyncStorage.removeItem(USER_ID_STORAGE_KEY);
            }
            setUserIdState(id);
        } catch (error) {
            console.error('Failed to save userId to AsyncStorage:', error);
        }
    };

    // Function to fetch user profile from custom `users` table
    const fetchUserProfile = async (authUserId: string) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('user_id', authUserId)
                .single(); // Fetch single user

            if (error) {
                console.error('Error fetching user profile from users table:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
    };

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
    };

    // Handle sign-up operation
    const signUpWithEmail = async (email: string, password: string) => {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) {
            Alert.alert(`Sign up: ${error.message}`);
        } else if (!session) {
            Alert.alert('Please check your inbox for email verification!');
        } else if (session) {
            await insertUserWithReferralCode(session.user.id);
            const userProfile = await fetchUserProfile(session.user.id);
            setUser({ ...session.user, ...userProfile });
            setUserId(session.user.id);
        }
        setLoading(false);
    };

    // Handle sign-in operation
    const signInWithEmail = async (email: string, password: string) => {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            Alert.alert(`Sign in: ${error.message}`);
        } else if (session) {
            const userProfile = await fetchUserProfile(session.user.id);
            setUser({ ...session.user, ...userProfile });
            setUserId(session.user.id);
        }
        setLoading(false);
    };

    // Effect to fetch the current user from Supabase and handle auth state changes
    useEffect(() => {
        // we only want to fetch if we aren't in the process of an operation
        if (loading) return;

        const fetchCurrentUser = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) {
                console.error('Error fetching current user:', error);
                setUser(null);
            } else if (session) {
                const userProfile = await fetchUserProfile(session.user.id);
                setUser({ ...session.user, ...userProfile });
                setUserId(session.user.id);
            } else {
                setUser(null);
                setUserId(null);
            }
            setLoading(false);
        };

        fetchCurrentUser();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session) {
                const userProfile = await fetchUserProfile(session.user.id);
                setUser({ ...session.user, ...userProfile });
                setUserId(session.user.id);
            } else {
                setUser(null);
                setUserId(null);
            }
        });

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, [loading]);

    // Listen for AppState changes to start and stop token refresh
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

    return (
        <UserContext.Provider value={{ user, userId, loading, signInWithEmail, signUpWithEmail, setUserId }}>
            {/* {!loading && children} */}
            {children}
        </UserContext.Provider>
    );
};
