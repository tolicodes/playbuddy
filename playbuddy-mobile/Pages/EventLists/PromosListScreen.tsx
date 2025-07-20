import React from 'react';
import { View } from 'react-native';
import EventCalendarView from "../Calendar/ListView/EventCalendarView";
import { useCalendarContext } from "../Calendar/hooks/CalendarContext";
import { getEventPromoCodes } from "../Auth/usePromoCode";
import { useFeaturedEvents } from '../Calendar/hooks/useGroupedEvents';

export const PromosListScreen = () => {
    const { allEvents } = useCalendarContext();
    const featuredEvents = useFeaturedEvents();
    const withPromoEvents = allEvents.filter((e) => getEventPromoCodes(e).length > 0);

    return (
        <View style={{ flex: 1 }}>
            <EventCalendarView
                events={withPromoEvents}
                featuredEvents={featuredEvents}
                entity='promo'
            />
        </View>
    );
};
