import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Text, SectionList, StyleSheet, Animated, Dimensions, SafeAreaView } from 'react-native';
import axios from 'axios';
import moment from 'moment';
import { Calendar } from 'react-native-calendars';
import { Event } from './types';
import { ListItem } from './ListItem';
import { EventDetail } from './EventDetail';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';


const EVENTS_API_URL = 'https://kinkbuddy.org/all_events.json'


type RootStackParamList = {
    'Main': undefined;
    'Event Details': { selectedEvent: Event };
};

const EventsList: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const sectionListRef = useRef<SectionList<Event>>(null); // Reference to SectionList
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

    useEffect(() => {
        if (!selectedEvent) return
        navigation.navigate('Event Details', { selectedEvent })
    }, [selectedEvent])

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

    useEffect(() => {
        // Automatically scroll to today's section when the list loads
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

    // Ensure filteredEvents is always an array before using reduce
    const groupedEvents = useMemo(() => Array.isArray(filteredEvents) ? filteredEvents.reduce((acc: Record<string, Event[]>, event) => {
        const date = moment(event.start_date).format('YYYY-MM-DD');
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(event);
        return acc;
    }, {}) : {}, [filteredEvents]);

    const sections = useMemo(() => Object.keys(groupedEvents).map(date => ({
        title: moment(date).format('MMM D, YYYY'),
        data: groupedEvents[date],
    })), [groupedEvents]);

    const markedDates = useMemo(() => {
        return Object.keys(groupedEvents).reduce((acc: any, date) => {
            acc[date] = { marked: true, dotColor: 'blue' };
            return acc;
        }, {});
    }, [groupedEvents]);

    const organizerOptions = useMemo(() => {
        return Array.from(new Set(events.map(event => event.organizer))).map(organizer => ({
            label: organizer,
            value: organizer,
            key: organizer
        }));
    }, [events]);


    const handleDayPress = (day: any) => {
        const date = moment(day.dateString).format('MMM D, YYYY');
        const sectionIndex = sections.findIndex(section => section.title === date);

        if (sectionIndex !== -1 && sectionListRef.current) {
            sectionListRef.current.scrollToLocation({
                sectionIndex,
                itemIndex: -1,
                animated: true,
            });
        }
    };

    // @ts-ignore
    const renderSectionHeader = ({ section: { title } }: any) => (
        <Text style={styles.sectionHeader}>{title}</Text>
    );

    return (
        <SafeAreaView style={styles.container}>
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
            <SectionList
                ref={sectionListRef} // Set reference to SectionList
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


const CalendarStack = createStackNavigator();

const CalendarWrapper = () => {
    return (
        <CalendarStack.Navigator>
            <CalendarStack.Screen name="Main" component={EventsList}
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
        </CalendarStack.Navigator>
    );
}

export default CalendarWrapper;
