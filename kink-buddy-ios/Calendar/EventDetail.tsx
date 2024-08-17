import React from 'react';
import { View, Text, Image, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { Event } from '../utils/api';
import moment from 'moment';

type EventDetailProps = {
    event: Event;
    slideAnim: Animated.Value;
    slideOut: () => void;
};

const EventDetail: React.FC<EventDetailProps> = ({ event, slideAnim, slideOut }) => {
    return (
        <Animated.View style={[styles.fullViewContainer, { transform: [{ translateX: slideAnim }] }]}>
            <TouchableOpacity onPress={slideOut}>
                <Text style={styles.backButton}>Back</Text>
            </TouchableOpacity>
            <Image source={{ uri: event.imageUrl }} style={styles.fullViewImage} />
            <Text style={styles.fullViewTitle}>{event.name}</Text>
            <Text style={styles.fullViewTime}>
                {event.start_time ? moment(event.start_time, 'HH:mm:ss').format('h:mm A') : ''}
                {' - '}
                {event.end_time ? moment(event.end_time, 'HH:mm:ss').format('h:mm A') : ''}
            </Text>
            <Text style={styles.fullViewLocation}>{event.location}</Text>
            <Text style={styles.fullViewPrice}>
                {event.min_ticket_price !== event.max_ticket_price
                    ? `$${event.min_ticket_price} - $${event.max_ticket_price}`
                    : event.price}
            </Text>
            <Text style={styles.fullViewSummary}>{event.summary}</Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    fullViewContainer: {
        position: 'absolute',
        top: 0,
        left: Dimensions.get('window').width,
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

export default EventDetail;
