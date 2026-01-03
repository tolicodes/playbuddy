import axios from 'axios';
import { API_BASE_URL } from '../../../config';
import { v4 as uuidv4 } from 'uuid';
import 'react-native-get-random-values';
import { supabase } from '../../../supabaseClient';
import { UserProfile } from './UserTypes';
import { useOptimisticMutation } from '../../../Common/hooks/useOptimisticMutation';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

// We have to manually pass authUserId to avoid circular dependency
// we need authUserId to check if user is logged in and not fetch otherwise
export const useFetchUserProfile = (authUserId?: string) => {
    return useQuery<UserProfile>({
        queryKey: ['userProfile', authUserId],
        queryFn: async () => {
            // unset the user profile if we log out
            if (!authUserId) return null;
            try {
                const { data } = await axios.get(`${API_BASE_URL}/profile/me`)
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

            return (await axios.put<UserProfile>(`${API_BASE_URL}/profile/me`, { avatar_url: data.publicUrl })).data;
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
            return (await axios.put<UserProfile>(`${API_BASE_URL}/profile/me`, updateFields)).data;
        },
        queryKey: ['userProfile', authUserId],
        onMutateFn: (old: UserProfile | undefined, updateFields: Partial<UserProfile>) => {
            if (!old) return;

            return {
                ...old,
                ...updateFields,
            };
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
