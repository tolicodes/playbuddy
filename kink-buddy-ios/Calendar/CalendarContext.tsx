import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { getAvailableOrganizers, OrganizerFilterOption, useRefreshEventsOnAppStateChange } from './calendarUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '../supabaseCiient';

import { useFetchEvents } from './hooks/useFetchEvents';
import { Event } from './../commonTypes';
import { useFetchWishlistEvents, useToggleWishlistEvent } from './hooks/useFetchWishlistEvents';

// Type definition for the filter state
type FilterState = {
    organizers: string[]; // Array of selected organizer IDs
    search: string;       // Search term
};

// Type definition for Event with additional metadata
export type EventWithMetadata = Event & {
    organizerDotColor?: string; // Color associated with the event's organizer
    isOnWishlist?: boolean;
};

// Type definition for the context value
type CalendarContextType = {
    filters: FilterState;
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
    organizers: OrganizerFilterOption[];
    filteredEvents: EventWithMetadata[];
    toggleWishlistEvent: any;
    wishlistEvents: EventWithMetadata[];
    setFriendWishlistCode: (shareCode: string) => Promise<void>;
    friendWishlistEvents: EventWithMetadata[];
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

const saveFiltersToLocalStorage = async (filters: FilterState) => {
    try {
        const jsonValue = JSON.stringify(filters);
        await AsyncStorage.setItem('@filters', jsonValue);
    } catch (e) {
        console.error('Failed to save filters', e);
    }
};

const loadFiltersFromLocalStorage = async (): Promise<FilterState | null> => {
    try {
        const jsonValue = await AsyncStorage.getItem('@filters');
        return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
        console.error('Failed to load filters', e);
        return null;
    }
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

    // Load wishlist
    const { data: wishlistEventIds } = useFetchWishlistEvents(); // Use React Query to fetch wishlist

    // State for filters
    const [filters, setFilters] = useState<FilterState>({ organizers: [], search: '' });

    // SAVING FILTERS TO LOCAL STORAGE
    const [filtersLoadedFromLocalStorage, setFiltersLoadedFromLocalStorage] = useState(false);

    // Save filters to local storage when they change
    useEffect(() => {
        // on load we want to wait for filters to be loaded from local storage
        if (!filtersLoadedFromLocalStorage) return;

        saveFiltersToLocalStorage(filters);
    }, [filters, filtersLoadedFromLocalStorage]);

    // Load filters from local storage on initial render
    useEffect(() => {
        loadFiltersFromLocalStorage().then((loadedFilters) => {
            if (loadedFilters) {
                setFilters(loadedFilters);
                setFiltersLoadedFromLocalStorage(true);
            }
        });
    }, []);

    // BUILD ORGANIZER DOT MAP
    const organizers = useMemo(() => getAvailableOrganizers(events), [events]);

    // Sort organizers by count and map their colors
    const organizersByCount = useMemo(() =>
        organizers.sort((a, b) => b.count - a.count), [organizers]
    );

    const organizerDotColorMap = useMemo(() =>
        organizersByCount.reduce((acc, organizer, i) => {
            acc[organizer.id] = {
                color: organizer.color,
                priority: i
            };
            return acc;
        }, {} as { [key: string]: { color: string; priority: number; } }),
        [organizersByCount]
    );

    // Apply metadata (organizer color and wishlist flag) to all events
    const eventsWithMetadata = useMemo(() => {
        return events.map(event => ({
            ...event,
            organizerDotColor: organizerDotColorMap[event.organizer?.id]?.color || '',
            organizerPriority: organizerDotColorMap[event.organizer?.id]?.priority || Infinity,
            isOnWishlist: wishlistEventIds?.includes(event.id)
        }))
            .sort((a, b) => a.organizerPriority - b.organizerPriority);  // Sort by organizer's priority

    }, [events, organizerDotColorMap, wishlistEventIds]);

    // FILTER REGULAR EVENTS BASED ON FILTERS
    const filteredEvents = useMemo(() => {
        const organizerIds = filters.organizers;
        const searchTerm = filters.search.toLowerCase();

        return eventsWithMetadata.filter(event => {
            const organizerId = event.organizer?.id || '';
            const eventName = event.name?.toLowerCase() || '';
            const organizerName = event.organizer?.name?.toLowerCase() || '';

            // Filter by organizer and search term
            return (
                (!organizerIds.length || organizerIds.includes(organizerId)) &&
                (eventName.includes(searchTerm) ||
                    organizerName.includes(searchTerm) ||
                    event.description?.toLowerCase()?.includes(searchTerm))
            );
        });
    }, [eventsWithMetadata, filters]);

    // WISHLIST EVENTS
    const wishlistEvents = useMemo(() => {
        return filteredEvents.filter(event => event.isOnWishlist);
    }, [filteredEvents]);

    const toggleWishlistEvent = useToggleWishlistEvent();

    // FRIEND WISHLIST
    const [friendWishlistEventIds, setFriendWishlistEventIds] = useState<string[]>([]);

    const setFriendWishlistCode = async (shareCode: string | null) => {
        if (!shareCode) {
            setFriendWishlistEventIds([]);
            return
        }

        try {
            // Step 1: Fetch user ID based on the share code
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('user_id')
                .eq('share_code', shareCode)
                .single();

            if (userError || !userData) {
                throw new Error('Failed to find user with this share code');
            }

            const userId = userData.user_id;

            // Step 2: Fetch favorites for that user
            const { data: wishlistData, error: wishlistError } = await supabase
                .from('event_wishlist')
                .select('event_id')
                .eq('user_id', userId);

            if (wishlistError || !wishlistData) {
                throw new Error('Failed to fetch wishlist for the user');
            }

            // Step 3: Store the friend's wishlist in the state
            setFriendWishlistEventIds(wishlistData.map((item: { event_id: string }) => item.event_id));
        } catch (error) {
            console.error('Error fetching friend’s wishlist:', error);
        }
    };

    const friendWishlistEvents = useMemo(() => {
        return filteredEvents.filter(event => friendWishlistEventIds.includes(event.id));
    }, [friendWishlistEventIds, filteredEvents]);

    return (
        <CalendarContext.Provider value={{ filters, setFilters, organizers, filteredEvents, toggleWishlistEvent, wishlistEvents, setFriendWishlistCode, friendWishlistEvents }}>
            {children}
        </CalendarContext.Provider>
    );
};

export default CalendarProvider;
