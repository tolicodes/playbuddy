import { useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { EventWithMetadata } from '../../../Common/Nav/NavStackType';
import { useUserContext } from '../../Auth/hooks/UserContext';
import { API_BASE_URL } from '../../../config';
import { supabase } from '../../../supabaseClient';
import { useAuthorizedQuery } from '../../../Common/hooks/useAuthorizedQuery';
import { useOptimisticMutation } from '../../../Common/hooks/useOptimisticMutation';

const useGetAuthUserId = () => {
    const { authUserId } = useUserContext();
    return authUserId;
};


export type WishlistEntry = {
    event_id: number;
    created_at: string | null;
};

const normalizeWishlistEntries = (payload: unknown): WishlistEntry[] => {
    if (!Array.isArray(payload)) return [];
    return payload
        .map((entry: any) => {
            if (entry && typeof entry === 'object' && 'event_id' in entry) {
                const eventId = Number(entry.event_id);
                if (!Number.isFinite(eventId)) return null;
                return { event_id: eventId, created_at: entry.created_at ?? null };
            }
            const eventId = Number(entry);
            if (!Number.isFinite(eventId)) return null;
            return { event_id: eventId, created_at: null };
        })
        .filter(Boolean) as WishlistEntry[];
};

const useFetchWishlistEvents = () => {
    const authUserId = useGetAuthUserId();
    return useAuthorizedQuery({
        queryKey: ['wishlistEvents', authUserId],
        queryFn: async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/wishlist?includeMeta=true`);
                return normalizeWishlistEntries(response.data ?? []);
            } catch (error) {
                throw new Error(`Error fetching wishlist events: ${error.message}`);
            }
        },
    });
};

const useToggleWishlistEvent = () => {
    const queryClient = useQueryClient();
    const authUserId = useGetAuthUserId(); // Fetch userId from context or hook

    return useMutation({
        mutationFn: async ({ eventId, isOnWishlist }: { eventId: number; isOnWishlist: boolean }) => {
            try {
                if (!authUserId) {
                    throw new Error('User ID is required');
                }

                const eventIdParam = encodeURIComponent(String(eventId));
                if (isOnWishlist) {
                    // Add to wishlist via the API
                    await axios.post(`${API_BASE_URL}/wishlist/${eventIdParam}`);
                } else {
                    // Remove from wishlist via the API
                    await axios.delete(`${API_BASE_URL}/wishlist/${eventIdParam}`);
                }
            } catch (error: Error | any) {
                throw new Error(`Error toggling wishlist event: ${error.response?.data?.error || error.message}`);
            }
        },
        onMutate: async ({ eventId, isOnWishlist }) => {
            if (!authUserId) return;

            // Cancel any outgoing refetches (so they don't overwrite optimistic updates)
            await queryClient.cancelQueries({ queryKey: ['wishlistEvents', authUserId] });

            // Snapshot the previous value
            const previousWishlist = queryClient.getQueryData<WishlistEntry[] | number[]>(['wishlistEvents', authUserId]);

            // Optimistically update the cache
            queryClient.setQueryData<WishlistEntry[] | number[]>(['wishlistEvents', authUserId], (oldWishlist = []) => {
                const entries = normalizeWishlistEntries(oldWishlist);
                if (isOnWishlist) {
                    if (entries.some((entry) => entry.event_id === eventId)) return entries;
                    return [...entries, { event_id: eventId, created_at: new Date().toISOString() }];
                }
                return entries.filter((entry) => entry.event_id !== eventId);
            });

            return { previousWishlist };
        },
        onError: (err, _, context) => {
            if (!authUserId) return;

            // Rollback to the previous wishlist state on error
            if (context?.previousWishlist) {
                queryClient.setQueryData(['wishlistEvents', authUserId], context.previousWishlist);
            }

            throw new Error('Error toggling wishlist event:', err?.message)
        },
        onSettled: () => {
            if (!authUserId) return;
            // Refetch wishlist events after mutation completes
            queryClient.invalidateQueries({ queryKey: ['wishlistEvents', authUserId] });
        },
    });
};
// Combined Hook to manage both user and friend's wishlist
export const useWishlist = (eventsWithMetadata: EventWithMetadata[]) => {
    const { data: wishlistEntries = [], isLoading: isLoadingWishlistEvents } = useFetchWishlistEvents();
    const wishlistEventIds = useMemo(
        () => new Set(wishlistEntries.map((entry) => entry.event_id)),
        [wishlistEntries]
    );
    const wishlistEntryMap = useMemo(
        () => new Map(wishlistEntries.map((entry) => [entry.event_id, entry])),
        [wishlistEntries]
    );

    // Memoized function to calculate wishlist events
    const wishlistEvents = useMemo(() => {
        if (!wishlistEventIds.size) return [];
        return eventsWithMetadata.filter((event) => wishlistEventIds.has(event.id));
    }, [wishlistEventIds, eventsWithMetadata]);

    // Memoized function to check if an event is on wishlist
    const isOnWishlist = useCallback((eventId: number) => {
        return wishlistEventIds.has(eventId);
    }, [wishlistEventIds]);

    const toggleWishlistEvent = useToggleWishlistEvent();

    const swipeChoices = useFetchSwipeChoices();

    return {
        wishlistEvents,
        wishlistEntries,
        wishlistEntryMap,
        isLoadingWishlistEvents,
        isOnWishlist,
        toggleWishlistEvent,

        swipeChoices,
    };
};


export const useRecordSwipeChoice = () => {
    const qc = useQueryClient();

    return useOptimisticMutation<SwipeModeChoiceList, SwipeModeChoice, SwipeModeChoice>({
        queryKey: ['swipe_mode_choices'],

        mutationFn: (props) => {
            return axios.post(`${API_BASE_URL}/wishlist/swipe_mode_choices`, props);
        },
        onMutateFn: (old, newChoice) => {
            if (!old) return;
            return {
                swipeModeChosenWishlist: [
                    ...old.swipeModeChosenWishlist,
                    ...(newChoice.choice === 'wishlist' ? [newChoice.event_id] : []),
                ],
                swipeModeChosenSkip: [
                    ...old.swipeModeChosenSkip,
                    ...(newChoice.choice === 'skip' ? [newChoice.event_id] : []),
                ],
            }
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ['swipe_mode_choices'] });
            qc.invalidateQueries({ queryKey: ['wishlistEvents'] });
        }
    });
};



interface SwipeModeChoice {
    event_id: number;
    choice: 'wishlist' | 'skip';
    list?: string;
}

interface SwipeModeChoiceList {
    swipeModeChosenWishlist: number[];
    swipeModeChosenSkip: number[];
}

export const useFetchSwipeChoices = () => {
    const authUserId = useGetAuthUserId();

    const { data } = useQuery<SwipeModeChoiceList>({
        queryKey: ['swipe_mode_choices'],
        queryFn: () => axios.get(`${API_BASE_URL}/wishlist/swipe_mode_choices`).then(res => res.data),
        enabled: !!authUserId, // Only fetch if the user_id exists
    });

    return data;
};
