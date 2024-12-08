import React, { createContext, useContext, ReactNode, useMemo, useEffect } from 'react';
import { UseMutationResult } from '@tanstack/react-query';
import { useFilters, FilterState } from './useFilters';
import { useEvents } from './useEvents';
import { useWishlist } from './useWishlist';
import { useUserContext } from '../../Auth/hooks/UserContext';
import { EventWithMetadata } from '../../../types';
import { EXPLICIT_WORDS, OrganizerFilterOption } from './calendarUtils';
import { ALL_COMMUNITIES_ID } from '../../../Common/hooks/CommonContext';
import { ALL_LOCATION_AREAS_ID } from '../../../Common/hooks/CommonContext';

// Filter explicit events for apple test user
const APPLE_USER_ID = '5d494e48-5457-4517-b183-dd1d8f2592a2';

type CalendarContextType = {
    // Filters
    filters: FilterState;
    setFilters: (filters: FilterState) => void;
    organizers: OrganizerFilterOption[];

    // Events
    filteredEvents: EventWithMetadata[];
    allEvents: EventWithMetadata[];
    reloadEvents: () => void;
    isLoadingEvents: boolean;

    // Wishlist
    wishlistEvents: EventWithMetadata[];
    isOnWishlist: (eventId: string) => boolean;
    toggleWishlistEvent: UseMutationResult<void, Error, { eventId: string; isOnWishlist: boolean }, unknown>;

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
    const searchTerm = filters.search.toLowerCase();

    return eventsWithMetadata.filter(event => {
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
    const { selectedLocationAreaId, selectedCommunityId } = useUserContext();
    const { authUserId } = useUserContext();
    const {
        wishlistEvents,
        isOnWishlist,
        toggleWishlistEvent,
        swipeChoices,
    } = useWishlist(eventsWithMetadata);

    useEffect(() => {
        const intervalId = setInterval(() => {
            reloadEvents();
        }, 60000); // 60000 milliseconds = 1 minute

        return () => clearInterval(intervalId); // Cleanup interval on component unmount
    }, [reloadEvents]);

    const filteredEvents = useMemo(() => {
        const filtered = filterEvents(eventsWithMetadata, filters)
            .filter(event => {
                const hasValidLocation = selectedLocationAreaId && selectedLocationAreaId !== ALL_LOCATION_AREAS_ID;
                const hasValidCommunity = selectedCommunityId && selectedCommunityId !== ALL_COMMUNITIES_ID;
                if (hasValidLocation && hasValidCommunity) {
                    return event.location_area?.id === selectedLocationAreaId &&
                        event.communities?.some(community => community.id === selectedCommunityId);
                } else if (hasValidLocation) {
                    return event.location_area?.id === selectedLocationAreaId;
                } else if (hasValidCommunity) {
                    return event.communities?.some(community => community.id === selectedCommunityId);
                }
                return true;
            });
        const withoutExplicit = removeExplicitEvents(filtered);

        return authUserId && authUserId !== APPLE_USER_ID
            ? filtered
            : withoutExplicit;
    }, [eventsWithMetadata, filters, authUserId, selectedLocationAreaId, selectedCommunityId]);

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
        allEvents: eventsWithMetadata,
        reloadEvents,
        isLoadingEvents,

        // Wishlist
        wishlistEvents,
        isOnWishlist,
        toggleWishlistEvent,
        // Swipe Mode
        availableCardsToSwipe,
    }), [
        filters, setFilters, organizers, filteredEvents, eventsWithMetadata, reloadEvents, isLoadingEvents,
        wishlistEvents, isOnWishlist, toggleWishlistEvent, availableCardsToSwipe
    ]);

    return (
        <CalendarContext.Provider value={contextValue}>
            {children}
        </CalendarContext.Provider>
    );
};