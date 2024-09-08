import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../supabaseCiient';
import { EventWithMetadata } from '../../types';

// Utility function to get the user ID from AsyncStorage
const getUserIdFromStorage = async () => {
    const userId = await AsyncStorage.getItem('@userId');
    return userId || null;
};

// Fetch the wishlist event IDs for a user from Supabase
const fetchWishlistEvents = async (userId: string) => {
    const { data, error } = await supabase
        .from('event_wishlist')
        .select('event_id')
        .eq('user_id', userId);

    if (error) {
        throw new Error(`Error fetching wishlist: ${error.message}`);
    }

    return data.map((wishlist_event: { event_id: string }) => wishlist_event.event_id);
};

// Function to save an event to the wishlist
const saveWishlistEvent = async (eventId: string, userId: string) => {
    const { error } = await supabase
        .from('event_wishlist')
        .insert([{ user_id: userId, event_id: eventId }]);

    if (error) {
        throw new Error(`Error saving event to wishlist: ${error.message}`);
    }

    return true;
};

// Function to remove an event from the wishlist
const deleteWishlistEvent = async (eventId: string, userId: string) => {
    const { error } = await supabase
        .from('event_wishlist')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', eventId);

    if (error) {
        throw new Error(`Error deleting event from wishlist: ${error.message}`);
    }

    return true;
};

// Hook to fetch the user ID using React Query
const useGetUserId = () => {
    return useQuery({
        queryKey: ['userId'],
        queryFn: getUserIdFromStorage,
        staleTime: Infinity, // Cache user ID indefinitely
    });
};

// Hook to fetch wishlist events for the current user
const useFetchWishlistEvents = () => {
    const { data: userId } = useGetUserId();

    return useQuery({
        queryKey: ['wishlistEvents', userId],
        queryFn: () => fetchWishlistEvents(userId as string),
        enabled: !!userId, // Only run the query if the userId is available
        staleTime: 1000 * 60 * 10, // 10 minutes stale time
    });
};

// Hook for toggling wishlist events with optimistic updates
const useToggleWishlistEvent = () => {
    const queryClient = useQueryClient();
    const { data: userId } = useGetUserId();

    return useMutation({
        mutationFn: async ({ eventId, isOnWishlist }: { eventId: string; isOnWishlist: boolean }) => {
            if (!userId) {
                throw new Error('No user ID available');
            }
            return isOnWishlist ? saveWishlistEvent(eventId, userId) : deleteWishlistEvent(eventId, userId);
        },
        onMutate: async ({ eventId, isOnWishlist }) => {
            const previousWishlist = queryClient.getQueryData<string[]>(['wishlistEvents', userId]);

            // Optimistically update the cache
            queryClient.setQueryData<string[]>(['wishlistEvents', userId], (oldWishlist = []) => {
                return isOnWishlist
                    ? [...oldWishlist, eventId]
                    : oldWishlist.filter(id => id !== eventId);
            });

            return { previousWishlist };
        },
        onError: (err, _, context) => {
            console.error('Error toggling wishlist event:', err);
            // Rollback to the previous wishlist state on error
            if (context?.previousWishlist) {
                queryClient.setQueryData(['wishlistEvents', userId], context.previousWishlist);
            }
        },
    });
};

// Combined Hook to manage both user and friend's wishlist
export const useWishlist = (eventsWithMetadata: EventWithMetadata[]) => {
    const { data: wishlistEventIds } = useFetchWishlistEvents();
    const [friendWishlistEventIds, setFriendWishlistEventIds] = useState<string[]>([]);

    const setFriendWishlistCode = async (shareCode: string | null) => {
        if (!shareCode) {
            setFriendWishlistEventIds([]);
            return;
        }

        try {
            const { data: userData } = await supabase
                .from('users')
                .select('user_id')
                .eq('share_code', shareCode)
                .single();

            const userId = userData?.user_id;

            if (userId) {
                const { data: wishlistData } = await supabase
                    .from('event_wishlist')
                    .select('event_id')
                    .eq('user_id', userId);

                if (!wishlistData) {
                    setFriendWishlistEventIds([]);
                    return;
                }

                setFriendWishlistEventIds(wishlistData.map((item: { event_id: string }) => item.event_id));
            }
        } catch (error) {
            console.error('Error fetching friend’s wishlist:', error);
        }
    };

    const friendWishlistEvents = useMemo(() => {
        return eventsWithMetadata.filter(event => friendWishlistEventIds.includes(event.id));
    }, [friendWishlistEventIds, eventsWithMetadata]);

    const wishlistEvents = useMemo(() => {
        return eventsWithMetadata.filter(event => wishlistEventIds?.includes(event.id));
    }, [wishlistEventIds, eventsWithMetadata]);

    const toggleWishlistEvent = useToggleWishlistEvent();

    const isOnWishlist = (eventId: string) => {
        return wishlistEventIds?.includes(eventId) || false;
    }

    return {
        wishlistEvents,
        friendWishlistEvents,
        setFriendWishlistCode,
        toggleWishlistEvent,
        isOnWishlist,
    };
};
