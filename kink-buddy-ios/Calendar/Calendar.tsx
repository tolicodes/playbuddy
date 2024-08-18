import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Text, SectionList, StyleSheet, Animated, Dimensions, SafeAreaView } from 'react-native';
import axios from 'axios';
import moment from 'moment';
import { Calendar } from 'react-native-calendars';
import { Picker } from '@react-native-picker/picker';
import { Event } from './types';
import { ListItem } from './ListItem';
import { EventDetail } from './EventDetail';

const EVENTS_API_URL = 'https://kinkbuddy.org/all_events.json'
const { width: windowWidth } = Dimensions.get('window');

const CalendarEventList: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
    const [selectedOrganizer, setSelectedOrganizer] = useState<string | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const slideAnim = useRef(new Animated.Value(windowWidth)).current;
    const sectionListRef = useRef<SectionList<Event>>(null); // Reference to SectionList

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
        // Filter events based on the selected organizer
        if (selectedOrganizer) {
            const filtered = events.filter(event => event.organizer === selectedOrganizer);
            setFilteredEvents(filtered);
        } else {
            setFilteredEvents(events);
        }
    }, [selectedOrganizer, events]);

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

    const slideIn = () => {
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    const slideOut = () => {
        Animated.timing(slideAnim, {
            toValue: windowWidth,
            duration: 300,
            useNativeDriver: true,
        }).start(() => setSelectedEvent(null));
    };

    // @ts-ignore
    const renderSectionHeader = ({ section: { title } }: any) => (
        <Text style={styles.sectionHeader}>{title}</Text>
    );

    console.log({
        organizerOptions
    })

    return (
        <SafeAreaView style={styles.container}>
            {!selectedEvent && (
                <>
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
                            ({ item }: { item: Event }) => <ListItem item={item} setSelectedEvent={setSelectedEvent} slideIn={slideIn} />
                        }
                        renderSectionHeader={renderSectionHeader}
                        keyExtractor={(item, i) => item.name + item.id}
                        onScrollToIndexFailed={() => { console.log('scroll fail') }}
                        ListEmptyComponent={<Text>No events for this day.</Text>}
                    />
                </>)
            }

            {
                selectedEvent && (
                    <EventDetail selectedEvent={selectedEvent} slideAnim={slideAnim} slideOut={slideOut} />
                )
            }
        </SafeAreaView >
    );
};

const pickerSelectStyles = StyleSheet.create({
    inputIOS: {
        fontSize: 16,
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: 'gray',
        borderRadius: 4,
        color: 'black',
        paddingRight: 30, // to ensure the text is never behind the icon
        backgroundColor: '#fff',
        marginBottom: 10,
    },
    inputAndroid: {
        fontSize: 16,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 0.5,
        borderColor: 'purple',
        borderRadius: 8,
        color: 'black',
        paddingRight: 30,
        backgroundColor: '#fff',
        marginBottom: 10,
    },
    iconContainer: {
        top: 10,
        right: 12,
    },
    viewContainer: {
        padding: 10
    }
});

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

export default CalendarEventList;
