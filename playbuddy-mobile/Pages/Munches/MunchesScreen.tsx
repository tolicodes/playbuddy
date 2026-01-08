import React, { useMemo } from "react";
import { View } from "react-native";
import EventCalendarView from "../Calendar/ListView/EventCalendarView";
import { useFetchEvents } from "../../Common/db-axios/useEvents";

export const MunchesScreen = () => {
    const { data: events = [] } = useFetchEvents();
    const munchEvents = useMemo(
        () => events.filter((event) => event.is_munch === true),
        [events]
    );

    return (
        <View style={{ flex: 1 }}>
            <EventCalendarView events={munchEvents} entity="munch" />
        </View>
    );
};

export default MunchesScreen;
