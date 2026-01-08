import { useMemo } from 'react';
import { useFetchEvents } from '../../../Common/db-axios/useEvents';
import { useFetchDeepLinks } from '../../../Common/hooks/useDeepLinks';
import { getAvailableOrganizers } from './calendarUtils';
import { addEventMetadata, buildOrganizerColorMap as mapOrganizerColors } from './eventHelpers';


export { useGroupedEvents } from './useGroupedEventsMain'

export const useFeaturedEvents = () => {
    const { data: events = [] } = useFetchEvents();
    const { data: deepLinks = [] } = useFetchDeepLinks();

    const organizers = useMemo(() => getAvailableOrganizers(events), [events]);
    const organizerColorMap = useMemo(() => mapOrganizerColors(organizers as any), [organizers]);
    const eventsWithMetadata = useMemo(
        () => addEventMetadata({ events, organizerColorMap }),
        [events, organizerColorMap]
    );
    const featuredEventIds = useMemo(
        () => new Set(deepLinks.map((dl) => dl.featured_event?.id).filter(Boolean) as number[]),
        [deepLinks]
    );
    const featuredEvents = useMemo(
        () => eventsWithMetadata.filter((event) => featuredEventIds.has(event.id)),
        [eventsWithMetadata, featuredEventIds]
    );

    return featuredEvents;
}
