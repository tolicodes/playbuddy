import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TextInput, StyleSheet, Animated, TouchableOpacity, View, SectionList, Linking } from 'react-native';
import { Image } from 'expo-image'
import moment from 'moment';
import { Calendar } from 'react-native-calendars';

import { Event } from '../../../Common/commonTypes';
import { SECTION_DATE_FORMAT, useGroupedEvents } from './hooks/useGroupedEvents';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { EventWithMetadata } from '../../Common/Nav/NavStackType';

import { useCalendarContext } from './hooks/CalendarContext';
import { CustomCalendarDay, CustomCalendarDayProps } from './CustomCalendarDay';
import EventList from './EventList';
import WebsiteBanner from '../../Common/WebsiteBanner';
import { useUserContext } from '../Auth/hooks/UserContext';
import { MISC_URLS } from '../../config';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { logEvent } from '../../Common/hooks/logger';

const CALENDAR_HEIGHT = 250;

type EventCalendarViewProps = {
    isOnWishlist?: boolean
    events?: EventWithMetadata[]
}

const EventCalendarView = ({ isOnWishlist = false, events }: EventCalendarViewProps = {}) => {
    const [isCalendarExpanded, setIsCalendarExpanded] = useState(true);
    const { filters, setFilters, filteredEvents, wishlistEvents, reloadEvents, isLoadingEvents } = useCalendarContext();

    const { authUserId } = useUserContext()
    const [searchQuery, setSearchQuery] = useState('');

    let eventsUsed: EventWithMetadata[];

    if (events) {
        eventsUsed = events
    }
    else if (isOnWishlist) {
        eventsUsed = wishlistEvents
    } else {
        eventsUsed = filteredEvents
    }

    // locally filter private events based on button on top
    const [isPrivateEventsFiltered, setIsPrivateEventsFiltered] = useState(false);
    const [eventsLocalFiltered, setEventsLocalFiltered] = useState<EventWithMetadata[]>([]);

    // these don't apply globally, so we need to filter locally
    useEffect(() => {
        const eventsFiltered = isPrivateEventsFiltered
            ? eventsUsed.filter(event => event.visibility === 'private')
            : eventsUsed

        setEventsLocalFiltered(eventsFiltered)
    }, [isPrivateEventsFiltered, eventsUsed])

    const onPressPrivateEvents = () => {
        logEvent('event_calendar_view_on_press_private_events');
        setIsPrivateEventsFiltered(!isPrivateEventsFiltered);
    }

    const { sections, markedDates } = useGroupedEvents(eventsLocalFiltered);
    const sectionListRef = useRef<SectionList<Event>>(null);
    const animatedHeight = useRef(new Animated.Value(CALENDAR_HEIGHT)).current;  // Persist across renders

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

    // Toggle calendar expansion
    const onPressCalendar = () => {
        logEvent('event_calendar_view_on_press_calendar');
        Animated.timing(animatedHeight, {
            toValue: isCalendarExpanded ? 0 : CALENDAR_HEIGHT, // Toggle between 0 and the actual content height
            duration: 300,
            useNativeDriver: false, // Height animations cannot use native driver
        }).start();

        setIsCalendarExpanded(!isCalendarExpanded);
    };

    const onPressDay = (day: any) => {
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
    };

    const onPressGoogleCalendar = () => {
        logEvent('event_calendar_view_on_press_google_calendar', {
            isOnWishlist,
            authUserId,
        });

        const params = isOnWishlist ? { wishlist: true, authUserId: authUserId || '' } : {};

        const url = MISC_URLS.addGoogleCalendar(params);

        Linking.openURL(url);
    }

    return (
        <View style={styles.container}>
            {!authUserId && <WebsiteBanner />}
            <View style={styles.searchContainer}>
                <TouchableOpacity style={styles.calendarIcon} onPress={onPressCalendar}>
                    <FAIcon name="calendar" size={30} color={isCalendarExpanded ? "#007AFF" : "#8E8E93"} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.calendarIcon} onPress={onPressPrivateEvents}>
                    <Ionicons name="lock-closed" size={30} color={isPrivateEventsFiltered ? "#007AFF" : "#8E8E93"} />
                </TouchableOpacity>

                {isOnWishlist && <TouchableOpacity style={styles.googleCalendarIcon} onPress={onPressGoogleCalendar}>
                    <Image
                        source={require('./images/google-calendar.png')}
                        style={styles.googleCalendarImage}
                    />
                </TouchableOpacity>}

                <TextInput
                    style={[styles.searchBox, searchQuery
                        ? { borderColor: '#007AFF', borderWidth: 3 }
                        : { borderColor: '#DDD' }]}
                    placeholder="Search events (filters on top)"
                    value={searchQuery}
                    onChangeText={text => setSearchQuery(text)}
                />
            </View>


            <Animated.View style={[styles.calendar, { height: animatedHeight }]}>
                <Calendar
                    markedDates={markedDates}
                    onDayPress={onPressDay}
                    dayComponent={(props: CustomCalendarDayProps) => (
                        <CustomCalendarDay
                            {...props}
                        />
                    )}
                    theme={{
                        selectedDayBackgroundColor: 'blue',
                        todayTextColor: 'blue',
                        arrowColor: 'blue',
                        lineHeight: 10,
                    }}
                />
            </Animated.View>

            <View style={styles.eventListContainer}>
                <EventList
                    sections={sections}
                    screen={'Main Calendar'}
                    sectionListRef={sectionListRef}
                    reloadEvents={reloadEvents}
                    isLoadingEvents={isLoadingEvents}
                />
            </View>

        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flex: 1
    },
    calendar: {
        width: '100%',
        overflow: 'hidden',
    },
    emptyList: {
        padding: 20,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        backgroundColor: '#f4f4f4',
        paddingVertical: 8,
        paddingHorizontal: 20,
        color: '#333',
    },
    controlLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: 20,
        paddingBottom: 0,
        paddingTop: 10,
        backgroundColor: 'white',
        marginBottom: -20,
    },
    searchBox: {
        height: 40,
        flex: 1,
        borderColor: '#DDD',
        borderWidth: 1,
        paddingHorizontal: 10,
        marginBottom: 20,
        borderRadius: 8,
        backgroundColor: '#fff',
        fontSize: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 2,
    },
    filterIcon: {
        marginTop: -20,
        marginLeft: 10,
        marginRight: 20,
        alignSelf: 'center',
    },
    calendarIcon: {
        marginTop: -20,
        marginRight: 15,
        alignSelf: 'center',
    },
    googleCalendarIcon: {
        marginTop: -20,
        marginRight: 10,
        alignSelf: 'center',
    },
    googleCalendarImage: {
        width: 30,  // Set your desired width
        height: 30, // Set your desired height
    },
    eventListContainer: {
        flex: 1,
    }
});

export default EventCalendarView;