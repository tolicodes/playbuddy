import { useMemo } from 'react';
import { useEffect } from 'react';
import axios from 'axios';
import { Event } from '../../../commonTypes';
import { API_URL } from '../../../config';
import { getAvailableOrganizers } from './calendarUtils';
import { useQuery } from '@tanstack/react-query';
import { useUserContext } from '../../Auth/hooks/UserContext';

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

export const useFetchEvents = (appState?: string, authUserId?: string) => {
    const { data: events = [], isLoading: isLoadingEvents, refetch: reloadEvents } = useQuery({
        queryKey: ['events'],
        queryFn: async () => {
            return axios.get<Event[]>(API_URL.events).then(response => response.data);
        },
    });

    // Reload events when the app state changes
    useEffect(() => {
        reloadEvents();
    }, [appState, authUserId]);

    return { events, reloadEvents, isLoadingEvents };
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
    const { authUserId } = useUserContext();
    // Fetch events based on app state
    const { events, reloadEvents, isLoadingEvents } = useFetchEvents(appState, authUserId || '');
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

    // Map metadata to events and apply sorting
    const eventsWithMetadata = useMemo(() =>
        addEventMetadata({ events: allEvents, organizerColorMap }),
        [allEvents, organizerColorMap]
    );

    return { eventsWithMetadata, organizers, reloadEvents, isLoadingEvents: isLoadingEvents || isLoadingPrivateEvents };
};
