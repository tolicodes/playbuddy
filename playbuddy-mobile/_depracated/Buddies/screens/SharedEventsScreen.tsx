import React, { useMemo } from 'react';
import { View } from 'react-native';
import EventCalendarView from '../../Calendar/EventCalendarView/EventCalendarView';
import { useBuddiesContext } from '../../../Common/hooks/BuddiesContext';
import { useCalendarData } from '../../Calendar/hooks/useCalendarData';

const SharedEvents = () => {
    const { sharedEvents } = useBuddiesContext();
    const { allEvents } = useCalendarData();

    const sharedEventsWithMetadata = useMemo(() => {
        if (!sharedEvents.data) return []
        return allEvents.filter(event => sharedEvents.data.find(e => e.eventId === event.id))
    }, [sharedEvents, allEvents]);

    return (
        <View style={{ flex: 1 }}>
            <EventCalendarView events={sharedEventsWithMetadata || []} />
        </View>
    )
};

export default SharedEvents;
