import { useState, useEffect } from 'react';
import axios from 'axios';
import { Event } from '../../commmonTypes';
import { EVENTS_API_URL } from '../../config';

export const useFetchEvents = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);

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
