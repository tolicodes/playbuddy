import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useFilters, FilterState } from './hooks/useFilters';
import { useEvents } from './hooks/useEvents';
import { useWishlist } from './hooks/useWishlist';
import { EventWithMetadata } from '../types';
import { EXPLICIT_WORDS, OrganizerFilterOption } from './calendarUtils';
import { useUserContext } from '../Auth/UserContext';

// Filter explicit events for apple test user
const APPLE_USER_ID = '5d494e48-5457-4517-b183-dd1d8f2592a2';

type CalendarContextType = {
    filters: FilterState;
    setFilters: (filters: FilterState) => void;
    organizers: OrganizerFilterOption[];
    filteredEvents: EventWithMetadata[];
    wishlistEvents: EventWithMetadata[];
    friendWishlistEvents: EventWithMetadata[];
    setFriendWishlistShareCode: (shareCode: string | null) => void;
    friendWishlistShareCode: string | null;
    isOnWishlist: (eventId: string) => boolean;
    toggleWishlistEvent: any; // TODO: Add type
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
    const { eventsWithMetadata, organizers } = useEvents();
    const {
        wishlistEvents,
        friendWishlistEvents,
        setFriendWishlistShareCode,
        friendWishlistShareCode,
        isOnWishlist,
        toggleWishlistEvent,
    } = useWishlist(eventsWithMetadata);
    const { userId } = useUserContext();

    const filteredEvents = useMemo(() => {
        const filtered = filterEvents(eventsWithMetadata, filters);
        const withoutExplicit = removeExplicitEvents(filtered);

        // apple shouldn't see explicit events
        return userId && userId !== APPLE_USER_ID ? filtered : withoutExplicit;
    }, [eventsWithMetadata, filters, userId]);

    // Memoize the context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        filters,
        setFilters,
        organizers,
        filteredEvents,
        wishlistEvents,
        friendWishlistEvents,
        setFriendWishlistShareCode,
        friendWishlistShareCode,
        isOnWishlist,
        toggleWishlistEvent,
    }), [
        filters,
        setFilters,
        organizers,
        filteredEvents,
        wishlistEvents,
        friendWishlistEvents,
        setFriendWishlistShareCode,
        friendWishlistShareCode,
        isOnWishlist,
        toggleWishlistEvent,
    ]);

    return (
        <CalendarContext.Provider value={contextValue}>
            {children}
        </CalendarContext.Provider>
    );
};