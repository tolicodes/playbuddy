import React, { useMemo } from "react";
import EventCalendarView from "./Calendar/EventCalendarView";
import { View } from 'react-native';
import { useCalendarContext } from "./Calendar/hooks/CalendarContext";



export const Retreats = () => {
    const { allEvents } = useCalendarContext();
    const retreatEvents = useMemo(() => allEvents.filter(event => event.type === 'retreat'), [allEvents]);

    return (
        <View style={{ flex: 1 }}>
            <EventCalendarView events={retreatEvents} />
        </View>
    );
};

export default Retreats;