import React, { useEffect, useRef, useState } from 'react';
import { TextInput, Image, StyleSheet, SafeAreaView, Animated, TouchableOpacity, View, SectionList, Linking } from 'react-native';
import moment from 'moment';
import { Calendar } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';

import { Event } from '../../Common/commonTypes';
import { SECTION_DATE_FORMAT, useGroupedEvents } from './hooks/useGroupedEvents';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { EventWithMetadata, NavStack } from '../types';
import { useCalendarContext } from './CalendarContext';
import { CustomCalendarDay, CustomCalendarDayProps } from './CustomCalendarDay';
import EventList from './EventList';
import WebsiteBanner from './WebsiteBanner';
import { useUserContext } from '../Auth/UserContext';
import * as amplitude from '@amplitude/analytics-react-native';
import { MISC_URLS } from '../config';
import { screen } from '@testing-library/react';

const CALENDAR_HEIGHT = 250;

type EventCalendarViewProps = {
    isOnWishlist?: boolean
    isFriendWishlist?: boolean
    isRetreats?: boolean
    events?: EventWithMetadata[]
}

const EventCalendarView = ({ isOnWishlist = false, isFriendWishlist = false, isRetreats = false, events }: EventCalendarViewProps = {}) => {
    const [isCalendarExpanded, setIsCalendarExpanded] = useState(true);
    const { filters, setFilters, filteredEvents, wishlistEvents, friendWishlistEvents, reloadEvents, isLoadingEvents } = useCalendarContext();

    const { authUserId } = useUserContext()
    const [searchQuery, setSearchQuery] = useState('');

    let eventsUsed;

    if (events) {
        eventsUsed = events
    }
    else if (isFriendWishlist) {
        eventsUsed = friendWishlistEvents
    }
    else if (isOnWishlist) {
        eventsUsed = wishlistEvents
    } else if (isRetreats) {
        eventsUsed = filteredEvents.filter(event => event.type === 'retreat')
    } else {
        eventsUsed = filteredEvents
    }

    const { sections, markedDates } = useGroupedEvents(eventsUsed);
    const sectionListRef = useRef<SectionList<Event>>(null);
    const animatedHeight = useRef(new Animated.Value(CALENDAR_HEIGHT)).current;  // Persist across renders


    useEffect(() => {
        setFilters({ ...filters, search: searchQuery });
    }, [searchQuery]);

    // Toggle calendar expansion
    const onPressCalendar = () => {
        amplitude.logEvent('calendar_toggle_clicked');
        Animated.timing(animatedHeight, {
            toValue: isCalendarExpanded ? 0 : CALENDAR_HEIGHT, // Toggle between 0 and the actual content height
            duration: 300,
            useNativeDriver: false, // Height animations cannot use native driver
        }).start();

        setIsCalendarExpanded(!isCalendarExpanded);
    };

    const onPressDay = (day: any) => {
        amplitude.logEvent('calendar_day_clicked');
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
        amplitude.logEvent('google_calendar_clicked', {
            isOnWishlist,
            authUserId,
        });

        const params = isOnWishlist ? { wishlist: true, authUserId: authUserId || '' } : {};

        const url = MISC_URLS.addGoogleCalendar(params);

        Linking.openURL(url);
    }

    return (
        <SafeAreaView style={styles.container}>
            {!authUserId && <WebsiteBanner />}
            <View style={styles.searchContainer}>
                <TouchableOpacity style={styles.calendarIcon} onPress={onPressCalendar}>
                    <FAIcon name="calendar" size={30} color={isCalendarExpanded ? "#007AFF" : "#8E8E93"} />
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
                    placeholder="Search events (filters on left)"
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

            <EventList
                sections={sections}
                screen={'Calendar'}
                sectionListRef={sectionListRef}
                reloadEvents={reloadEvents}
                isLoadingEvents={isLoadingEvents}
            />

        </SafeAreaView >
    );
};

const styles = StyleSheet.create({
    container: {
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
        marginRight: 10,
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
    }
});

export default EventCalendarView;
