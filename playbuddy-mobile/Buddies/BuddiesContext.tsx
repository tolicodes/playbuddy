import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { useUserContext } from '../Auth/UserContext';

interface Buddy {
    id: string;
    display_name: string;
    avatar_url: string;
}

interface BuddyList {
    id: number;
    name: string;
    buddy_list_buddies: { buddy_id: Buddy }[];
}

interface BuddiesContextType {
    buddies?: Buddy[];
    isLoadingBuddies: boolean;
    addBuddy: (params: { buddyUserId: string }) => void;
    buddyLists?: BuddyList[];
    isLoadingBuddyLists: boolean;
    createBuddyList: (params: { listName: string }) => void;
    addBuddyToList: (params: { buddyListId: number; buddyId: number }) => void;
}

const BuddiesContext = createContext<BuddiesContextType | undefined>(undefined);

export const BuddiesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const queryClient = useQueryClient();
    const { authUserId } = useUserContext();

    const buddiesQuery = useQuery({
        queryKey: ['buddies', authUserId],
        queryFn: () => fetchBuddies(authUserId),
        enabled: !!authUserId,
    });

    const addBuddyMutation = useMutation({
        mutationFn: ({ buddyUserId }: { buddyUserId: string }) => addBuddy(authUserId!, buddyUserId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['buddies', authUserId] });
        },
    });

    const buddyListsQuery = useQuery({
        queryKey: ['buddyLists', authUserId],
        queryFn: () => fetchBuddyListsWithBuddies(authUserId),
        enabled: !!authUserId,
    });

    const createBuddyListMutation = useMutation({
        mutationFn: ({ listName }: { listName: string }) => createBuddyList(authUserId!, listName),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['buddyLists', authUserId] });
        },
    });

    const addBuddyToListMutation = useMutation({
        mutationFn: ({ buddyListId, buddyId }: { buddyListId: number, buddyId: number }) => addBuddyToList(buddyListId, buddyId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['buddyLists', authUserId] });
        },
    });

    return (
        <BuddiesContext.Provider
            value={{
                buddies: buddiesQuery.data,
                isLoadingBuddies: buddiesQuery.isLoading,
                addBuddy: addBuddyMutation.mutate,
                buddyLists: buddyListsQuery.data,
                isLoadingBuddyLists: buddyListsQuery.isLoading,
                createBuddyList: createBuddyListMutation.mutate,
                addBuddyToList: addBuddyToListMutation.mutate,
            }}
        >
            {children}
        </BuddiesContext.Provider>
    );
};

export const useBuddiesContext = () => {
    const context = useContext(BuddiesContext);
    if (context === undefined) {
        throw new Error('useBuddiesContext must be used within a BuddiesProvider');
    }
    return context;
};

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
