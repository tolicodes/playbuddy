import React from "react"
import { View } from "react-native"
import EventCalendarView from "../../Calendar/EventCalendarView"
import { useCalendarContext } from "../../Calendar/CalendarContext"

export const CommunityEvents = ({ route: { params: { communityId } } }: { route: { params: { communityId: string } } }) => {
    const { allEvents } = useCalendarContext();

    const communityEvents = allEvents.filter(event => event.communities?.some(community => community.id === communityId));

    return (
        <View>
            <EventCalendarView events={communityEvents} />
        </View>
    )
}   