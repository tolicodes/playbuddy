import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabaseCiient';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Fetch the user ID from AsyncStorage
async function getUserId() {
    const userId = await AsyncStorage.getItem('@userId');
    return userId || null; // Return null if no userId is found
}

// Hook to get user ID and track it using React Query
export const useGetUserId = () => {
    return useQuery({
        queryKey: ['userId'],
        queryFn: getUserId,
        staleTime: Infinity, // Cache user ID indefinitely
    });
};

// Fetch the wishlist event IDs for a user
async function fetchWishlistEvents(userId: string) {
    const { data, error } = await supabase
        .from('event_wishlist')
        .select('event_id')
        .eq('user_id', userId);

    if (error) {
        throw new Error('Error fetching wishlist: ' + error.message);
    }

    return data.map((wishlist_event: { event_id: string }) => wishlist_event.event_id);
}

// Hook to fetch wishlist events, ensuring userId is available
export const useFetchWishlistEvents = () => {
    const { data: userId } = useGetUserId();

    return useQuery({
        queryKey: userId ? ['wishlistEvents', userId] : ['wishlistEvents'], // Only include userId if defined
        queryFn: () => fetchWishlistEvents(userId as string), // Ensure userId is a string
        enabled: !!userId, // Only run query if userId exists
    });
};

// Save event to wishlist
async function saveWishlistEvent(eventId: string, userId: string) {
    const { error } = await supabase
        .from('event_wishlist')
        .insert([{ user_id: userId, event_id: eventId }]);

    if (error) {
        throw new Error('Error saving event to wishlist: ' + error.message);
    }

    return true;
}

// Remove event from wishlist
async function deleteWishlistEvent(eventId: string, userId: string) {
    const { error } = await supabase
        .from('event_wishlist')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', eventId);

    if (error) {
        throw new Error('Error deleting event from wishlist: ' + error.message);
    }

    return true;
}

// Use mutation for saving/removing events from wishlist with optimistic update
export const useToggleWishlistEvent = () => {
    const queryClient = useQueryClient();
    const { data: userId } = useGetUserId();

    return useMutation({
        mutationFn: async ({ eventId, isOnWishlist }: { eventId: string, isOnWishlist: boolean }) => {
            if (!userId) throw new Error('No user ID available');
            if (isOnWishlist) {
                return saveWishlistEvent(eventId, userId);
            } else {
                return deleteWishlistEvent(eventId, userId);
            }
        },
        onMutate: async ({ eventId, isOnWishlist }) => {
            // Optimistic update: Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['wishlistEvents', userId] });

            // Snapshot the previous value
            const previousWishlist = queryClient.getQueryData<string[]>(['wishlistEvents', userId]);

            // Optimistically update the cache
            queryClient.setQueryData<string[]>(['wishlistEvents', userId], (old = []) =>
                isOnWishlist
                    ? [...old, eventId] // Add eventId if it's being added to the wishlist
                    : old.filter(id => id !== eventId) // Remove eventId if it's being removed
            );

            return { previousWishlist };
        },
        onError: (err, _, context) => {
            // Rollback on error
            if (context?.previousWishlist) {
                queryClient.setQueryData(['wishlistEvents', userId], context.previousWishlist);
            }
        },
        onSettled: () => {
            // Refetch wishlist events after mutation completes
            queryClient.invalidateQueries({ queryKey: ['wishlistEvents', userId] });
        },
    });
};
