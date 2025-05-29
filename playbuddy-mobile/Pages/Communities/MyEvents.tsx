import React, { useMemo } from "react";

import { Community } from "../../../common/types/commonTypes";
import { useCalendarContext } from "../Calendar/hooks/CalendarContext";
import { useCommonContext } from "../../Common/hooks/CommonContext";
import EventCalendarView from "../Calendar/EventCalendarView/EventCalendarView";

const getMyEvents = (myCommunities: Community[]) => {
    const { allEvents } = useCalendarContext();
    const communityIds = myCommunities.map((community) => community.id);
    const myEvents = useMemo(() => allEvents.filter((event) => {
        return event.communities?.some((community) => communityIds.includes(community.id))
    }), [allEvents, communityIds]);

    return myEvents;
}

export const MyEvents = ({ type }: { type: 'organizer' | 'private' } = { type: 'private' }) => {
    const { myCommunities } = useCommonContext();
    const privateCommunities = [
        ...myCommunities.myPrivateCommunities,
        ...myCommunities.myOrganizerPrivateCommunities,
    ] as Community[];

    const organizerCommunities = [
        ...myCommunities.myOrganizerPublicCommunities
    ] as Community[];


    const myEvents = getMyEvents(type === 'private' ? privateCommunities : organizerCommunities);

    return <>
        <EventCalendarView events={myEvents} />
    </>
}
