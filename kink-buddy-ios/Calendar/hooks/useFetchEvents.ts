import { useState, useEffect } from 'react';
import axios from 'axios';
import { Event } from '../../commmonTypes';
import { EVENTS_API_URL } from '../../config';
import all_events from '../all_events.json';

export const useFetchEvents = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
    all_events.sort((a, b) => a.start_date > b.start_date ? 1 : -1);

    useEffect(() => {
        axios.get<Event[]>(EVENTS_API_URL)
            .then(response => {
                setEvents(response.data);
                setFilteredEvents(response.data);
            })
            .catch(error => {
                console.error('Error fetching events:', error);
            });
    }, []);

    return { events, filteredEvents, setFilteredEvents };
};
