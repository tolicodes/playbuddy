import React, { useState, useEffect, useRef } from 'react';
import { View, Text, SectionList, StyleSheet, Image, Animated, TouchableOpacity, Dimensions } from 'react-native';
import axios from 'axios';
import moment from 'moment';
import { Calendar } from 'react-native-calendars';
import RNPickerSelect from 'react-native-picker-select';

export type SourceMetadata = {
    source_origination_group_id?: string;
    source_origination_group_name?: string;
    source_origination_platform?: 'WhatsApp' | 'Unknown';
    source_ticketing_platform?: 'Eventbrite' | 'Plura' | 'Partiful' | 'Unknown';
    dataset?: 'Kink' | 'Whatsapp POC';
};

export type Event = {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    start_time?: string;
    end_time?: string;
    timezone?: string;
    location: string;
    price: string;
    imageUrl: string;
    organizer: string;
    organizerUrl: string;
    eventUrl: string;
    summary: string;
    tags: string[];
    min_ticket_price: string;
    max_ticket_price: string;
};

const { width } = Dimensions.get('window');

const CalendarEventList: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
    const [selectedOrganizer, setSelectedOrganizer] = useState<string | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const slideAnim = useRef(new Animated.Value(0)).current;
    const sectionListRef = useRef<SectionList<Event>>(null); // Reference to SectionList

    useEffect(() => {
        axios.get<Event[]>('https://kinkbuddy.org/all_events.json')
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
                // sectionListRef.current.scrollToLocation({
                //     sectionIndex,
                //     itemIndex: 0,
                //     animated: true,
                // });
            }
        }
    }, [filteredEvents]);

    const slideIn = () => {
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    const slideOut = () => {
        Animated.timing(slideAnim, {
            toValue: width,
            duration: 300,
            useNativeDriver: true,
        }).start(() => setSelectedEvent(null));
    };

    const renderEvent = ({ item }: { item: Event }) => (
        <TouchableOpacity onPress={() => {
            setSelectedEvent(item);
            slideIn();
        }}>
            <View style={styles.eventContainer}>
                <Image source={{ uri: item.imageUrl }} style={styles.eventImage} />
                <View style={styles.eventDetails}>
                    <Text style={styles.eventTitle}>{item.name}</Text>
                    <Text style={styles.eventTime}>
                        {item.start_time ? moment(item.start_time, 'HH:mm:ss').format('h:mm A') : ''}
                        {' - '}
                        {item.end_time ? moment(item.end_time, 'HH:mm:ss').format('h:mm A') : ''}
                    </Text>
                    <Text style={styles.eventLocation}>{item.location}</Text>
                    <Text style={styles.eventPrice}>
                        {item.min_ticket_price !== item.max_ticket_price
                            ? `$${item.min_ticket_price} - $${item.max_ticket_price}`
                            : item.price}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderSectionHeader = ({ section }: { section: { title: string } }) => (
        <Text style={styles.sectionHeader}>{section.title}</Text>
    );

    // Ensure filteredEvents is always an array before using reduce
    const groupedEvents = Array.isArray(filteredEvents) ? filteredEvents.reduce((acc: Record<string, Event[]>, event) => {
        const date = moment(event.start_date).format('YYYY-MM-DD');
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(event);
        return acc;
    }, {}) : {};

    const sections = Object.keys(groupedEvents).map(date => ({
        title: moment(date).format('MMM D, YYYY'),
        data: groupedEvents[date],
    }));

    const markedDates = Object.keys(groupedEvents).reduce((acc: any, date) => {
        acc[date] = { marked: true, dotColor: 'blue' };
        return acc;
    }, {});
    const handleDayPress = (day: any) => {
        const date = moment(day.dateString).format('MMM D, YYYY');
        const sectionIndex = sections.findIndex(section => section.title === date);
        if (sectionIndex !== -1 && sectionListRef.current) {
            sectionListRef.current.scrollToLocation({
                sectionIndex,
                itemIndex: 0,
                animated: true,
            });
        }
    };

    const organizerOptions = Array.from(new Set(events.map(event => event.organizer))).map(organizer => ({
        label: organizer,
        value: organizer,
    }));

    return (
        <View style={styles.container}>
            {/* <RNPickerSelect
                onValueChange={(value) => setSelectedOrganizer(value)}
                items={organizerOptions}
                placeholder={{ label: "Filter by Organizer", value: null }}
                style={pickerSelectStyles}
            /> */}
            <Calendar
                markedDates={markedDates}
                onDayPress={handleDayPress}
                style={styles.calendar}
                theme={{
                    selectedDayBackgroundColor: 'blue',
                    todayTextColor: 'blue',
                    dotColor: 'blue',
                    arrowColor: 'blue',
                }}
            />
            <SectionList
                ref={sectionListRef} // Set reference to SectionList
                sections={sections}
                renderItem={renderEvent}
                // renderSectionHeader={renderSectionHeader}
                keyExtractor={item => item.id}
            // ListEmptyComponent={<Text style={styles.noEventsText}>No events for this day.</Text>}
            />

            {selectedEvent && (
                <Animated.View style={[styles.fullViewContainer, { transform: [{ translateX: slideAnim }] }]}>
                    <TouchableOpacity onPress={slideOut}>
                        <Text style={styles.backButton}>Back</Text>
                    </TouchableOpacity>
                    <Image source={{ uri: selectedEvent.imageUrl }} style={styles.fullViewImage} />
                    {/* <TouchableOpacity onPress={() => Linking.openURL(selectedEvent.eventUrl)}>
                        <Text style={styles.fullViewTitle}>{selectedEvent.name}</Text>
                    </TouchableOpacity> */}
                    <Text style={styles.fullViewTime}>
                        {selectedEvent.start_time ? moment(selectedEvent.start_time, 'HH:mm:ss').format('h:mm A') : ''}
                        {' - '}
                        {selectedEvent.end_time ? moment(selectedEvent.end_time, 'HH:mm:ss').format('h:mm A') : ''}
                    </Text>
                    <Text style={styles.fullViewLocation}>{selectedEvent.location}</Text>
                    <Text style={styles.fullViewPrice}>
                        {selectedEvent.min_ticket_price !== selectedEvent.max_ticket_price
                            ? `$${selectedEvent.min_ticket_price} - $${selectedEvent.max_ticket_price}`
                            : selectedEvent.price}
                    </Text>
                    <Text style={styles.fullViewSummary}>{selectedEvent.summary}</Text>
                </Animated.View>
            )}
        </View>
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
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    calendar: {
        marginBottom: 10,
    },
    eventContainer: {
        flexDirection: 'row',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    eventImage: {
        width: 50,
        height: 50,
        marginRight: 16,
    },
    eventDetails: {
        flex: 1,
    },
    eventTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    eventTime: {
        fontSize: 14,
        color: '#666',
    },
    eventLocation: {
        fontSize: 14,
        color: '#666',
    },
    eventPrice: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        backgroundColor: '#f4f4f4',
        paddingVertical: 8,
        paddingHorizontal: 20,
        color: '#333',
    },
    fullViewContainer: {
        position: 'absolute',
        top: 0,
        left: width,
        width: '100%',
        height: '100%',
        backgroundColor: '#fff',
        padding: 20,
    },
    fullViewImage: {
        width: '100%',
        height: 200,
        marginBottom: 20,
    },
    fullViewTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e90ff',
        marginBottom: 20,
    },
    fullViewTime: {
        fontSize: 18,
        color: '#666',
        marginTop: 10,
    },
    fullViewLocation: {
        fontSize: 18,
        color: '#666',
        marginTop: 10,
    },
    fullViewPrice: {
        fontSize: 18,
        color: '#666',
        marginTop: 10,
    },
    fullViewSummary: {
        fontSize: 16,
        color: '#666',
        marginTop: 20,
    },
    backButton: {
        fontSize: 18,
        color: 'blue',
        marginBottom: 20,
    },
});

export default CalendarEventList;
