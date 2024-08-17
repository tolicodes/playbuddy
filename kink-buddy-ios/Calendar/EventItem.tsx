import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import moment from 'moment';
import { Event } from '../utils/api';

type EventItemProps = {
    event: Event;
    onPress: () => void;
};

const EventItem: React.FC<EventItemProps> = ({ event, onPress }) => {
    return (
        <TouchableOpacity onPress={onPress}>
            <View style={styles.eventContainer}>
                <Image source={{ uri: event.imageUrl }} style={styles.eventImage} />
                <View style={styles.eventDetails}>
                    <Text style={styles.eventTitle}>{event.name}</Text>
                    <Text style={styles.eventTime}>
                        {event.start_time ? moment(event.start_time, 'HH:mm:ss').format('h:mm A') : ''}
                        {' - '}
                        {event.end_time ? moment(event.end_time, 'HH:mm:ss').format('h:mm A') : ''}
                    </Text>
                    <Text style={styles.eventLocation}>{event.location}</Text>
                    <Text style={styles.eventPrice}>
                        {event.min_ticket_price !== event.max_ticket_price
                            ? `$${event.min_ticket_price} - $${event.max_ticket_price}`
                            : event.price}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
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
});

export default EventItem;
