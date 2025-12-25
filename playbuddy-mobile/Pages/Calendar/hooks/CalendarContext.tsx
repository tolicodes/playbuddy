import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { UseMutationResult } from '@tanstack/react-query';
import { useWishlist } from './useWishlist';
import { EventWithMetadata } from '../../../Common/Nav/NavStackType';
import { OrganizerFilterOption, getAvailableOrganizers } from './calendarUtils';
import { useUserContext } from '../../Auth/hooks/UserContext';
import { ADMIN_EMAILS } from '../../../config';
import { useFetchEvents as useCommonFetchEvents } from '../../../Common/db-axios/useEvents';
import { addEventMetadata, buildOrganizerColorMap as mapOrganizerColors, useFetchPrivateEvents } from './eventHelpers';

type CalendarContextType = {
    organizers: OrganizerFilterOption[];

    // Events
    allEvents: EventWithMetadata[];
    reloadEvents: () => void;
    isLoadingEvents: boolean;

    // Wishlist
    wishlistEvents: EventWithMetadata[];
    isOnWishlist: (eventId: number) => boolean;
    toggleWishlistEvent: UseMutationResult<void, Error, { eventId: number; isOnWishlist: boolean }, unknown>;

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

// // Helper function to remove explicit events
// const removeExplicitEvents = (eventsWithMetadata: EventWithMetadata[]) => {
//     return eventsWithMetadata.filter(event =>
//         EXPLICIT_WORDS.every(word => !event.name.toLowerCase().includes(word.toLowerCase()))
//     );
// };

export const CalendarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { userProfile } = useUserContext();
    const isAdmin = !!userProfile?.email && ADMIN_EMAILS.includes(userProfile.email);

    const { data: events = [], isLoading: isLoadingEvents, refetch: reloadEvents } = useCommonFetchEvents({
        includeApprovalPending: isAdmin,
    });
    const { privateEvents, isLoadingPrivateEvents } = useFetchPrivateEvents();

    const allEvents = useMemo(() => [...events, ...privateEvents], [events, privateEvents]);

    const organizers = useMemo(
        () => getAvailableOrganizers(allEvents || []),
        [allEvents]
    );
    const organizerColorMap = useMemo(
        () => mapOrganizerColors(organizers as any),
        [organizers]
    );

    const eventsWithMetadata = useMemo(() => {
        const withoutFacilitatorOnly = allEvents
            .filter(event => !event.facilitator_only)
            .filter(event => !event.non_ny);
        return addEventMetadata({ events: withoutFacilitatorOnly, organizerColorMap });
    }, [allEvents, organizerColorMap]);

    const {
        wishlistEvents,
        isOnWishlist,
        toggleWishlistEvent,
        swipeChoices,
    } = useWishlist(eventsWithMetadata);

    const availableCardsToSwipe = useMemo(() => {
        return eventsWithMetadata
            .filter(event =>
                !swipeChoices?.swipeModeChosenWishlist.some(choice => choice === event.id) &&
                !swipeChoices?.swipeModeChosenSkip.some(choice => choice === event.id)
            )
            .sort((a, b) => new Date(a.start_date) < new Date(b.start_date) ? -1 : 1);
    }, [swipeChoices, eventsWithMetadata]);

    // Memoize the context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        organizers,

        // Events
        allEvents: eventsWithMetadata,
        reloadEvents,
        isLoadingEvents: isLoadingEvents || isLoadingPrivateEvents,

        // Wishlist
        wishlistEvents,
        isOnWishlist,
        toggleWishlistEvent,
        // Swipe Mode
        availableCardsToSwipe,
    }), [
        organizers, eventsWithMetadata, reloadEvents, isLoadingEvents,
        wishlistEvents, isOnWishlist, toggleWishlistEvent, availableCardsToSwipe
    ]);

    return (
        <CalendarContext.Provider value={contextValue}>
            {children}
        </CalendarContext.Provider>
    );
};
