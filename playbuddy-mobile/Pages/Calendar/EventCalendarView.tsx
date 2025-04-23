import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, Animated, SectionList, Linking } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { format, startOfWeek, addDays, subWeeks, addWeeks, isSameDay } from 'date-fns';
import moment from 'moment';

import { useCalendarContext } from './hooks/CalendarContext';
import { useGroupedEvents, SECTION_DATE_FORMAT } from './hooks/useGroupedEvents';
import { useUserContext } from '../Auth/hooks/UserContext';
import EventList from './EventList';
import WebsiteBanner from '../../Common/WebsiteBanner';
import { logEvent } from '../../Common/hooks/logger';
import { MISC_URLS } from '../../config';
import { Calendar } from 'react-native-calendars';
import { EventWithMetadata } from '../../Common/Nav/NavStackType';

const WEEK_HEIGHT = 70;
const MONTH_HEIGHT = 300;

interface EventCalendarViewProps {
    isOnWishlist?: boolean;
    events?: EventWithMetadata[];
}

const EventCalendarView: React.FC<EventCalendarViewProps> = ({ isOnWishlist = false, events }) => {
    const { filters, setFilters, filteredEvents, wishlistEvents, reloadEvents, isLoadingEvents } = useCalendarContext();
    const { authUserId } = useUserContext();

    const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    const sectionListRef = useRef<SectionList>(null);
    const animatedHeight = useRef(new Animated.Value(WEEK_HEIGHT)).current;

    const eventsUsed = events ? events : isOnWishlist ? wishlistEvents : filteredEvents;

    const [eventsLocalFiltered, setEventsLocalFiltered] = useState<EventWithMetadata[]>(eventsUsed);

    useEffect(() => {
        setEventsLocalFiltered(eventsUsed);
    }, [eventsUsed]);

    const { sections, markedDates } = useGroupedEvents(eventsLocalFiltered);

    const startOfCurrentWeek = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 0 }), [currentDate]);
    const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(startOfCurrentWeek, i)), [startOfCurrentWeek]);

    const onPressExpand = () => {
        logEvent('event_calendar_view_on_press_expand');
        Animated.timing(animatedHeight, {
            toValue: isCalendarExpanded ? WEEK_HEIGHT : MONTH_HEIGHT,
            duration: 300,
            useNativeDriver: false,
        }).start();
        setIsCalendarExpanded(!isCalendarExpanded);
    };

    const onPressToday = () => {
        logEvent('event_calendar_view_on_press_today');
        setCurrentDate(new Date());
        setSelectedDate(new Date());
        scrollToDate(new Date());
    };

    const onPressGoogleCalendar = () => {
        logEvent('event_calendar_view_on_press_google_calendar', { isOnWishlist, authUserId });
        Linking.openURL(MISC_URLS.addGoogleCalendar());
    };

    const scrollToDate = (date: Date) => {
        const formatted = moment(date).format(SECTION_DATE_FORMAT);
        const sectionIndex = sections.findIndex(section => section.title === formatted);
        if (sectionIndex !== -1 && sectionListRef.current) {
            sectionListRef.current.scrollToLocation({ sectionIndex, itemIndex: 0, animated: true });
        }
    };

    const onSelectDay = (day: Date) => {
        setSelectedDate(day);
        scrollToDate(day);
    };

    const hasEventsOnDay = (day: Date) => {
        return eventsLocalFiltered.some(event => isSameDay(event.start_date, day));
    };

    const goToPrev = () => setCurrentDate(prev => isCalendarExpanded ? subWeeks(prev, 4) : subWeeks(prev, 1));
    const goToNext = () => setCurrentDate(prev => isCalendarExpanded ? addWeeks(prev, 4) : addWeeks(prev, 1));

    const debounce = (func: (query: string) => void, delay: number) => {
        let timeout: NodeJS.Timeout;
        return (query: string) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(query), delay);
        };
    };

    const debouncedSetFilters = useCallback(debounce((query) => {
        setFilters({ ...filters, search: query });
    }, 200), [filters]);

    useEffect(() => {
        debouncedSetFilters(searchQuery);
    }, [searchQuery]);

    return (
        <View style={styles.container}>
            {!authUserId && <WebsiteBanner />}

            {/* Top Bar */}
            <View style={styles.topBar}>
                <View style={styles.searchBubble}>
                    <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search events"
                        placeholderTextColor="#888"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                <View style={styles.topButtons}>
                    <TouchableOpacity style={styles.topButton} onPress={onPressToday}>
                        <Ionicons name="today-outline" size={24} color="#888" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.topButton} onPress={onPressGoogleCalendar}>
                        <Image source={require('./images/google-calendar.png')} style={styles.googleCalendarImage} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.topButton} onPress={onPressExpand}>
                        <FAIcon name={isCalendarExpanded ? 'angle-double-up' : 'angle-double-down'} size={24} color="#888" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Month + Arrows */}
            {!isCalendarExpanded && (
                <View style={styles.monthHeader}>
                    <TouchableOpacity onPress={goToPrev}>
                        <FAIcon name="chevron-left" size={20} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.monthText}>{format(currentDate, 'MMMM yyyy')}</Text>
                    <TouchableOpacity onPress={goToNext}>
                        <FAIcon name="chevron-right" size={20} color="#333" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Week Strip or Full Calendar */}
            <Animated.View style={[styles.calendarContainer, { height: animatedHeight }]}>
                {isCalendarExpanded ? (
                    <Calendar
                        current={currentDate.toISOString()}
                        markedDates={markedDates}
                        onDayPress={day => onSelectDay(new Date(day.dateString))}
                        hideExtraDays={false}
                        dayComponent={({ date, state }: { date: any, state: any }) => {
                            const isSelected = isSameDay(new Date(date.dateString), selectedDate);
                            return (
                                <TouchableOpacity
                                    style={[
                                        {
                                            width: 30,
                                            height: 30,
                                            borderRadius: 15,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            backgroundColor: isSelected ? '#9C6ADE' : '#f7f2fa',
                                            opacity: hasEventsOnDay(new Date(date.dateString)) ? 1 : 0.5,
                                        }
                                    ]}
                                    onPress={() => onSelectDay(new Date(date.dateString))}
                                >
                                    <Text style={{
                                        color: isSelected ? 'white' : state === 'disabled' ? '#ccc' : '#333',
                                        fontWeight: 'bold'
                                    }}>
                                        {date.day}
                                    </Text>
                                </TouchableOpacity>
                            );
                        }}
                        theme={{
                            backgroundColor: '#ffffff',
                            calendarBackground: '#ffffff',
                            textSectionTitleColor: '#b6c1cd',
                            textSectionTitleDisabledColor: '#d9e1e8',
                            selectedDayBackgroundColor: '#9C6ADE',
                            selectedDayTextColor: '#ffffff',
                            todayTextColor: '#9C6ADE',
                            dayTextColor: '#2d4150',
                            textDisabledColor: '#d9e1e8',
                            dotColor: '#00adf5',
                            selectedDotColor: '#ffffff',
                            arrowColor: '#9C6ADE',
                            disabledArrowColor: '#d9e1e8',
                            monthTextColor: '#333333',
                            indicatorColor: '#9C6ADE',
                            textDayFontWeight: '300',
                            textMonthFontWeight: 'bold',
                            textDayHeaderFontWeight: '500',
                            textDayFontSize: 16,
                            textMonthFontSize: 18,
                            textDayHeaderFontSize: 14,
                        }}

                    />
                ) : (
                    <View style={styles.weekStrip}>
                        {weekDays.map(day => (
                            <TouchableOpacity
                                key={day.toISOString()}
                                style={[
                                    styles.dayBubble,
                                    isSameDay(day, selectedDate) && styles.selectedDayBubble,
                                    !hasEventsOnDay(day) && styles.noEvents
                                ]}
                                onPress={() => onSelectDay(day)}
                            >
                                <Text style={[styles.dayName, isSameDay(day, selectedDate) && styles.selectedDayName]}>{format(day, 'EEE')}</Text>
                                <Text style={[styles.dayNumber, isSameDay(day, selectedDate) && styles.selectedDayNumber]}>{format(day, 'd')}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </Animated.View>

            {/* Events List */}
            <View style={styles.eventListContainer}>
                <EventList
                    sections={sections}
                    sectionListRef={sectionListRef}
                    reloadEvents={reloadEvents}
                    isLoadingEvents={isLoadingEvents}
                />
            </View>
        </View>
    );
};

export default EventCalendarView;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F2F2' },
    topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
    searchBubble: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFEFEF', borderRadius: 25, paddingHorizontal: 12, paddingVertical: 6 },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 16, color: '#333' },
    topButtons: { flexDirection: 'row', marginLeft: 12 },
    topButton: { marginHorizontal: 4, backgroundColor: '#FFF', padding: 6, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 2 },
    googleCalendarImage: { width: 26, height: 26 },
    monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff' },
    monthText: { fontSize: 18, fontWeight: '600', color: '#333' },
    calendarContainer: { width: '100%', overflow: 'hidden', backgroundColor: '#fff' },
    weekStrip: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10 },
    dayBubble: { alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 24, backgroundColor: '#f7f2fa' },
    selectedDayBubble: { backgroundColor: '#9C6ADE', color: 'black' },
    dayName: { fontSize: 12, color: '#666' },
    dayNumber: { fontWeight: 'bold', color: '#333' },
    selectedDayName: { color: '#fff' },
    selectedDayNumber: { color: '#fff' },
    eventListContainer: { flex: 1 },
    noEvents: { backgroundColor: '#f7f2fa', opacity: 0.5 },
});
