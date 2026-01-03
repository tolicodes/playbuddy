import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    signOut,
    phoneSendOtp,
    phoneVerifyOtp,
    authenticateWithGoogle,
    authenticateWithApple,
    useInitializeAuth,
    signUpWithEmail,
    signInWithEmail,
    useSetupTracking,
    fetchSession,
    setupAxiosHeaders,
} from './authUtils';
import type { UserProfile } from './UserTypes';
import type { Session } from '@supabase/supabase-js';
import { useFetchUserProfile, useSkippingWelcomeScreen } from './useUserProfile';
import type { DeepLink } from '../../../commonTypes';

interface UserContextType {
    authUserId: string | null;
    userProfile?: UserProfile | null;
    session: Session | null;
    isProfileComplete: boolean;
    isDefaultsComplete: boolean;

    isSkippingWelcomeScreen: boolean;
    updateSkippingWelcomeScreen: (value: boolean) => void;

    isLoading: boolean;
    isLoadingAuth: boolean;
    isLoadingUserProfile: boolean;
    hasFetchedSession: boolean;
    isError: boolean;

    signUpWithEmail: (email: string, password: string) => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;

    phoneSendOtp: ({ phone }: { phone: string }) => Promise<void>;
    phoneVerifyOtp: ({ phone, otp }: { phone: string; otp: string }) => Promise<void>;

    authenticateWithGoogle: () => Promise<void>;
    authenticateWithApple: () => Promise<void>;
    signOut: () => Promise<void>;

    selectedLocationAreaId?: string | null;
    selectedCommunityId?: string | null;

    currentDeepLink: DeepLink | null;
    setCurrentDeepLink: (deepLink: DeepLink) => void;

    fullNameFromOAuthedUser: string | null;
    setFullNameFromOAuthedUser: (fullName: string) => void;

    analyticsProps: {
        auth_user_id: string | null;
        deep_link_id?: string | null;
    };
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUserContext = (): UserContextType => {
    const context = useContext(UserContext);
    if (!context) throw new Error('useUserContext must be used within an UserProvider');
    return context;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(false);
    const [hasFetchedSession, setHasFetchedSession] = useState(false);
    const [currentDeepLink, setCurrentDeepLink] = useState<DeepLink | null>(null);
    const [fullNameFromOAuthedUser, setFullNameFromOAuthedUser] = useState<string | null>(null);

    // Initializes auth listeners (should also sync Axios defaults inside this, per your updated authUtils)
    useInitializeAuth(setSession);

    // Pull initial session on mount
    useEffect(() => {
        (async () => {
            setIsLoadingAuth(true);
            try {
                const s = await fetchSession();
                if (s) setupAxiosHeaders(s);
                setSession(s ?? null);
            } finally {
                setIsLoadingAuth(false);
                setHasFetchedSession(true);
            }
        })();
    }, []);

    // Keep axios header synced if session changes via listener/refresh
    useEffect(() => {
        setupAxiosHeaders(session);
    }, [session]);

    // Profile + analytics
    const { data: userProfile, isLoading: isLoadingUserProfile, isError: isErrorUserProfile } =
        useFetchUserProfile(session?.user?.id);
    useSetupTracking(session, userProfile);

    // OTP/send-only shouldn’t clear session; wrapper only updates when a session is returned
    const wrapAuthFunction =
        <T extends (...args: any[]) => Promise<Session | null | void>>(authFn: T) =>
            async (...args: Parameters<T>): Promise<void> => {
                setIsLoadingAuth(true);
                try {
                    const result = await authFn(...args);
                    // Only update session/headers when the auth fn *returns* a session (e.g., sign-in/verify OTP)
                    if (result !== undefined) {
                        const newSession = (result as Session | null) ?? null;
                        setupAxiosHeaders(newSession);
                        if (newSession?.user?.user_metadata?.full_name) {
                            setFullNameFromOAuthedUser(newSession.user.user_metadata.full_name);
                        }
                        setSession(newSession);
                    }
                } finally {
                    setIsLoadingAuth(false);
                }
            };

    const isProfileComplete = !!userProfile?.name;
    const isDefaultsComplete =
        !!userProfile?.selected_location_area_id && !!userProfile?.selected_community_id;

    const { isSkippingWelcomeScreen, updateSkippingWelcomeScreen } = useSkippingWelcomeScreen();
    const prevSessionRef = useRef<Session | null>(null);

    useEffect(() => {
        if (prevSessionRef.current && !session) {
            updateSkippingWelcomeScreen(false);
        }
        prevSessionRef.current = session;
    }, [session, updateSkippingWelcomeScreen]);

    const analyticsProps = {
        auth_user_id: session?.user?.id || null,
        deep_link_id: currentDeepLink?.id ?? null,
    };

    const value = useMemo(
        () => ({
            authUserId: session?.user?.id || null,
            userProfile,
            session,
            isProfileComplete,
            isDefaultsComplete,

            isError: isErrorUserProfile,
            isLoading: isLoadingAuth || isLoadingUserProfile,
            isLoadingAuth,
            isLoadingUserProfile,
            hasFetchedSession,

            isSkippingWelcomeScreen,
            updateSkippingWelcomeScreen,

            signUpWithEmail: wrapAuthFunction(signUpWithEmail),
            signInWithEmail: wrapAuthFunction(signInWithEmail),

            phoneSendOtp: wrapAuthFunction(phoneSendOtp), // returns void → wrapper won’t clear session
            phoneVerifyOtp: wrapAuthFunction(phoneVerifyOtp), // returns Session

            authenticateWithGoogle: wrapAuthFunction(authenticateWithGoogle),
            authenticateWithApple: wrapAuthFunction(authenticateWithApple),

            signOut: wrapAuthFunction(signOut), // make sure authUtils uses { scope: 'local' } on mobile

            selectedLocationAreaId: userProfile?.selected_location_area_id,
            selectedCommunityId: userProfile?.selected_community_id,

            currentDeepLink,
            setCurrentDeepLink,

            fullNameFromOAuthedUser,
            setFullNameFromOAuthedUser,

            analyticsProps,
        }),
        [
            session,
            userProfile,
            isLoadingAuth,
            isLoadingUserProfile,
            hasFetchedSession,
            isErrorUserProfile,
            isSkippingWelcomeScreen,
            updateSkippingWelcomeScreen,
            currentDeepLink,
            fullNameFromOAuthedUser,
        ]
    );

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
