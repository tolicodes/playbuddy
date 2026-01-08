import React, { useMemo } from 'react';
import { View } from 'react-native';
import EventCalendarView from "../Calendar/ListView/EventCalendarView";
import { getEventPromoCodes } from "../Auth/usePromoCode";
import { useFeaturedEvents } from '../Calendar/hooks/useGroupedEvents';
import { useFetchEvents } from "../../Common/db-axios/useEvents";

export const PromosListScreen = () => {
    const { data: events = [] } = useFetchEvents();
    const featuredEvents = useFeaturedEvents();
    const withPromoEvents = useMemo(
        () => events.filter((e) => getEventPromoCodes(e).length > 0),
        [events]
    );

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
