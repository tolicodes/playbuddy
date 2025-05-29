import React, { useMemo } from 'react';
import { View } from 'react-native';
import EventCalendarView from '../../Calendar/EventCalendarView/EventCalendarView';
import { useBuddiesContext } from '../hooks/BuddiesContext';
import { useCalendarContext } from '../../Calendar/hooks/CalendarContext';

const SharedEvents = () => {
    const { sharedEvents } = useBuddiesContext();
    const { filteredEvents } = useCalendarContext();

    const sharedEventsWithMetadata = useMemo(() => {
        if (!sharedEvents.data) return []
        return filteredEvents.filter(event => sharedEvents.data.find(e => e.eventId === event.id))
    }, [sharedEvents, filteredEvents]);

    return (
        <View style={{ flex: 1 }}>
            <EventCalendarView events={sharedEventsWithMetadata || []} />
        </View>
    )
};

export default SharedEvents;
