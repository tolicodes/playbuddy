import React, { useMemo } from "react";

import { Community } from "../../../Common/commonTypes";
import { useCalendarContext } from "../../Calendar/CalendarContext";
import { useCommonContext } from "../../Common/CommonContext";
import EventCalendarView from "../../Calendar/EventCalendarView";

const getMyEvents = (myCommunities: Community[]) => {
    const { allEvents } = useCalendarContext();
    const communityIds = myCommunities.map((community) => community.id);
    const myEvents = useMemo(() => allEvents.filter((event) => {
        return event.communities?.some((community) => communityIds.includes(community.id))
    }), [allEvents, communityIds]);

    return myEvents;
}

export const MyEvents: React.FC = () => {
    const { myCommunities } = useCommonContext();
    const communities = [
        ...myCommunities.myPrivateCommunities,
        ...myCommunities.myOrganizerPrivateCommunities,
        ...myCommunities.myOrganizerPublicCommunities

    ];
    const myEvents = getMyEvents(communities);

    return <>
        <EventCalendarView events={myEvents} />

    </>
}
