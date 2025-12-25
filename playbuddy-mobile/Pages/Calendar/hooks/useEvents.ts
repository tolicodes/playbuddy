import { useEffect, useMemo } from 'react';
import axios from 'axios';
import { Event } from '../../../commonTypes';
import { API_URL, ADMIN_EMAILS } from '../../../config';
import { getAvailableOrganizers } from './calendarUtils';
import { useQuery } from '@tanstack/react-query';
import { useUserContext } from '../../Auth/hooks/UserContext';
import { useFetchEvents as useCommonFetchEvents } from '../../../Common/db-axios/useEvents';

type OrganizerColorMap = { [key: string]: { color: string; priority: number } }
type Organizer = {
    id: string;
    color: string;
};
function buildOrganizerColorMap(organizers: Organizer[]): OrganizerColorMap {
    return organizers.reduce((acc, organizer, i) => {
        acc[organizer.id] = {
            color: organizer.color,
            priority: i,
        };
        return acc;
    }, {} as OrganizerColorMap);
}

function addEventMetadata({ events, organizerColorMap }: { events: Event[]; organizerColorMap: OrganizerColorMap }) {
    return events.map(event => ({
        ...event,
        organizerColor: organizerColorMap[event.organizer?.id]?.color || '',
        organizerPriority: organizerColorMap[event.organizer?.id]?.priority || Infinity,
    })).sort((a, b) => a.organizerPriority - b.organizerPriority);
}

export const useFetchEvents = (appState?: string, authUserId?: string, isAdmin?: boolean) => {
    const query = useCommonFetchEvents({ includeApprovalPending: !!isAdmin });
    const events = query.data || [];

    // Reload events when the app state changes
    useEffect(() => {
        query.refetch();
    }, [appState, authUserId, query.refetch]);

    return { events, reloadEvents: query.refetch, isLoadingEvents: query.isLoading };
};

export const useFetchPrivateEvents = () => {
    const { authUserId } = useUserContext();
    const { data: privateEvents = [], isLoading: isLoadingPrivateEvents } = useQuery({
        queryKey: ['events', authUserId],
        queryFn: async () => {
            return axios.get<Event[]>(API_URL.events, { params: { visibility: 'private' } }).then(response => response.data);
        },
        enabled: !!authUserId,
    });

    return { privateEvents, isLoadingPrivateEvents };
};


export const useEvents = (appState?: string) => {
    const { authUserId, userProfile } = useUserContext();
    const isAdmin = !!userProfile?.email && ADMIN_EMAILS.includes(userProfile.email);
    // Fetch events based on app state
    const { events, reloadEvents, isLoadingEvents } = useFetchEvents(appState, authUserId || '', isAdmin);
    const { privateEvents, isLoadingPrivateEvents } = useFetchPrivateEvents();

    const allEvents = [...events, ...privateEvents];

    const organizers = useMemo(() =>
        getAvailableOrganizers(allEvents || []),
        [events]
    );
    const organizerColorMap = useMemo(() =>
        buildOrganizerColorMap(organizers),
        [organizers]
    );

    const withoutFacilitatorOnly = useMemo(() => (
        allEvents.filter(event => !event.facilitator_only)
            .filter(event => !event.non_ny)
    ), [allEvents])

    // Map metadata to events and apply sorting
    const eventsWithMetadata = useMemo(() =>
        addEventMetadata({ events: withoutFacilitatorOnly, organizerColorMap }),
        [withoutFacilitatorOnly, organizerColorMap]
    );

    return { eventsWithMetadata, organizers, reloadEvents, isLoadingEvents: isLoadingEvents || isLoadingPrivateEvents };
};
