import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import EventCalendarView from "../../../Calendar/EventCalendarView";
import { useCalendarContext } from "../../../Calendar/hooks/CalendarContext";
import { getEventPromoCodes } from "../usePromoCode";
import { useFetchDeepLinks } from '../../../../Common/hooks/useDeepLinks';
import { Event } from '../../../../commonTypes';

export const PromosScreen = () => {
    const { allEvents } = useCalendarContext();
    const [promoFilter, setPromoFilter] = useState<'featured' | 'all'>('featured');

    const withPromoEvents = allEvents.filter((e) => getEventPromoCodes(e).length > 0);

    const { data: deepLinks = [] } = useFetchDeepLinks();

    const featuredEvents = deepLinks.filter((dl) => dl.featured_event)
        .map((dl) => dl.featured_event)
        .filter((event, index, self) =>
            index === self.findIndex((e) => e.id === event.id)
        ).map((event) => {
            return allEvents.find(e => e.id === event.id);
        }).filter((event) => event !== undefined) as Event[];

    const filteredEvents = promoFilter === 'all' ? withPromoEvents : featuredEvents;

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.filterRow}>
                <TouchableOpacity
                    style={[styles.filterButton, promoFilter === 'featured' && styles.activeFilter]}
                    onPress={() => setPromoFilter('featured')}
                >
                    <Text style={promoFilter === 'featured' ? styles.activeFilterText : styles.filterText}>Featured Events</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.filterButton, promoFilter === 'all' && styles.activeFilter]}
                    onPress={() => setPromoFilter('all')}
                >
                    <Text style={promoFilter === 'all' ? styles.activeFilterText : styles.filterText}>All Promos</Text>
                </TouchableOpacity>
            </View>

            <EventCalendarView events={filteredEvents} />
        </View>
    );
};

const styles = StyleSheet.create({
    filterRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingVertical: 10,
    },
    filterButton: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginHorizontal: 6,
        backgroundColor: '#eee',
    },
    activeFilter: {
        backgroundColor: '#8f00ff',
    },
    filterText: {
        color: '#333',
    },
    activeFilterText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
