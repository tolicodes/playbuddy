import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Text, SectionList, StyleSheet, SafeAreaView, Button, View } from 'react-native';
import axios from 'axios';
import moment from 'moment';
import { Calendar } from 'react-native-calendars';

import { Event } from './types';
import { ListItem } from './ListItem';
import { EventDetail } from './EventDetail';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';


import Icon from 'react-native-vector-icons/FontAwesome';
import { Filters } from './Filters';

const EVENTS_API_URL = 'https://rational-autumn-417712-73c6w6zqza-ue.a.run.app/events'


type RootStackParamList = {
    'Event List': undefined;
    'Event Details': { selectedEvent: Event };
    Filters: undefined;
};

const EventsList: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const sectionListRef = useRef<SectionList<Event>>(null); // Reference to SectionList
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

    // Navigate to Event Details screen when selectedEvent changes
    useEffect(() => {
        if (!selectedEvent) return
        navigation.navigate('Event Details', { selectedEvent })
    }, [selectedEvent])

    // Fetch events from API on component mount
    useEffect(() => {
        axios.get<Event[]>(EVENTS_API_URL)
            .then(response => {
                setEvents(response.data);
                setFilteredEvents(response.data);
            })
            .catch(error => {
                console.error('Error fetching events:', error);
            });
    }, []);

    // Automatically scroll to today's section when the list loads
    useEffect(() => {
        if (filteredEvents.length > 0) {
            const today = moment().format('MMM D, YYYY');
            const sectionIndex = sections.findIndex(section => section.title === today);

            if (sectionIndex !== -1 && sectionListRef.current) {
                setTimeout(() => {
                    sectionListRef.current?.scrollToLocation({
                        sectionIndex,
                        itemIndex: -1,
                        animated: true,
                    });
                }, 500)
            }
        }
    }, [filteredEvents]);

    // Group events by date
    const groupedEvents = useMemo(() => Array.isArray(filteredEvents) ? filteredEvents.reduce((acc: Record<string, Event[]>, event) => {
        const date = moment(event.start_date).format('YYYY-MM-DD');
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(event);
        return acc;
    }, {}) : {}, [filteredEvents]);

    // Create sections for SectionList by date
    const sections = useMemo(() => Object.keys(groupedEvents).map(date => ({
        title: moment(date).format('MMM D, YYYY'),
        data: groupedEvents[date],
    })), [groupedEvents]);

    // Mark dates with events on the calendar
    const markedDates = useMemo(() => {
        return Object.keys(groupedEvents).reduce((acc: any, date) => {
            acc[date] = { marked: true, dotColor: 'blue' };
            return acc;
        }, {});
    }, [groupedEvents]);

    // Create options for the organizer filter
    const organizerOptions = useMemo(() => {
        return Array.from(new Set(events.map(event => event.organizer))).map(organizer => ({
            label: organizer,
            value: organizer,
            key: organizer
        }));
    }, [events]);

    // When day is pressed on the calendar, scroll to the corresponding section
    const handleDayPress = (day: any) => {
        const date = moment(day.dateString).format('MMM D, YYYY');
        const sectionIndex = sections.findIndex(section => section.title === date);

        if (sectionIndex !== -1 && sectionListRef.current) {
            sectionListRef.current.scrollToLocation({
                // Bug fix: scrollToLocation doesn't work for the first section
                sectionIndex,
                itemIndex: sectionIndex === 0 ? 0 : -1,
                animated: true,
            });
        }
    };

    // Date header for each section
    // @ts-ignore
    const renderSectionHeader = ({ section: { title } }: any) => (
        <Text style={styles.sectionHeader}>{title}</Text>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Shows the actual calendar on top */}
            <Calendar
                markedDates={markedDates}
                onDayPress={handleDayPress}
                style={styles.calendar}
                theme={{
                    selectedDayBackgroundColor: 'blue',
                    todayTextColor: 'blue',
                    dotColor: 'blue',
                    arrowColor: 'blue',
                    'stylesheet.day.basic': {
                        base: {
                            margin: .2,  // Reduce margin around each day
                        },
                    }
                }}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                <Icon name="filter" size={30} color="blue" />
                <Button
                    title="Show Filters (By Organizer)"
                    onPress={() => navigation.navigate('Filters')}
                />
                <Icon name="filter" size={30} color="blue" />

            </View>


            {/*  List of events */}
            <SectionList
                ref={sectionListRef} // Set reference to SectionList so that we can scroll
                sections={sections}
                stickySectionHeadersEnabled={true}
                renderItem={
                    ({ item }: { item: Event }) => <ListItem item={item} setSelectedEvent={setSelectedEvent} />
                }
                renderSectionHeader={renderSectionHeader}
                keyExtractor={(item, i) => item.name + item.id}
                onScrollToIndexFailed={() => { console.log('scroll fail') }}
                ListEmptyComponent={<Text>Loading</Text>}
            />
        </SafeAreaView >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    calendar: {
        marginBottom: 10,
    },

    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        backgroundColor: '#f4f4f4',
        paddingVertical: 8,
        paddingHorizontal: 20,
        color: '#333',
    },
});

// For navigation
const CalendarStack = createStackNavigator();

const CalendarWrapper = () => {
    return (
        <CalendarStack.Navigator>
            {/*  Event */}
            <CalendarStack.Screen name="Event List" component={EventsList}
                options={{
                    headerShown: false, // Turn off the header for the Main screen
                }}
            />
            <CalendarStack.Screen
                name="Event Details"
                component={EventDetail}
                options={{
                    headerShown: true,
                    headerTitle: 'Event Details',
                }}
            />
            <CalendarStack.Screen
                name="Filters"
                component={Filters}
                options={{
                    headerShown: true,
                    headerTitle: 'Filters',
                }}
            />
        </CalendarStack.Navigator>
    );
}

export default CalendarWrapper;
