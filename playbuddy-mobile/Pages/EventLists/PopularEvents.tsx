import React, { useMemo } from "react";
import { View } from "react-native";
import EventCalendarView from "../Calendar/ListView/EventCalendarView";
import { useCalendarContext } from "../Calendar/hooks/CalendarContext";
import { useFetchAttendees } from "../../Common/db-axios/useAttendees";

export const PopularEvents = () => {
    const { allEvents } = useCalendarContext();
    const { data: attendees = [] } = useFetchAttendees();

    const popularEvents = useMemo(() => {
        const counts = new Map<number, number>();
        attendees.forEach(({ event_id, attendees: eventAttendees }) => {
            counts.set(event_id, eventAttendees.length);
        });

        return allEvents
            .filter((event) => (counts.get(event.id) || 0) >= 2)
            .sort((a, b) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0));
    }, [allEvents, attendees]);

    return (
        <View style={{ flex: 1 }}>
            <EventCalendarView events={popularEvents} entity="popular_events" />
        </View>
    );
};

export default PopularEvents;
