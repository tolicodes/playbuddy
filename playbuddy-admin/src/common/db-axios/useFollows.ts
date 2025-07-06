import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { FolloweeType, FollowPayload } from '../types/commonTypes';
import { API_BASE_URL } from '../config';
type FollowsResponse = Record<FolloweeType, string[]>;

export function useFetchFollows(authUserId?: string | null) {
    return useQuery({
        queryKey: ['follows', authUserId],
        enabled: !!authUserId,
        queryFn: async (): Promise<FollowsResponse> => {
            const res = await axios.get<FollowsResponse>(`${API_BASE_URL}/follows`);
            return res.data;
        },
    });
}

export function useFollow(authUserId?: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: FollowPayload) => {
            if (!authUserId) {
                throw new Error('Follow: User ID is required');
            }

            try {
                const res = await axios.post(`${API_BASE_URL}/follows`, payload);
                return res.data;
            } catch (error) {
                console.error('Error following:', error);
                throw error;
            }
        },
        onSuccess: () => {
            if (authUserId) {
                queryClient.invalidateQueries({ queryKey: ['follows', authUserId] });
            }
        },
    });
}

export function useUnfollow(authUserId?: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: FollowPayload) => {
            if (!authUserId) {
                throw new Error('Unfollow: User ID is required');
            }

            try {
                const res = await axios.delete(`${API_BASE_URL}/follows`, { data: payload });
                return res.data;
            } catch (error) {
                console.error('Error unfollowing:', error);
                throw error;
            }
        },
        onSuccess: () => {
            if (authUserId) {
                queryClient.invalidateQueries({ queryKey: ['follows', authUserId] });
            }
        },
    });
}
