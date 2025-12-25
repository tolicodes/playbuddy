import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Event } from '../../../commonTypes';
import { API_URL } from '../../../config';
import { useUserContext } from '../../Auth/hooks/UserContext';

export type OrganizerColorMap = { [key: string]: { color: string; priority: number } };
export type Organizer = { id: string; color: string };

export function buildOrganizerColorMap(organizers: Organizer[]): OrganizerColorMap {
    return organizers.reduce((acc, organizer, i) => {
        acc[organizer.id] = { color: organizer.color, priority: i };
        return acc;
    }, {} as OrganizerColorMap);
}

export function addEventMetadata({ events, organizerColorMap }: { events: Event[]; organizerColorMap: OrganizerColorMap }) {
    return events
        .map(event => ({
            ...event,
            organizerColor: organizerColorMap[event.organizer?.id]?.color || '',
            organizerPriority: organizerColorMap[event.organizer?.id]?.priority || Infinity,
        }))
        .sort((a, b) => a.organizerPriority - b.organizerPriority);
}

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
