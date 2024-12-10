// hooks/useCommunities.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useUserContext } from '../../Pages/Auth/hooks/UserContext';
import { Community } from './CommonContext';
import { API_BASE_URL } from '../../config';
import { queryClient as qc } from './reactQueryClient';
import { useAuthorizedQuery } from './useAuthorizedQuery';
import { useOptimisticMutation } from './useOptimisticMutation';

// Fetch My Communities
export const useFetchMyCommunities = () => {
    return useAuthorizedQuery({
        queryKey: ['myCommunities'],
        queryFn: async () => {
            try {
                const { data } = await axios.get(`${API_BASE_URL}/communities/my`);
                return data as Community[];
            } catch (error) {
                if (error instanceof Error) {
                    throw new Error(`Failed to fetch my communities: ${error.message}`);
                }
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
            }
        }
    });
};

type JoinCommunityData = { community_id: string; join_code?: string; type?: string }

type JoinCommunityResponse = { status: string }

// Join a Community
export const useJoinCommunity = () => {
    const { authUserId } = useUserContext();
    return useOptimisticMutation<Community[], JoinCommunityResponse, JoinCommunityData>({
        queryKey: ['myCommunities'],
        mutationFn: async (joinData) => {
            const { data } = await axios.post(`${API_BASE_URL}/communities/join`, {
                ...joinData,
            });

            return data;
        },
        onMutateFn: (old, joinData) => {
            // placeholder
            const newCommunity = {
                id: joinData.community_id,
                name: 'Joining...',
                type: joinData.type || '',
                code: '',
                organizer_id: '',
                description: '',
                visibility: '',
            };
            return old
                ? [...old, newCommunity]
                : [newCommunity];
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ['myCommunities'] });
            qc.invalidateQueries({ queryKey: ['events', authUserId] });
        }
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
        }
    });
};
