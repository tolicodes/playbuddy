import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient, UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import { useUserContext } from '../Auth/UserContext';
import axios from 'axios';
import { API_BASE_URL } from '../config';

interface Buddy {
    user_id: string;
    name: string;
    avatar_url: string;
}

interface BuddyList {
    id: number;
    name: string;
    buddy_list_buddies: { buddy_id: Buddy }[];
}

export type SharedEvent = {
    eventId: string;
    sharedBuddies: {
        user_id: string;
        name: string;
        avatar_url: string | null;
    }[];
};

export interface BuddyWishlist {
    user_id: string;
    avatar_url: string;
    name: string;
    events: string[];
}

interface BuddiesContextType {
    buddies: UseQueryResult<Buddy[], Error>;
    addBuddy: UseMutationResult<null, Error, { buddyUserId: string }, unknown>;

    sharedEvents: UseQueryResult<SharedEvent[], Error>;
    buddiesWishlists: UseQueryResult<BuddyWishlist[], Error>;

    buddyLists: UseQueryResult<BuddyList[], Error>;

    createBuddyList: UseMutationResult<null, Error, { listName: string }, unknown>;
    addBuddyToList: UseMutationResult<null, Error, { buddyListId: number; buddyId: string }, unknown>;
}

const BuddiesContext = createContext<BuddiesContextType | undefined>(undefined);

export const BuddiesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const queryClient = useQueryClient();
    const { authUserId } = useUserContext();
    const buddiesQuery = useQuery<Buddy[]>({
        queryKey: ['buddies'],
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/buddies`);
            return response.data;
        },
        enabled: !!authUserId,

    });

    const addBuddyMutation = useMutation({
        mutationFn: async ({ buddyUserId }: { buddyUserId: string }) => {
            await axios.post(`${API_BASE_URL}/buddies/add`, { buddyUserId });
            return null;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['buddies'] });
        },
    });

    const sharedEventsQuery = useQuery<SharedEvent[]>({
        queryKey: ['sharedEvents'],
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/wishlist/sharedEvents`);
            return response.data;
        },
        enabled: !!authUserId,
    });

    const buddiesWishlistsQuery = useQuery<BuddyWishlist[]>({
        queryKey: ['buddiesWishlists'],
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/wishlist/buddies`);
            return response.data;
        },
        enabled: !!authUserId,

    });

    const buddyListsQuery = useQuery({
        queryKey: ['buddyLists'],
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/buddies/lists`);
            return response.data;
        },
        enabled: !!authUserId,
    });

    const createBuddyListMutation = useMutation({
        mutationFn: async ({ listName }: { listName: string }) => {
            await axios.post(`${API_BASE_URL}/buddies/lists`, { listName });
            return null;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['buddyLists'] });
        },
    });

    const addBuddyToListMutation = useMutation({
        mutationFn: async ({ buddyListId, buddyId }: { buddyListId: number, buddyId: string }) => {
            await axios.post(`${API_BASE_URL}/buddies/lists/${buddyListId}/buddies`, { buddyId });
            return null;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['buddyLists'] });
        },
    });

    return (
        <BuddiesContext.Provider
            value={{
                // Buddies
                buddies: buddiesQuery,
                addBuddy: addBuddyMutation,

                // Wishlists
                sharedEvents: sharedEventsQuery,
                buddiesWishlists: buddiesWishlistsQuery,

                // Lists
                buddyLists: buddyListsQuery,
                createBuddyList: createBuddyListMutation,
                addBuddyToList: addBuddyToListMutation,
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
