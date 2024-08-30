import { useState, useEffect } from 'react';
import axios from 'axios';
import { Event } from '../../commonTypes';
import { EVENTS_API_URL } from '../../config';

export const useFetchEvents = (appState: string) => {
    const [events, setEvents] = useState<Event[]>([]);

    useEffect(() => {
        axios.get<Event[]>(EVENTS_API_URL)
            .then(response => {
                setEvents(response.data);
            })
            .catch(error => {
                console.error('Error fetching events:', error);
            });
    }, [appState]);

    return { events };
};
