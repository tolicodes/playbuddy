import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Markdown from 'react-native-markdown-display';
import { WebView } from 'react-native-webview';
import { formatDate } from './hooks/calendarUtils';
import { getSmallAvatarUrl } from '../../Common/hooks/imageUtils';
import { logEvent } from '../../Common/hooks/logger';

import { FormattedPromoCode } from './PromoCode';
import { addOrReplacePromoCodeToEventbriteUrl } from '../Auth/screens/usePromoCode';

import { useNavigation } from '@react-navigation/native';
import { EventWithMetadata, NavStack } from '../../Common/Nav/NavStackType';
import { generateGoogleCalendarUrl } from './hooks/generateGoogleCalendarUrl';
import { useUserContext } from '../Auth/hooks/UserContext';
import { ALL_LOCATION_AREAS_ID } from '../../Common/hooks/CommonContext';
import { useCalendarContext } from './hooks/CalendarContext';

const VideoPlayer = ({ uri }: { uri: string }) => {
    return (
        <WebView
            style={styles.video}
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            source={{ uri }}
        />
    );
};

const formatPrice = (price: string) => {
    if (!price) return '';
    if (price === '0') return 'Free';
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice)) return price;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(numericPrice);
};

const EventHeader = ({ selectedEvent, addPromoCodeToUrlAndOpen, onPressGoogleCalendar }: { selectedEvent: EventWithMetadata, addPromoCodeToUrlAndOpen: () => void, onPressGoogleCalendar: () => void }) => {
    const { toggleWishlistEvent, isOnWishlist } = useCalendarContext();
    const itemIsOnWishlist = isOnWishlist(selectedEvent.id);

    return (
        <View style={styles.headerContainer}>
            <TouchableOpacity onPress={addPromoCodeToUrlAndOpen} style={styles.flexOne}>
                <Text style={styles.fullViewTitle} numberOfLines={2}>
                    {selectedEvent.name}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => toggleWishlistEvent.mutate({ eventId: selectedEvent.id, isOnWishlist: !itemIsOnWishlist })} style={styles.favoriteIcon}>
                <MaterialIcons
                    name={itemIsOnWishlist ? 'favorite' : 'favorite-border'}
                    size={35}
                    color="red"
                />
            </TouchableOpacity>

            <TouchableOpacity style={styles.googleCalendarButton} onPress={onPressGoogleCalendar}>
                <View>
                    <Image
                        source={require('./images/google-calendar.png')}
                        style={styles.googleCalendarImage}
                    />
                </View>
            </TouchableOpacity>
        </View>
    );
};

export const EventDetail = ({ route }: { route: { params: { selectedEvent: EventWithMetadata } } }) => {
    const navigation = useNavigation<NavStack>();
    const selectedEvent = route?.params?.selectedEvent;
    const { selectedLocationAreaId } = useUserContext();

    if (!selectedEvent) return null;

    const formattedPrice = formatPrice(selectedEvent.price);
    const imageUrl = selectedEvent.image_url && getSmallAvatarUrl(selectedEvent.image_url);

    const eventPromoCode = selectedEvent.promo_codes?.find(code => code.scope === 'event');
    const organizerPromoCode = selectedEvent.organizer?.promo_codes?.find(code => code.scope === 'organizer');
    const promoCode = eventPromoCode || organizerPromoCode;

    const addPromoCodeToUrlAndOpen = () => {
        const eventUrlWithPromoCode = addOrReplacePromoCodeToEventbriteUrl(selectedEvent.event_url, promoCode?.promo_code);
        logEvent('event_detail_link_clicked', { event_url: eventUrlWithPromoCode || selectedEvent.event_url });
        Linking.openURL(eventUrlWithPromoCode || selectedEvent.event_url);
    };

    const onClickOrganizer = () => {
        logEvent('event_detail_organizer_clicked', { organizer_id: selectedEvent.organizer.id });
        const community = selectedEvent.communities?.find(community => community.organizer_id === selectedEvent.organizer.id)?.id;
        if (community) {
            navigation.navigate('Details', { screen: 'Community Events', params: { communityId: community } });
        }
    };

    const onPressGoogleCalendar = () => {
        logEvent('event_detail_google_calendar_clicked', { event_id: selectedEvent.id });
        const calendarUrl = generateGoogleCalendarUrl({
            title: selectedEvent.name,
            startDate: selectedEvent.start_date,
            endDate: selectedEvent.end_date,
            description: selectedEvent.description,
            location: selectedEvent.location,
        });

        Linking.openURL(calendarUrl).catch(err => {
            throw new Error(`Failed to open Google Calendar: ${err}`);
        });
    };

    const locationAreaIsAll = selectedLocationAreaId === ALL_LOCATION_AREAS_ID;

    return (
        <ScrollView style={styles.scrollView}>
            {selectedEvent.video_url ? (
                <VideoPlayer uri={selectedEvent.video_url} />
            ) : (
                <Image source={{ uri: imageUrl }} style={styles.fullViewImage} />
            )}

            <View style={styles.contentContainer}>
                <EventHeader
                    selectedEvent={selectedEvent}
                    addPromoCodeToUrlAndOpen={addPromoCodeToUrlAndOpen}
                    onPressGoogleCalendar={onPressGoogleCalendar}
                />

                <TouchableOpacity onPress={onClickOrganizer}>
                    <Text style={styles.eventOrganizer}>
                        <Text style={styles.eventOrganizerLabel}>Organizer:</Text> {selectedEvent.organizer?.name}
                    </Text>
                </TouchableOpacity>

                <Text style={styles.eventTime}>
                    {formatDate(selectedEvent, true)}
                </Text>

                {formattedPrice && (
                    <Text style={styles.fullViewPrice}>
                        Price: {formattedPrice}
                    </Text>
                )}

                {locationAreaIsAll && (
                    <Text style={styles.eventLocation}>
                        {selectedEvent.location_area?.name}
                    </Text>
                )}

                {promoCode && <FormattedPromoCode promoCode={promoCode} />}

                {selectedEvent.ticket_url && (
                    <TouchableOpacity
                        style={styles.ticketButton}
                        onPress={() => {
                            logEvent('event_detail_get_tickets_clicked', { event_id: selectedEvent.id, event_name: selectedEvent.name, promo_code: promoCode });
                            Linking.openURL(selectedEvent.ticket_url).catch(err => {
                                throw new Error(`Failed to open ticket URL: ${err}`);
                            });
                        }}
                    >
                        <Text style={styles.buttonText}>🎟️ Get Tickets 🎟️</Text>
                    </TouchableOpacity>
                )}

                <Markdown>
                    {selectedEvent.description}
                </Markdown>
            </View>
        </ScrollView>
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
        flexWrap: 'nowrap',
        marginBottom: 20,
    },
    flexOne: {
        flex: 1,
    },
    fullViewContainer: {
        position: 'relative',
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#fff',
        padding: 20,
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
    fullViewTime: {
        fontSize: 18,
        color: '#000',
    },
    fullViewLocation: {
        fontSize: 18,
        color: '#666',
        marginTop: 10,
    },
    fullViewPrice: {
        fontSize: 16,
        color: '#666',
        marginTop: 10,
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
    videoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
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
    controlsContainer: {
        padding: 10,
    },
    promoCodeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
    },
    promoCodeBadge: {
        backgroundColor: '#FFD700',
        padding: 8,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginVertical: 10,
    },
    promoCodeText: {
        fontSize: 14,
        color: '#000',
        fontWeight: 'bold',
    },
    promoCodeLabel: {
        fontSize: 14,
        color: '#000',
        fontWeight: 'bold',
    },
    promoCodeBubble: {
        backgroundColor: '#FFD700',
        padding: 8,
        borderRadius: 12,
    },
    promoCodeDiscount: {
        fontSize: 14,
        color: '#000',
        fontWeight: 'bold',
    },
    googleCalendarIcon: {
        width: 30,
        height: 30,
        alignItems: 'flex-start',
    },
    googleCalendarImage: {
        width: 30,
        height: 30,
    },
    googleCalendarText: {
        fontSize: 11,
        color: '#000',
        fontWeight: 'bold',
    },
    googleCalendarButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    googleCalendarButtonText: {
        fontSize: 10,
        color: '#000',
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 3,
        width: 30,
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
    padding20: {
        padding: 20,
    },
});