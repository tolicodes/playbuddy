import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { getAvailableOrganizers, OrganizerFilterOption, useRefreshEventsOnAppStateChange } from './calendarUtils';
import { useFetchEvents } from './hooks/useFetchEvents';
import { Event } from './../commonTypes';

// Type definition for the filter state
type FilterState = {
    organizers: string[]; // Array of selected organizer IDs
    search: string;       // Search term
};

// Type definition for Event with additional metadata
export type EventWithMetadata = Event & {
    organizerDotColor?: string; // Color associated with the event's organizer
};

// Type definition for the context value
type CalendarContextType = {
    filters: FilterState;
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
    organizers: OrganizerFilterOption[];
    filteredEvents: EventWithMetadata[];
};

// Creating the context with an undefined initial value
const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

// Custom hook to use the calendar context
export const useCalendarContext = (): CalendarContextType => {
    const context = useContext(CalendarContext);
    if (!context) {
        throw new Error('useFilters must be used within a CalendarProvider');
    }
    return context;
};

// Props type for the CalendarProvider
type CalendarProviderProps = {
    children: ReactNode;
};

// CalendarProvider component to manage the state and provide context to children
const CalendarProvider: React.FC<CalendarProviderProps> = ({ children }) => {
    // Refresh events based on app state changes
    const { appState } = useRefreshEventsOnAppStateChange();
    // Fetch events based on the app state, like when the user navigates away from the app and back
    const { events } = useFetchEvents(appState);

    // State for filters
    const [filters, setFilters] = useState<FilterState>({ organizers: [], search: '' });

    // Memoized organizers based on the current events
    const organizers = useMemo(() => getAvailableOrganizers(events), [events]);

    // Memoized organizers sorted by count (most frequent first)
    // This is used to assign priority to the organizers in the day view dots
    const organizersByCount = useMemo(() =>
        organizers.sort((a, b) => b.count - a.count), [organizers]);

    // Memoized map of organizer IDs to their color and priority (for day view dots)
    const organizerDotColorMap = useMemo(() =>
        organizersByCount.reduce((acc, organizer, i) => {
            acc[organizer.id] = {
                color: organizer.color, // Assign color to the organizer
                priority: i             // Assign priority based on order
            };
            return acc;
        }, {} as { [key: string]: { color: string; priority: number; } }),
        [organizersByCount]
    );

    // Memoized filtered and sorted events based on filters
    const filteredEvents = useMemo(() => {
        const organizerIds = filters.organizers; // Selected organizer IDs
        const searchTerm = filters.search.toLowerCase(); // Lowercased search term

        // Filter events by selected organizers
        const organizerFilteredEvents = events.filter(event => {
            const organizerId = event.organizer?.id || '';
            return !organizerIds.length || organizerIds.includes(organizerId); // Include all if no filter
        });

        // Further filter events by the search term
        const searchFilteredEvents = organizerFilteredEvents.filter(item => {
            const eventName = item.name?.toLowerCase() || '';
            const organizerName = item.organizer?.name?.toLowerCase() || '';
            return eventName.includes(searchTerm)
                || organizerName.includes(searchTerm)
                || item.description?.toLowerCase().includes(searchTerm)
                || !searchTerm; // Include all if no search term
        });

        // Add metadata and sort by organizer count
        return searchFilteredEvents.map(event => ({
            ...event,
            organizerDotColor: organizerDotColorMap[event.organizer?.id]?.color || '' // Assign dot color
        })).sort((a, b) => {
            const aIndex = organizersByCount.findIndex(organizer => organizer.id === a.organizer?.id);
            const bIndex = organizersByCount.findIndex(organizer => organizer.id === b.organizer?.id);
            return aIndex - bIndex; // Sort by index (priority)
        });
    }, [events, filters, organizersByCount, organizerDotColorMap]);

    return (
        <CalendarContext.Provider value={{ filters, setFilters, organizers, filteredEvents }}>
            {children}
        </CalendarContext.Provider>
    );
};

export default CalendarProvider;
