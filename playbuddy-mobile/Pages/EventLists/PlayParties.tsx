import React, { useMemo } from "react";
import EventCalendarView from "../Calendar/ListView/EventCalendarView";
import { View } from 'react-native';
import { useCalendarContext } from "../Calendar/hooks/CalendarContext";



export const PlayParties = () => {
    const { allEvents } = useCalendarContext();
    const playPartyEvents = useMemo(() => allEvents.filter(event => event.play_party === true), [allEvents]);

    return (
        <View style={{ flex: 1 }}>
            <EventCalendarView events={playPartyEvents} entity='play_party' />
        </View>
    );
};

export default PlayParties;