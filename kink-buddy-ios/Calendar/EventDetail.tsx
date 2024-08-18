import moment from 'moment';
import { View, Text, SectionList, StyleSheet, Image, Animated, TouchableOpacity, Dimensions, Linking, SafeAreaView, ScrollView } from 'react-native';
import { Event } from './types';

export const EventDetail = ({ selectedEvent, slideAnim, slideOut }: { selectedEvent: Event, slideAnim: Animated.Value, slideOut: () => void }) => {
    return (<Animated.View style={[styles.fullViewContainer, { transform: [{ translateX: slideAnim }] }]}>
        <ScrollView>
            <TouchableOpacity onPress={slideOut}>
                <Text style={styles.backButton}>Back</Text>
            </TouchableOpacity>
            <Image source={{ uri: selectedEvent.imageUrl }} style={styles.fullViewImage} />
            <TouchableOpacity onPress={() => Linking.openURL(selectedEvent.eventUrl)}>
                <Text style={styles.fullViewTitle}>{selectedEvent.name}</Text>
            </TouchableOpacity>

            <Text style={styles.eventOrganizer}>{selectedEvent.organizer}</Text>

            <Text style={styles.eventTime}>
                {`${moment(selectedEvent.start_date).format('MMM D, YYYY')} ${moment(selectedEvent.start_date).format('hA')} - ${moment(selectedEvent.end_date).format('hA')}`}
            </Text>
            {selectedEvent.price && <Text style={styles.fullViewPrice}>
                {selectedEvent.price}
            </Text>}
            <Text style={styles.fullViewSummary}>{selectedEvent.summary}</Text>
        </ScrollView>
    </Animated.View>)
}

const styles = StyleSheet.create({
    fullViewContainer: {
        position: 'relative',
        left: 0,
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
    eventOrganizer: {
        fontSize: 14,
        color: 'black',
    },
    eventTime: {
        fontSize: 14,
        color: '#666',
    },
})