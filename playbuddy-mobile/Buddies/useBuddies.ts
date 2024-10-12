import { useQuery, useMutation, useQueryClient } from 'react-query';
import { supabase } from '../supabaseClient'; // adjust the path to your Supabase client
import { useUserContext } from '../Auth/UserContext';

// Fetch all buddies
const fetchBuddies = async (userId: string | null) => {
    if (!userId) throw new Error('User ID is required');
    const { data, error } = await supabase
        .from('buddies')
        .select('buddy_user_id, buddy_user_id:users(id, display_name, avatar_url)')
        .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return data;
};

// Add a new buddy
const addBuddy = async (userId: string, buddyUserId: string) => {
    if (!userId || !buddyUserId) throw new Error('User ID and Buddy User ID are required');

    const { data, error } = await supabase
        .from('buddies')
        .insert({ user_id: userId, buddy_user_id: buddyUserId });

    if (error) throw new Error(error.message);
    return data;
};

// Fetch buddy lists with buddies
const fetchBuddyListsWithBuddies = async (userId: string | null) => {
    if (!userId) throw new Error('User ID is required');

    const { data, error } = await supabase
        .from('buddy_lists')
        .select('id, name, buddy_list_buddies(buddy_id:users(id, display_name, avatar_url))')
        .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return data;
};

// Create a new buddy list
const createBuddyList = async (userId: string, listName: string) => {
    const { data, error } = await supabase
        .from('buddy_lists')
        .insert({ user_id: userId, name: listName });

    if (error) throw new Error(error.message);
    return data;
};

// Add a buddy to a buddy list
const addBuddyToList = async (buddyListId: number, buddyId: number) => {
    const { data, error } = await supabase
        .from('buddy_list_buddies')
        .insert({ buddy_list_id: buddyListId, buddy_id: buddyId });

    if (error) throw new Error(error.message);
    return data;
};

// React Query hooks for fetching and adding buddies, managing buddy lists
export const useBuddies = () => {
    const queryClient = useQueryClient();
    const { authUserId } = useUserContext();

    // Fetch buddies
    const buddiesQuery = useQuery(['buddies', authUserId], () => fetchBuddies(authUserId), {
        enabled: !!authUserId,
    });

    // Add buddy mutation
    const addBuddyMutation = useMutation(
        ({ buddyUserId }: { buddyUserId: string }) => addBuddy(authUserId!, buddyUserId),
        {
            onSuccess: () => {
                queryClient.invalidateQueries(['buddies', authUserId]);
            },
        }
    );

    // Fetch buddy lists with buddies
    const buddyListsQuery = useQuery(['buddyLists', authUserId], () => fetchBuddyListsWithBuddies(userId), {
        enabled: !!authUserId,
    });

    // Create new buddy list mutation
    const createBuddyListMutation = useMutation(
        ({ listName }: { listName: string }) => createBuddyList(authUserId!, listName),
        {
            onSuccess: () => {
                queryClient.invalidateQueries(['buddyLists', authUserId]);
            },
        }
    );

    // Add buddy to list mutation
    const addBuddyToListMutation = useMutation(
        ({ buddyListId, buddyId }: { buddyListId: number, buddyId: number }) => addBuddyToList(buddyListId, buddyId),
        {
            onSuccess: () => {
                queryClient.invalidateQueries(['buddyLists', authUserId]);
            },
        }
    );

    return {
        buddies: buddiesQuery.data,
        isLoadingBuddies: buddiesQuery.isLoading,
        addBuddy: addBuddyMutation.mutate,
        buddyLists: buddyListsQuery.data,
        isLoadingBuddyLists: buddyListsQuery.isLoading,
        createBuddyList: createBuddyListMutation.mutate,
        addBuddyToList: addBuddyToListMutation.mutate,
    };
};
