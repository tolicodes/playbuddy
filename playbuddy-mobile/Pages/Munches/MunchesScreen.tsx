import React, { useMemo } from "react";
import { View } from "react-native";
import EventCalendarView from "../Calendar/ListView/EventCalendarView";
import { useCalendarContext } from "../Calendar/hooks/CalendarContext";

export const MunchesScreen = () => {
    const { allEvents } = useCalendarContext();
    const munchEvents = useMemo(
        () => allEvents.filter((event) => event.is_munch === true),
        [allEvents]
    );

    return (
        <View style={{ flex: 1 }}>
            <EventCalendarView events={munchEvents} entity="munch" />
        </View>
    );
};

export default MunchesScreen;
