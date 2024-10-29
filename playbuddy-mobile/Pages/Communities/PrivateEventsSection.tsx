import React, { useMemo } from "react";
import { Text, StyleSheet } from "react-native";

import { Community } from "../../../Common/commonTypes";
import EventList from "../../Calendar/EventList";
import { useCalendarContext } from "../../Calendar/CalendarContext";
import { useGroupedEvents } from "../../Calendar/hooks/useGroupedEvents";
import { useCommonContext } from "../../Common/CommonContext";

const getMyPrivateEventSections = (myPrivateCommunities: Community[]) => {
    const { filteredEvents } = useCalendarContext();
    const communityIds = myPrivateCommunities.map((community) => community.id);
    const myPrivateEvents = useMemo(() => filteredEvents.filter((event) => {
        return event.communities?.some((community) => communityIds.includes(community.id))
    }), [filteredEvents, communityIds]);

    const { sections } = useGroupedEvents(myPrivateEvents || [])

    return sections;
}

export const PrivateEventsSection: React.FC = () => {
    const { myCommunities } = useCommonContext();
    const privateCommunities = [
        ...myCommunities.myPrivateCommunities,
        ...myCommunities.myOrganizerPrivateCommunities
    ];
    const myPrivateEventSections = getMyPrivateEventSections(privateCommunities);

    return <>
        <EventList
            sections={myPrivateEventSections}
            screen="Communities Play"
            reloadEvents={() => { }}
            isLoadingEvents={false}
        />
    </>
}

const styles = StyleSheet.create({
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginVertical: 10,
        textAlign: 'center'
    }
});