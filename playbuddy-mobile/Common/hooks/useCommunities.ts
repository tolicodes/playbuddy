// hooks/useCommunities.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useUserContext } from '../../contexts/UserContext';
import { Community } from '../CommonContext';
import { API_BASE_URL } from '../../config';
import { queryClient as qc } from '../queryClient';

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
                if (error instanceof Error) {
                    throw new Error(`Failed to fetch my communities: ${error.message}`);
                }
                throw new Error('Failed to fetch my communities');
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
                if (error instanceof Error) {
                    throw new Error(`Failed to fetch public communities: ${error.message}`);
                }
                throw new Error('Failed to fetch public communities');
            }
        }
    });
};

// Join a Community
export const useJoinCommunity = () => {
    const { authUserId } = useUserContext();
    const queryClient = useQueryClient(qc);

    return useMutation<Community, Error, { community_id: string; join_code?: string }>({
        mutationFn: async (joinData) => {
            const { data } = await axios.post(`${API_BASE_URL}/communities/join`, {
                ...joinData,
                authUserId
            });
            return data;
        },
        onMutate: async (joinData) => {
            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({ queryKey: ['myCommunities'] });

            // Snapshot the previous value
            const previousCommunities = queryClient.getQueryData<Community[]>(['myCommunities']);

            // Optimistically update to the new value
            queryClient.setQueryData<Community[]>(['myCommunities'], old => {
                const newCommunity: Partial<Community> = { id: joinData.community_id, name: 'Joining...', type: joinData.type };
                return old ? [...old, newCommunity as Community] : [newCommunity as Community];
            });

            // Return a context object with the snapshotted value
            return { previousCommunities };
        },
        onError: (err, joinData, context) => {
            // If the mutation fails, use the context returned from onMutate to roll back
            queryClient.setQueryData(['myCommunities'], context?.previousCommunities);
        },
        onSettled: () => {
            // Always refetch after error or success:
            queryClient.invalidateQueries({ queryKey: ['myCommunities'] });
        },
    });
};

export const useLeaveCommunity = () => {
    const { authUserId } = useUserContext();
    const queryClient = useQueryClient(qc);

    return useMutation<Community, Error, { community_id: string }>({
        mutationFn: async (leaveData) => {
            const { data } = await axios.post(`${API_BASE_URL}/communities/leave`, {
                ...leaveData,
                authUserId
            });
            return data;
        },
        onMutate: async (leaveData) => {
            await queryClient.cancelQueries({ queryKey: ['myCommunities'] });
            const previousCommunities = queryClient.getQueryData<Community[]>(['myCommunities']);

            queryClient.setQueryData<Community[]>(['myCommunities'], old => {
                return old ? old.filter(community => community.id !== leaveData.community_id) : [];
            });

            return { previousCommunities };
        },
        onError: (err, leaveData, context: { previousCommunities?: Community[] }) => {
            queryClient.setQueryData(['myCommunities'], context?.previousCommunities);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['myCommunities'] });
        },
    });
};
