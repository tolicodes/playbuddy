import { useCallback, useMemo } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';

import { useWishlist, type WishlistEntry } from './useWishlist';
import { OrganizerFilterOption, getAvailableOrganizers } from './calendarUtils';
import { useUserContext } from '../../Auth/hooks/UserContext';
import { useFetchEvents as useCommonFetchEvents } from '../../../Common/db-axios/useEvents';
import { addEventMetadata, buildOrganizerColorMap as mapOrganizerColors } from './eventHelpers';
import { ADMIN_EMAILS } from '../../../config';
import type { EventWithMetadata } from '../../../Common/Nav/NavStackType';

const dedupeEventsById = <T extends { id: number }>(events: T[]) => {
    const seen = new Map<number, T>();
    for (const event of events) {
        if (!seen.has(event.id)) {
            seen.set(event.id, event);
        }
    }
    return Array.from(seen.values());
};


export type CalendarData = {
    organizers: OrganizerFilterOption[];

    // Events
    allEvents: EventWithMetadata[];
    reloadEvents: () => void;
    isLoadingEvents: boolean;
    isUsingCachedFallback: boolean;

    // Wishlist
    wishlistEvents: EventWithMetadata[];
    wishlistEntries: WishlistEntry[];
    wishlistEntryMap: Map<number, WishlistEntry>;
    isOnWishlist: (eventId: number) => boolean;
    toggleWishlistEvent: UseMutationResult<void, Error, { eventId: number; isOnWishlist: boolean }, unknown>;

    // Swipe Mode
    availableCardsToSwipe: EventWithMetadata[];

    // Admin helpers
    isEventSourceExcluded: (event: EventWithMetadata) => boolean;
};

export type CalendarDataOptions = {
    includeHidden?: boolean;
    includeHiddenOrganizers?: boolean;
    includeApprovalPending?: boolean;
    approvalStatuses?: string[];
};

export const useCalendarData = (options: CalendarDataOptions = {}): CalendarData => {
    const { authUserId, userProfile } = useUserContext();
    const isAdmin = !!userProfile?.email && ADMIN_EMAILS.includes(userProfile.email);
    const adminApprovalStatuses = isAdmin ? ['approved', 'pending', 'rejected'] : undefined;
    const resolvedApprovalStatuses = options.approvalStatuses ?? adminApprovalStatuses;
    const includeHidden = options.includeHidden ?? false;
    const includeHiddenOrganizers = options.includeHiddenOrganizers ?? false;
    const includeApprovalPending = options.includeApprovalPending ?? false;

    const {
        data: eventsData = [],
        isLoading: isLoadingEvents,
        refetch: reloadEvents,
        isUsingCachedFallback,
    } = useCommonFetchEvents({
        approvalStatuses: resolvedApprovalStatuses,
        includePrivate: !!authUserId,
        includeHidden,
        includeHiddenOrganizers,
        includeApprovalPending,
    });

    const events = useMemo(() => dedupeEventsById(eventsData), [eventsData]);

    const organizers = useMemo(
        () => getAvailableOrganizers(events || []),
        [events]
    );
    const organizerColorMap = useMemo(
        () => mapOrganizerColors(organizers as any),
        [organizers]
    );

    const eventsWithMetadata = useMemo(
        () => addEventMetadata({ events, organizerColorMap }),
        [events, organizerColorMap]
    );

    const isEventSourceExcluded = useCallback(() => false, []);

    const {
        wishlistEvents,
        wishlistEntries,
        wishlistEntryMap,
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

    return {
        organizers,

        // Events
        allEvents: eventsWithMetadata,
        reloadEvents,
        isLoadingEvents,
        isUsingCachedFallback: isUsingCachedFallback ?? false,

        // Wishlist
        wishlistEvents,
        wishlistEntries,
        wishlistEntryMap,
        isOnWishlist,
        toggleWishlistEvent,

        // Swipe Mode
        availableCardsToSwipe,

        isEventSourceExcluded,
    };
};
