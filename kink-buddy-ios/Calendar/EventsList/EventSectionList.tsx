import { useState, useEffect } from "react";
import { SectionList, StyleSheet, Text } from "react-native";
import { EventWithMetadata, useCalendarContext } from "../CalendarContext";
import { useGroupedEvents } from "../hooks/useGroupedEvents";
import { ListItem } from "../ListItem";
import { useNavigation } from "@react-navigation/native";
import { NavStack } from "../types";
import { Event } from "../../commonTypes";

export default () => {
    const { wishlistEvents } = useCalendarContext();
    const { sections } = useGroupedEvents(wishlistEvents);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

    const navigation = useNavigation<NavStack>();

    useEffect(() => {
        if (selectedEvent) {
            navigation.navigate('Event Details', {
                selectedEvent,
                origin: 'Wishlist',
            });
        }
    }, [selectedEvent]);


    return (
        <SectionList
            sections={sections}
            stickySectionHeadersEnabled={true}
            renderItem={({ item: event }: { item: EventWithMetadata }) => {
                return (
                    <ListItem
                        item={event}
                        setSelectedEvent={setSelectedEvent}
                    />
                )
            }}
            renderSectionHeader={({ section }: any) => (
                <Text
                    style={styles.sectionHeader}
                >{section.title}</Text>
            )}
            keyExtractor={(item, i) => item.name + item.id}
            ListEmptyComponent={<Text style={styles.emptyList}>No Results</Text>}
        />
    )
}

const styles = StyleSheet.create({
    emptyList: {
        padding: 20,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        backgroundColor: '#f4f4f4',
        paddingVertical: 8,
        paddingHorizontal: 20,
        color: '#333',
    },
})