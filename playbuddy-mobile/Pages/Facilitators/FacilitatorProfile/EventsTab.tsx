import { LinkifyText } from "../../Munches/LinkifyText";
import type { Event, Facilitator } from "../../../Common/types/commonTypes";
import { View, StyleSheet, Text } from "react-native";
import EventCalendarView from "../../Calendar/ListView/EventCalendarView";
import { colors, fontFamilies, fontSizes } from "../../../components/styles";

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
        <EventCalendarView events={events} entity="facilitator" entityId={facilitator.id} />
    );
};

const styles = StyleSheet.create({
    emptyEventsContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyEventsText: { color: colors.textPrimary, fontSize: fontSizes.xl, fontFamily: fontFamilies.body },
});
