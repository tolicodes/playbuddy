import React from "react";
import { SectionList, View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { EventWithMetadata } from "./../types";
import { ListItem } from "./ListItem";
import { useNavigation } from "@react-navigation/native";
import { useState, useEffect } from "react";
import { NavStack } from "../types";
import { Event } from "../commonTypes";
import * as amplitude from '@amplitude/analytics-react-native';

const EventList = ({ sections, sectionListRef, isLoadingEvents }: { sections: any, screen: string, sectionListRef?: any, reloadEvents: any, isLoadingEvents: boolean }) => {
    const navigation = useNavigation<NavStack>();

    // Handle event click
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

    useEffect(() => {
        if (selectedEvent) {
            navigation.navigate('Event Details', { selectedEvent });
        }
    }, [selectedEvent]);

    return (<SectionList
        ref={sectionListRef}
        sections={sections}
        stickySectionHeadersEnabled={true}
        renderItem={({ item: event }: { item: EventWithMetadata }) => {
            return (
                <View
                    style={{ height: 100 }}
                >
                    <ListItem
                        item={event}
                        setSelectedEvent={(event) => {
                            amplitude.logEvent('event_list_item_clicked', { event_id: event.id });
                            setSelectedEvent(event)
                        }}
                    />
                </View>
            )
        }}
        renderSectionHeader={({ section }: any) => {
            return (
                <Text style={styles.sectionHeader}>{section.title}</Text>
            )
        }}
        keyExtractor={(item, i) => `${i}_${item.id}`}
        ListEmptyComponent={<View style={styles.emptyList}>
            {isLoadingEvents
                ? <ActivityIndicator size="large" color="#007AFF" />
                : <Text>No events found</Text>
            }

        </View>}
        onScrollToIndexFailed={() => {
            amplitude.logEvent('scroll_to_index_failed');
        }}

        initialNumToRender={1000}
    // TODO: Implement pull to refresh
    // onRefresh={() => reloadEvents()}
    />)
}

const styles = StyleSheet.create({
    sectionHeader: {
        backgroundColor: 'lightgrey',
        padding: 10,
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyList: {
        padding: 20,
        textAlign: 'center',
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        alignContent: 'center',
    },
});

export default EventList;