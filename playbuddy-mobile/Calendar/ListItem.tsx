import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import moment from 'moment';
import { Event } from '../commonTypes';
import { EventWithMetadata } from '../types';
import { useCalendarContext } from './CalendarContext';
import { useUserContext } from '../Auth/UserContext';
import * as amplitude from '@amplitude/analytics-react-native';

interface ListItemProps {
    item: EventWithMetadata;
    setSelectedEvent: (event: Event) => void;
}

export const ListItem: React.FC<ListItemProps> = ({ item, setSelectedEvent }) => {
    const { toggleWishlistEvent, isOnWishlist, } = useCalendarContext(); // use the hook to handle wishlist

    const { userId } = useUserContext(); // use the hook to get the user ID

    const formattedDate = `${moment(item.start_date).format('hA')} - ${moment(item.end_date).format('hA')}`;

    const itemIsOnWishlist = isOnWishlist(item.id);

    const handleToggleEventWishlist = () => {
        amplitude.logEvent('event_wishlist_toggled', { event_id: item.id, is_on_wishlist: !itemIsOnWishlist });
        // flip the old value
        toggleWishlistEvent.mutate({ eventId: item.id, isOnWishlist: !itemIsOnWishlist });
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
                                backgroundColor: item.organizerColor || 'white',
                                marginRight: 5,
                            }}
                        />
                        {item.organizer?.name}
                    </Text>
                    <Text style={styles.eventTitle}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                    >{item.name}</Text>
                    <Text style={styles.eventTime}>{formattedDate}</Text>
                </View>

                {userId && <TouchableOpacity onPress={handleToggleEventWishlist} style={styles.favoriteIcon}>
                    <FAIcon name={itemIsOnWishlist ? 'heart' : 'heart-o'} size={25} color="red" />
                </TouchableOpacity>}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    eventContainer: {
        height: 100,
        flexDirection: 'row',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        alignItems: 'center', // Aligns all content vertically centered
    },
    eventDetails: {
        flex: 1,
        height: 100,
        // marginTop: 20,
        justifyContent: 'center', // Aligns all content vertically centered

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
