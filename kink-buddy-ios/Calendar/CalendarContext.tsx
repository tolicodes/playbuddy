import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { getAvailableOrganizers, OrganizerFilterOption, useRefreshEventsOnAppStateChange } from './calendarUtils';
import { useFetchEvents } from './hooks/useFetchEvents';
import { Event } from './../commonTypes';

type FilterState = {
    // ids
    organizers: string[];
    search: string;
};

type CalendarContextType = {
    filters: FilterState;
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
    organizers: OrganizerFilterOption[];
    setOrganizers: React.Dispatch<React.SetStateAction<OrganizerFilterOption[]>>;
    events: Event[],
    filteredEvents: Event[];
};

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const useCalendarContext = (): CalendarContextType => {
    const context = useContext(CalendarContext);
    if (!context) {
        throw new Error('useFilters must be used within a CalendarProvider');
    }
    return context;
};

type CalendarProviderProps = {
    children: ReactNode;
};

const CalendarProvider: React.FC<CalendarProviderProps> = ({ children }) => {
    const { appState } = useRefreshEventsOnAppStateChange();
    const { events } = useFetchEvents(appState);
    const [filteredEvents, setFilteredEvents] = useState<Event[]>(events);

    const [filters, setFilters] = useState<FilterState>({ organizers: [], search: '' });
    const [organizers, setOrganizers] = useState<OrganizerFilterOption[]>([]);

    useEffect(() => {
        // with id, name, count
        const organizers = getAvailableOrganizers(events);
        setOrganizers(organizers);
    }, [filteredEvents, setOrganizers]);

    useEffect(() => {
        const organizerIds = filters.organizers;
        const organizerFilteredEvents = events.filter((event) => {
            if (!organizerIds.length) return true;
            return organizerIds.includes(event.organizer?.id || '');
        });

        const searchFilteredEvents = organizerFilteredEvents.filter(item =>
            item.name.toLowerCase().includes(filters.search.toLowerCase()) ||
            item.organizer?.name.toLowerCase().includes(filters.search.toLowerCase())
        );

        setFilteredEvents(searchFilteredEvents);

    }, [events, filters]);

    return (
        <CalendarContext.Provider value={{ filters, setFilters, organizers, setOrganizers, events, filteredEvents }}>
            {children}
        </CalendarContext.Provider>
    );
};

export default CalendarProvider;
