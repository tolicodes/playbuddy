import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavStack } from '../../Common/Nav/NavStackType';
import { useCalendarContext } from '../Calendar/hooks/CalendarContext';
import { format, addWeeks, startOfWeek, endOfWeek } from 'date-fns';
import Ionicons from 'react-native-vector-icons/Ionicons';
import moment from 'moment-timezone';
import { useEventAnalyticsProps } from '../../Common/hooks/useAnalytics';
import { UE } from '../../userEventTypes';
import { logEvent } from '@amplitude/analytics-react-native';

const NY_TIMEZONE = 'America/New_York';

export const WeeklyPicks = () => {
    const { allEvents } = useCalendarContext();
    const navigation = useNavigation<NavStack>();
    const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
    const [weekDates, setWeekDates] = useState<string[]>([]);
    const [visibleWeeks, setVisibleWeeks] = useState<number[]>([]);

    const analyticsProps = useEventAnalyticsProps()

    useEffect(() => {
        const generateWeekDates = () => {
            const dates = [];
            for (let i = 0; i < 3; i++) {
                const nyNow = moment().tz(NY_TIMEZONE);
                const start = startOfWeek(addWeeks(nyNow.toDate(), i), { weekStartsOn: 1 });
                const end = endOfWeek(start, { weekStartsOn: 1 });
                dates.push(`${format(start, 'MMM d')} - ${format(end, 'MMM d')}${i === 0 ? ' (this week)' : ''}`);
            }
            setWeekDates(dates);
        };
        generateWeekDates();
    }, []);

    useEffect(() => {
        const visibleWeeks = weekDates.reduce((acc, _, index) => {
            if (getWeeklyPicks(index).length > 0) {
                acc.push(index);
            }
            return acc;
        }, [] as number[]);
        setVisibleWeeks(visibleWeeks);
        if (visibleWeeks.length > 0 && !visibleWeeks.includes(currentWeekOffset)) {
            setCurrentWeekOffset(visibleWeeks[0]);
        }
    }, [weekDates, allEvents]);

    const getWeeklyPicks = (weekOffset: number) => {
        const nyNow = moment().tz(NY_TIMEZONE);

        const startDate = startOfWeek(addWeeks(nyNow.toDate(), weekOffset), { weekStartsOn: 1 });
        const endDate = endOfWeek(startDate, { weekStartsOn: 1 });

        return allEvents
            .filter((e) => e.weekly_pick)
            .filter((e) => {
                const eventDate = new Date(e.start_date);
                return eventDate >= startDate && eventDate <= endDate;
            })
            .map((e) => {
                const organizerPromoCode = e.organizer?.promo_codes?.find(code => code.scope === 'organizer');
                const eventPromoCode = e.promo_codes?.find(code => code.scope === 'event');
                const promoCodeDiscount = eventPromoCode || organizerPromoCode;

                return ({
                    dateKey: moment(new Date(e.start_date)).tz(NY_TIMEZONE).format('YYYY-MM-DD'),
                    dayOfWeek: moment(new Date(e.start_date)).tz(NY_TIMEZONE).format('ddd'), // e.g., "Wed"
                    title: e.name,
                    organizer: e.organizer.name,
                    description: e.short_description,
                    image: e.image_url,
                    promoCodeDiscount: promoCodeDiscount ? `${promoCodeDiscount.discount}% off` : null,
                    eventId: e.id,
                })
            })
            .sort((a, b) => new Date(a.dateKey).getTime() - new Date(b.dateKey).getTime());
    };

    const eventsByDate = getWeeklyPicks(currentWeekOffset).reduce<Record<string, any[]>>((acc, ev) => {
        (acc[ev.dateKey] = acc[ev.dateKey] || []).push(ev);
        return acc;
    }, {});

    const onPressEvent = (eventId: number) => {
        const full = allEvents.find((ev) => ev.id === eventId);

        logEvent(UE.WeeklyPicksEventDetailsClicked, {
            ...analyticsProps,
            event_id: eventId,
        });

        if (full) navigation.navigate('Event Details', { selectedEvent: full });
    };

    const handlePrevWeek = () => {
        const prevWeekIndex = visibleWeeks.findIndex(week => week === currentWeekOffset) - 1;

        logEvent(UE.WeeklyPicksPrevWeekClicked, {
            ...analyticsProps,
            index: prevWeekIndex,
        });

        if (prevWeekIndex >= 0) {
            setCurrentWeekOffset(visibleWeeks[prevWeekIndex]);
        }
    };

    const handleNextWeek = () => {
        const nextWeekIndex = visibleWeeks.findIndex(week => week === currentWeekOffset) + 1;

        logEvent(UE.WeeklyPicksNextWeekClicked, {
            ...analyticsProps,
            index: nextWeekIndex,
        });

        if (nextWeekIndex < visibleWeeks.length) {
            setCurrentWeekOffset(visibleWeeks[nextWeekIndex]);
        }
    };

    if (visibleWeeks.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.noEventsText}>No events available for the next few weeks.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.weekSelector}>
                <TouchableOpacity onPress={handlePrevWeek} disabled={currentWeekOffset === visibleWeeks[0]}>
                    <Ionicons name="chevron-back" size={24} color={currentWeekOffset === visibleWeeks[0] ? '#CCC' : '#6A1B9A'} />
                </TouchableOpacity>
                <Text style={styles.weekText}>{weekDates[currentWeekOffset]}</Text>
                <TouchableOpacity onPress={handleNextWeek} disabled={currentWeekOffset === visibleWeeks[visibleWeeks.length - 1]}>
                    <Ionicons name="chevron-forward" size={24} color={currentWeekOffset === visibleWeeks[visibleWeeks.length - 1] ? '#CCC' : '#6A1B9A'} />
                </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.eventsContainer}>
                {Object.entries(eventsByDate).map(([dateKey, events]) => (
                    <View key={dateKey} style={styles.card}>
                        <View style={styles.dayWrapper}>
                            <Text style={styles.day}>{events[0].dayOfWeek}</Text>
                        </View>
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
                                    {i < events.length - 1 && <View style={styles.separator} />}
                                </React.Fragment>
                            ))}
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    weekSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    weekText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    eventsContainer: {
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
    noEventsText: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
        color: 'white',
    },
});
