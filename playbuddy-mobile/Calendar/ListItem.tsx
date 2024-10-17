import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { Event } from '../commonTypes';
import { EventWithMetadata } from '../types';
import { useCalendarContext } from './CalendarContext';
import { useUserContext } from '../Auth/UserContext';
import * as amplitude from '@amplitude/analytics-react-native';
import { formatDate } from './calendarUtils';
import { BuddyAvatarCarousel } from './BuddyAvatarCarousel';

interface ListItemProps {
    item: EventWithMetadata;
    setSelectedEvent: (event: Event) => void;
    sharedBuddies?: {
        user_id: string;
        name: string;
        avatar_url: string | null;
    }[];
}

export const ListItem: React.FC<ListItemProps> = ({ item, setSelectedEvent, sharedBuddies }) => {
    const { toggleWishlistEvent, isOnWishlist, } = useCalendarContext(); // use the hook to handle wishlist

    const { authUserId } = useUserContext(); // use the hook to get the user ID

    const formattedDate = formatDate(item)

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

                    <View style={styles.eventOrganizerAndBuddiesContainer}>
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

                        <View>
                            {sharedBuddies && <BuddyAvatarCarousel buddies={sharedBuddies} />}
                        </View>
                    </View>

                    <Text style={styles.eventTitle}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                    >{item.name}</Text>

                    <Text style={styles.eventTime}>{formattedDate}</Text>

                </View>

                {authUserId && <TouchableOpacity onPress={handleToggleEventWishlist} style={styles.favoriteIcon}>
                    <FAIcon name={itemIsOnWishlist ? 'heart' : 'heart-o'} size={25} color="red" />
                </TouchableOpacity>}

            </View>
        </TouchableOpacity >
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
        width: 100,
        marginTop: 4
    },
    favoriteIcon: {
        paddingLeft: 10, // Adds some space between the event details and the star icon
    },
    eventOrganizerAndBuddiesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 3
    }
});
