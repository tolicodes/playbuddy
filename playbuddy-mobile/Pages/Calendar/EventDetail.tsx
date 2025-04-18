import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Linking,
    ScrollView,
    Alert,
} from 'react-native';
import { Image } from 'expo-image';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Markdown from 'react-native-markdown-display';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';

import { formatDate } from './hooks/calendarUtils';
import { getSmallAvatarUrl } from '../../Common/hooks/imageUtils';
import { getAnalyticsPropsDeepLink, getAnalyticsPropsEvent, getAnalyticsPropsPromoCode, logEvent } from '../../Common/hooks/logger';
import { EventWithMetadata, NavStack } from '../../Common/Nav/NavStackType';
import { generateGoogleCalendarUrl } from './hooks/generateGoogleCalendarUrl';
import { useUserContext } from '../Auth/hooks/UserContext';
import { ALL_LOCATION_AREAS_ID } from '../../Common/hooks/CommonContext';
import { useCalendarContext } from './hooks/CalendarContext';
import PromoCodeSection from './PromoCodeSection';
import { TicketPromoModal } from './TicketPromoModal';
import { UE } from '../../userEventTypes';

/* 
 * VideoPlayer
 * A simple component that wraps a WebView for video playback.
 */
const VideoPlayer = ({ uri }: { uri: string }) => (
    <WebView
        style={styles.video}
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        source={{ uri }}
    />
);

/*
 * EventHeader
 * Renders the event title with a touchable link, the wishlist icon,
 * and a Google Calendar button.
 */
const EventHeader = ({
    event,
    onEventHeaderPress,
    onToggleWishlist,
    onGoogleCalendar
}: {
    event: EventWithMetadata;
    onEventHeaderPress: () => void;
    onToggleWishlist: () => void;
    onGoogleCalendar: () => void;
}) => {
    const { isOnWishlist } = useCalendarContext();
    const itemIsOnWishlist = isOnWishlist(event.id);

    return (
        <View style={styles.headerContainer}>
            <TouchableOpacity onPress={onEventHeaderPress} style={styles.flexOne}>
                <Text style={styles.fullViewTitle} numberOfLines={2}>
                    {event.name}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onToggleWishlist} style={styles.favoriteIcon}>
                <MaterialIcons
                    name={itemIsOnWishlist ? 'favorite' : 'favorite-border'}
                    size={35}
                    color="red"
                />
            </TouchableOpacity>

            <TouchableOpacity style={styles.googleCalendarButton} onPress={onGoogleCalendar}>
                <Image
                    source={require('./images/google-calendar.png')}
                    style={styles.googleCalendarImage}
                />
            </TouchableOpacity>
        </View>
    );
};

/*
 * EventDetail
 * Main component that renders an event’s full details including image/video,
 * description, organizer info, ticket purchase logic, and promo code handling.
 */
export const EventDetail = ({ route }) => {
    const navigation = useNavigation<NavStack>();
    const { selectedEvent }: { selectedEvent: EventWithMetadata } = route.params || {};
    const { selectedLocationAreaId, currentDeepLink, authUserId } = useUserContext();
    const { toggleWishlistEvent, isOnWishlist } = useCalendarContext();
    const { allEvents } = useCalendarContext();

    // If no event is provided, render nothing.
    if (!selectedEvent) return null;

    // Format and retrieve event data.
    const imageUrl = selectedEvent.image_url ? getSmallAvatarUrl(selectedEvent.image_url) : null;

    // Determine the promo code to use: initial deep link > event > organizer.
    const eventPromoCode = selectedEvent.promo_codes?.find(code => code.scope === 'event');
    const organizerPromoCode = selectedEvent.organizer?.promo_codes?.find(code => code.scope === 'organizer');
    const featuredPromoCode = currentDeepLink?.featured_event.id === selectedEvent.id ? currentDeepLink?.featured_promo_code : null;
    const promoCode = featuredPromoCode || eventPromoCode || organizerPromoCode;

    useEffect(() => {
        // This is just for all promo codes
        if (promoCode) {
            logEvent(UE.EventDetailPromoCodeSeen, {
                auth_user_id: authUserId ?? '',
                ...getAnalyticsPropsEvent(selectedEvent),
                ...getAnalyticsPropsPromoCode(promoCode),
                ...(currentDeepLink ? getAnalyticsPropsDeepLink(currentDeepLink) : {}),
            });
        }
    }, [promoCode, featuredPromoCode, currentDeepLink]);

    // Opens the event
    const handleEventHeaderPress = () => {
        const eventUrl = selectedEvent.event_url
        logEvent(UE.EventDetailHeaderTitleClicked, {
            auth_user_id: authUserId ?? '',
            ...getAnalyticsPropsEvent(selectedEvent),
            ...(currentDeepLink ? getAnalyticsPropsDeepLink(currentDeepLink) : {}),
            ...(promoCode ? getAnalyticsPropsPromoCode(promoCode) : {}),
        });

        logEvent(UE.EventDetailTicketPressed, {
            auth_user_id: authUserId ?? '',
            ...getAnalyticsPropsEvent(selectedEvent),
            ...(currentDeepLink ? getAnalyticsPropsDeepLink(currentDeepLink) : {}),
            ...(promoCode ? getAnalyticsPropsPromoCode(promoCode) : {}),
        });
        Linking.openURL(eventUrl);
    };

    // Toggles the wishlist status for the event.
    const handleToggleWishlist = () => {
        const currentStatus = isOnWishlist(selectedEvent.id);
        logEvent(UE.EventDetailWishlistToggled, {
            auth_user_id: authUserId ?? '',
            ...getAnalyticsPropsEvent(selectedEvent),
            is_on_wishlist: !currentStatus,
        });
        toggleWishlistEvent.mutate({ eventId: selectedEvent.id, isOnWishlist: !currentStatus });
    };

    // Navigates to the organizer’s community events page.
    const handleOrganizerClick = () => {
        logEvent(UE.EventDetailOrganizerClicked, {
            auth_user_id: authUserId ?? '',
            ...getAnalyticsPropsEvent(selectedEvent),
            ...(currentDeepLink ? getAnalyticsPropsDeepLink(currentDeepLink) : {}),
            ...(promoCode ? getAnalyticsPropsPromoCode(promoCode) : {}),
        });

        const fullEvent = allEvents.find(event => event.id === selectedEvent.id);

        if (!fullEvent) return;

        // from the allEvents array, find the community that the organizer is in
        const community = fullEvent.communities?.find(
            community => community.organizer_id?.toString() === selectedEvent.organizer?.id?.toString()
        )?.id;

        if (community) {
            navigation.navigate('Details', { screen: 'Community Events', params: { communityId: community } });
        }
    };

    // Opens the Google Calendar URL.
    const handleGoogleCalendar = () => {
        logEvent(UE.EventDetailGoogleCalendarClicked, {
            auth_user_id: authUserId ?? '',
            ...getAnalyticsPropsEvent(selectedEvent),
            ...(currentDeepLink ? getAnalyticsPropsDeepLink(currentDeepLink) : {}),
            ...(promoCode ? getAnalyticsPropsPromoCode(promoCode) : {}),
        });
        const calendarUrl = generateGoogleCalendarUrl({
            title: selectedEvent.name,
            startDate: selectedEvent.start_date,
            endDate: selectedEvent.end_date,
            description: selectedEvent.description,
            location: selectedEvent.location,
        });

        Linking.openURL(calendarUrl).catch(err => {
            Alert.alert('Error', `Failed to open Google Calendar: ${err}`);
        });
    };

    // Determine if the location area is "All".
    const locationAreaIsAll = selectedLocationAreaId === ALL_LOCATION_AREAS_ID;
    const [discountModalVisible, setDiscountModalVisible] = useState(false);

    // Handle "Get Tickets" button press.
    const handleGetTickets = () => {
        logEvent(UE.EventDetailGetTicketsClicked, {
            auth_user_id: authUserId ?? '',
            ...getAnalyticsPropsEvent(selectedEvent),
            ...(currentDeepLink ? getAnalyticsPropsDeepLink(currentDeepLink) : {}),
            ...(promoCode ? getAnalyticsPropsPromoCode(promoCode) : {})
        });

        if (!promoCode) {
            Linking.openURL(selectedEvent.ticket_url);
            logEvent(UE.EventDetailTicketPressed, {
                auth_user_id: authUserId ?? '',
                ...getAnalyticsPropsEvent(selectedEvent),
            });
        } else {
            setDiscountModalVisible(true);
            logEvent(UE.EventDetailDiscountModalOpened, {
                auth_user_id: authUserId ?? '',
                ...getAnalyticsPropsEvent(selectedEvent),
                ...(currentDeepLink ? getAnalyticsPropsDeepLink(currentDeepLink) : {}),
                ...getAnalyticsPropsPromoCode(promoCode),
            });
        }
    };

    const handleCopyPromoCode = () => {
        if (!promoCode) return;
        logEvent(UE.EventDetailPromoCodeCopied, {
            auth_user_id: authUserId ?? '',
            ...getAnalyticsPropsEvent(selectedEvent),
            ...getAnalyticsPropsPromoCode(promoCode),
        });
    };

    const handleModalCopyPromoCode = () => {
        if (!promoCode) return;
        logEvent(UE.EventDetailTicketPromoModalPromoCopied, {
            auth_user_id: authUserId ?? '',
            ...getAnalyticsPropsEvent(selectedEvent),
            ...getAnalyticsPropsPromoCode(promoCode),
        });
    };

    return (
        <>
            <TicketPromoModal
                visible={discountModalVisible}
                promoCode={promoCode?.promo_code || 'N/A'}
                discount={`${promoCode?.discount}${promoCode?.discount_type === 'percent' ? '%' : '$'
                    }`}
                onClose={() => setDiscountModalVisible(false)}
                onBuyTicket={() => {
                    logEvent(UE.EventDetailModalTicketPressed, {
                        auth_user_id: authUserId ?? '',
                        ...getAnalyticsPropsEvent(selectedEvent),
                        ...(currentDeepLink ? getAnalyticsPropsDeepLink(currentDeepLink) : {}),
                        ...(promoCode ? getAnalyticsPropsPromoCode(promoCode) : {}),
                    });
                    Linking.openURL(selectedEvent.ticket_url);
                    setDiscountModalVisible(false);
                }}
                organizerName={selectedEvent.organizer?.name}
                onCopy={handleModalCopyPromoCode}
            />
            <ScrollView style={styles.scrollView}>
                {selectedEvent.video_url ? (
                    <VideoPlayer uri={selectedEvent.video_url} />
                ) : (
                    <Image source={{ uri: imageUrl }} style={styles.fullViewImage} />
                )}
                <View style={styles.contentContainer}>
                    <EventHeader
                        event={selectedEvent}
                        onEventHeaderPress={handleEventHeaderPress}
                        onToggleWishlist={handleToggleWishlist}
                        onGoogleCalendar={handleGoogleCalendar}
                    />

                    <TouchableOpacity onPress={handleOrganizerClick}>
                        <Text style={styles.eventOrganizer}>
                            {selectedEvent.organizer?.name}
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.eventTime}>{formatDate(selectedEvent, true)}</Text>

                    {locationAreaIsAll && (
                        <Text style={styles.eventLocation}>
                            {selectedEvent.location_area?.name}
                        </Text>
                    )}
                    {promoCode && <PromoCodeSection promoCode={promoCode} onCopy={handleCopyPromoCode} />}

                    {selectedEvent.ticket_url && (
                        <TouchableOpacity style={styles.ticketButton} onPress={handleGetTickets}>
                            <Text style={styles.buttonText}>🎟️ Get Tickets 🎟️</Text>
                        </TouchableOpacity>
                    )}

                    <Markdown>{selectedEvent.description}</Markdown>
                </View>
            </ScrollView>
        </>
    );
};

const styles = StyleSheet.create({
    scrollView: {
        backgroundColor: '#f8f8f8',
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    flexOne: {
        flex: 1,
    },
    fullViewImage: {
        width: '100%',
        height: 250,
        marginBottom: 20,
    },
    fullViewTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#007AFF',
        marginRight: 20,
    },
    eventOrganizer: {
        fontSize: 16,
        color: '#007AFF',
        marginBottom: 10,
    },
    eventOrganizerLabel: {
        fontSize: 16,
        color: 'black',
    },
    eventTime: {
        fontSize: 16,
        color: '#666',
        marginBottom: 10,
    },
    video: {
        width: '100%',
        height: 300,
        borderRadius: 10,
    },
    contentContainer: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        marginTop: -20,
    },
    googleCalendarButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    googleCalendarImage: {
        width: 26,
        height: 26,
    },
    fullViewPrice: {
        fontSize: 16,
        color: '#666',
        marginTop: 10,
    },
    eventLocation: {
        fontSize: 16,
        color: '#666',
        marginTop: 10,
    },
    ticketButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        alignItems: 'center',
        marginVertical: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    favoriteIcon: {
        marginRight: 10,
    },
});

export default EventDetail;
