import React, { useState, useEffect, useRef } from 'react';
import { View, Text, SectionList, StyleSheet, Image, Animated, TouchableOpacity, Dimensions, SafeAreaView } from 'react-native';
import axios from 'axios';
import moment from 'moment';

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
} & SourceMetadata;

const { width } = Dimensions.get('window');
const CalendarEventList: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const slideAnim = useRef(new Animated.Value(0)).current; // Initial position of the event details view

    useEffect(() => {
        axios.get<Event[]>('https://kinkbuddy.org/all_events.json')
            .then(response => {
                setEvents(response.data);
            })
            .catch(error => {
                console.error('Error fetching events:', error);
            });
    }, []);

    const slideIn = () => {
        Animated.timing(slideAnim, {
            toValue: -width, // Slide to the left by the width of the screen
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    const slideOut = () => {
        Animated.timing(slideAnim, {
            toValue: 0, // Slide back to the original position
            duration: 300,
            useNativeDriver: true,
        }).start(() => setSelectedEvent(null));
    };

    const renderEvent = ({ item }: { item: Event }) => (
        <TouchableOpacity onPress={() => {
            setSelectedEvent(item);
            slideIn();
        }}>
            <SafeAreaView style={styles.eventContainer}>
                <Image source={{ uri: item.imageUrl }} style={styles.eventImage} />
                <SafeAreaView style={styles.eventDetails}>
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
                </SafeAreaView>
            </SafeAreaView>
        </TouchableOpacity>
    );

    const renderSectionHeader = ({ section }: { section: { title: string } }) => (
        <Text style={styles.sectionHeader}>{section.title}</Text>
    );

    const groupedEvents = events.reduce((acc: Record<string, Event[]>, event) => {
        const date = moment(event.start_date).format('MMM D, YYYY');
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(event);
        return acc;
    }, {});

    const sections = Object.keys(groupedEvents).map(date => ({
        title: date,
        data: groupedEvents[date],
    }));

    return (
        <View style={styles.container}>
            <SectionList
                sections={sections}
                renderItem={renderEvent}
                renderSectionHeader={renderSectionHeader}
                keyExtractor={item => item.id}
                ListEmptyComponent={<Text style={styles.noEventsText}>No events for this day.</Text>}
            />

            {selectedEvent && (
                <Animated.View style={[styles.fullViewContainer, { transform: [{ translateX: slideAnim }] }]}>
                    <SafeAreaView style={styles.container}>
                        <TouchableOpacity onPress={slideOut}>
                            <Text style={styles.backButton}>Back</Text>
                        </TouchableOpacity>
                        <Image source={{ uri: selectedEvent.imageUrl }} style={styles.fullViewImage} />
                        <Text style={styles.fullViewTitle}>{selectedEvent.name}</Text>
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
                    </SafeAreaView>
                </Animated.View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    eventContainer: {
        flex: 1,
        flexDirection: 'row',
        padding: 16,
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
        paddingHorizontal: 16,
        color: '#333',
    },
    fullViewContainer: {
        position: 'absolute',
        top: 0,
        left: width,
        width: width,
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
        color: '#333',
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
