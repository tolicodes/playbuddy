import React, { useMemo } from "react";

import { Community } from "../../Common/types/commonTypes";
import { useCommonContext } from "../../Common/hooks/CommonContext";
import EventCalendarView from "../Calendar/ListView/EventCalendarView";
import { useFetchEvents } from "../../Common/db-axios/useEvents";

export const MyEvents = ({ type }: { type: 'organizer' | 'private' } = { type: 'private' }) => {
    const { myCommunities } = useCommonContext();
    const { data: events = [] } = useFetchEvents();
    const privateCommunities = [
        ...myCommunities.myPrivateCommunities,
        ...myCommunities.myOrganizerPrivateCommunities,
    ] as Community[];

    const organizerCommunities = [
        ...myCommunities.myOrganizerPublicCommunities
    ] as Community[];


    const targetCommunities = useMemo(
        () => (type === 'private' ? privateCommunities : organizerCommunities),
        [type, privateCommunities, organizerCommunities]
    );
    const communityIds = useMemo(
        () => targetCommunities.map((community) => community.id),
        [targetCommunities]
    );
    const myEvents = useMemo(
        () => events.filter((event) =>
            event.communities?.some((community) => communityIds.includes(community.id))
        ),
        [events, communityIds]
    );

    return <>
        <EventCalendarView events={myEvents} />
    </>
}
