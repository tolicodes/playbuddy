import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
    useMemo,
} from 'react';
import { Alert, AppState } from 'react-native';
import { supabase } from '../supabaseClient';
import axios from 'axios';
import * as amplitude from '@amplitude/analytics-react-native';
import {
    fetchUserProfile as fetchUserProfileUtil,
    insertUserWithReferralCode as insertUserWithReferralCodeUtil,
} from './auth_utils';

// Define the shape of the UserContext state
interface UserProfile {
    user_id: string;
    share_code: string;
    email?: string;
}

interface UserContextType {
    userId: string | null;
    userProfile: UserProfile | null;
    signInWithEmail: (
        email: string,
        password: string,
        callback: () => void
    ) => Promise<void>;
    signUpWithEmail: (
        email: string,
        password: string,
        callback: () => void
    ) => Promise<void>;
    signOut: (callback: () => void) => Promise<void>;
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
    // State variables
    const [authReady, setAuthReady] = useState(true);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

    // Helper functions for authentication flows
    const setupAxiosAccessTokenInterceptor = useCallback((token: string) => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }, []);

    const setAmplitudeIdentify = useCallback((authUserId: string, userProfile: UserProfile) => {
        amplitude.setUserId(authUserId);
        const identifyEvent = new amplitude.Identify();

        if (userProfile.email) {
            identifyEvent.set('email', userProfile.email);
        }

        amplitude.identify(identifyEvent);
    }, []);

    const fetchAndSetUserProfile = useCallback(
        async (session: any) => {
            if (!session?.user?.id) {
                throw new Error('fetchAndSetUserProfile requires a valid user session');
            }

            const profile = await fetchUserProfileUtil(session.user.id);
            if (!profile) {
                throw new Error('User profile not found');
            }
            const updatedProfile = {
                // copy from session
                user_id: session.user.id,
                email: session.user.email,
                // copy from user table
                share_code: profile.share_code,
            };
            setUserProfile(updatedProfile);
            return updatedProfile;
        },
        []
    );

    // Abstracted authentication flow
    const runAuthFlow = useCallback(
        async ({
            email,
            password,
            callback,
            flowType,
        }: {
            email: string;
            password: string;
            callback: () => void;
            flowType: 'signUp' | 'signIn';
        }) => {
            try {
                // Step 1: Set authReady to false
                setAuthReady(false);

                // Step 2: Perform Supabase authentication
                let session;
                if (flowType === 'signUp') {
                    const { data, error } = await supabase.auth.signUp({ email, password });
                    if (error || !data.session) {
                        throw new Error(error?.message || 'Sign up failed');
                    }
                    session = data.session;
                    await insertUserWithReferralCodeUtil(session.user.id);
                } else {
                    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                    if (error || !data.session) {
                        throw new Error(error?.message || 'Sign in failed');
                    }
                    session = data.session;
                }

                if (!session) {
                    throw new Error('No session returned from Supabase');
                }

                // Step 3: Fetch user profile
                const userProfile = await fetchAndSetUserProfile(session);

                // Step 4: Set Axios interceptor
                setupAxiosAccessTokenInterceptor(session.access_token);

                // Step 5: Identify user in Amplitude
                setAmplitudeIdentify(session.user.id, userProfile);

                // Step 6: Log event in Amplitude
                amplitude.logEvent(flowType === 'signUp' ? 'sign_up' : 'sign_in', { email });

                // Step 7: Set authReady to true
                setAuthReady(true);

                // Step 8: Store the callback to be called after authReady is true
                setPendingCallback(() => callback);
            } catch (error) {
                // Consistent error handling
                const errorMessage = `Error ${flowType === 'signUp' ? 'Signing Up' : 'Signing In'}: ${error.message}`;
                Alert.alert(errorMessage);
                throw new Error(errorMessage);
            }
        },
        [fetchAndSetUserProfile, setupAxiosAccessTokenInterceptor, setAmplitudeIdentify]
    );

    // Sign up function
    const signUpWithEmail = useCallback(
        async (email: string, password: string, callback: () => void) => {
            await runAuthFlow({
                email,
                password,
                callback,
                flowType: 'signUp',
            });
        },
        [runAuthFlow]
    );

    // Sign in function
    const signInWithEmail = useCallback(
        async (email: string, password: string, callback: () => void) => {
            await runAuthFlow({
                email,
                password,
                callback,
                flowType: 'signIn',
            });
        },
        [runAuthFlow]
    );

    // Sign out function
    const signOut = useCallback(
        async (callback: () => void) => {
            try {
                // Step 1: Set authReady to false
                setAuthReady(false);

                // Step 2: Sign out from Supabase
                const { error } = await supabase.auth.signOut();
                if (error) {
                    throw new Error(error.message);
                }

                // Step 3: Log sign-out event in Amplitude
                amplitude.logEvent('sign_out');

                // Step 4: Clear user profile
                setUserProfile(null);

                // Step 5: Remove Axios interceptor
                setupAxiosAccessTokenInterceptor('');

                // Step 6: Set authReady to true
                setAuthReady(true);

                // Step 7: Execute the callback immediately (no need to wait)
                callback();
            } catch (error) {
                const errorMessage = `Error Signing Out: ${error.message}`;
                Alert.alert(errorMessage);
                throw new Error(errorMessage);
            }
        },
        [setupAxiosAccessTokenInterceptor]
    );

    // Effect to execute the pending callback when authReady becomes true
    useEffect(() => {
        if (authReady && pendingCallback) {
            pendingCallback();
            setPendingCallback(null);
        }
    }, [authReady, pendingCallback]);

    // Fetch session and user profile on mount and app state change
    useEffect(() => {
        let authListener: any;

        const initializeAuth = async () => {
            // another operation is working on it
            if (authReady === false) {
                return;
            }

            try {
                setAuthReady(false);
                const {
                    data: { session },
                } = await supabase.auth.getSession();

                const authUserId = session?.user?.id;

                if (authUserId) {
                    // Fetch and set user profile
                    const userProfile = await fetchAndSetUserProfile(session);

                    // Set Axios interceptor
                    setupAxiosAccessTokenInterceptor(session.access_token);

                    // Identify user in Amplitude
                    setAmplitudeIdentify(authUserId, userProfile);

                    // Set authReady to true
                    setAuthReady(true);
                } else {
                    setAuthReady(true); // No session, but auth is ready
                }

                // This listens for the auto state including token refreshes to change
                //  Updates axios etc
                authListener = supabase.auth.onAuthStateChange(async (event, session) => {
                    // could be in the middle of signing up
                    if (!authReady) return

                    if (authUserId && session) {
                        // Fetch and set user profile
                        const userProfile = await fetchAndSetUserProfile(session);

                        // Set Axios interceptor
                        setupAxiosAccessTokenInterceptor(session.access_token);

                        // Identify user in Amplitude
                        setAmplitudeIdentify(authUserId, userProfile);

                        // Set authReady to true
                        setAuthReady(true);
                    } else {
                        // User signed out
                        setUserProfile(null);
                        setupAxiosAccessTokenInterceptor('');
                        setAuthReady(true); // Auth is ready, but no user is signed in
                    }
                });
            } catch (error) {
                throw new Error(`Error initializing auth: ${error.message}`);
            }

        };

        initializeAuth();

        // this listens for the app state to change (foreground, background, etc.)
        // it will stop the auto refresh when the app is in the background
        // and when it's back it will get the latest profile
        const appStateListener = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                initializeAuth();
                supabase.auth.startAutoRefresh();
            } else {
                supabase.auth.stopAutoRefresh();
            }
        });

        return () => {
            appStateListener.remove();
            if (authListener && authListener.data && authListener.data.subscription) {
                authListener.data.subscription.unsubscribe();
            }
        };
    }, [fetchAndSetUserProfile, setupAxiosAccessTokenInterceptor, setAmplitudeIdentify]);

    // Memoize the context value to optimize performance
    const value = useMemo(
        () => ({
            userId: userProfile?.user_id || null,
            userProfile,
            authReady,
            signInWithEmail,
            signUpWithEmail,
            signOut,
        }),
        [userProfile, authReady, signInWithEmail, signUpWithEmail, signOut]
    );

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
