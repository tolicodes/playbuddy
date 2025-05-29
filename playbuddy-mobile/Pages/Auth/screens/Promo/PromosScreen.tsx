import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import EventCalendarView from "../../../Calendar/EventCalendarView/EventCalendarView";
import { useCalendarContext } from "../../../Calendar/hooks/CalendarContext";
import { getEventPromoCodes } from "../usePromoCode";
import { useFetchDeepLinks } from '../../../../Common/hooks/useDeepLinks';
import { Event } from '../../../../commonTypes';
import { MaterialIcons } from '@expo/vector-icons';

export const PromosScreen = () => {
    const { allEvents } = useCalendarContext();
    const [promoFilter, setPromoFilter] = useState<'featured' | 'all'>('featured');

    const withPromoEvents = allEvents.filter((e) => getEventPromoCodes(e).length > 0);
    const { data: deepLinks = [] } = useFetchDeepLinks();

    const featuredEvents = deepLinks
        .filter((dl) => dl.featured_event)
        .map((dl) => dl.featured_event)
        .filter((event, index, self) =>
            index === self.findIndex((e) => e.id === event.id)
        )
        .map((event) => allEvents.find(e => e.id === event.id))
        .filter((event): event is Event => !!event);

    const filteredEvents = promoFilter === 'all' ? withPromoEvents : featuredEvents;

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.filterRow}>
                <TouchableOpacity
                    style={[
                        styles.filterButton,
                        promoFilter === 'featured' && styles.activeFilter,
                    ]}
                    onPress={() => setPromoFilter('featured')}
                >
                    <Text style={promoFilter === 'featured' ? styles.activeFilterText : styles.filterText}>
                        Featured Events
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.filterButton,
                        promoFilter === 'all' && styles.activeFilter,
                    ]}
                    onPress={() => setPromoFilter('all')}
                >
                    <View style={styles.iconRow}>
                        <MaterialIcons name="list" size={16} color={promoFilter === 'all' ? '#fff' : '#333'} />
                        <Text style={[styles.tabLabel, promoFilter === 'all' ? styles.activeFilterText : styles.filterText]}>
                            All Promos
                        </Text>
                    </View>
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
