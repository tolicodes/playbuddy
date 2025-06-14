import { NavStack } from "../../../Common/Nav/NavStackType";
import { EventListItem } from "../../Calendar/EventListItem";
import { LinkifyText } from "../../Munches/LinkifyText";
import type { Event, Facilitator } from "../../../Common/types/commonTypes";
import { FlatList } from "react-native-gesture-handler";
import { View, StyleSheet } from "react-native";

export const EventsTab = ({
    events,
    navigation,
    facilitator,
}: {
    events: Event[];
    navigation: NavStack;
    facilitator: Facilitator;
}) => {
    // console.log('events', events);
    const noEventsText = events.length
        ? null
        : (() => {
            let txt = `No events on PlayBuddy.\n`;
            if (facilitator.website) txt += `- Website: ${facilitator.website}\n`;
            if (facilitator.instagram_handle) txt += `- Instagram: @${facilitator.instagram_handle}\n`;
            if (facilitator.fetlife_handle) txt += `- FetLife: @${facilitator.fetlife_handle}\n`;
            return txt;
        })();

    if (noEventsText) {
        return (
            <View style={styles.emptyEventsContainer}>
                <LinkifyText style={styles.emptyEventsText}>{noEventsText}</LinkifyText>
            </View>
        );
    }

    return (
        <FlatList
            data={events}
            keyExtractor={e => e.id}
            renderItem={({ item }) => (
                <EventListItem
                    item={item}
                    onPress={() =>
                        navigation.navigate('Event Details', { selectedEvent: item })
                    }
                />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
        />
    );
};

const styles = StyleSheet.create({
    list: { paddingTop: 8 },

    emptyEventsContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyEventsText: { color: '#000', fontSize: 16 },
});