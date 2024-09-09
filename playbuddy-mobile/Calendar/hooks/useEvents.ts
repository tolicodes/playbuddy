import { useMemo } from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Event } from '../../commonTypes';
import { API_URL } from '../../config';
import { getAvailableOrganizers } from '../calendarUtils';

type OrganizerColorMap = { [key: string]: { color: string; priority: number } }
function buildOrganizerColorMap(organizers: any) {
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

export const useFetchEvents = (appState?: string) => {
    const [events, setEvents] = useState<Event[]>([]);

    useEffect(() => {
        axios.get<Event[]>(API_URL.events)
            .then(response => {
                setEvents(response.data);
            })
            .catch(error => {
                console.error('Error fetching events:', error);
            });
    }, [appState]);

    return { events };
};


export const useEvents = (appState?: string) => {
    // Fetch events based on app state
    const { events } = useFetchEvents(appState);

    const organizers = useMemo(() =>
        getAvailableOrganizers(events),
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

    return { eventsWithMetadata, organizers };
};
