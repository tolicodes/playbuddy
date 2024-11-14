import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { EventWithMetadata } from '../../types';
import { useUserContext } from '../../contexts/UserContext';
import { API_BASE_URL } from '../../config';
import { supabase } from '../../supabaseClient';

const useGetAuthUserId = () => {
    const { authUserId } = useUserContext();
    return authUserId;
};

const useAuthReady = () => {
    const { authReady } = useUserContext();
    return authReady;
}

const fetchWishlistEvents = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/wishlist`);
        return response.data;
    } catch (error) {
        throw new Error(`Error fetching wishlist events: ${error.message}`);
    }
};

// Hook to fetch wishlist events for the current user
const useFetchWishlistEvents = () => {
    const authReady = useAuthReady();
    const authUserId = useGetAuthUserId();
    return useQuery({
        queryKey: ['wishlistEvents', authUserId],
        queryFn: () => fetchWishlistEvents(),
        enabled: !!authReady,
    });
};

const useToggleWishlistEvent = () => {
    const queryClient = useQueryClient();
    const authUserId = useGetAuthUserId(); // Fetch userId from context or hook

    return useMutation({
        mutationFn: async ({ eventId, isOnWishlist }: { eventId: string; isOnWishlist: boolean }) => {
            try {
                if (!authUserId) {
                    throw new Error('User ID is required');
                }

                if (isOnWishlist) {
                    // Add to wishlist via the API
                    await axios.post(`${API_BASE_URL}/wishlist/${eventId}`);
                } else {
                    // Remove from wishlist via the API
                    await axios.delete(`${API_BASE_URL}/wishlist/${eventId}`);
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
            const previousWishlist = queryClient.getQueryData<string[]>(['wishlistEvents', authUserId]);

            // Optimistically update the cache
            queryClient.setQueryData<string[]>(['wishlistEvents', authUserId], (oldWishlist = []) => {
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
    const { data: wishlistEventIds, isLoading: isLoadingWishlistEvents } = useFetchWishlistEvents();

    // Memoized function to calculate wishlist events
    const wishlistEvents = useMemo(() => {
        return eventsWithMetadata.filter(event => wishlistEventIds?.includes(event.id));
    }, [wishlistEventIds, eventsWithMetadata]);

    // Memoized function to check if an event is on wishlist
    const isOnWishlist = useCallback((eventId: string) => {
        return wishlistEventIds?.includes(eventId) || false;
    }, [wishlistEventIds]);

    const toggleWishlistEvent = useToggleWishlistEvent();

    const swipeChoices = useSwipeChoices();

    return {
        wishlistEvents,
        isLoadingWishlistEvents,
        isOnWishlist,
        toggleWishlistEvent,

        swipeChoices,
    };
};



// SWIPE CHOICES

const recordSwipeChoice = async ({
    event_id,
    user_id,
    choice,
    list = 'main',
}: {
    event_id: number;
    user_id?: string | null;
    choice: 'wishlist' | 'skip';
    list?: string;
}) => {
    if (!user_id) {
        console.error('User ID is required, skipping recording');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('swipe_mode_choices')
            .insert([{ event_id, user_id, choice, list }]);

        if (error) {
            console.error('Supabase insert error:', error);
            throw new Error(error.message);
        }

        return data;
    } catch (e) {
        console.error(e)
    }
};


export const useRecordSwipeChoice = () => {
    const queryClient = useQueryClient();
    const authUserId = useGetAuthUserId();

    return useMutation({
        mutationFn: (props: any) => {
            return recordSwipeChoice({
                ...props,
                user_id: authUserId,
            })
        },
        // onMutate: async ({ event_id, choice, list }) => {
        //     // Cancel any outgoing refetches (so they don't overwrite optimistic updates)
        //     // await queryClient.cancelQueries(['swipe_mode_choices']);

        //     // Snapshot the previous value
        //     const previousChoices = queryClient.getQueryData(['swipe_mode_choices']);

        //     // Optimistically update with the new choice
        //     queryClient.setQueryData(['swipe_mode_choices'], (oldChoices: any) => [
        //         ...oldChoices,
        //         { event_id, choice, list },
        //     ]);

        //     // Return the context to be used in case of rollback
        //     return { previousChoices };
        // },
        // If the mutation fails, roll back to the previous value
        onError: (err, newChoice, context: any) => {
            queryClient.setQueryData(['swipe_mode_choices'], context?.previousChoices);

            throw new Error(`Error recording swipe choice: ${err.message} [${newChoice}]`);
        },
        // Always refetch after error or success
        onSettled: () => {
            // queryClient.invalidateQueries(['swipe_mode_choices']);
        },
    });
};



interface SwipeModeChoices {
    event_id: number;
    choice: 'wishlist' | 'skip';
    list?: string;
}

interface SwipeModeChosen {
    swipeModeChosenWishlist: number[];
    swipeModeChosenSkip: number[];
}

const fetchSwipeChoices = async (user_id: string): Promise<SwipeModeChosen> => {
    const { data, error } = await supabase
        .from('swipe_mode_choices')
        .select('event_id, choice')
        .eq('user_id', user_id);

    if (error) {
        throw new Error(error.message);
    }

    const swipeModeChosenWishlist = data
        ?.filter((choice: SwipeModeChoices) => choice.choice === 'wishlist')
        .map((choice: SwipeModeChoices) => choice.event_id) || [];

    const swipeModeChosenSkip = data
        ?.filter((choice: SwipeModeChoices) => choice.choice === 'skip')
        .map((choice: SwipeModeChoices) => choice.event_id) || [];

    return {
        swipeModeChosenWishlist,
        swipeModeChosenSkip,
    };
};

export const useSwipeChoices = () => {
    const authUserId = useGetAuthUserId();

    const { data } = useQuery<SwipeModeChosen>({
        queryKey: ['swipe_mode_choices', authUserId],
        queryFn: () => fetchSwipeChoices(authUserId!),
        enabled: !!authUserId, // Only fetch if the user_id exists
    });

    return data;
};