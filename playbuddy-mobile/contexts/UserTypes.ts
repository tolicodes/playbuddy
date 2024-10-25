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
    // mostly from user table
    userProfile?: UserProfile | null;

    // we don't use id on user table

    // auth table
    authUserId?: string | null;
    signInWithEmail: (params: SignInParams) => void;
    signUpWithEmail: (params: SignUpParams) => void;
    signOut: (callback: () => void) => void;
    authReady: boolean;
}
