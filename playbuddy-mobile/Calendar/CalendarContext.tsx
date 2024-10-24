import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { UseMutationResult } from '@tanstack/react-query';
import { useFilters, FilterState } from './hooks/useFilters';
import { useEvents } from './hooks/useEvents';
import { useWishlist } from './hooks/useWishlist';
import { useUserContext } from '../Auth/UserContext';
import { useCommonContext } from '../Common/CommonContext';
import { EventWithMetadata } from '../types';
import { EXPLICIT_WORDS, OrganizerFilterOption } from './calendarUtils';

// Filter explicit events for apple test user
const APPLE_USER_ID = '5d494e48-5457-4517-b183-dd1d8f2592a2';

type CalendarContextType = {
    // Filters
    filters: FilterState;
    setFilters: (filters: FilterState) => void;
    organizers: OrganizerFilterOption[];

    // Events
    filteredEvents: EventWithMetadata[];
    reloadEvents: () => void;
    isLoadingEvents: boolean;

    // Wishlist
    wishlistEvents: EventWithMetadata[];
    isOnWishlist: (eventId: string) => boolean;
    toggleWishlistEvent: UseMutationResult<void, Error, { eventId: string; isOnWishlist: boolean }, unknown>;

    // Friend's Wishlist
    friendWishlistEvents: EventWithMetadata[];
    setFriendWishlistShareCode: (shareCode: string | null) => void;
    friendWishlistShareCode: string | null;

    // Swipe Mode
    availableCardsToSwipe: EventWithMetadata[];
};

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const useCalendarContext = () => {
    const context = useContext(CalendarContext);
    if (!context) {
        throw new Error('useCalendarContext must be used within CalendarProvider');
    }
    return context;
};

const filterEvents = (eventsWithMetadata: EventWithMetadata[], filters: FilterState) => {
    return eventsWithMetadata.filter(event => {
        const searchTerm = filters.search.toLowerCase();
        const organizerId = event.organizer?.id || '';
        const eventName = event.name?.toLowerCase() || '';
        const organizerName = event.organizer?.name?.toLowerCase() || '';

        return (
            (!filters.organizers.length || filters.organizers.includes(organizerId)) &&
            (eventName.includes(searchTerm) || organizerName.includes(searchTerm))
        );
    });
};

// Helper function to remove explicit events
const removeExplicitEvents = (eventsWithMetadata: EventWithMetadata[]) => {
    return eventsWithMetadata.filter(event =>
        EXPLICIT_WORDS.every(word => !event.name.toLowerCase().includes(word.toLowerCase()))
    );
};

export const CalendarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { filters, setFilters } = useFilters();
    const { eventsWithMetadata, organizers, reloadEvents, isLoadingEvents } = useEvents();
    const { selectedLocationArea, selectedCommunity } = useCommonContext();
    const { authUserId } = useUserContext();
    const {
        wishlistEvents,
        friendWishlistEvents,
        setFriendWishlistShareCode,
        friendWishlistShareCode,
        isOnWishlist,
        toggleWishlistEvent,
        swipeChoices,
    } = useWishlist(eventsWithMetadata);

    const filteredEvents = useMemo(() => {
        const filtered = filterEvents(eventsWithMetadata, filters)
            // by location and community
            // If we have a location and community, filter by that
            // otherwise show all events


            .filter(event => {
                if (selectedLocationArea && selectedLocationArea.id !== 'all' && selectedCommunity && selectedCommunity.id !== 'all') {
                    return event.location_area?.id === selectedLocationArea.id &&
                        event.communities?.some(community => community.id === selectedCommunity.id);
                } else if (selectedLocationArea && selectedLocationArea.id !== 'all') {
                    return event.location_area?.id === selectedLocationArea.id;
                } else if (selectedCommunity && selectedCommunity.id !== 'all') {
                    return event.communities?.some(community => community.id === selectedCommunity.id);
                }
                return true;
            });
        const withoutExplicit = removeExplicitEvents(filtered);

        return authUserId && authUserId !== APPLE_USER_ID
            ? filtered
            : withoutExplicit;
    }, [eventsWithMetadata, filters, authUserId, selectedLocationArea, selectedCommunity]);

    const availableCardsToSwipe = useMemo(() => {
        return filteredEvents
            .filter(event =>
                !swipeChoices?.swipeModeChosenWishlist.some(choice => choice + '' === event.id + '') &&
                !swipeChoices?.swipeModeChosenSkip.some(choice => choice + '' === event.id + '')
            )
            .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    }, [swipeChoices, filteredEvents]);

    // Memoize the context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        // Filters
        filters,
        setFilters,
        organizers,

        // Events
        filteredEvents,
        reloadEvents,
        isLoadingEvents,

        // Wishlist
        wishlistEvents,
        isOnWishlist,
        toggleWishlistEvent,

        // Friend's Wishlist
        friendWishlistEvents,
        setFriendWishlistShareCode,
        friendWishlistShareCode,

        // Swipe Mode
        availableCardsToSwipe,
    }), [
        // Filters
        filters,
        setFilters,
        organizers,

        // Events
        filteredEvents,
        reloadEvents,
        isLoadingEvents,

        // Wishlist
        wishlistEvents,
        isOnWishlist,
        toggleWishlistEvent,

        // Friend's Wishlist
        friendWishlistEvents,
        setFriendWishlistShareCode,
        friendWishlistShareCode,

        // Swipe Mode
        availableCardsToSwipe,
    ]);

    return (
        <CalendarContext.Provider value={contextValue}>
            {children}
        </CalendarContext.Provider>
    );
};