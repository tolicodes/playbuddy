import { supabase } from '../../../supabaseClient';
import { Session } from '@supabase/auth-js/src/lib/types';
import axios from 'axios';
import * as amplitude from '@amplitude/analytics-react-native';
import { setUxCamUserIdentity } from '../../../Common/hooks/uxCam';

import { Alert } from 'react-native';
import { Dispatch, SetStateAction, useEffect } from 'react';

import { AppState } from 'react-native';
import { UserProfile } from './UserTypes';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { AuthError } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication'


GoogleSignin.configure({
    iosClientId: '929140353915-9pd1soj5ugifbg0ftb28ejc3jaggq0bv.apps.googleusercontent.com',
    webClientId: '929140353915-gv3am3vcpu0ckb37mlu5msieqv2jv74a.apps.googleusercontent.com',
    scopes: ['openid', 'email', 'profile'],
});

const handleAuthError = (error: AuthError | null, action: string): never => {
    console.error(`Error during ${action}:`, error);
    Alert.alert(`Error: ${action}`, error?.message || 'Something went wrong.');
    throw new Error(error?.message || `Failed to ${action}`);
};

// EMAIL AUTH

export const signUpWithEmail = async (email: string, password: string): Promise<Session | null> => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.session) handleAuthError(error, 'sign up');
    return data.session || null;
};

export const signInWithEmail = async (email: string, password: string): Promise<Session | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) handleAuthError(error, 'sign in');
    return data.session || null;
};


// PHONE AUTH
export const phoneSendOtp = async ({ phone }: { phone: string }): Promise<void> => {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) handleAuthError(error, 'send phone OTP');
};

export const phoneVerifyOtp = async ({ phone, otp }: { phone: string, otp: string }): Promise<Session | null> => {
    const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms',
    });
    if (error || !data.session) handleAuthError(error, 'verify phone OTP');
    return data.session || null;
};


// GOOGLE AUTH
export const authenticateWithGoogle = async (): Promise<Session | null> => {
    try {
        await GoogleSignin.hasPlayServices()
        const userInfo = await GoogleSignin.signIn();

        if (!userInfo?.data?.idToken) {
            handleAuthError(null, 'Google authentication - no idToken');
            return null;
        }

        const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: userInfo.data.idToken,
        })

        if (error || !data.session) handleAuthError(error, 'Google authentication');
        return data.session || null;
    } catch (error: any) {
        handleAuthError(error, 'Google authentication');
        return null;
    }
};

export const authenticateWithApple = async (): Promise<Session | null> => {
    try {
        const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
        })
        // Sign in via Supabase Auth.
        if (!credential.identityToken) {
            handleAuthError(null, 'Apple authentication - no identityToken');
            return null;
        }

        const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'apple',
            token: credential.identityToken,
        })


        if (error || !data.session) handleAuthError(error, 'Apple authentication');

        return data.session || null;
    } catch (error: any) {
        handleAuthError(error, 'Apple authentication');
        return null;
    }
}

// SIGN OUT
export const signOut = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) handleAuthError(error, 'sign out');
};

// Other

export const fetchSession = async (): Promise<Session | null> => {
    const { data, error } = await supabase.auth.getSession();
    if (error) handleAuthError(error, 'fetch session');
    return data.session || null;
};

// HOOKS

// Initialize Auth State
// Check for invalid auth state and log out
// Auto refresh if the app goes into the foreground
export const useInitializeAuth = (setSession: Dispatch<SetStateAction<Session | null>>) => {
    useEffect(() => {
        /// Auto refresh if the app goes into the foreground
        const appStateListener = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                supabase.auth.startAutoRefresh();
            } else {
                supabase.auth.stopAutoRefresh();
            }
        });

        // Check for invalid auth state and log out
        const authStateListener = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!session?.user?.id) {
                setSession(null);
            }
        });

        return () => {
            appStateListener.remove();
            authStateListener?.data?.subscription?.unsubscribe();
        };
    }, []);
}

export const setupAxiosHeaders = (session: Session | null): void => {
    const token = session?.access_token;
    if (token) {
        // for debugging
        console.log('token', session?.access_token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete axios.defaults.headers.common['Authorization'];
    }
};

export const useSetupTracking = (session?: Session | null, userProfile?: UserProfile | null) => {
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