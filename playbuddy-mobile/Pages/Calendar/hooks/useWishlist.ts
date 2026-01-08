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


const useFetchWishlistEvents = () => {
    const authUserId = useGetAuthUserId();
    return useAuthorizedQuery({
        queryKey: ['wishlistEvents', authUserId],
        queryFn: async () => {
            try {
                const response = await axios.get<Array<string | number>>(`${API_BASE_URL}/wishlist`);
                return (response.data ?? [])
                    .map((id) => Number(id))
                    .filter((id) => Number.isFinite(id));
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
            const previousWishlist = queryClient.getQueryData<number[]>(['wishlistEvents', authUserId]);

            // Optimistically update the cache
            queryClient.setQueryData<number[]>(['wishlistEvents', authUserId], (oldWishlist = []) => {
                return isOnWishlist
                    ? [...oldWishlist, eventId]
                    : oldWishlist.filter(id => id !== eventId);
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
    const { data: wishlistEventIds, isLoading: isLoadingWishlistEvents, } = useFetchWishlistEvents();

    // Memoized function to calculate wishlist events
    const wishlistEvents = useMemo(() => {
        return eventsWithMetadata.filter(event => wishlistEventIds?.includes(event.id));
    }, [wishlistEventIds, eventsWithMetadata]);

    // Memoized function to check if an event is on wishlist
    const isOnWishlist = useCallback((eventId: number) => {
        return wishlistEventIds?.includes(eventId) || false;
    }, [wishlistEventIds]);

    const toggleWishlistEvent = useToggleWishlistEvent();

    const swipeChoices = useFetchSwipeChoices();

    return {
        wishlistEvents,
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
