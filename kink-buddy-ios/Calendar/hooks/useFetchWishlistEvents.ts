import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabaseCiient';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

    console.log('fetching wishlist events', data);

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

// Hook to get the user ID using React Query
export const useGetUserId = () => {
    return useQuery({
        queryKey: ['userId'],
        queryFn: getUserIdFromStorage,
        staleTime: Infinity, // Cache user ID indefinitely
    });
};

// Hook to fetch wishlist events for a specific user
export const useFetchWishlistEvents = () => {
    const { data: userId } = useGetUserId();

    return useQuery({
        queryKey: ['wishlistEvents', userId],
        queryFn: () => fetchWishlistEvents(userId as string),
        enabled: !!userId, // Only run the query if the userId is available
        staleTime: 1000 * 60 * 10, // 10 minutes stale time
    });
};

// Hook for toggling the wishlist event with optimistic updates
export const useToggleWishlistEvent = () => {
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
                const newWishlist = isOnWishlist ? [...oldWishlist, eventId] : oldWishlist.filter(id => id !== eventId)
                console.log('newWishlist', newWishlist);
                return newWishlist;
            }
            );
            console.og

            // Return the snapshot of the previous wishlist for rollback in case of error
            return { previousWishlist };
        },
        onError: (err, _, context) => {
            console.error('Error toggling wishlist event:', err);
            // Rollback to the previous wishlist state on error
            if (context?.previousWishlist) {
                queryClient.setQueryData(['wishlistEvents', userId], context.previousWishlist);
            }
        },

        onSettled: () => {
            // Optionally refetch wishlist events only if needed
            // queryClient.invalidateQueries({ queryKey: ['wishlistEvents', userId] });
        },
    });
};
