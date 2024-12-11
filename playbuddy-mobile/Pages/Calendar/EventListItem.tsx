import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image'
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { Event } from '../../commonTypes';
import { EventWithMetadata } from '../../Common/Nav/NavStackType';
import { useCalendarContext } from './hooks/CalendarContext';
import { useUserContext } from '../Auth/hooks/UserContext';
import { formatDate } from './hooks/calendarUtils';
import { BuddyAvatarCarousel } from './BuddyAvatarCarousel';
import { getSmallAvatarUrl } from '../../Common/hooks/imageUtils';
import { logEvent } from '../../Common/hooks/logger';
import { Buddy } from '../Buddies/hooks/BuddiesContext';

interface ListItemProps {
    item: EventWithMetadata;
    setSelectedEvent: (event: Event) => void;
    buddiesAttending?: Buddy[];
}

export const EventListItem: React.FC<ListItemProps> = ({ item, setSelectedEvent, buddiesAttending: sharedBuddies }) => {
    const { toggleWishlistEvent, isOnWishlist } = useCalendarContext();
    const { authUserId } = useUserContext();

    const formattedDate = formatDate(item);
    const itemIsOnWishlist = isOnWishlist(item.id);
    const imageUrl = item.image_url && getSmallAvatarUrl(item.image_url);

    const handleToggleEventWishlist = () => {
        logEvent('event_list_item_wishlist_toggled', {
            event_id: item.id,
            event_name: item.name,
            is_on_wishlist: !itemIsOnWishlist
        });
        toggleWishlistEvent.mutate({
            eventId: item.id,
            isOnWishlist: !itemIsOnWishlist
        });
    };
    const handlePressEvent = () => {
        setSelectedEvent(item);
        logEvent('event_list_item_clicked', { event_id: item.id, event_name: item.name });
    }

    const eventPromoCode = item.promo_codes?.find(code => code.scope === 'event');
    const organizerPromoCode = item.organizer?.promo_codes?.find(code => code.scope === 'organizer');

    const promoCode = eventPromoCode || organizerPromoCode;

    const PromoCode = promoCode && (
        <View style={styles.promoCodeBadge}>
            <Text style={styles.promoCodeText}>
                {promoCode.discount_type === 'percent' ? '' : '$'}
                {promoCode.discount}{promoCode.discount_type === 'percent' ? '%' : ''} off
            </Text>
        </View>
    )

    return (
        <TouchableOpacity onPress={handlePressEvent}>
            <View style={styles.eventContainer}>
                <Image source={{ uri: imageUrl }} style={styles.eventImage} />
                <View style={styles.eventDetails}>
                    <View style={styles.eventOrganizerAndBuddiesContainer}>
                        <View style={styles.organizerContainer}>
                            <View
                                style={[styles.organizerDot, { backgroundColor: item.organizerColor || 'white' }]}
                            />
                            <Text style={styles.eventOrganizer}>
                                {item.organizer?.name}
                            </Text>
                            {item.visibility === 'private' && (
                                <View style={styles.privateBadge}>
                                    <Text style={styles.privateBadgeText}>Private</Text>
                                </View>
                            )}
                            {PromoCode}
                        </View>
                        {sharedBuddies && (
                            <View style={styles.buddyAvatarCarouselContainer}>
                                <BuddyAvatarCarousel buddies={sharedBuddies} />
                            </View>
                        )}
                    </View>

                    <View style={styles.titleAndHeartContainer}>
                        <Text
                            style={styles.eventTitle}
                            numberOfLines={2}
                            ellipsizeMode="tail"
                        >
                            {item.name}
                        </Text>
                        {authUserId && (
                            <TouchableOpacity onPress={handleToggleEventWishlist} style={styles.favoriteIcon}>
                                <FAIcon
                                    name={itemIsOnWishlist ? 'heart' : 'heart-o'}
                                    size={25}
                                    color="red"
                                />
                            </TouchableOpacity>
                        )}
                    </View>

                    <Text style={styles.eventTime}>{formattedDate}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export const ITEM_HEIGHT = 100;

const styles = StyleSheet.create({
    eventContainer: {
        height: ITEM_HEIGHT,
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
        marginRight: 10,
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
    organizerDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 5,
    },
    buddyAvatarCarouselContainer: {
        marginLeft: 10
    },
    titleAndHeartContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    privateBadge: {
        backgroundColor: '#FF6B6B',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        marginLeft: 8,
    },
    privateBadgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    promoBadge: {
        backgroundColor: '#FFD700',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    promoBadgeText: {
        color: 'black',
        fontSize: 12,
        fontWeight: 'bold',
    },
    promoCodeText: {
        fontSize: 12,
        color: 'black',
        fontWeight: 'bold',
    },
    promoCodeBadge: {
        backgroundColor: '#FFD700',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
});
