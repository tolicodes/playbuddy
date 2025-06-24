import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { EventListItem } from '../Calendar/EventListItem';
import { LAVENDER_BACKGROUND } from '../../components/styles';
import type { Event, Munch } from '../../commonTypes';
import type { NavStack } from '../../Common/Nav/NavStackType';
import { useNavigation, type NavigationProp } from '@react-navigation/native';

interface Props {
    munch: Munch;
    events: Event[];
}

export const MunchDetailsEventsTab = ({ munch, events }: Props) => {
    const filteredEvents = events.filter(e => e.munch_id === munch.id);

    const navigation = useNavigation<NavStack>();

    return (
        <FlatList
            style={styles.container}
            contentContainerStyle={styles.content}
            data={filteredEvents}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
                <EventListItem
                    item={item}
                    noPadding={true}
                    fullDate={true}
                    onPress={() =>
                        navigation.navigate('Event Details', { selectedEvent: item })
                    }
                />
            )}
            ListEmptyComponent={
                <Text style={styles.emptyText}>No events linked to this munch yet.</Text>
            }
        />
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: LAVENDER_BACKGROUND,
    },
    content: {
        paddingBottom: 40,
    },
    emptyText: {
        padding: 16,
        color: '#555',
        fontSize: 16,
    },
});
