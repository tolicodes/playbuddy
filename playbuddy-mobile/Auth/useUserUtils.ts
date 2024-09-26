import { useEffect, useState } from 'react';
import axios from 'axios';
import * as amplitude from '@amplitude/analytics-react-native';
import { AppState, Alert } from 'react-native';
import { supabase } from '../supabaseClient';
import { UserProfile } from './UserContext';
import { Session } from '@supabase/auth-js/src/lib/types'
import { insertUserProfile } from './useUserProfile';


// Helper: Set up Axios Authorization and Amplitude User Identification
const setupSessionContext = (session: Session | null, userProfile: UserProfile | null) => {
    // Axios setup
    if (session?.access_token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`;
    } else {
        delete axios.defaults.headers.common['Authorization'];
    }

    // Amplitude setup
    if (session?.user?.id && userProfile) {
        amplitude.setUserId(session.user.id);
        const identifyEvent = new amplitude.Identify();
        if (userProfile?.email) {
            identifyEvent.set('email', userProfile.email);
        }
        amplitude.identify(identifyEvent);
    }
};

// Initialize Auth State Listeners
export const onInitializeAuth = (
    { setAuthReady, setSession }: {
        setAuthReady: (authReady: boolean) => void,
        setSession: (session: Session | null) => void
    }) => {
    useEffect(() => {

        // logout
        const authStateListener = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!session?.user.id) {
                setupSessionContext(null, null);
                setSession(null)
                setAuthReady(true);
            }
        });

        /// Auto refresh if the app goes into the foreground
        const appStateListener = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                supabase.auth.startAutoRefresh();
            } else {
                supabase.auth.stopAutoRefresh();
            }
        });

        // if we are already logged in
        const checkInitSession = async () => {
            const { data, error } = await supabase.auth.getSession();

            if (data.session) {
                setSession(data.session)
                setupSessionContext(data.session, null);
                setAuthReady(true);
            }
        }

        checkInitSession();

        return () => {
            appStateListener.remove();
            authStateListener?.data?.subscription?.unsubscribe();
        };
    }, []);
};

// Fetch User Profile Listener
export const onFetchUserProfile = ({
    userProfile,
    session,
    setAuthReady
}: {
    userProfile: UserProfile | null;
    session: Session | null;
    setAuthReady: (authReady: boolean) => void;
}) => {
    useEffect(() => {
        if (!userProfile || !session) return;
        setupSessionContext(session, userProfile);
        setAuthReady(true);
    }, [userProfile, session]);
};

// Pending callback listener
export const onPendingCallback = ({ authReady }: { authReady: boolean }) => {
    const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

    useEffect(() => {
        if (authReady && pendingCallback) {
            pendingCallback();
            setPendingCallback(null);
        }
    }, [authReady, pendingCallback]);

    return { setPendingCallback };
};

// Run Auth Flow (Signup/Signin)
export const runAuthFlow = async ({
    flowType,
    email,
    password,
    name,
    callback,
    setAuthReady,
    setSession,
    setPendingCallback,
}: {
    flowType: 'signUp' | 'signIn';
    email: string;
    password: string;
    name?: string;
    callback: () => void;
    setAuthReady: (authReady: boolean) => void;
    setSession: (session: Session) => void;
    setPendingCallback: (callback: (() => void) | null) => void;
}) => {
    try {
        setAuthReady(false);
        setPendingCallback(() => callback);

        const isSignUp = flowType === 'signUp';

        const { data, error } = isSignUp
            ? await supabase.auth.signUp({ email, password })
            : await supabase.auth.signInWithPassword({ email, password });

        if (error || !data.session) throw new Error(error?.message || `${flowType} failed`);

        const session = data.session;

        if (isSignUp && data?.user?.id && name) {
            await insertUserProfile({ userId: data.user.id, name });
        }

        setSession(session);
        amplitude.logEvent(isSignUp ? 'sign_up' : 'sign_in', { email });
        setupSessionContext(session, null); // Pass null for userProfile for now
    } catch (error) {
        Alert.alert(`Error ${flowType === 'signUp' ? 'Signing Up' : 'Signing In'}: ${error.message}`);
        setAuthReady(true);
    }
};

// Sign out function
export const signOut = async ({
    callback,
    setAuthReady,
    setSession,
}: {
    callback: () => void;
    setAuthReady: (authReady: boolean) => void;
    setSession: (session: Session | null) => void;
}) => {
    try {
        setAuthReady(false);
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error(error.message);

        amplitude.logEvent('sign_out');
        setSession(null);
        setupSessionContext(null, null);
        setAuthReady(true);
        callback();
    } catch (error) {
        Alert.alert(`Error Signing Out: ${error.message}`);
        setAuthReady(true);
    }
};
