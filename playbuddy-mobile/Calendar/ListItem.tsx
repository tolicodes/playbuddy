import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { Event } from '../commonTypes';
import { EventWithMetadata } from '../types';
import { useCalendarContext } from './CalendarContext';
import { useUserContext } from '../contexts/UserContext';
import * as amplitude from '@amplitude/analytics-react-native';
import { formatDate } from './calendarUtils';
import { BuddyAvatarCarousel } from './BuddyAvatarCarousel';
import { getSmallAvatarUrl } from '../Common/imageUtils';

interface ListItemProps {
    item: EventWithMetadata;
    setSelectedEvent: (event: Event) => void;
    buddiesAttending?: {
        user_id: string;
        name: string;
        avatar_url: string | null;
    }[];
}

export const ListItem: React.FC<ListItemProps> = ({ item, setSelectedEvent, buddiesAttending: sharedBuddies }) => {
    const { toggleWishlistEvent, isOnWishlist, } = useCalendarContext(); // use the hook to handle wishlist

    const { authUserId } = useUserContext(); // use the hook to get the user ID

    const formattedDate = formatDate(item)

    const itemIsOnWishlist = isOnWishlist(item.id);

    const handleToggleEventWishlist = () => {
        amplitude.logEvent('event_wishlist_toggled', { event_id: item.id, is_on_wishlist: !itemIsOnWishlist });
        // flip the old value
        toggleWishlistEvent.mutate({ eventId: item.id, isOnWishlist: !itemIsOnWishlist });
    };

    const imageUrl = item.image_url && getSmallAvatarUrl(item.image_url);

    return (
        <TouchableOpacity onPress={() => setSelectedEvent(item)}>
            <View style={styles.eventContainer}>
                <Image source={{ uri: imageUrl }} style={styles.eventImage} />
                <View style={styles.eventDetails}>
                    <View style={styles.eventOrganizerAndBuddiesContainer}>
                        <View style={styles.organizerContainer}>
                            <View
                                style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: 5,
                                    backgroundColor: item.organizerColor || 'white',
                                    marginRight: 5,
                                }}
                            />
                            <Text style={styles.eventOrganizer}>
                                {item.organizer?.name}
                            </Text>
                        </View>
                        {sharedBuddies && (
                            <View style={styles.buddyAvatarCarouselContainer}>
                                <BuddyAvatarCarousel buddies={sharedBuddies} />
                            </View>
                        )}
                    </View>

                    <View style={styles.titleAndHeartContainer}>
                        <Text style={styles.eventTitle}
                            numberOfLines={2}
                            ellipsizeMode="tail"
                        >{item.name}</Text>
                        {authUserId && (
                            <TouchableOpacity onPress={handleToggleEventWishlist} style={styles.favoriteIcon}>
                                <FAIcon name={itemIsOnWishlist ? 'heart' : 'heart-o'} size={25} color="red" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <Text style={styles.eventTime}>{formattedDate}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    eventContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        alignItems: 'center',
    },
    eventDetails: {
        flex: 1,
        justifyContent: 'center',
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
        flex: 1,
        marginRight: 10,
    },
    eventOrganizer: {
        fontSize: 14,
        color: 'black',
    },
    eventTime: {
        fontSize: 14,
        color: '#666',
        marginTop: 4
    },
    favoriteIcon: {
        paddingLeft: 10,
    },
    eventOrganizerAndBuddiesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    organizerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    buddyAvatarCarouselContainer: {
        marginLeft: 10
    },
    titleAndHeartContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',

    },
});
