// hooks/useCommunities.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useUserContext } from '../../Pages/Auth/hooks/UserContext';
import { Community } from './CommonContext';
import { API_BASE_URL } from '../../config';
import { queryClient as qc } from './reactQueryClient';
import { useAuthorizedQuery } from './useAuthorizedQuery';
import { useOptimisticMutation } from './useOptimisticMutation';

const summarizeCommunities = (communities: Community[]) => {
    const typeCounts: Record<string, number> = {};
    let missingOrganizerId = 0;
    for (const community of communities) {
        const type = community.type || 'unknown';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
        if (!community.organizer_id) {
            missingOrganizerId += 1;
        }
    }
    return { total: communities.length, typeCounts, missingOrganizerId };
};

const logCommunityFetch = (
    label: string,
    url: string,
    communities: Community[]
) => {
    if (!__DEV__) return;
    const summary = summarizeCommunities(communities);
    const sample = communities.slice(0, 3).map((community) => ({
        id: community.id,
        type: community.type,
        visibility: community.visibility,
        organizer_id: community.organizer_id,
    }));
    console.log(`[communities][fetch][${label}]`, {
        url,
        ...summary,
        sample,
    });
};

const logCommunityFetchError = (label: string, url: string, error: unknown) => {
    if (!__DEV__) return;
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[communities][fetch][${label}][error]`, { url, status, message });
};

// Fetch My Communities
export const useFetchMyCommunities = () => {
    return useAuthorizedQuery({
        queryKey: ['myCommunities'],
        queryFn: async () => {
            const url = `${API_BASE_URL}/communities/my`;
            try {
                const res = await axios.get(url);
                const data = res.data as Community[];
                logCommunityFetch('my', url, data);
                return data;
            } catch (error) {
                logCommunityFetchError('my', url, error);
                throw error;
            }
        }
    });
};

// Fetch Public Communities
export const useFetchPublicCommunities = () => {
    return useQuery<Community[]>({
        queryKey: ['publicCommunities'],
        queryFn: async () => {
            const url = `${API_BASE_URL}/communities/public`;
            try {
                const res = await axios.get(url);
                const data = res.data as Community[];
                logCommunityFetch('public', url, data);
                return data;
            } catch (error) {
                logCommunityFetchError('public', url, error);
                throw error;
            }
        }
    });
};

type JoinCommunityData = { community_id: string; join_code?: string; type?: string }

type JoinCommunityResponse = { status: string }

const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

// Join a Community
export const useJoinCommunity = () => {
    const { authUserId } = useUserContext();
    return useOptimisticMutation<Community[], JoinCommunityResponse, JoinCommunityData>({
        queryKey: ['myCommunities'],
        mutationFn: async (joinData) => {
            if (!joinData.join_code && !isUuid(joinData.community_id)) {
                throw new Error('Join community requires a UUID community_id');
            }
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
