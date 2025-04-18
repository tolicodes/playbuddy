import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share, Linking } from 'react-native';
import { Image } from 'expo-image';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import IonIcon from 'react-native-vector-icons/Ionicons';
import { Event, UE } from '../../commonTypes';
import { EventWithMetadata } from '../../Common/Nav/NavStackType';
import { useCalendarContext } from './hooks/CalendarContext';
import { useUserContext } from '../Auth/hooks/UserContext';
import { formatDate } from './hooks/calendarUtils';
import { getSmallAvatarUrl } from '../../Common/hooks/imageUtils';
import { getAnalyticsPropsDeepLink, getAnalyticsPropsEvent, getAnalyticsPropsPromoCode, logEvent } from '../../Common/hooks/logger';
import { Buddy } from '../Buddies/hooks/BuddiesContext';
import { TicketPromoModal } from './TicketPromoModal';

interface ListItemProps {
    item: EventWithMetadata;
    onPress: (event: Event) => void;
    buddiesAttending?: Buddy[];
}


export const EventListItem: React.FC<ListItemProps> = ({ item, onPress }) => {
    const { toggleWishlistEvent, isOnWishlist } = useCalendarContext();
    const { authUserId } = useUserContext();
    const { currentDeepLink } = useUserContext();

    const formattedDate = formatDate(item);
    const itemIsOnWishlist = isOnWishlist(item.id);
    const imageUrl = item.image_url && getSmallAvatarUrl(item.image_url);

    // Navigate to event details.
    const handlePressEvent = () => {
        onPress(item);
        logEvent(UE.EventListItemClicked, {
            auth_user_id: authUserId ?? '',
            ...getAnalyticsPropsEvent(item),
            ...(currentDeepLink ? getAnalyticsPropsDeepLink(currentDeepLink) : {}),
            ...(promoCode ? getAnalyticsPropsPromoCode(promoCode) : {}),
        });
    };

    // Toggle wishlist status.
    const handleToggleEventWishlist = () => {
        logEvent(UE.EventListItemWishlistToggled, {
            auth_user_id: authUserId ?? '',
            ...getAnalyticsPropsEvent(item),
            ...(currentDeepLink ? getAnalyticsPropsDeepLink(currentDeepLink) : {}),
            ...(promoCode ? getAnalyticsPropsPromoCode(promoCode) : {}),
            is_on_wishlist: !itemIsOnWishlist,
        });
        toggleWishlistEvent.mutate({
            eventId: item.id,
            isOnWishlist: !itemIsOnWishlist,
        });
    };



    // Share the ticket URL via the Share menu.
    const handlePressShare = async () => {
        if (item.ticket_url) {
            await Share.share({ message: item.ticket_url });
            logEvent(UE.EventListItemSharePressed, {
                auth_user_id: authUserId ?? '',
                ...getAnalyticsPropsEvent(item),
                ...(currentDeepLink ? getAnalyticsPropsDeepLink(currentDeepLink) : {}),
                ...(promoCode ? getAnalyticsPropsPromoCode(promoCode) : {}),
            });

        }
    };

    const handleModalCopyPromoCode = () => {
        logEvent(UE.EventListItemPromoModalPromoCopied, {
            auth_user_id: authUserId ?? '',
            ...getAnalyticsPropsEvent(item),
            ...(currentDeepLink ? getAnalyticsPropsDeepLink(currentDeepLink) : {}),
            ...(promoCode ? getAnalyticsPropsPromoCode(promoCode) : {}),
        });
    };

    // Determine promo code from event or organizer.
    const eventPromoCode = item.promo_codes?.find(code => code.scope === 'event');
    const organizerPromoCode = item.organizer?.promo_codes?.find(code => code.scope === 'organizer');
    const featuredPromoCode = currentDeepLink?.featured_event.id === item.id ? currentDeepLink?.featured_promo_code : null;
    const promoCode = featuredPromoCode || eventPromoCode || organizerPromoCode;

    const [discountModalVisible, setDiscountModalVisible] = useState(false);

    // Open the ticket URL directly.
    const handlePressTickets = () => {
        if (!promoCode) {
            Linking.openURL(item.ticket_url);
            logEvent(UE.EventListItemTicketPressed, {
                auth_user_id: authUserId,
                ...getAnalyticsPropsEvent(item),
                ...(currentDeepLink ? getAnalyticsPropsDeepLink(currentDeepLink) : {}),
                ...(promoCode ? getAnalyticsPropsPromoCode(promoCode) : {}),
            });
        } else {
            setDiscountModalVisible(true);
            logEvent(UE.EventListItemDiscountModalOpened, {
                auth_user_id: authUserId,
                ...getAnalyticsPropsEvent(item),
                ...(currentDeepLink ? getAnalyticsPropsDeepLink(currentDeepLink) : {}),
                ...(promoCode ? getAnalyticsPropsPromoCode(promoCode) : {}),
            });
        }
    };

    return (
        <>
            <TicketPromoModal
                visible={discountModalVisible}
                promoCode={promoCode?.promo_code || 'N/A'}
                discount={promoCode?.discount + (promoCode?.discount_type === 'percent' ? '%' : '$')}
                onClose={() => setDiscountModalVisible(false)}
                organizerName={item.organizer?.name || ''}
                onBuyTicket={() => {
                    logEvent(UE.EventListItemPromoModalTicketPressed, {
                        auth_user_id: authUserId,
                        ...getAnalyticsPropsEvent(item),
                        ...(currentDeepLink ? getAnalyticsPropsDeepLink(currentDeepLink) : {}),
                        ...(promoCode ? getAnalyticsPropsPromoCode(promoCode) : {}),
                    });
                    // Handle ticket purchase logic, e.g., open ticket URL
                    Linking.openURL(item.ticket_url);
                    setDiscountModalVisible(false);
                }}
                onCopy={handleModalCopyPromoCode}
            />
            <TouchableOpacity onPress={handlePressEvent} activeOpacity={0.8} style={styles.wrapper}>
                <View style={styles.cardWrapper}>
                    {/* Top Section: Image & Details */}
                    <View style={styles.topSection}>
                        {imageUrl && (
                            <View style={styles.imageContainer}>
                                <Image source={{ uri: imageUrl }} style={styles.eventImage} />
                            </View>
                        )}
                        <View style={styles.detailsContainer}>
                            {/* Organizer Row */}
                            <View style={styles.organizerRow}>
                                <View style={styles.organizerContainer}>
                                    <View style={[styles.organizerDot, { backgroundColor: item.organizerColor || '#ccc' }]} />
                                    <Text style={styles.organizerName} numberOfLines={1}>
                                        {item.organizer?.name}
                                    </Text>
                                </View>
                                {authUserId && (
                                    <TouchableOpacity onPress={handleToggleEventWishlist} style={styles.heartContainer}>
                                        <FAIcon name={itemIsOnWishlist ? 'heart' : 'heart-o'} size={25} color="red" />
                                    </TouchableOpacity>
                                )}
                            </View>
                            {/* Title Row */}
                            <View style={styles.titleAndDiscountRow}>
                                <Text style={styles.eventTitle} numberOfLines={1}>
                                    {item.name}
                                </Text>
                                {promoCode && (
                                    <View style={styles.discountBadge}>
                                        <Text style={styles.discountText}>
                                            {promoCode.discount_type === 'percent'
                                                ? `${promoCode.discount}% off`
                                                : `$${promoCode.discount} off`}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            {/* Time Row */}
                            <View style={styles.timeRow}>
                                <Text style={styles.eventTime}>{formattedDate}</Text>
                            </View>
                        </View>
                    </View>
                    {/* Button Row */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.button} onPress={handlePressEvent}>
                            <FAIcon name="info-circle" size={16} color="#888" style={styles.buttonIcon} />
                            <Text style={styles.buttonText}>Details</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.button} onPress={handlePressShare}>
                            <IonIcon name="share-social" size={16} color="#888" style={styles.buttonIcon} />
                            <Text style={styles.buttonText}>Share</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.button} onPress={handlePressTickets}>
                            <FAIcon name="ticket" size={16} color="#888" style={styles.buttonIcon} />
                            <Text style={styles.buttonText}>Tickets</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </>
    );
};

export const ITEM_HEIGHT = 150;

const styles = StyleSheet.create({
    wrapper: {
        height: ITEM_HEIGHT,
    },
    cardWrapper: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 12,
        overflow: 'hidden',
        marginVertical: 8,
        marginHorizontal: 16,
    },
    topSection: {
        flexDirection: 'row',
        padding: 12,
        alignItems: 'center',
    },
    imageContainer: {
        marginRight: 12,
    },
    eventImage: {
        width: 50,
        height: 50,
        borderRadius: 8,
        backgroundColor: '#eee',
    },
    detailsContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    organizerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    organizerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    organizerDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    organizerName: {
        fontSize: 14,
        color: '#000',
    },
    heartContainer: {
        marginLeft: 8,
    },
    titleAndDiscountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    eventTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    discountBadge: {
        backgroundColor: '#FFD700',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginLeft: 8,
    },
    discountText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: 'black',
    },
    timeRow: {
        marginBottom: 4,
    },
    eventTime: {
        fontSize: 14,
        color: '#666',
    },
    buttonRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#ccc',
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
    },
    buttonIcon: {
        marginRight: 4,
    },
    buttonText: {
        fontSize: 14,
        color: '#888',
    },
});
