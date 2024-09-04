import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import moment from 'moment';
import { Event } from '../commonTypes';
import { EventWithMetadata, useCalendarContext } from './CalendarContext';
import { useUserContext } from '../Auth/UserContext';

interface ListItemProps {
    item: EventWithMetadata;
    setSelectedEvent: (event: Event) => void;
}

export const ListItem: React.FC<ListItemProps> = ({ item, setSelectedEvent }) => {
    const { toggleWishlistEvent } = useCalendarContext(); // use the hook to handle wishlist

    const { userId } = useUserContext(); // use the hook to get the user ID

    const formattedDate = `${moment(item.start_date).format('hA')} - ${moment(item.end_date).format('hA')}`;

    const handleToggleEventWishlist = () => {
        // flip the old value
        toggleWishlistEvent.mutate({ eventId: item.id, isOnWishlist: !item.isOnWishlist });
        console.log('toggleWishlistEvent', item.id, !item.isOnWishlist);
    };

    return (
        <TouchableOpacity onPress={() => setSelectedEvent(item)}>
            <View style={styles.eventContainer}>
                <Image source={{ uri: item.image_url }} style={styles.eventImage} />
                <View style={styles.eventDetails}>
                    <Text style={styles.eventOrganizer}>
                        <View
                            style={{
                                width: 10,
                                height: 10,
                                borderRadius: 5,
                                backgroundColor: item.organizerDotColor || 'white',
                                marginRight: 5,
                            }}
                        />
                        {item.organizer?.name}
                    </Text>
                    <Text style={styles.eventTitle}>{item.name}</Text>
                    <Text style={styles.eventTime}>{formattedDate}</Text>
                </View>
                {
                    // Display a star icon if the event is on the wishlist
                    // Only Show if logged in
                }
                {userId && <TouchableOpacity onPress={handleToggleEventWishlist} style={styles.favoriteIcon}>
                    <FAIcon name={item.isOnWishlist ? 'heart' : 'heart-o'} size={20} color="red" />
                </TouchableOpacity>}
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
        alignItems: 'center', // Aligns all content vertically centered
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
        flexDirection: 'row',
        alignItems: 'center',
    },
    eventTime: {
        fontSize: 14,
        color: '#666',
    },
    favoriteIcon: {
        paddingLeft: 10, // Adds some space between the event details and the star icon
    },
});
