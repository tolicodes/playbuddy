import moment from 'moment';
import { Text, StyleSheet, Image, TouchableOpacity, Linking, ScrollView } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Markdown from 'react-native-markdown-display';


export const EventDetail = ({ route }: any) => {
    const selectedEvent = route.params.selectedEvent;

    return (
        <ScrollView style={{ padding: 20 }}>
            <Image source={{ uri: selectedEvent.imageUrl }} style={styles.fullViewImage} />
            <TouchableOpacity onPress={() => Linking.openURL(selectedEvent.eventUrl)}>
                <Text style={styles.fullViewTitle}>
                    {selectedEvent.name}
                    <MaterialIcons name="open-in-new" size={24} color="blue" />
                </Text>
            </TouchableOpacity>

            <Text style={styles.eventOrganizer}>{selectedEvent.organizer}</Text>

            <Text style={styles.eventTime}>
                {`${moment(selectedEvent.start_date).format('MMM D, YYYY')} ${moment(selectedEvent.start_date).format('hA')} - ${moment(selectedEvent.end_date).format('hA')}`}
            </Text>

            {selectedEvent.price && <Text style={styles.fullViewPrice}>
                {selectedEvent.price}
            </Text>}
            <Markdown>
                {selectedEvent.summary}
            </Markdown>
        </ScrollView>)
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
        color: 'blue',
    },
    fullViewTime: {
        fontSize: 18,
        color: 'black',
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
    eventOrganizer: {
        fontSize: 14,
        color: 'black',
    },
    eventTime: {
        fontSize: 14,
        color: '#666',
    },
})