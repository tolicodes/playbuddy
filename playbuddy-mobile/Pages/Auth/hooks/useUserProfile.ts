import axios from 'axios';
import { API_BASE_URL } from '../../../config';
import { v4 as uuidv4 } from 'uuid';
import 'react-native-get-random-values';
import { supabase } from '../../../supabaseClient';
import { UserProfile } from './UserTypes';
import { useOptimisticMutation } from '../../../Common/hooks/useOptimisticMutation';
import { useQuery } from '@tanstack/react-query';

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
            } catch (error) {
                throw new Error(`Error fetching user profile ${error.message}`);
            }
        },
    });
};

// Updated useUpdateAvatar with proper types
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

            return (await axios.put<UserProfile>(`${API_BASE_URL}/profile/me/update-avatar`, { avatarUrl: data.publicUrl })).data;
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

export const useUpdateAvatar = (authUserId: string) => {
    return useOptimisticMutation<UserProfile, UserProfile, { avatarUrl: string }, Error>({
        mutationFn: async ({ avatarUrl }: { avatarUrl: string }) => {
            return (await axios.put<UserProfile>(`${API_BASE_URL}/profile/me/update-avatar`, { avatarUrl })).data;
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

export const useInsertUserProfile = (authUserId: string) => {
    return useOptimisticMutation<UserProfile, UserProfile, { name: string }, Error>({
        mutationFn: async ({ name }: { name: string }) => {
            return (await axios.post<UserProfile>(`${API_BASE_URL}/profile/me`, { name })).data;
        },
        queryKey: ['userProfile', authUserId],
        onMutateFn: (old: UserProfile | undefined, { name }: { name: string }) => {
            if (!old) return;

            return {
                ...old,
                name,
            };
        }
    });
}

export const useUpdateUserProfile = (authUserId: string) => {
    return useOptimisticMutation<UserProfile, UserProfile, { name: string, avatar_url?: string }, Error>({
        mutationFn: async ({ name, avatar_url }: { name: string, avatar_url?: string }) => {
            return (await axios.put<UserProfile>(`${API_BASE_URL}/profile/me`, { name, avatar_url })).data;
        },
        queryKey: ['userProfile', authUserId],
        onMutateFn: (old: UserProfile | undefined, { name, avatar_url }: { name: string, avatar_url?: string }) => {
            if (!old) return;

            return {
                ...old,
                name,
                avatar_url,
            };
        }
    });
}   