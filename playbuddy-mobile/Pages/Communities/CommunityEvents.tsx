import React from "react"
import { View, Text, StyleSheet } from "react-native"
import EventCalendarView from "../Calendar/EventCalendarView"
import { useCalendarContext } from "../Calendar/hooks/CalendarContext"
import { useFetchMyCommunities } from "../../Common/hooks/useCommunities"

export const CommunityEvents = ({ route: { params: { communityId } } }: { route: { params: { communityId: string } } }) => {
    const { allEvents } = useCalendarContext();
    const { data: myCommunities } = useFetchMyCommunities();

    const thisCommunity = myCommunities?.find(community => community.id === communityId);

    const communityEvents = allEvents.filter(
        event => event.communities?.some(community => community.id === communityId)
    );


    return (
        <View style={{ flex: 1 }}>
            <Text style={styles.communityName}>{thisCommunity?.name}</Text>
            <EventCalendarView events={communityEvents} />
        </View>
    )
}


const styles = StyleSheet.create({
    communityName: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        padding: 10
    }
})  