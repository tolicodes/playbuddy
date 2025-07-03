import { NavStack } from "../../../Common/Nav/NavStackType";
import { EventListItem } from "../../Calendar/EventListItem";
import { LinkifyText } from "../../Munches/LinkifyText";
import type { Event, Facilitator } from "../../../Common/types/commonTypes";
import { FlatList } from "react-native-gesture-handler";
import { View, StyleSheet } from "react-native";
import { useFetchAttendees } from "../../../Common/db-axios/useAttendees";
import EventCalendarView from "../../Calendar/EventCalendarView/EventCalendarView";

export const EventsTab = ({
    events,
    facilitator,
}: {
    events: Event[];
    facilitator: Facilitator;
}) => {
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
        <EventCalendarView events={events} />
    );
};

const styles = StyleSheet.create({
    list: { paddingTop: 8 },

    emptyEventsContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyEventsText: { color: '#000', fontSize: 16 },
});