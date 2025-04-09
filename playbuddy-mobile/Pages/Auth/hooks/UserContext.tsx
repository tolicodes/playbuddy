import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
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
import { UserProfile } from './UserTypes';
import { Session } from '@supabase/auth-js/src/lib/types';
import { useFetchUserProfile, useSkippingWelcomeScreen } from './useUserProfile';
import { DeepLink } from '../../../commonTypes';

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
    isError: boolean;

    signUpWithEmail: (email: string, password: string) => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;

    phoneSendOtp: ({ phone }: { phone: string }) => Promise<void>;
    phoneVerifyOtp: ({ phone, otp }: { phone: string, otp: string }) => Promise<void>;

    authenticateWithGoogle: () => Promise<void>;
    authenticateWithApple: () => Promise<void>;
    signOut: () => Promise<void>;

    selectedLocationAreaId?: string | null;
    selectedCommunityId?: string | null;

    initialDeepLink: DeepLink | null;

    setInitialDeepLink: (deepLink: DeepLink) => void;

    fullNameFromOAuthedUser: string | null;
    setFullNameFromOAuthedUser: (fullName: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUserContext = (): UserContextType => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUserContext must be used within an UserProvider');
    }
    return context;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(false);

    const [initialDeepLink, setInitialDeepLink] = useState<DeepLink | null>(null);

    useInitializeAuth(setSession);

    const { data: userProfile, isLoading: isLoadingUserProfile, isError: isErrorUserProfile } = useFetchUserProfile(session?.user?.id);

    useSetupTracking(session, userProfile);

    const wrapAuthFunction = <T extends (...args: any[]) => Promise<Session | null | void>>(
        authFn: T
    ): ((...args: Parameters<T>) => Promise<void>) => {
        return async (...args: Parameters<T>): Promise<void> => {
            setIsLoadingAuth(true);
            try {
                const session = await authFn(...args);
                setupAxiosHeaders(session as Session | null);

                if (session?.user.user_metadata.full_name) {
                    setFullNameFromOAuthedUser(session.user.user_metadata.full_name);
                }

                setSession(session || null);
            } finally {
                setIsLoadingAuth(false);
            }
        };
    };

    // Fetch the session on mount
    useEffect(() => {
        wrapAuthFunction(fetchSession)();
    }, []);

    const isProfileComplete = !!userProfile?.name;
    const isDefaultsComplete = !!userProfile?.selected_location_area_id && !!userProfile?.selected_community_id;

    const { isSkippingWelcomeScreen, updateSkippingWelcomeScreen } = useSkippingWelcomeScreen();

    const [fullNameFromOAuthedUser, setFullNameFromOAuthedUser] = useState<string | null>(null);

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

            isSkippingWelcomeScreen,
            updateSkippingWelcomeScreen,

            signUpWithEmail: wrapAuthFunction(signUpWithEmail),
            signInWithEmail: wrapAuthFunction(signInWithEmail),

            phoneSendOtp: wrapAuthFunction(phoneSendOtp),
            phoneVerifyOtp: wrapAuthFunction(phoneVerifyOtp),

            authenticateWithGoogle: wrapAuthFunction(authenticateWithGoogle),
            authenticateWithApple: wrapAuthFunction(authenticateWithApple),

            signOut: wrapAuthFunction(signOut),

            selectedLocationAreaId: userProfile?.selected_location_area_id,
            selectedCommunityId: userProfile?.selected_community_id,

            initialDeepLink,
            setInitialDeepLink,

            fullNameFromOAuthedUser,
            setFullNameFromOAuthedUser,
        }),
        [
            session,
            userProfile,
            isLoadingAuth,
            isLoadingUserProfile,

            isSkippingWelcomeScreen,
            updateSkippingWelcomeScreen,

            fetchSession,
            signUpWithEmail,
            signInWithEmail,
            phoneSendOtp,
            phoneVerifyOtp,
            authenticateWithGoogle,
            authenticateWithApple,
            signOut,

            initialDeepLink,
            setInitialDeepLink,

            fullNameFromOAuthedUser,
            setFullNameFromOAuthedUser,
        ]
    );

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
