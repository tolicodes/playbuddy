import React, { useMemo } from "react";
import EventCalendarView from "../Calendar/ListView/EventCalendarView";
import { View } from 'react-native';
import { useFetchEvents } from "../../Common/db-axios/useEvents";



export const PlayParties = () => {
    const { data: events = [] } = useFetchEvents();
    const playPartyEvents = useMemo(() => events.filter(event => event.play_party === true), [events]);

    return (
        <View style={{ flex: 1 }}>
            <EventCalendarView events={playPartyEvents} entity='play_party' />
        </View>
    );
};

export default PlayParties;
