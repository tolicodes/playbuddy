import { useMemo } from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Event } from '../../commonTypes';
import { API_URL } from '../../config';
import { getAvailableOrganizers } from '../calendarUtils';
import { useQuery } from '@tanstack/react-query';

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

const fetchEvents = async () => {
    return axios.get<Event[]>(API_URL.events).then(response => response.data);
}

export const useFetchEvents = (appState?: string) => {
    const { data: events = [], isLoading: isLoadingEvents, refetch: reloadEvents } = useQuery({
        queryKey: ['events'],
        queryFn: fetchEvents,
    });

    // Reload events when the app state changes
    useEffect(() => {
        reloadEvents();
    }, [appState]);

    return { events, reloadEvents, isLoadingEvents };
};


export const useEvents = (appState?: string) => {
    // Fetch events based on app state
    const { events, reloadEvents, isLoadingEvents } = useFetchEvents(appState);

    const organizers = useMemo(() =>
        getAvailableOrganizers(events || []),
        [events]
    );
    const organizerColorMap = useMemo(() =>
        buildOrganizerColorMap(organizers),
        [organizers]
    );

    // Map metadata to events and apply sorting
    const eventsWithMetadata = useMemo(() =>
        addEventMetadata({ events, organizerColorMap }),
        [events, organizerColorMap]
    );

    return { eventsWithMetadata, organizers, reloadEvents, isLoadingEvents };
};
