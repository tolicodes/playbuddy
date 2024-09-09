import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { supabase } from '../../supabaseCiient';
import { EventWithMetadata } from '../../types';
import { useUserContext } from '../../Auth/UserContext';
import { API_BASE_URL } from '../../config';

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

const useGetUserId = () => {
    const { userId } = useUserContext();
    return userId;
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
        console.error('Error fetching wishlist events:', error);
        return [];
    }

};

// Hook to fetch wishlist events for the current user
const useFetchWishlistEvents = () => {
    const authReady = useAuthReady();
    const userId = useGetUserId();
    return useQuery({
        queryKey: ['wishlistEvents', userId],
        queryFn: () => fetchWishlistEvents(),
        enabled: !!authReady,
    });
};

const useToggleWishlistEvent = () => {
    const queryClient = useQueryClient();
    const userId = useGetUserId(); // Fetch userId from context or hook

    return useMutation({
        mutationFn: async ({ eventId, isOnWishlist }: { eventId: string; isOnWishlist: boolean }) => {
            try {
                if (!userId) {
                    throw new Error('User ID is required');
                }

                if (isOnWishlist) {
                    // Add to wishlist via the API
                    await axios.post(`${API_BASE_URL}/wishlist/${eventId}`);
                } else {
                    // Remove from wishlist via the API
                    await axios.delete(`${API_BASE_URL}/wishlist/${eventId}`);
                }
            } catch (error) {
                throw new Error(`Error toggling wishlist event: ${error.response?.data?.error || error.message}`);
            }
        },
        onMutate: async ({ eventId, isOnWishlist }) => {
            if (!userId) return;

            // Cancel any outgoing refetches (so they don't overwrite optimistic updates)
            await queryClient.cancelQueries({ queryKey: ['wishlistEvents', userId] });

            // Snapshot the previous value
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
            if (!userId) return;
            console.error('Error toggling wishlist event:', err);
            // Rollback to the previous wishlist state on error
            if (context?.previousWishlist) {
                queryClient.setQueryData(['wishlistEvents', userId], context.previousWishlist);
            }
        },
        onSettled: () => {
            if (!userId) return;
            // Refetch wishlist events after mutation completes
            queryClient.invalidateQueries({ queryKey: ['wishlistEvents', userId] });
        },
    });
};

const useFetchFriendWishlist = (shareCode: string | null) => {
    const authReady = useAuthReady();
    return useQuery({
        queryKey: ['friendWishlist', shareCode],
        queryFn: async () => {
            if (!shareCode) return [];

            // Make a request to your Express backend
            const response = await axios.get(`/wishlists/friend/${shareCode}`);
            return response.data.friendWishlistEventIds; // Return the array of event IDs
        },
        enabled: !!shareCode && !!authReady, // Only run the query if a shareCode is provided
    });
};

// Combined Hook to manage both user and friend's wishlist
export const useWishlist = (eventsWithMetadata: EventWithMetadata[]) => {
    const [shareCode, setShareCode] = useState<string | null>(null);

    const { data: wishlistEventIds } = useFetchWishlistEvents();
    const { data: friendWishlistEventIds = [] } = useFetchFriendWishlist(shareCode);

    const setFriendWishlistCode = async (shareCode: string | null) => {
        setShareCode(shareCode);
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
