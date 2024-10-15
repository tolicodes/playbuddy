// hooks/useCommunities.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useUserContext } from '../../Auth/UserContext';
import { Community } from '../CommonContext';
import { API_BASE_URL } from '../../config';

// Fetch My Communities
export const useFetchMyCommunities = () => {
    const { authUserId } = useUserContext();

    return useQuery({
        queryKey: ['myCommunities'],
        queryFn: async () => {
            try {
                const { data } = await axios.get(`${API_BASE_URL}/communities/my`, {
                    params: { authUserId }
                });
                return data;
            } catch (error) {
                throw new Error(`Failed to fetch my communities: ${error.message}`);
            }
        }
    });
};

// Fetch Public Communities
export const useFetchPublicCommunities = () => {
    return useQuery<Community[]>({
        queryKey: ['publicCommunities'],
        queryFn: async () => {
            try {
                const { data } = await axios.get(`${API_BASE_URL}/communities/public`);
                return data;
            } catch (error) {
                throw new Error(`Failed to fetch public communities: ${error.message}`);
            }
        }
    });
};

// Join a Community
export const useJoinCommunity = () => {
    const { authUserId } = useUserContext();
    // Use the queryClient from the hook
    const queryClient = useQueryClient();

    return useMutation<Community, Error, { community_id: string; join_code?: string }>({
        mutationFn: async (joinData) => {
            try {
                const { data } = await axios.post(`${API_BASE_URL}/communities/join`, {
                    ...joinData,
                    authUserId
                });

                queryClient.invalidateQueries({ queryKey: ['myCommunities'] });

                return data;
            } catch (error: unknown) {
                if (error instanceof Error) {
                    throw new Error(`Failed to join community: ${error.message}`);
                }
                throw new Error('Failed to join community: Unknown error');
            }
        }
    });
};

export const useLeaveCommunity = () => {
    const { authUserId } = useUserContext();
    const queryClient = useQueryClient();

    return useMutation<Community, Error, { community_id: string }>({
        mutationFn: async (leaveData) => {
            try {
                const { data } = await axios.post(`${API_BASE_URL}/communities/leave`, {
                    ...leaveData,
                    authUserId
                });

                queryClient.invalidateQueries({ queryKey: ['myCommunities'] });

                return data;
            } catch (error) {
                throw new Error(`Failed to leave community: ${error.message}`);
            }
        }
    });
};
