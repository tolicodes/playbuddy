import React, { useMemo } from "react";
import { View } from "react-native";
import EventCalendarView from "../Calendar/ListView/EventCalendarView";
import { useFetchAttendees } from "../../Common/db-axios/useAttendees";
import { useFetchEvents } from "../../Common/db-axios/useEvents";

export const PopularEvents = () => {
    const { data: events = [] } = useFetchEvents();
    const { data: attendees = [] } = useFetchAttendees();

    const popularEvents = useMemo(() => {
        const counts = new Map<number, number>();
        attendees.forEach(({ event_id, attendees: eventAttendees }) => {
            counts.set(event_id, eventAttendees.length);
        });

        return events
            .filter((event) => (counts.get(event.id) || 0) >= 2)
            .sort((a, b) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0));
    }, [events, attendees]);

    return (
        <View style={{ flex: 1 }}>
            <EventCalendarView events={popularEvents} entity="popular_events" />
        </View>
    );
};

export default PopularEvents;
