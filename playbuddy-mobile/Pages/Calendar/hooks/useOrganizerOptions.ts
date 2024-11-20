import { useMemo } from 'react';
import { Event } from '../../../commonTypes';

export const useOrganizerOptions = (events: Event[]) => {
    return useMemo(() => {
        return Array.from(new Set(events.map(event => event.organizer))).map(organizer => ({
            label: organizer,
            value: organizer,
            key: organizer
        }));
    }, [events]);
};
