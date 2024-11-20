import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    ReactNode,
    useMemo,
} from 'react';
import { useFetchUserProfile, useInsertUserProfile } from './useUserProfile';
import { onInitializeAuth, onPendingCallback, runAuthFlow, signOut as signOutUtil, useOnSessionReady, useSetupAmplitude } from './useUserUtils';
import { Session } from '@supabase/auth-js/src/lib/types'
import { UserContextType, SignInParams, SignUpParams } from './UserTypes';

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
    // only fetch if auth is ready
    const { data: userProfile, isLoading: isLoadingUserProfile } = useFetchUserProfile(authReady ? session?.user.id : undefined);

    const insertUserProfile = useInsertUserProfile();

    // Setup listeners
    onInitializeAuth({ setAuthReady, setSession });

    useSetupAmplitude(session, userProfile);

    useOnSessionReady(session, setAuthReady);

    // when auth is ready we run the callback
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
            setPendingCallback,
        });
    }, [setPendingCallback]);

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
            insertUserProfile,
        });
    }, [setPendingCallback, insertUserProfile]);

    const signOut = useCallback((callback: () => void) => {
        signOutUtil({ setAuthReady, setSession, callback });
    }, []);

    const authUserId = useMemo(() => session?.user.id || null, [session]);

    const value = useMemo(
        () => ({
            authUserId,
            userProfile,
            authReady,
            signInWithEmail,
            signUpWithEmail,
            signOut,
            isLoadingUserProfile,
        }),
        [authUserId, userProfile, authReady, signInWithEmail, signUpWithEmail, signOut, isLoadingUserProfile]
    );

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
