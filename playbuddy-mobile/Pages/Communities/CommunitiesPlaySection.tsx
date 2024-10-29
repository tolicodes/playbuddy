import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";

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

export const CommunitiesPlaySection: React.FC = () => {
    const { myCommunities } = useCommonContext();
    const privateCommunities = [
        ...myCommunities.myPrivateCommunities,
        ...myCommunities.myOrganizerPrivateCommunities
    ];

    const myPrivateEventSections = getMyPrivateEventSections(privateCommunities)

    return (
        <>
            <Text style={styles.sectionTitle}>My Communities</Text>
            {privateCommunities.length > 0 ? (
                <FlatList
                    data={privateCommunities}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.communityItem}>
                            <Text style={styles.communityName}>{item.name}</Text>
                        </TouchableOpacity>
                    )}
                    style={{ height: 200 }}
                />
            ) : (
                <Text style={styles.emptyText}>You haven&apos;t joined any communities yet.</Text>
            )}

            <Text style={styles.sectionTitle}>My Private Events!</Text>
            <EventList
                sections={myPrivateEventSections}
                screen="Communities Play"
                reloadEvents={() => { }}
                isLoadingEvents={false}
            />
        </>
    );
}

const styles = StyleSheet.create({
    section: {
        padding: 16,
        paddingVertical: 0
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginVertical: 10,
        textAlign: 'center'
    },
    communityItem: {
        padding: 15,
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 10,
        elevation: 2
    },
    communityName: {
        fontSize: 18,
        fontWeight: 'bold'
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 20
    }
});