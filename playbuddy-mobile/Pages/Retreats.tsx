import React, { useMemo } from "react";
import EventCalendarView from "./Calendar/EventCalendarView/EventCalendarView";
import { View } from 'react-native';
import { useFetchEvents } from "../Common/db-axios/useEvents";



export const Retreats = () => {
    const { data: events } = useFetchEvents();
    const retreatEvents = useMemo(() => events?.filter(event => event.type === 'retreat'), [events]);

    return (
        <View style={{ flex: 1 }}>
            <EventCalendarView events={retreatEvents || []} />
        </View>
    );
};

export default Retreats;