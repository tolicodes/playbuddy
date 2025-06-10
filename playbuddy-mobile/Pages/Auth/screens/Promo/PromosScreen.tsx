import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import EventCalendarView from "../../../Calendar/EventCalendarView/EventCalendarView";
import { useCalendarContext } from "../../../Calendar/hooks/CalendarContext";
import { getEventPromoCodes } from "../usePromoCode";
import { useFeaturedEvents } from '../../../Calendar/hooks/useGroupedEvents';

export const PromosScreen = () => {
    const { allEvents } = useCalendarContext();
    const featuredEvents = useFeaturedEvents();
    const withPromoEvents = allEvents.filter((e) => getEventPromoCodes(e).length > 0);

    return (
        <View style={{ flex: 1 }}>
            <EventCalendarView events={withPromoEvents} featuredEvents={featuredEvents} />
        </View>
    );
};

const styles = StyleSheet.create({
    filterRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingVertical: 12,
        backgroundColor: '#f8f8f8',
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 18,
        borderRadius: 24,
        marginHorizontal: 6,
        backgroundColor: '#e0e0e0',
    },
    activeFilter: {
        backgroundColor: '#8f00ff',
        shadowColor: '#8f00ff',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
    },
    iconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tabLabel: {
        fontSize: 15,
    },
    filterText: {
        color: '#333',
    },
    activeFilterText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
