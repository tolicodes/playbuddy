import React, { useState } from 'react';
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
import { logEvent } from '../../Common/hooks/logger';
import { addOrReplacePromoCodeToEventbriteUrl } from '../Auth/screens/usePromoCode';
import { EventWithMetadata, NavStack } from '../../Common/Nav/NavStackType';
import { generateGoogleCalendarUrl } from './hooks/generateGoogleCalendarUrl';
import { useUserContext } from '../Auth/hooks/UserContext';
import { ALL_LOCATION_AREAS_ID } from '../../Common/hooks/CommonContext';
import { useCalendarContext } from './hooks/CalendarContext';
import PromoCodeSection from './PromoCodeSection';
import { TicketPromoModal } from './TicketPromoModal';

/* 
 * VideoPlayer
 * A simple component that wraps a WebView for video playback.
 */
const VideoPlayer = ({ uri }) => (
    <WebView
        style={styles.video}
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        source={{ uri }}
    />
);

/*
 * formatPrice
 * Formats a string price into proper USD currency formatting.
 */
const formatPrice = (price) => {
    if (!price) return '';
    if (price === '0') return 'Free';
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice)) return price;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(numericPrice);
};

/*
 * EventHeader
 * Renders the event title with a touchable link, the wishlist icon,
 * and a Google Calendar button.
 */
const EventHeader = ({ event, onEventPress, onToggleWishlist, onGoogleCalendar }) => {
    const { isOnWishlist } = useCalendarContext();
    const itemIsOnWishlist = isOnWishlist(event.id);

    return (
        <View style={styles.headerContainer}>
            <TouchableOpacity onPress={onEventPress} style={styles.flexOne}>
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
    const { selectedEvent } = route.params || {};
    const { selectedLocationAreaId, initialDeepLink } = useUserContext();

    // If no event is provided, render nothing.
    if (!selectedEvent) return null;

    // Format and retrieve event data.
    const formattedPrice = formatPrice(selectedEvent.price);
    const imageUrl = selectedEvent.image_url ? getSmallAvatarUrl(selectedEvent.image_url) : null;

    // Determine the promo code to use: initial deep link > event > organizer.
    const eventPromoCode = selectedEvent.promo_codes?.find(code => code.scope === 'event');
    const organizerPromoCode = selectedEvent.organizer?.promo_codes?.find(code => code.scope === 'organizer');
    const promoCode = initialDeepLink?.featured_promo_code || eventPromoCode || organizerPromoCode;

    // Opens the event URL with the promo code inserted (if available).
    const handleEventPress = () => {
        const eventUrl = addOrReplacePromoCodeToEventbriteUrl(selectedEvent.event_url, promoCode?.promo_code);
        logEvent('event_detail_link_clicked', { event_url: eventUrl || selectedEvent.event_url });
        Linking.openURL(eventUrl || selectedEvent.event_url);
    };

    // Toggles the wishlist status for the event.
    const handleToggleWishlist = () => {
        const { toggleWishlistEvent, isOnWishlist } = useCalendarContext();
        const currentStatus = isOnWishlist(selectedEvent.id);
        toggleWishlistEvent.mutate({ eventId: selectedEvent.id, isOnWishlist: !currentStatus });
    };

    // Navigates to the organizer’s community events page.
    const handleOrganizerClick = () => {
        logEvent('event_detail_organizer_clicked', { organizer_id: selectedEvent.organizer.id });
        const community = selectedEvent.communities?.find(
            community => community.organizer_id === selectedEvent.organizer.id
        )?.id;
        if (community) {
            navigation.navigate('Details', { screen: 'Community Events', params: { communityId: community } });
        }
    };

    // Opens the Google Calendar URL.
    const handleGoogleCalendar = () => {
        logEvent('event_detail_google_calendar_clicked', { event_id: selectedEvent.id });
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
        logEvent('event_detail_get_tickets_clicked', {
            event_id: selectedEvent.id,
            event_name: selectedEvent.name,
            organizer_name: selectedEvent.organizer?.name,
            promo_code_id: promoCode?.id,
            promo_code_code: promoCode?.promo_code,
            initial_deep_link: initialDeepLink?.id,
        });

        if (!promoCode) {
            Linking.openURL(selectedEvent.ticket_url);
            logEvent('event_detail_ticket_pressed', {
                event_id: selectedEvent.id,
                event_name: selectedEvent.name,
            });
        } else {
            setDiscountModalVisible(true);
            logEvent('event_detail_ticket_discount_modal_opened', {
                event_id: selectedEvent.id,
                event_name: selectedEvent.name,
            });
        }
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
                    Linking.openURL(selectedEvent.ticket_url);
                    setDiscountModalVisible(false);
                }}
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
                        onEventPress={handleEventPress}
                        onToggleWishlist={handleToggleWishlist}
                        onGoogleCalendar={handleGoogleCalendar}
                    />

                    <TouchableOpacity onPress={handleOrganizerClick}>
                        <Text style={styles.eventOrganizer}>
                            <Text style={styles.eventOrganizerLabel}>Organizer: </Text>
                            {selectedEvent.organizer?.name}
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.eventTime}>{formatDate(selectedEvent, true)}</Text>

                    {formattedPrice ? <Text style={styles.fullViewPrice}>Price: {formattedPrice}</Text> : null}
                    {locationAreaIsAll && (
                        <Text style={styles.eventLocation}>
                            {selectedEvent.location_area?.name}
                        </Text>
                    )}
                    {promoCode && <PromoCodeSection promoCode={promoCode.promo_code} />}

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
        borderRadius: 10,
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
