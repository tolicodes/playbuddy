import React, { useMemo } from 'react';
import { View } from 'react-native';
import EventCalendarView from '../Calendar/EventCalendarView';
import { useBuddiesContext } from './BuddiesContext';
import { useCalendarContext } from '../Calendar/CalendarContext';

const SharedEvents = () => {
    const { sharedEvents } = useBuddiesContext();
    const { filteredEvents } = useCalendarContext();

    const sharedEventsWithMetadata = useMemo(() => {
        if (!sharedEvents.data) return []
        return filteredEvents.filter(event => sharedEvents.data.find(e => e.eventId === event.id))
    }, [sharedEvents, filteredEvents]);

    return (
        <View style={{ flex: 1 }}>
            {/* it will get added internally */}
            <EventCalendarView events={sharedEventsWithMetadata || []} />
        </View>
    )
};

export default SharedEvents;
