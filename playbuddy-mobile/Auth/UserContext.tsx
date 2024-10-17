import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    ReactNode,
    useMemo,
} from 'react';
import { useFetchUserProfile } from './useUserProfile';
import { onFetchUserProfile, onInitializeAuth, onPendingCallback, runAuthFlow, signOut as signOutUtil } from './useUserUtils';
import { Session } from '@supabase/auth-js/src/lib/types'

// Define the shape of the UserContext state
export interface UserProfile {
    // actually auth_user_id
    auth_user_id: string;
    share_code: string;
    email?: string;
    name?: string
    avatar_url?: string;
}

export type SignUpParams = {
    email: string,
    password: string,
    name: string,
    callback: () => void
}

export type SignInParams = {
    email: string,
    password: string,
    callback: () => void
}

export interface UserContextType {
    // user table
    // We don't use it
    // userId: string | null;
    // auth table
    authUserId: string | null;
    userProfile: UserProfile | null;
    signInWithEmail: (params: SignInParams) => void;
    signUpWithEmail: (params: SignUpParams) => void;
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
    const [authReady, setAuthReady] = useState(true);
    const [session, setSession] = useState<Session | null>(null);

    // Fetch user profile. It will continue the flow later, depends on session being present
    const { data: userProfile } = useFetchUserProfile(session);

    // Setup listeners
    onInitializeAuth({ setAuthReady, setSession });
    onFetchUserProfile({ userProfile, session, setAuthReady });
    const { setPendingCallback } = onPendingCallback({ authReady });

    // Authentication functions
    const signInWithEmail = useCallback(({ email, password, callback }: SignInParams) => {
        runAuthFlow({
            flowType: 'signIn',
            email,
            password,
            callback,
            setAuthReady,
            setSession,
            setPendingCallback
        });
    }, []);

    const signUpWithEmail = useCallback(({ email, password, name, callback }: SignUpParams) => {
        runAuthFlow({
            flowType: 'signUp',
            email,
            password,
            name,
            callback,
            setAuthReady,
            setSession,
            setPendingCallback,
        });
    }, []);

    const signOut = useCallback((callback: () => void) => {
        signOutUtil({ setAuthReady, setSession, callback });
    }, []);

    const value = useMemo(
        () => ({
            authUserId: userProfile?.auth_user_id || null,
            // We don't use it
            // userId: userProfile?.id || null,
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
