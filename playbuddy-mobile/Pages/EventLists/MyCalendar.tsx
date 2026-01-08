import React, { useMemo } from 'react';
import EventCalendarView from "../Calendar/ListView/EventCalendarView";
import { useUserContext } from "../Auth/hooks/UserContext";
import { LoginToAccess } from '../../components/LoginToAccess';
import { useFetchEvents } from "../../Common/db-axios/useEvents";
import { useWishlist } from "../Calendar/hooks/useWishlist";
import { getAvailableOrganizers } from "../Calendar/hooks/calendarUtils";
import { addEventMetadata, buildOrganizerColorMap as mapOrganizerColors } from "../Calendar/hooks/eventHelpers";

const MyCalendar = () => {
    const { authUserId } = useUserContext();
    const { data: events = [] } = useFetchEvents();
    const organizers = useMemo(() => getAvailableOrganizers(events), [events]);
    const organizerColorMap = useMemo(() => mapOrganizerColors(organizers as any), [organizers]);
    const eventsWithMetadata = useMemo(
        () => addEventMetadata({ events, organizerColorMap }),
        [events, organizerColorMap]
    );
    const { wishlistEvents } = useWishlist(eventsWithMetadata);

    return (
        (authUserId)
            ? (
                <EventCalendarView
                    events={wishlistEvents || []}
                    showGoogleCalendar={true}
                    entity='my_calendar'
                />
            )
            : (
                <LoginToAccess entityToAccess='My Calendar' />
            )
    )
}

export default MyCalendar;
