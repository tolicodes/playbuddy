import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TextInput, StyleSheet, Animated, TouchableOpacity, View, Linking, SectionList } from 'react-native';
import { Image } from 'expo-image';
import moment from 'moment';
import { Calendar } from 'react-native-calendars';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { Event } from '../../../common/types/commonTypes';
import { SECTION_DATE_FORMAT, useGroupedEvents } from './hooks/useGroupedEvents';
import { EventWithMetadata } from '../../Common/Nav/NavStackType';
import { useCalendarContext } from './hooks/CalendarContext';
import { CustomCalendarDay, CustomCalendarDayProps } from './CustomCalendarDay';
import EventList from './EventList';
import WebsiteBanner from '../../Common/WebsiteBanner';
import { useUserContext } from '../Auth/hooks/UserContext';
import { MISC_URLS } from '../../config';
import { logEvent } from '../../Common/hooks/logger';

const CALENDAR_HEIGHT = 250; // Shorter height for week view

// Provided helper – opens the Google Calendar link.
const getGoogleCalLink = () => {
    logEvent('moar_get_google_cal_link');
    return MISC_URLS.addGoogleCalendar();
};

type EventCalendarViewProps = {
    isOnWishlist?: boolean;
    events?: EventWithMetadata[];
};

const EventCalendarView: React.FC<EventCalendarViewProps> = ({ isOnWishlist = false, events }) => {
    const [isCalendarExpanded, setIsCalendarExpanded] = useState(true);
    const { filters, setFilters, filteredEvents, wishlistEvents, reloadEvents, isLoadingEvents } = useCalendarContext();
    const { authUserId } = useUserContext();
    const [searchQuery, setSearchQuery] = useState('');

    let eventsUsed: EventWithMetadata[];
    if (events) {
        eventsUsed = events;
    } else if (isOnWishlist) {
        eventsUsed = wishlistEvents;
    } else {
        eventsUsed = filteredEvents;
    }

    // Local private events filter (if needed)
    const [isPrivateEventsFiltered, setIsPrivateEventsFiltered] = useState(false);
    const [eventsLocalFiltered, setEventsLocalFiltered] = useState<EventWithMetadata[]>([]);
    useEffect(() => {
        const eventsFiltered = isPrivateEventsFiltered
            ? eventsUsed.filter(event => event.visibility === 'private')
            : eventsUsed;
        setEventsLocalFiltered(eventsFiltered);
    }, [isPrivateEventsFiltered, eventsUsed]);

    // Debounce search input
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

    const sectionListRef = useRef<SectionList<Event>>(null);
    const animatedHeight = useRef(new Animated.Value(CALENDAR_HEIGHT)).current;

    // Toggle calendar expansion (for fun, you might change the icon color etc.)
    const onPressExpand = () => {
        logEvent('event_calendar_view_on_press_expand');
        Animated.timing(animatedHeight, {
            toValue: isCalendarExpanded ? 0 : CALENDAR_HEIGHT,
            duration: 300,
            useNativeDriver: false,
        }).start();
        setIsCalendarExpanded(!isCalendarExpanded);
    };

    // Scroll to today's date in the SectionList
    const onPressToday = () => {
        logEvent('event_calendar_view_on_press_today');
        const today = moment().format(SECTION_DATE_FORMAT);
        const { sections } = useGroupedEvents(eventsLocalFiltered);
        const sectionIndex = sections.findIndex(section => section.title === today);
        if (sectionIndex !== -1 && sectionListRef.current) {
            sectionListRef.current.scrollToLocation({
                sectionIndex,
                itemIndex: 0,
                animated: true,
            });
        }
    };

    // Open Google Calendar link
    const onPressGoogleCalendar = () => {
        logEvent('event_calendar_view_on_press_google_calendar', { isOnWishlist, authUserId });
        const url = getGoogleCalLink();
        Linking.openURL(url);
    };

    // Prepare calendar props for week view.
    const { sections, markedDates } = useGroupedEvents(eventsLocalFiltered);
    const calendarProps = {
        markedDates,
        onDayPress: (day: CustomCalendarDayProps) => {
            logEvent('event_calendar_view_on_press_day');
            const date = moment(day.dateString).format(SECTION_DATE_FORMAT);
            const sectionIndex = sections.findIndex(section => section.title === date);
            if (sectionIndex !== -1 && sectionListRef.current) {
                sectionListRef.current.scrollToLocation({
                    sectionIndex,
                    itemIndex: sectionIndex === 0 ? 0 : -1,
                    animated: true,
                });
            }
        },
        dayComponent: (props: CustomCalendarDayProps) => <CustomCalendarDay {...props} />,
        theme: {
            selectedDayBackgroundColor: '#FF69B4',
            todayTextColor: '#FF69B4',
            arrowColor: '#FF69B4',
            textSectionTitleColor: '#333',
        },
        hideExtraDays: true,    // Show only the current week
        disableMonthChange: true,
    };

    return (
        <View style={styles.container}>
            {!authUserId && <WebsiteBanner />}
            <View style={styles.topBar}>
                {/* Bubble search */}
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
                {/* Top bar buttons */}
                <View style={styles.topButtons}>
                    <TouchableOpacity style={styles.topButton} onPress={onPressToday}>
                        <Ionicons name="today-outline" size={24} color="#888" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.topButton} onPress={onPressGoogleCalendar}>
                        <Image
                            source={require('./images/google-calendar.png')}
                            style={styles.googleCalendarImage}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.topButton} onPress={onPressExpand}>
                        <FAIcon name={isCalendarExpanded ? "angle-double-up" : "angle-double-down"} size={24} color="#888" />
                    </TouchableOpacity>
                </View>
            </View>
            <Animated.View style={[styles.calendarContainer, { height: isCalendarExpanded ? CALENDAR_HEIGHT : 0 }]}>
                <Calendar {...calendarProps} style={styles.calendar} />
            </Animated.View>
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
    container: {
        flex: 1,
        backgroundColor: '#F2F2F2',
    },
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
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    topButtons: {
        flexDirection: 'row',
        marginLeft: 12,
    },
    topButton: {
        marginHorizontal: 4,
        backgroundColor: '#FFF',
        padding: 6,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    calendarContainer: {
        width: '100%',
        overflow: 'hidden',
        height: CALENDAR_HEIGHT,
    },
    calendar: {
        height: CALENDAR_HEIGHT,
        borderTopWidth: 1,
        borderTopColor: '#ccc',
    },
    eventListContainer: {
        flex: 1,
    },
    googleCalendarImage: {
        width: 26,
        height: 26,
    },
});
