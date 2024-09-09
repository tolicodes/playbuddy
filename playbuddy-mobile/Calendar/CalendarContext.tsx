import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useFilters } from './hooks/useFilters';
import { useEvents } from './hooks/useEvents';
import { useWishlist } from './hooks/useWishlist';
import { EventWithMetadata } from '../types';
import { EXPLICIT_WORDS } from './calendarUtils';

type CalendarContextType = {
    filters: any;
    setFilters: any;
    organizers: any;
    filteredEvents: any;
    wishlistEvents: any;
    friendWishlistEvents: any;
    setFriendWishlistCode: (shareCode: string | null) => void;
    isOnWishlist: (eventId: string) => boolean;
    toggleWishlistEvent: any
};

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const useCalendarContext = () => {
    const context = useContext(CalendarContext);
    if (!context) {
        throw new Error('useCalendarContext must be used within CalendarProvider');
    }
    return context;
};

const filterEvents = (eventsWithMetadata: EventWithMetadata[], filters: any) => {
    const filteredEvents = eventsWithMetadata.filter(event => {
        const searchTerm = filters.search.toLowerCase();
        const organizerId = event.organizer?.id || '';
        const eventName = event.name?.toLowerCase() || '';
        const organizerName = event.organizer?.name?.toLowerCase() || '';

        return (
            (!filters.organizers.length || filters.organizers.includes(organizerId)) &&
            (eventName.includes(searchTerm) || organizerName.includes(searchTerm))
        );
    });
    return filteredEvents
}

const removeExplicitEvents = (eventsWithMetadata: EventWithMetadata[]) => {
    return eventsWithMetadata.filter(event => EXPLICIT_WORDS.every(word => !event.name.toLowerCase().includes(word.toLowerCase())));
}

export const CalendarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { filters, setFilters } = useFilters();
    const { eventsWithMetadata, organizers } = useEvents();
    const { wishlistEvents, friendWishlistEvents, setFriendWishlistCode, isOnWishlist, toggleWishlistEvent } = useWishlist(eventsWithMetadata);

    const filteredEvents = useMemo(() => {
        const filtered = filterEvents(eventsWithMetadata, filters);
        const withoutExplicit = removeExplicitEvents(filtered);
        return withoutExplicit;
    },
        [eventsWithMetadata, filters]
    );

    return (
        <CalendarContext.Provider
            value={{
                filters,
                setFilters,

                organizers,

                filteredEvents,

                wishlistEvents,
                friendWishlistEvents,
                setFriendWishlistCode,
                isOnWishlist,
                toggleWishlistEvent,
            }}
        >
            {children}
        </CalendarContext.Provider>
    );
};
