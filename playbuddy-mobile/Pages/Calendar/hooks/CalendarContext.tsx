import React, { createContext, useCallback, useContext, ReactNode, useMemo } from 'react';
import { UseMutationResult } from '@tanstack/react-query';
import { useWishlist, type WishlistEntry } from './useWishlist';
import { EventWithMetadata } from '../../../Common/Nav/NavStackType';
import { OrganizerFilterOption, getAvailableOrganizers } from './calendarUtils';
import { useUserContext } from '../../Auth/hooks/UserContext';
import { ADMIN_EMAILS } from '../../../config';
import { useFetchEvents as useCommonFetchEvents } from '../../../Common/db-axios/useEvents';
import { useImportSources } from '../../../Common/db-axios/useImportSources';
import { addEventMetadata, buildOrganizerColorMap as mapOrganizerColors, useFetchPrivateEvents } from './eventHelpers';
import type { ImportSource } from '../../../commonTypes';

const dedupeEventsById = <T extends { id: number }>(events: T[]) => {
    const seen = new Map<number, T>();
    for (const event of events) {
        if (!seen.has(event.id)) {
            seen.set(event.id, event);
        }
    }
    return Array.from(seen.values());
};

const normalizeHandle = (value?: string | null) => (value || '').replace(/^@/, '').trim().toLowerCase();
const normalizeUrl = (value?: string | null) => {
    if (!value) return '';
    const raw = value.trim();
    if (!raw) return '';
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
        const url = new URL(withScheme);
        url.hash = '';
        url.search = '';
        const normalized = `${url.host}${url.pathname}`.replace(/\/$/, '');
        return normalized.toLowerCase();
    } catch {
        return raw.replace(/^https?:\/\//i, '').replace(/\/$/, '').toLowerCase();
    }
};

const addOrganizerId = (target: Set<string>, value: unknown) => {
    if (value === undefined || value === null) return;
    const trimmed = String(value).trim();
    if (trimmed) target.add(trimmed);
};

const addHandle = (target: Set<string>, value: unknown) => {
    if (value === undefined || value === null) return;
    const normalized = normalizeHandle(String(value));
    if (normalized) target.add(normalized);
};

const addUrl = (target: Set<string>, value: unknown) => {
    if (value === undefined || value === null) return;
    const normalized = normalizeUrl(String(value));
    if (normalized) target.add(normalized);
};

const buildExcludedSourceLookup = (sources: ImportSource[]) => {
    const organizerIds = new Set<string>();
    const handles = new Set<string>();
    const urls = new Set<string>();

    sources.forEach((source) => {
        if (!source?.is_excluded) return;
        const status = source.approval_status ?? null;
        if (status === 'approved' || status === 'rejected') return;

        const defaults = source.event_defaults || {};
        const metadata = source.metadata || {};
        addOrganizerId(organizerIds, (defaults as any).organizer_id);
        addOrganizerId(organizerIds, (defaults as any).organizerId);
        addOrganizerId(organizerIds, (metadata as any).organizer_id);
        addOrganizerId(organizerIds, (metadata as any).organizerId);

        const isHandleSource =
            (source.identifier_type || '').toLowerCase() === 'handle' ||
            source.source === 'fetlife_handle';
        if (isHandleSource) {
            addHandle(handles, source.identifier);
        }
        const isUrlSource =
            (source.identifier_type || '').toLowerCase() === 'url' ||
            source.source === 'eb_url' ||
            source.source === 'url' ||
            /^https?:\/\//i.test(source.identifier || '');
        if (isUrlSource) {
            addUrl(urls, source.identifier);
        }
    });

    return { organizerIds, handles, urls };
};

type CalendarContextType = {
    organizers: OrganizerFilterOption[];

    // Events
    allEvents: EventWithMetadata[];
    reloadEvents: () => void;
    isLoadingEvents: boolean;

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

    const adminApprovalStatuses = isAdmin ? ['approved', 'pending', 'rejected'] : undefined;
    const { data: events = [], isLoading: isLoadingEvents, refetch: reloadEvents } = useCommonFetchEvents({
        approvalStatuses: adminApprovalStatuses,
    });
    const { data: importSources = [] } = useImportSources({ includeAll: true, enabled: isAdmin });
    const { privateEvents, isLoadingPrivateEvents } = useFetchPrivateEvents();

    const allEvents = useMemo(
        () => dedupeEventsById([...events, ...privateEvents]),
        [events, privateEvents]
    );

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

    const excludedSourceLookup = useMemo(() => {
        if (!isAdmin) {
            return { organizerIds: new Set<string>(), handles: new Set<string>(), urls: new Set<string>() };
        }
        return buildExcludedSourceLookup(importSources || []);
    }, [importSources, isAdmin]);

    const isEventSourceExcluded = useCallback(
        (event: EventWithMetadata) => {
            if (!isAdmin) return false;
            const urlCandidates = [
                event.ticket_url,
                event.event_url,
                (event as any)?.source_url,
            ].map(normalizeUrl).filter(Boolean);
            if (urlCandidates.some((url) => excludedSourceLookup.urls.has(url))) {
                return true;
            }
            const organizer = event.organizer;
            if (!organizer) return false;
            const organizerId = organizer.id != null ? String(organizer.id) : '';
            if (organizerId && excludedSourceLookup.organizerIds.has(organizerId)) {
                return true;
            }
            const handles = [
                organizer.fetlife_handle,
                ...(organizer.fetlife_handles || []),
            ];
            return handles.some((handle) => excludedSourceLookup.handles.has(normalizeHandle(handle)));
        },
        [excludedSourceLookup, isAdmin]
    );

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

    // Memoize the context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        organizers,

        // Events
        allEvents: eventsWithMetadata,
        reloadEvents,
        isLoadingEvents: isLoadingEvents || isLoadingPrivateEvents,

        // Wishlist
        wishlistEvents,
        wishlistEntries,
        wishlistEntryMap,
        isOnWishlist,
        toggleWishlistEvent,
        // Swipe Mode
        availableCardsToSwipe,
        isEventSourceExcluded,
    }), [
        organizers, eventsWithMetadata, reloadEvents, isLoadingEvents,
        wishlistEvents, wishlistEntries, wishlistEntryMap, isOnWishlist, toggleWishlistEvent, availableCardsToSwipe,
        isEventSourceExcluded,
    ]);

    return (
        <CalendarContext.Provider value={contextValue}>
            {children}
        </CalendarContext.Provider>
    );
};
