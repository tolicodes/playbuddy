import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavStack } from '../../../../Common/Nav/NavStackType';
import { useCalendarContext } from '../../../Calendar/hooks/CalendarContext';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

export const WeeklyPromoList = () => {
    const { allEvents } = useCalendarContext();
    const navigation = useNavigation<NavStack>();

    const weeklyPicks = allEvents.filter((e) => e.weekly_pick);

    // flatten & sort events
    const mappedEvents = weeklyPicks
        // Filter for events happening next week (Monday to Sunday)
        .filter((e) => {
            const eventDate = new Date(e.start_date);
            const today = new Date();
            const nextMonday = new Date(today);
            nextMonday.setDate(today.getDate() + (8 - today.getDay()) % 7);
            nextMonday.setHours(0, 0, 0, 0);

            const nextSunday = new Date(nextMonday);
            nextSunday.setDate(nextMonday.getDate() + 6);
            nextSunday.setHours(23, 59, 59, 999);

            return eventDate >= new Date() && eventDate <= nextSunday;
        })
        .map((e) => {
            return {
                dateKey: new Date(e.start_date).toDateString(),
                dayOfWeek: new Date(e.start_date).toLocaleDateString('en-US', { weekday: 'short' }),
                title: e.name,
                organizer: e.organizer.name,
                description: e.short_description,
                image: e.image_url,
                promoCodeDiscount: e.promo_codes?.[0] ? `${e.promo_codes[0].discount}% off` : null,
                eventId: e.id,
            }
        })
        .sort((a, b) => new Date(a.dateKey).getTime() - new Date(b.dateKey).getTime())
        || [];

    // group by date
    const eventsByDate = mappedEvents.reduce<Record<string, typeof mappedEvents>>((acc, ev) => {
        (acc[ev.dateKey] = acc[ev.dateKey] || []).push(ev);
        return acc;
    }, {});

    const getFullEvent = (id: number) => allEvents.find((ev) => ev.id === id);

    const onPressEvent = (eventId: number) => {
        const full = getFullEvent(eventId);
        if (full) navigation.navigate('Event Details', { selectedEvent: full });
    };

    return (
        <SafeAreaView>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.header}>PB's Weekly Picks</Text>
                <TouchableOpacity
                    onPress={() => navigation.navigate('Home')}
                    style={[styles.homeButton, styles.centeredButton, styles.homeButtonHighlight]}
                >
                    <FontAwesome name="home" size={24} color="#FFF" />
                    <Text style={styles.homeButtonText}>Take me Home</Text>
                </TouchableOpacity>

                {Object.entries(eventsByDate).map(([dateKey, events]) => (
                    <View key={dateKey} style={styles.card}>
                        {/* Day column */}
                        <View style={styles.dayWrapper}>
                            <Text style={styles.day}>{events[0].dayOfWeek}</Text>
                        </View>

                        {/* All events that day */}
                        <View style={styles.detailsColumn}>
                            {events.map((item, i) => (
                                <React.Fragment key={item.eventId}>
                                    <TouchableOpacity onPress={() => onPressEvent(item.eventId)}>
                                        <View style={styles.eventRow}>
                                            <View style={styles.textContainer}>
                                                <Text style={styles.eventTitle} numberOfLines={2}>
                                                    {item.title}
                                                </Text>
                                                <Text style={styles.organizer}>{item.organizer}</Text>
                                                <Text style={styles.description} numberOfLines={2}>
                                                    {item.description}
                                                </Text>
                                            </View>
                                            <View style={styles.imageWrapper}>
                                                <Image source={{ uri: item.image }} style={styles.image} />
                                                {item.promoCodeDiscount && (
                                                    <View style={styles.discountBubble}>
                                                        <Text style={styles.discountText}>{item.promoCodeDiscount}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                    {/* Separator between events */}
                                    {i < events.length - 1 && <View style={styles.separator} />}
                                </React.Fragment>
                            ))}
                        </View>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingBottom: 32,
    },
    header: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        marginVertical: 10,
        color: '#2D005F',
    },
    homeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6A1B9A',
        padding: 12,
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 14,
    },
    homeButtonHighlight: {
        backgroundColor: '#8E24AA',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    homeButtonText: {
        marginLeft: 8,
        fontSize: 18,
        fontWeight: '700',
        color: '#FFF',
    },
    centeredButton: {
        alignSelf: 'center',
    },
    card: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#DDD',
        marginHorizontal: 16,
        marginBottom: 14,
        overflow: 'hidden',
    },
    dayWrapper: {
        width: 60,
        backgroundColor: '#F4E1FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    day: {
        fontSize: 20,
        fontWeight: '600',
        color: '#6A1B9A',
    },
    detailsColumn: {
        flex: 1,
        padding: 12,
    },
    eventRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    separator: {
        height: 1,
        backgroundColor: '#CCC',
        marginVertical: 15,
    },
    textContainer: {
        flex: 1,
        paddingRight: 8,
    },
    eventTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2D005F',
    },
    organizer: {
        fontSize: 14,
        color: '#666',
    },
    description: {
        fontSize: 13,
        color: '#333',
        marginTop: 4,
        lineHeight: 16,
    },
    imageWrapper: {
        width: 80,
        height: 80,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    discountBubble: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: '#FFD700',
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 8,
    },
    discountText: {
        color: '#000',
        fontSize: 12,
        fontWeight: '600',
    },
});
