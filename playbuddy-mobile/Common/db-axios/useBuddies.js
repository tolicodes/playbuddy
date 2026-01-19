import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { API_BASE_URL } from '../config';
const MIN_SEARCH_LENGTH = 2;
const normalizeList = (payload) => (Array.isArray(payload) ? payload : []);
export const useFetchBuddies = (authUserId, options) => {
    const enabled = !!authUserId && (options?.enabled ?? true);
    return useQuery({
        queryKey: ['buddies', authUserId],
        enabled,
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/buddies`);
            return normalizeList(response.data);
        },
        ...options,
    });
};
export const useCreateBuddy = (authUserId) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload) => {
            if (!authUserId) {
                throw new Error('Buddy: User ID is required');
            }
            const response = await axios.post(`${API_BASE_URL}/buddies/add`, payload);
            return response.data;
        },
        onSuccess: () => {
            if (!authUserId)
                return;
            queryClient.invalidateQueries({ queryKey: ['buddies', authUserId] });
            queryClient.invalidateQueries({ queryKey: ['buddyWishlists', authUserId] });
            queryClient.invalidateQueries({ queryKey: ['buddySearch', authUserId] });
        },
    });
};
export const useDeleteBuddy = (authUserId) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (buddyUserId) => {
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
            if (!authUserId)
                return;
            queryClient.invalidateQueries({ queryKey: ['buddies', authUserId] });
            queryClient.invalidateQueries({ queryKey: ['buddyWishlists', authUserId] });
            queryClient.invalidateQueries({ queryKey: ['buddySearch', authUserId] });
        },
    });
};
export const useFetchBuddyWishlists = (authUserId, options) => {
    const enabled = !!authUserId && (options?.enabled ?? true);
    return useQuery({
        queryKey: ['buddyWishlists', authUserId],
        enabled,
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/wishlist/buddies`);
            return normalizeList(response.data);
        },
        ...options,
    });
};
export const useSearchBuddies = (query, authUserId, options) => {
    const normalizedQuery = query.trim();
    const enabled = !!authUserId &&
        normalizedQuery.length >= MIN_SEARCH_LENGTH &&
        (options?.enabled ?? true);
    return useQuery({
        queryKey: ['buddySearch', authUserId, normalizedQuery],
        enabled,
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/buddies/search`, {
                params: { q: normalizedQuery },
            });
            return normalizeList(response.data);
        },
        ...options,
    });
};
