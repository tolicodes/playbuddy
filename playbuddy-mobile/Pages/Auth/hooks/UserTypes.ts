export interface UserProfile {
    // actually auth_user_id
    auth_user_id: string;
    share_code: string;
    email?: string;
    name?: string
    avatar_url?: string;

    selected_location_area_id?: string | null;
    selected_community_id?: string | null;
}

export type SignUpParams = {
    email: string,
    password: string,
    name: string,
    callback: () => void
    type: 'email' | 'phone' | 'google'
}

export type SignInParams = {
    email: string,
    password: string,
    callback: () => void
    type: 'email' | 'phone' | 'google'
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
    phoneSendOtp: (params: { phone: string }) => void;
    phoneVerifyOtp: (params: { phone: string, otp: string }) => void;
    authWithGoogle: () => void;
    authReady: boolean;
    isLoadingUserProfile: boolean;
}
