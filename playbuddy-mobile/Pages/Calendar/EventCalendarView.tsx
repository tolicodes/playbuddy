import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    View,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Text,
    Animated,
    SectionList,
    Linking
} from 'react-native';
import { Image } from 'expo-image';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import moment from 'moment-timezone';
import { format, startOfWeek, addDays, subWeeks, addWeeks } from 'date-fns';

import { useCalendarContext } from './hooks/CalendarContext';
import { useGroupedEvents, SECTION_DATE_FORMAT } from './hooks/useGroupedEvents';
import { useUserContext } from '../Auth/hooks/UserContext';
import EventList from './EventList';
import WebsiteBanner from '../../Common/WebsiteBanner';
import { logEvent } from '../../Common/hooks/logger';
import { MISC_URLS } from '../../config';
import { Calendar } from 'react-native-calendars';
import { EventWithMetadata } from '../../Common/Nav/NavStackType';
import { FeedbackInviteModal } from '../FeedbackInviteModal';

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

    const eventsUsed = events ?? (isOnWishlist ? wishlistEvents : filteredEvents);
    const [eventsLocalFiltered, setEventsLocalFiltered] = useState<EventWithMetadata[]>(eventsUsed);

    useEffect(() => {
        setEventsLocalFiltered(eventsUsed);
    }, [eventsUsed]);

    const { sections, markedDates } = useGroupedEvents(eventsLocalFiltered);

    const startOfCurrentWeek = useMemo(
        () => startOfWeek(currentDate, { weekStartsOn: 0 }),
        [currentDate]
    );
    const weekDays = useMemo(
        () => Array.from({ length: 7 }).map((_, i) => addDays(startOfCurrentWeek, i)),
        [startOfCurrentWeek]
    );

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

    // Use moment-timezone for clean day comparison in NY timezone
    const isSameDayNY = (d1: Date | string, d2: Date | string) =>
        moment(d1).tz('America/New_York').isSame(moment(d2).tz('America/New_York'), 'day');

    const hasEventsOnDay = (day: Date | string) =>
        eventsLocalFiltered.some(event => isSameDayNY(event.start_date, day));

    const goToPrev = () => {
        const prevDate = isCalendarExpanded ? subWeeks(currentDate, 4) : subWeeks(currentDate, 1);

        setCurrentDate(prevDate);
        setSelectedDate(prevDate);
        scrollToDate(prevDate);
    };
    const goToNext = () => {
        const nextDate = isCalendarExpanded ? addWeeks(currentDate, 4) : addWeeks(currentDate, 1);
        setCurrentDate(nextDate);
        setSelectedDate(nextDate);
        scrollToDate(nextDate);
    };

    const debounce = (func: (query: string) => void, delay: number) => {
        let timeout: NodeJS.Timeout;
        return (query: string) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(query), delay);
        };
    };

    const debouncedSetFilters = useCallback(
        debounce(query => {
            setFilters({ ...filters, search: query });
        }, 200),
        [filters]
    );

    useEffect(() => {
        debouncedSetFilters(searchQuery);
    }, [searchQuery]);

    return (
        <View style={styles.container}>
            {!authUserId && <WebsiteBanner />}
            <FeedbackInviteModal />

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
                    <TouchableOpacity onPress={goToPrev} style={styles.monthHeaderButtonLeft}>
                        <FAIcon name="chevron-left" size={20} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.monthText}>{format(currentDate, 'MMMM yyyy')}</Text>
                    <TouchableOpacity onPress={goToNext} style={styles.monthHeaderButtonRight}>
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
                        dayComponent={({ date, state }) => {
                            const iso = date.dateString;
                            const selected = isSameDayNY(iso, selectedDate);
                            return (
                                <TouchableOpacity
                                    style={{
                                        width: 30,
                                        height: 30,
                                        borderRadius: 15,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        backgroundColor: selected ? '#9C6ADE' : '#f7f2fa',
                                        opacity: hasEventsOnDay(iso) ? 1 : 0.5,
                                    }}
                                    onPress={() => onSelectDay(new Date(iso))}
                                >
                                    <Text
                                        style={{
                                            color: selected ? 'white' : state === 'disabled' ? '#ccc' : '#333',
                                            fontWeight: 'bold',
                                        }}
                                    >
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
                        {weekDays.map(day => {
                            const selected = isSameDayNY(day, selectedDate);
                            const hasEvent = hasEventsOnDay(day);
                            return (
                                <TouchableOpacity
                                    key={day.toISOString()}
                                    style={[styles.weekDay, selected && styles.weekDaySelected, hasEvent && !selected && styles.weekDayHasEvent]}
                                    onPress={() => onSelectDay(day)}
                                >
                                    <Text style={[styles.weekDayText, selected && styles.weekDayTextSelected]}>
                                        {moment(day).format('ddd')}
                                    </Text>
                                    <Text style={[styles.weekDayNumber, selected && styles.weekDayNumberSelected]}>
                                        {moment(day).format('D')}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
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
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#fff',
    },
    searchBubble: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFEFEF',
        borderRadius: 25,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 16, color: '#333' },
    topButtons: { flexDirection: 'row', marginLeft: 12 },
    topButton: {
        marginHorizontal: 4,
        backgroundColor: '#FFF',
        padding: 6,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    googleCalendarImage: { width: 26, height: 26 },
    monthHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        backgroundColor: '#fff',
    },
    monthText: { fontSize: 18, fontWeight: '600', color: '#333' },
    calendarContainer: { width: '100%', overflow: 'hidden', backgroundColor: '#fff' },

    dayBubble: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        borderRadius: 24,
        backgroundColor: '#f7f2fa',
    },
    selectedDayBubble: { backgroundColor: '#9C6ADE' },
    dayName: { fontSize: 12, color: '#666' },
    dayNumber: { fontWeight: 'bold', color: '#333' },
    selectedDayName: { color: '#fff' },
    selectedDayNumber: { color: '#fff' },
    noEvents: { opacity: 0.5 },
    eventListContainer: { flex: 1 },
    weekStrip: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    weekDay: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 10,
    },
    weekDayHasEvent: {
        backgroundColor: '#f0e8fc',
    },
    weekDaySelected: {
        backgroundColor: '#9C6ADE',
    },
    weekDayText: {
        fontSize: 12,
        color: '#666',
    },
    weekDayTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },
    weekDayNumber: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    weekDayNumberSelected: {
        color: '#fff',
    },
    monthHeaderButtonLeft: {
        paddingHorizontal: 8,
        paddingRight: 16,
    },
    monthHeaderButtonRight: {
        paddingHorizontal: 8,
        paddingLeft: 16,
    },

});
