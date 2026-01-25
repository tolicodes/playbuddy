import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export type BuddyProfile = {
    user_id: string;
    name: string | null;
    avatar_url: string | null;
    share_code?: string | null;
};

export type BuddyWishlist = {
    user_id: string;
    name: string;
    avatar_url: string | null;
    events: string[];
};

export type BuddyWishlistDetail = BuddyWishlist & {
    share_calendar?: boolean | null;
};

export type CreateBuddyPayload = {
    buddyUserId?: string;
    shareCode?: string;
};

const MIN_SEARCH_LENGTH = 2;

const normalizeList = <T>(payload: unknown): T[] => (Array.isArray(payload) ? (payload as T[]) : []);

export const useFetchBuddies = (
    authUserId?: string | null,
    options?: Omit<UseQueryOptions<BuddyProfile[]>, 'queryKey' | 'queryFn'>
) => {
    const enabled = !!authUserId && (options?.enabled ?? true);
    return useQuery<BuddyProfile[]>({
        queryKey: ['buddies', authUserId],
        enabled,
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/buddies`);
            return normalizeList<BuddyProfile>(response.data);
        },
        ...options,
    });
};

export const useCreateBuddy = (authUserId?: string | null) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: CreateBuddyPayload) => {
            if (!authUserId) {
                throw new Error('Buddy: User ID is required');
            }
            const response = await axios.post(`${API_BASE_URL}/buddies/add`, payload);
            return response.data;
        },
        onSuccess: () => {
            if (!authUserId) return;
            queryClient.invalidateQueries({ queryKey: ['buddies', authUserId] });
            queryClient.invalidateQueries({ queryKey: ['buddyWishlists', authUserId] });
            queryClient.invalidateQueries({ queryKey: ['buddyWishlist', authUserId] });
            queryClient.invalidateQueries({ queryKey: ['buddySearch', authUserId] });
        },
    });
};

export const useDeleteBuddy = (authUserId?: string | null) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (buddyUserId: string) => {
            if (!authUserId) {
                throw new Error('Buddy: User ID is required');
            }
            if (!buddyUserId) {
                throw new Error('Buddy: Buddy user ID is required');
            }
            const response = await axios.delete(`${API_BASE_URL}/buddies/${buddyUserId}`);
            return response.data;
        },
        onSuccess: () => {
            if (!authUserId) return;
            queryClient.invalidateQueries({ queryKey: ['buddies', authUserId] });
            queryClient.invalidateQueries({ queryKey: ['buddyWishlists', authUserId] });
            queryClient.invalidateQueries({ queryKey: ['buddyWishlist', authUserId] });
            queryClient.invalidateQueries({ queryKey: ['buddySearch', authUserId] });
        },
    });
};

export const useFetchBuddyWishlists = (
    authUserId?: string | null,
    options?: Omit<UseQueryOptions<BuddyWishlist[]>, 'queryKey' | 'queryFn'>
) => {
    const enabled = !!authUserId && (options?.enabled ?? true);
    return useQuery<BuddyWishlist[]>({
        queryKey: ['buddyWishlists', authUserId],
        enabled,
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/wishlist/buddies`);
            return normalizeList<BuddyWishlist>(response.data);
        },
        ...options,
    });
};

export const useFetchBuddyWishlist = (
    buddyUserId?: string | null,
    authUserId?: string | null,
    options?: Omit<UseQueryOptions<BuddyWishlistDetail | null>, 'queryKey' | 'queryFn'>
) => {
    const enabled = !!authUserId && !!buddyUserId && (options?.enabled ?? true);
    return useQuery<BuddyWishlistDetail | null>({
        queryKey: ['buddyWishlist', authUserId, buddyUserId],
        enabled,
        queryFn: async () => {
            if (!buddyUserId) return null;
            const response = await axios.get(`${API_BASE_URL}/wishlist/user/${buddyUserId}`);
            return response.data ?? null;
        },
        ...options,
    });
};

export const useSearchBuddies = (
    query: string,
    authUserId?: string | null,
    options?: Omit<UseQueryOptions<BuddyProfile[]>, 'queryKey' | 'queryFn'>
) => {
    const normalizedQuery = query.trim();
    const enabled =
        !!authUserId &&
        normalizedQuery.length >= MIN_SEARCH_LENGTH &&
        (options?.enabled ?? true);

    return useQuery<BuddyProfile[]>({
        queryKey: ['buddySearch', authUserId, normalizedQuery],
        enabled,
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/buddies/search`, {
                params: { q: normalizedQuery },
            });
            return normalizeList<BuddyProfile>(response.data);
        },
        ...options,
    });
};
