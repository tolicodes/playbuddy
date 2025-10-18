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
import FAIcon from 'react-native-vector-icons/FontAwesome5';

import { formatDate } from '../hooks/calendarUtils';
import { logEvent } from '../../../Common/hooks/logger';
import { EventWithMetadata, NavStack } from '../../../Common/Nav/NavStackType';
import { generateGoogleCalendarUrl } from '../hooks/generateGoogleCalendarUrl';
import { useUserContext } from '../../Auth/hooks/UserContext';
import { TicketPromoModal } from './TicketPromoModal';
import { UE } from '../../../userEventTypes';
import { getBestPromoCode } from '../../../utils/getBestPromoCode';
import { useFetchEvents } from '../../../Common/db-axios/useEvents';
import PromoCodeSection from './PromoCodeSection';
import { useCalendarContext } from '../hooks/CalendarContext';
import TabBar from '../../../components/TabBar';
import { MediaCarousel } from '../../../components/MediaCarousel';
import { useEventAnalyticsProps } from '../../../Common/hooks/useAnalytics';
import { HORIZONTAL_PADDING } from '../../../components/styles';
import SectionCard from './SectionCard';

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

const allowedAffiliates = ['1pb'];

const buildTicketUrl = (rawUrl: string, opts?: { promoCode?: string }) => {
    const { promoCode } = opts || {};

    // Only attach affiliate for Eventbrite. UTM is safe everywhere.
    const addParams = (u: URL) => {
        const isEventbrite = u.hostname.includes('eventbrite.');
        if (isEventbrite && !allowedAffiliates.includes(u.searchParams.get('aff') || '')) {
            u.searchParams.set('aff', 'playbuddy');        // Eventbrite affiliate
            if (promoCode) u.searchParams.set('discount', promoCode); // EB promo
        } else {
            // Safe defaults for non-EB vendors; won’t break pages
            u.searchParams.set('utm_source', 'playbuddy');
            if (promoCode) u.searchParams.set('discount', promoCode);
        }
    };

    try {
        const u = new URL(rawUrl);
        addParams(u);
        return u.toString();
    } catch {
        // Fallback for relative/invalid URLs
        const sep = rawUrl.includes('?') ? '&' : '?';
        const params = new URLSearchParams();
        // We can’t detect vendor here, so use safe defaults
        params.set('utm_source', 'playbuddy');
        if (promoCode) params.set('discount', promoCode);
        return `${rawUrl}${sep}${params.toString()}`;
    }
};

const EventHeader = ({ selectedEvent }: { selectedEvent: EventWithMetadata }) => {
    const { currentDeepLink, authUserId } = useUserContext();
    const { toggleWishlistEvent, isOnWishlist } = useCalendarContext();
    const { data: allEvents } = useFetchEvents()
    const navigation = useNavigation<NavStack>();

    const [discountModalVisible, setDiscountModalVisible] = useState(false);

    const fullEvent = allEvents?.find(event => event.id === selectedEvent.id);

    const promoCode = getBestPromoCode(selectedEvent, currentDeepLink);
    const noImageOrVideo = !selectedEvent.image_url && !selectedEvent.video_url;

    const eventAnalyticsProps = useEventAnalyticsProps(selectedEvent)

    if (!fullEvent || !selectedEvent) return null;

    // Toggles the wishlist status for the event.
    const handleToggleWishlist = () => {
        if (!authUserId) {
            alert('You need an account to add events to your calendar');
            return;
        }

        if (!eventAnalyticsProps.event_id) {
            console.error('Event ID is missing');
            return;
        }

        const currentStatus = isOnWishlist(selectedEvent.id);
        logEvent(UE.EventDetailWishlistToggled, {
            ...eventAnalyticsProps,
            is_on_wishlist: !currentStatus,
        });
        toggleWishlistEvent.mutate({ eventId: selectedEvent.id, isOnWishlist: !currentStatus });
    };

    // Navigates to the organizer’s community events page.
    const handleOrganizerClick = () => {
        if (!eventAnalyticsProps.event_id) {
            return;
        }
        logEvent(UE.EventDetailOrganizerClicked, eventAnalyticsProps);

        // from the allEvents array, find the community that the organizer is in
        const community = fullEvent.communities?.find(
            community => community.organizer_id?.toString() === selectedEvent.organizer?.id?.toString()
        )?.id;

        if (community) {
            navigation.navigate('Community Events', {
                communityId: community
            });
        }
    };

    // Handle "Get Tickets" button press.
    const handleGetTickets = () => {

        // hack for invalid links (presale for TTI)
        const availableSoon = !selectedEvent.ticket_url?.includes('https');

        if (availableSoon) {
            return;
        }

        if (!eventAnalyticsProps.event_id) {
            return;
        }

        logEvent(UE.EventDetailGetTicketsClicked, eventAnalyticsProps);

        if (!promoCode) {
            Linking.openURL(buildTicketUrl(selectedEvent.ticket_url || ''));
            logEvent(UE.EventDetailTicketPressed, eventAnalyticsProps);
        } else {
            setDiscountModalVisible(true);
            logEvent(UE.EventDetailDiscountModalOpened, eventAnalyticsProps);
        }
    };

    const handleModalCopyPromoCode = () => {
        if (!promoCode) return;
        if (!eventAnalyticsProps.event_id) {
            return;
        }
        logEvent(UE.EventDetailTicketPromoModalPromoCopied, eventAnalyticsProps);
    };

    // Opens the Google Calendar URL.
    const handleGoogleCalendar = () => {
        if (!eventAnalyticsProps.event_id) {
            return;
        }
        logEvent(UE.EventDetailGoogleCalendarClicked, eventAnalyticsProps);
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

    const ticketUrlWithPromo = (() => {
        if (!promoCode) return buildTicketUrl(selectedEvent.ticket_url || '');

        try {
            const url = new URL(selectedEvent.ticket_url);
            url.searchParams.set('discount', promoCode.promo_code);
            return url.toString();
        } catch (e) {
            // Fallback in case the URL is relative or invalid
            const separator = selectedEvent.ticket_url.includes('?') ? '&' : '?';
            return `${buildTicketUrl(selectedEvent.ticket_url || '')}${separator}discount=${promoCode.promo_code}`;
        }
    })();

    const isAvailableSoon = !selectedEvent.ticket_url?.includes('https');

    return (
        <>
            <TicketPromoModal
                visible={discountModalVisible}
                promoCode={promoCode?.promo_code || 'N/A'}
                discount={`${promoCode?.discount}${promoCode?.discount_type === 'percent' ? '%' : '$'
                    }`}
                onClose={() => setDiscountModalVisible(false)}
                onBuyTicket={() => {
                    if (!eventAnalyticsProps.event_id) {
                        return;
                    }
                    logEvent(UE.EventDetailModalTicketPressed, eventAnalyticsProps);
                    Linking.openURL(buildTicketUrl(ticketUrlWithPromo));
                    setDiscountModalVisible(false);
                }}
                organizerName={selectedEvent.organizer?.name}
                onCopy={handleModalCopyPromoCode}
            />
            {
                selectedEvent.video_url ? (
                    <VideoPlayer uri={selectedEvent.video_url} />
                ) : selectedEvent.image_url ? (
                    <Image source={{ uri: selectedEvent.image_url }} style={styles.fullViewImage} />
                ) : null
            }
            <View style={[styles.headerCard, noImageOrVideo && styles.headerCardNoImage]}>
                <View style={styles.titleRow}>
                    <MaterialIcons name="event" size={24} color="#fff" style={styles.icon} />
                    <Text style={styles.headerTitle}>{selectedEvent.name}</Text>
                    <TouchableOpacity onPress={handleToggleWishlist} style={styles.favoriteIcon}>
                        <MaterialIcons
                            name={isOnWishlist(selectedEvent.id) ? 'favorite' : 'favorite-border'}
                            size={28}
                            color="#fff"
                        />
                    </TouchableOpacity>
                </View>

                <View style={styles.infoRow}>
                    <TouchableOpacity onPress={handleOrganizerClick} style={styles.organizerPill}>
                        <MaterialIcons name="group" size={14} color="#fff" />
                        <Text style={styles.organizerText}>{selectedEvent.organizer?.name}</Text>
                    </TouchableOpacity>

                    <View style={styles.infoRowPill}>
                        <MaterialIcons name="schedule" size={14} color="#fff" />
                        <Text style={styles.infoText}>{formatDate(selectedEvent, true)}</Text>
                    </View>

                    <View style={styles.infoRowPill}>
                        <MaterialIcons name="location-pin" size={14} color="#fff" />
                        <Text style={styles.infoText}>{selectedEvent.location}</Text>
                    </View>

                    {selectedEvent.price && <View style={styles.infoRowPill}>
                        <MaterialIcons name="paid" size={14} color="#fff" />
                        <Text style={styles.infoText}>{selectedEvent.price}</Text>
                    </View>}
                </View>

                <TouchableOpacity style={styles.ticketButton} onPress={handleGetTickets}>
                    <Text style={styles.ticketText}>{isAvailableSoon ? 'Available Soon' : '🎟️ Get Tickets 🎟️'}</Text>
                </TouchableOpacity>

            </View>
        </>
    )
}

const MediaTab = ({ event }: { event: EventWithMetadata }) => {
    return (
        <MediaCarousel
            medias={event.media || []}
        />
    )
}
const CLASSIFICATION_ICONS = [
    'hands', // interactivity
    'spa', // comfort
    'school', // experience
]

const TABS = [
    { name: 'Details', value: 'details' },
    { name: 'Organizer', value: 'organizer' },
    { name: 'Media', value: 'media' },
]

const DetailsTab = ({ event, handleCopyPromoCode }: { event: EventWithMetadata, handleCopyPromoCode: () => void }) => {
    const { currentDeepLink } = useUserContext();
    const promoCode = getBestPromoCode(event, currentDeepLink);
    const navigation = useNavigation<NavStack>();

    const isAvailableSoon = !event.ticket_url?.includes('https');

    const description = (isAvailableSoon && !event.description) ?
        'This event is available soon. Please check back later.'
        : event.description.replace('\n', '\n\n');

    return (
        <View style={styles.contentContainer}>
            <SectionCard title="Summary" icon="style">
                {event.short_description && (
                    <Text>{event.short_description}</Text>
                )}
            </SectionCard>

            {event.classification && (
                <SectionCard title="Tags" icon="style">
                    {event.classification.tags?.length > 0 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                        >
                            {event.classification.tags.map((theme, i) => (
                                <View key={`theme-${i}`} style={styles.tagPill}>
                                    <FAIcon
                                        name={'tag'}
                                        size={12}
                                        color="#4B2ABF"
                                        style={{ marginRight: 6 }}
                                        solid
                                    />
                                    <Text style={styles.tagText}>{theme}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    )}

                    {/* Row 2: Tags + Classification fields */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                    >
                        {[
                            event.classification.interactivity_level,
                            event.classification.experience_level
                        ]
                            .filter(Boolean)
                            .map((tag, i) => {
                                const icon = CLASSIFICATION_ICONS[i];
                                return (
                                    <View key={`tag-${i}`} style={[styles.tagPill, styles.tagPillSecondary]}>
                                        <FAIcon
                                            name={icon}
                                            size={12}
                                            color="#4B2ABF"
                                            style={{ marginRight: 6 }}
                                            solid
                                        />
                                        <Text style={styles.tagText}>{tag}</Text>
                                    </View>
                                );
                            })}

                    </ScrollView>
                </SectionCard>
            )}

            {promoCode && (
                <SectionCard title="Promo Code" icon="style">
                    <PromoCodeSection promoCode={promoCode} onCopy={handleCopyPromoCode} />
                </SectionCard>
            )}


            {event.vetted && (
                <SectionCard title="Vetted" icon="style">
                    <Text style={styles.vettedInfoText}>
                        This is a <Text style={{ fontWeight: 'bold' }}>vetted</Text> event. To attend you must fill out an application{' '}
                        {event.vetting_url && <Text style={{ color: '#4a6ee0', fontWeight: 'bold' }}>
                            <Text onPress={() => Linking.openURL(event.vetting_url || '')}>here</Text>
                        </Text>}
                    </Text>
                </SectionCard>
            )}

            {event.munch_id && (
                <SectionCard title="Munch" icon="style">
                    <Text style={styles.infoCardText}>
                        🍽️ This event is a <Text style={{ fontWeight: 'bold' }}>munch</Text>. Learn more on the Munch page:
                    </Text>
                    <TouchableOpacity
                        onPress={() =>
                            navigation.navigate('Munch Details', { munchId: event.munch_id })
                        }
                        style={styles.infoCardButton}
                    >
                        <Text style={styles.infoCardButtonText}>Go to Munch</Text>
                    </TouchableOpacity>
                </SectionCard>
            )}

            {event.ticket_url?.includes('fetlife') && (
                <SectionCard title="FetLife" icon="style">
                    <Text style={styles.infoCardText}>
                        🔗 Imported from FetLife with the organizer's permission. Requires FetLife account.
                    </Text>
                    <TouchableOpacity
                        onPress={() => Linking.openURL(buildTicketUrl(event.ticket_url || ''))}
                        style={styles.infoCardButton}
                    >
                        <Text style={styles.infoCardButtonText}>Open in FetLife</Text>
                    </TouchableOpacity>
                </SectionCard>
            )}

            <Markdown style={markdownStyles}>{description}</Markdown>
        </View >
    )
}

/*
 * EventDetail
 * Main component that renders an event’s full details including image/video,
 * description, organizer info, ticket purchase logic, and promo code handling.
 */
export const EventDetails = ({ route }) => {

    const { selectedEvent }: { selectedEvent: EventWithMetadata } = route.params || {};
    const { currentDeepLink, authUserId } = useUserContext();
    const promoCode = getBestPromoCode(selectedEvent, currentDeepLink);
    const [activeTab, setActiveTab] = useState<string>('details');

    const eventAnalyticsProps = useEventAnalyticsProps(selectedEvent);

    // If no event is provided, render nothing.
    if (!selectedEvent || !eventAnalyticsProps.event_id) return null;

    useEffect(() => {
        // This is just for all promo codes
        if (promoCode) {
            logEvent(UE.EventDetailPromoCodeSeen, eventAnalyticsProps);
        }
    }, [promoCode, currentDeepLink]);

    const handleCopyPromoCode = () => {
        if (!promoCode) return;
        logEvent(UE.EventDetailPromoCodeCopied, eventAnalyticsProps);
    };

    const hasMedia = (selectedEvent.media?.length || 0) > 1;

    const enabledTabs = [
        { name: 'Details', value: 'details' },
        ...(hasMedia ? [{ name: 'Media', value: 'media' }] : []),
    ]

    return (
        <>
            <ScrollView style={styles.scrollView}>

                <EventHeader selectedEvent={selectedEvent} />

                {enabledTabs.length > 1 && <TabBar tabs={enabledTabs} active={activeTab} onPress={setActiveTab} />}

                {activeTab === 'details' && (
                    <DetailsTab event={selectedEvent} handleCopyPromoCode={handleCopyPromoCode} />
                )}

                {hasMedia && <MediaTab event={selectedEvent} />}

            </ScrollView>

        </>
    );
};

const styles = StyleSheet.create({
    scrollView: {
        backgroundColor: '#fefaff', // Very soft background
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        paddingTop: 10,
    },
    flexOne: {
        flex: 1,
    },
    fullViewImage: {
        width: '100%',
        height: 250,
        marginBottom: 20,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        overflow: 'hidden',
    },
    fullViewTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#7F5AF0', // friendly purple
        marginRight: 20,
    },
    eventOrganizer: {
        fontSize: 18,
        color: '#5C5C5C',
        fontWeight: '500',
        marginBottom: 8,
    },
    eventTime: {
        fontSize: 16,
        color: '#8E8E93', // soft gray
        marginBottom: 6,
    },
    eventLocation: {
        fontSize: 16,
        color: '#8E8E93',
        marginBottom: 10,
    },
    video: {
        width: '100%',
        height: 280,
        borderRadius: 16,
        marginBottom: 20,
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 24,
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: -3 },
        shadowRadius: 10,
        elevation: 5,
    },
    googleCalendarButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#7F5AF0',
    },
    googleCalendarImage: {
        width: 26,
        height: 26,
    },
    googleCalendarText: {
        fontSize: 16,
        color: '#5C5C5C',
        fontWeight: '500',
    },
    buttonText: {
        color: 'black',
        fontSize: 18,
        fontWeight: '600',
    },
    favoriteIcon: {
        padding: 4,
    },
    headerCard: {
        backgroundColor: '#7F5AF0',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 16,
        paddingTop: 20,
        marginTop: -60, // make it flush against the white container
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: -2 },
        shadowRadius: 4,
        elevation: 5,
    },
    headerCardNoImage: {
        marginTop: 0,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    icon: {
        marginRight: 10,
    },
    headerTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: '700',
        color: '#FFF',
    },
    badgesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',

    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        marginRight: 8,
        marginBottom: 8,
    },
    organizerBadge: {
        backgroundColor: '#5C4DB1',
    },
    timeBadge: {
        backgroundColor: '#8566F2',
    },
    badgeText: {
        marginLeft: 4,
        fontSize: 13,
        fontWeight: '600',
        color: '#FFF',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 12,
        gap: 8,
        flexWrap: 'wrap',
    },

    organizerPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#5C4DB1',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 20,
    },
    organizerText: {
        marginLeft: 6,
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },

    infoRowPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6B57D0',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 20,
    },
    infoText: {
        marginLeft: 6,
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
    },

    ticketButton: {
        backgroundColor: '#fff',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 30,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 5,
        elevation: 3,
    },
    ticketText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#7F5AF0',
    },
    // Replace your existing styles for these:
    vettedInfo: {
        backgroundColor: '#E8F5E9',
        borderLeftWidth: 5,
        borderLeftColor: '#4CAF50',
        padding: 12,
        marginBottom: 16,
        borderRadius: 12,
        marginTop: 16
    },

    vettedInfoText: {
        fontSize: 14,
        color: '#2E7D32',
        fontWeight: '500',
    },

    infoCardMunch: {
        backgroundColor: '#FFF3E0',
        borderLeftWidth: 5,
        borderLeftColor: '#FFA000',
        padding: 14,
        borderRadius: 12,
        marginVertical: 12,
    },

    infoCardFetlife: {
        backgroundColor: '#E1F5FE',
        borderLeftWidth: 5,
        borderLeftColor: '#039BE5',
        padding: 14,
        borderRadius: 12,
        marginVertical: 12,
    },

    infoCardText: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
        marginBottom: 8,
    },

    infoCardButton: {
        backgroundColor: '#7F5AF0',
        paddingVertical: 8,
        paddingHorizontal: HORIZONTAL_PADDING,
        borderRadius: 24,
        alignSelf: 'flex-start',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 5,
        elevation: 2,
    },

    infoCardButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },

    tagContainer: {
        paddingVertical: 8,
        paddingHorizontal: HORIZONTAL_PADDING,
        backgroundColor: '#F8F3FF',
        borderRadius: 14,
    },

    tagRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    tagPill: {
        flexDirection: 'row', // ← make icon and text inline
        alignItems: 'center',
        backgroundColor: '#E2D9FF',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 999,
        marginRight: 6,
    },


    tagPillSecondary: {
        backgroundColor: '#E8EAF0',
    },

    tagText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#4B2ABF',
    },

});

const markdownStyles = {
    heading1: {
        marginTop: 20,
    },
    heading2: {
        marginTop: 20,
    },
    bullet_list: {
        marginTop: 8,
    },
    list_item: {
        marginBottom: 12,
    },
    paragraph: {
        marginBottom: 12,
    },
};


export default EventDetails;
