import { useMemo } from 'react';
import moment from 'moment';
import { Event } from '../../../commonTypes';
import { EventWithMetadata } from '../../../Common/Nav/NavStackType';
import { useCalendarContext } from './CalendarContext';
import { useFetchDeepLinks } from '../../../Common/hooks/useDeepLinks';


export { useGroupedEvents } from './useGroupedEventsMain'

export const useFeaturedEvents = () => {
    const { allEvents } = useCalendarContext();

    const { data: deepLinks = [] } = useFetchDeepLinks();

    const featuredEvents = deepLinks
        .filter((dl) => dl.featured_event)
        .map((dl) => dl.featured_event)
        .filter((event, index, self) =>
            index === self.findIndex((e) => e.id === event.id)
        )
        .map((event) => allEvents.find(e => e.id === event.id))
        .filter((event): event is Event => !!event);

    return featuredEvents;
}