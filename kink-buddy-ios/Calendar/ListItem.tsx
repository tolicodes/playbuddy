import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Event } from '../commonTypes';
import moment from 'moment';
import { EventWithMetadata } from './CalendarContext';
export const ListItem = ({ item, setSelectedEvent }: { item: EventWithMetadata, setSelectedEvent: (event: Event) => void, organizerDotColor?: string }) => {
    const formattedDate = `${moment(item.start_date).format('hA')} - ${moment(item.end_date).format('hA')}`;
    return (
        <TouchableOpacity onPress={() => {
            setSelectedEvent(item);
        }}>
            <View style={styles.eventContainer}>
                <Image source={{ uri: item.image_url }} style={styles.eventImage} />
                <View style={styles.eventDetails}>
                    <Text style={styles.eventOrganizer}>

                        {/* Organizer color dot */}
                        <View
                            style={{
                                width: 10,
                                height: 10,
                                borderRadius: 5, // Makes the dot round
                                backgroundColor: item.organizerDotColor || 'white', // Use the provided dotColor
                                marginLeft: 5, // Space between the dot and the text
                            }}
                        />
                        {item.organizer.name}
                    </Text>
                    <Text style={styles.eventTitle}>{item.name}</Text>

                    <Text style={styles.eventTime}>{formattedDate}</Text>
                </View>
            </View>
        </TouchableOpacity>
    )
};

const styles = StyleSheet.create({
    eventContainer: {
        flexDirection: 'row',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    eventDetails: {
        flex: 1,
    },
    eventImage: {
        width: 50,
        height: 50,
        marginRight: 16,
    },

    eventTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    eventOrganizer: {
        fontSize: 14,
        color: 'black',
        marginBottom: 4,
    },
    eventTime: {
        fontSize: 14,
        color: '#666',
    },
});