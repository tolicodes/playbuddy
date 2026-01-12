import axios from 'axios';
import { API_BASE_URL } from '../../../config';
import { v4 as uuidv4 } from 'uuid';
import 'react-native-get-random-values';
import { supabase } from '../../../supabaseClient';
import { UserProfile } from './UserTypes';
import { useOptimisticMutation } from '../../../Common/hooks/useOptimisticMutation';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

const getAuthHeader = async (): Promise<Record<string, string>> => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// We have to manually pass authUserId to avoid circular dependency
// we need authUserId to check if user is logged in and not fetch otherwise
export const useFetchUserProfile = (authUserId?: string) => {
    return useQuery<UserProfile>({
        queryKey: ['userProfile', authUserId],
        queryFn: async () => {
            // unset the user profile if we log out
            if (!authUserId) return null;
            try {
                const headers = await getAuthHeader();
                const { data } = await axios.get(`${API_BASE_URL}/profile/me`, { headers })
                return data;
            } catch (error: any) {
                throw new Error(`Error fetching user profile ${error.message}`);
            }
        },
    });
};

export const useUploadAvatar = (authUserId: string) => {
    return useOptimisticMutation<UserProfile, UserProfile, { avatarUrl: string }, Error>({
        mutationFn: async ({ avatarUrl }: { avatarUrl: string }) => {
            if (!avatarUrl) throw new Error('No avatar URL provided');

            const response = await fetch(avatarUrl);
            const blob = await response.blob();
            const arrayBuffer = await new Response(blob).arrayBuffer();
            const randomUUID = uuidv4();

            const fileName = `public/${randomUUID}.jpg`;

            // Upload the image to Supabase Storage
            const { error } = await supabase.storage
                .from('avatars')
                .upload(fileName, arrayBuffer, { contentType: blob.type });

            if (error) {
                throw error;
            }

            const { data } = await supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            const headers = await getAuthHeader();
            return (await axios.put<UserProfile>(
                `${API_BASE_URL}/profile/me`,
                { avatar_url: data.publicUrl },
                { headers }
            )).data;
        },
        queryKey: ['userProfile', authUserId],
        onMutateFn: (old: UserProfile | undefined, { avatarUrl }: { avatarUrl: string }) => {
            if (!old) return;

            return {
                ...old,
                avatar_url: avatarUrl,
            };
        }
    });
};

export const useUpdateUserProfile = (authUserId: string) => {
    return useOptimisticMutation<UserProfile, UserProfile, Partial<UserProfile>, Error>({
        mutationFn: async (updateFields: Partial<UserProfile>) => {
            const headers = await getAuthHeader();
            return (await axios.put<UserProfile>(
                `${API_BASE_URL}/profile/me`,
                updateFields,
                { headers }
            )).data;
        },
        queryKey: ['userProfile', authUserId],
        onMutateFn: (old: UserProfile | undefined, updateFields: Partial<UserProfile>) => {
            if (!old) return;

            const hasNameUpdate = Object.prototype.hasOwnProperty.call(updateFields, 'name');
            const updatedProfile = {
                ...old,
                ...updateFields,
            };

            if (hasNameUpdate) {
                updatedProfile.name = old.name;
            }

            return updatedProfile;
        }
    });
}


export const useSkippingWelcomeScreen = () => {
    const [isSkippingWelcomeScreen, setIsSkippingWelcomeScreen] = useState<boolean>(false);

    const updateSkippingWelcomeScreen = (value: boolean) => {
        setIsSkippingWelcomeScreen(value);
    };

    return { isSkippingWelcomeScreen, updateSkippingWelcomeScreen };
}
