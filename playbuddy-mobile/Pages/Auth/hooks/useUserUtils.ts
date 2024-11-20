import { useEffect, useState } from 'react';
import axios from 'axios';
import * as amplitude from '@amplitude/analytics-react-native';
import { AppState, Alert } from 'react-native';
import { supabase } from '../../../supabaseClient';
import { Session } from '@supabase/auth-js/src/lib/types'
import { UserProfile } from '../../contexts/UserTypes';
import { UseMutationResult } from '@tanstack/react-query';

import { setUxCamUserIdentity } from '../../../Common/hooks/uxCam';


export const useSetupAmplitude = (session?: Session | null, userProfile?: UserProfile | null) => {
    useEffect(() => {
        if (!session || !userProfile) return;

        amplitude.setUserId(session.user.id);
        const identifyEvent = new amplitude.Identify();
        if (userProfile?.email) {
            identifyEvent.set('email', userProfile.email);
        }
        amplitude.identify(identifyEvent);

        if (userProfile.email) {
            setUxCamUserIdentity(userProfile.email, userProfile.name || '')
        }
    }, [session, userProfile]);
};

const setupAxios = (session: Session | null) => {
    console.log('token', session?.access_token);
    // for debugging
    axios.interceptors.response.use((response) => {
        return response;
    });

    // Axios setup
    if (session?.access_token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`;
    } else {
        delete axios.defaults.headers.common['Authorization'];
    }
}

export const useOnSessionReady = (session: Session | null, setAuthReady: (authReady: boolean) => void) => {
    useEffect(() => {
        if (!session) return;

        setAuthReady(true);
    }, [session, setAuthReady]);
}

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
                setupAxios(null)
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
            const { data } = await supabase.auth.getSession();

            if (data.session) {
                setupAxios(data.session);
                setSession(data.session)
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
// Allow to set a pending callback, and when auth is ready we run the callback  
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
    insertUserProfile,
}: {
    flowType: 'signUp' | 'signIn';
    email: string;
    password: string;
    name?: string;
    callback: () => void;
    setAuthReady: (authReady: boolean) => void;
    setSession: (session: Session) => void;
    setPendingCallback: (callback: (() => void) | null) => void;
    insertUserProfile?: UseMutationResult<UserProfile>,
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

        setupAxios(session);

        if (isSignUp && data?.user?.id && name) {
            await insertUserProfile?.mutateAsync({ name });
        }

        // we want the session to be set after the profile is inserted
        setSession(session);
        amplitude.logEvent(isSignUp ? 'sign_up' : 'sign_in', { email });
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
        setAuthReady(true);

        // call the callback immediately
        callback();
    } catch (error) {
        Alert.alert(`Error Signing Out: ${error.message}`);
        setAuthReady(true);
    }
};
