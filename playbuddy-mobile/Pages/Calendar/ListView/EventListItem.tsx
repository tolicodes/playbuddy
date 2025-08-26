import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

import { Image } from 'expo-image';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { Attendee, Event } from '../../../commonTypes';
import { UE } from '../../../Common/types/userEventTypes';
import { EventWithMetadata } from '../../../Common/Nav/NavStackType';
import { useCalendarContext } from '../hooks/CalendarContext';
import { useUserContext } from '../../Auth/hooks/UserContext';
import { formatDate } from '../hooks/calendarUtils';
import { getSmallAvatarUrl } from '../../../Common/hooks/imageUtils';
import { logEvent } from '../../../Common/hooks/logger';
import { getEventPromoCodes } from '../../Auth/usePromoCode';
import { BORDER_LAVENDER } from '../../../components/styles';
import { BadgeRow } from '../../../components/EventBadgesRow';
import { AttendeeCarousel } from '../common/AttendeeCarousel';
import { useEventAnalyticsProps } from '../../../Common/hooks/useAnalytics';
import { WishlistHeart } from './WishlistHeart';

interface ListItemProps {
    item: EventWithMetadata;
    onPress: (event: Event) => void;
    noPadding?: boolean;
    fullDate?: boolean;
    attendees: Attendee[];
}

export const EventListItem: React.FC<ListItemProps> = ({ item, onPress, noPadding, fullDate, attendees }) => {
    const { toggleWishlistEvent, isOnWishlist } = useCalendarContext();
    const { authUserId } = useUserContext();
    const [scrolling, setScrolling] = useState(false);
    const eventAnalyticsProps = useEventAnalyticsProps(item);

    const promoCode = getEventPromoCodes(item)?.[0];
    const formattedDate = formatDate(item, fullDate);
    const itemIsOnWishlist = isOnWishlist(item.id);
    const imageUrl = item.image_url && getSmallAvatarUrl(item.image_url);
    const vetted = item.vetted;

    const handlePressEvent = () => {
        // for attendee carousel scroll logic
        if (!scrolling) {
            onPress(item);
            logEvent(UE.EventListItemClicked, eventAnalyticsProps);
        }
    };

    const handleToggleEventWishlist = () => {
        if (!authUserId) {
            alert('You need an account to add events to your calendar');
            return;
        }

        logEvent(UE.EventListItemWishlistToggled, {
            ...eventAnalyticsProps,
            is_on_wishlist: !itemIsOnWishlist,
        });

        toggleWishlistEvent.mutate({
            eventId: item.id,
            isOnWishlist: !itemIsOnWishlist,
        });
    };

    const placeHolderImage = item.munch_id ? (
        <FAIcon name="cutlery" size={50} color="#666" style={styles.icon} />
    ) : (
        <FAIcon name="calendar" size={50} color="#666" style={styles.icon} />
    );

    return (
        <View style={styles.wrapper}>
            <View style={[styles.cardWrapper, noPadding && styles.noPadding]}>
                <TouchableOpacity onPress={handlePressEvent} activeOpacity={0.8}>
                    <View style={styles.topSection}>
                        <View style={styles.imageContainer}>
                            {imageUrl ? (
                                <Image source={{ uri: imageUrl }} style={styles.eventImage} />
                            ) : (
                                placeHolderImage
                            )}
                        </View>
                        <View style={styles.detailsContainer}>
                            <View style={styles.organizerRow}>
                                <View style={styles.organizerContainer}>
                                    <View style={[styles.organizerDot, { backgroundColor: item.organizerColor || '#ccc' }]} />
                                    <Text style={styles.organizerName} numberOfLines={1}>
                                        {item.organizer?.name}
                                    </Text>
                                </View>
                                <View style={styles.rightContainer}>
                                    {promoCode && (
                                        <View style={styles.discountBadge}>
                                            <Text style={styles.discountText}>
                                                {promoCode.discount_type === 'percent'
                                                    ? `${promoCode.discount}% off`
                                                    : `$${promoCode.discount} off`}
                                            </Text>
                                        </View>
                                    )}
                                    <WishlistHeart itemIsOnWishlist={itemIsOnWishlist} handleToggleEventWishlist={handleToggleEventWishlist} />
                                </View>
                            </View>

                            <Text style={styles.eventTitle} numberOfLines={1}>
                                {item.name}
                            </Text>

                            <Text style={styles.eventTime}>{formattedDate}</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Badges and Attendees */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContainer}
                    style={styles.scrollView}
                    onScrollBeginDrag={() => setScrolling(true)}
                    onScrollEndDrag={() => setTimeout(() => setScrolling(false), 200)}
                >
                    <BadgeRow
                        vetted={vetted}
                        playParty={item.play_party}
                        center={false}
                        munch={item.munch_id}
                        classification={item.classification}
                    />
                    <AttendeeCarousel attendees={attendees!} />
                </ScrollView>
            </View>
        </View>
    );
};


export const ITEM_HEIGHT = 140;
const LEFT_PADDING = 75;

const styles = StyleSheet.create({
    // Container
    wrapper: {
        height: ITEM_HEIGHT,
    },
    cardWrapper: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: BORDER_LAVENDER,
        borderRadius: 12,
        overflow: 'hidden',
        marginHorizontal: 16,
        marginBottom: 10,
        height: ITEM_HEIGHT - 10,
        justifyContent: 'center',
        shadowOpacity: 0.2,
    },
    noPadding: {
        marginHorizontal: 0,
    },

    // Header layout
    topSection: {
        flexDirection: 'row',
        padding: 12,
        paddingBottom: 0,
        alignItems: 'center',
    },
    imageContainer: {
        marginRight: 12,
        alignItems: 'center',
    },
    eventImage: {
        width: 50,
        height: 50,
        borderRadius: 50,
        backgroundColor: '#eee',
    },
    icon: {
        width: 50,
        height: 50,
        borderRadius: 50,
    },

    // Text block
    detailsContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    eventTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    eventTime: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },

    // Organizer row
    organizerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        justifyContent: 'space-between',
    },
    organizerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
        flexGrow: 1,
        marginRight: 8,
    },
    organizerDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    organizerName: {
        fontSize: 14,
        color: '#333',
        flexShrink: 1,
    },

    // Promo badge and heart icon
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 0,
        flexGrow: 0,
    },
    discountBadge: {
        backgroundColor: '#FFD700',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    discountText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: 'black',
    },
    heartContainer: {
        marginLeft: 8,
    },

    // Scroll row (badges + attendees)
    scrollContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 0,
        paddingVertical: 0,
        marginLeft: LEFT_PADDING,
    },
    scrollView: {
        maxHeight: 36,
        flexGrow: 0,
    },
});
