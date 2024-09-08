import { SectionList, View, Text, StyleSheet } from "react-native";
import { EventWithMetadata } from "./../types";
import { ListItem } from "./ListItem";
import { useNavigation } from "@react-navigation/native";
import { useState, useEffect } from "react";
import { NavStack } from "../types";
import { Event } from "../commonTypes";

export default ({ sections, screen, sectionListRef }: { sections: any, screen: string, sectionListRef?: any }) => {
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
                        setSelectedEvent={setSelectedEvent}
                    />
                </View>
            )
        }}
        renderSectionHeader={({ section }: any) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        keyExtractor={(item, i) => item.name + item.id}
        ListEmptyComponent={<Text style={styles.emptyList}>No Results</Text>}
        onScrollToIndexFailed={(e) => {
            console.log('onScrollToIndexFailed', e);
        }}
        initialNumToRender={200}
    />)
}

const styles = StyleSheet.create({
    sectionHeader: {
        backgroundColor: 'lightgrey',
        padding: 10,
        fontSize: 20,
        fontWeight: 'bold',
    },
    emptyList: {
        padding: 20,
        textAlign: 'center',
    },
});