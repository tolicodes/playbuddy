import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Linking,
    ScrollView,
    Alert,
    Share,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Markdown from 'react-native-markdown-display';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import FAIcon from 'react-native-vector-icons/FontAwesome5';

import { formatDate } from '../hooks/calendarUtils';
import { logEvent } from '../../../Common/hooks/logger';
import { EventWithMetadata, NavStack } from '../../../Common/Nav/NavStackType';
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

const TAG_TONES = {
    spiritual: { backgroundColor: '#FFF4E6', borderColor: '#FFD7A8', textColor: '#B45309' },
    social: { backgroundColor: '#E9FBF3', borderColor: '#BDEDD8', textColor: '#1F8A5B' },
    skill: { backgroundColor: '#EEF5FF', borderColor: '#CFE0FF', textColor: '#2B5AD7' },
    scene: { backgroundColor: '#F6EEFF', borderColor: '#DEC8FF', textColor: '#6B35C6' },
    default: { backgroundColor: '#F5F1FF', borderColor: '#E3DBFF', textColor: '#4B2ABF' },
};

const TAG_TONE_MATCHERS: Array<{ tone: keyof typeof TAG_TONES; keywords: string[] }> = [
    {
        tone: 'spiritual',
        keywords: ['tantra', 'spiritual', 'meditat', 'ritual', 'ceremony', 'sacred', 'yoga', 'breath', 'energy', 'shaman', 'hypnosis'],
    },
    {
        tone: 'social',
        keywords: ['social', 'community', 'munch', 'meet', 'mingle', 'dating', 'poly', 'network', 'party'],
    },
    {
        tone: 'skill',
        keywords: ['workshop', 'class', 'training', 'lesson', 'beginner', 'intermediate', 'advanced', 'practice', 'hands on', 'education', 'consent', 'safety'],
    },
    {
        tone: 'scene',
        keywords: ['bdsm', 'kink', 'rope', 'shibari', 'bondage', 'fetish', 'impact', 'domin', 'submiss', 'sadis', 'masoch', 'exhibition', 'voyeur', 'play', 'erotic', 'sensual', 'sexual'],
    },
];

const getTagTone = (tag: string) => {
    const normalized = tag.trim().toLowerCase();
    const match = TAG_TONE_MATCHERS.find(({ keywords }) =>
        keywords.some(keyword => normalized.includes(keyword))
    );
    return TAG_TONES[match?.tone ?? 'default'];
};

const MAX_COLLAPSED_TAGS = 6;

const EventHeader = ({ selectedEvent }: { selectedEvent: EventWithMetadata }) => {
    const { currentDeepLink, authUserId } = useUserContext();
    const { toggleWishlistEvent, isOnWishlist } = useCalendarContext();
    const { data: allEvents } = useFetchEvents()
    const navigation = useNavigation<NavStack>();

    const [discountModalVisible, setDiscountModalVisible] = useState(false);

    const fullEvent = allEvents?.find(event => event.id === selectedEvent.id) || selectedEvent;

    const promoCode = getBestPromoCode(selectedEvent, currentDeepLink);
    const eventAnalyticsProps = useEventAnalyticsProps(selectedEvent);

    const locationLabel = selectedEvent.location || selectedEvent.city || selectedEvent.region || '';
    const promoBadgeLabel = promoCode
        ? promoCode.discount_type === 'percent'
            ? `${promoCode.discount}% off`
            : `$${promoCode.discount} off`
        : null;

    const infoItems = [
        { icon: 'schedule', label: formatDate(selectedEvent, true) },
        locationLabel ? { icon: 'location-pin', label: locationLabel } : null,
        selectedEvent.price ? { icon: 'paid', label: selectedEvent.price } : null,
    ].filter(Boolean) as { icon: string; label: string }[];

    const formatLabel = (value: string) =>
        value
            .split('_')
            .map(word => word[0].toUpperCase() + word.slice(1))
            .join(' ');

    const typeLabelMap: Record<string, string> = {
        play_party: 'Play Party',
        munch: 'Munch',
        retreat: 'Retreat',
        festival: 'Festival',
        workshop: 'Workshop',
        performance: 'Performance',
        discussion: 'Discussion',
    };
    const typeIconMap: Record<string, string> = {
        play_party: 'glass-cheers',
        munch: 'utensils',
        retreat: 'leaf',
        festival: 'music',
        workshop: 'chalkboard-teacher',
        performance: 'microphone',
        discussion: 'comments',
        event: 'calendar-alt',
    };
    type QuickChip = { label: string; icon: string };
    const quickChips: QuickChip[] = [];
    const seenQuick = new Set<string>();
    const pushQuickChip = (label: string, icon: string) => {
        const clean = label.trim();
        const key = clean.toLowerCase();
        if (!clean || seenQuick.has(key)) return;
        seenQuick.add(key);
        quickChips.push({ label: clean, icon });
    };

    if (selectedEvent.play_party) pushQuickChip('Play Party', typeIconMap.play_party);
    if (selectedEvent.is_munch) pushQuickChip('Munch', typeIconMap.munch);
    if (selectedEvent.type && selectedEvent.type !== 'event') {
        const typeLabel = typeLabelMap[selectedEvent.type] || formatLabel(selectedEvent.type);
        pushQuickChip(typeLabel, typeIconMap[selectedEvent.type] || typeIconMap.event);
    }
    if (selectedEvent.classification?.experience_level) {
        pushQuickChip(formatLabel(selectedEvent.classification.experience_level), 'signal');
    }
    if (selectedEvent.classification?.interactivity_level) {
        pushQuickChip(formatLabel(selectedEvent.classification.interactivity_level), 'hands');
    }

    if (!selectedEvent) return null;

    const isWishlisted = isOnWishlist(selectedEvent.id);

    // Toggles the wishlist status for the event.
    const handleToggleWishlist = () => {
        if (!authUserId) {
            alert('You need an account to add events to your wishlist');
            return;
        }

        if (!eventAnalyticsProps.event_id) {
            console.error('Event ID is missing');
            return;
        }

        logEvent(UE.EventDetailWishlistToggled, {
            ...eventAnalyticsProps,
            is_on_wishlist: !isWishlisted,
        });
        toggleWishlistEvent.mutate({ eventId: selectedEvent.id, isOnWishlist: !isWishlisted });
    };

    // Navigates to the organizer’s community events page.
    const handleOrganizerClick = () => {
        if (!eventAnalyticsProps.event_id) {
            return;
        }
        logEvent(UE.EventDetailOrganizerClicked, eventAnalyticsProps);

        // from the allEvents array, find the community that the organizer is in
        const organizerId = selectedEvent.organizer?.id?.toString();
        if (!organizerId) return;

        const communityIdSet = new Set<string>();
        const addCommunityId = (id?: string) => {
            if (id) communityIdSet.add(id);
        };

        for (const event of allEvents || []) {
            if (event.organizer?.id?.toString() !== organizerId) continue;
            for (const community of event.communities || []) {
                if (!community.organizer_id || community.organizer_id.toString() === organizerId) {
                    addCommunityId(community.id);
                }
            }
        }

        for (const community of fullEvent.communities || []) {
            addCommunityId(community.id);
        }

        const communityIds = Array.from(communityIdSet);
        const communityId =
            fullEvent.communities?.find(
                community => community.organizer_id?.toString() === organizerId
            )?.id || communityIds[0];

        if (communityId) {
            navigation.navigate('Community Events', {
                communityId,
                communityIds,
                displayName: selectedEvent.organizer?.name,
                organizerId,
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

    const handleShare = async () => {
        if (!eventAnalyticsProps.event_id) {
            return;
        }
        logEvent(UE.EventListItemSharePressed, eventAnalyticsProps);

        const shareUrl = selectedEvent.ticket_url
            ? buildTicketUrl(selectedEvent.ticket_url)
            : '';

        if (!shareUrl) {
            Alert.alert('No ticket link yet', 'Tickets are not available for this event yet.');
            return;
        }

        try {
            await Share.share({ message: shareUrl });
        } catch (err) {
            Alert.alert('Error', 'Unable to share right now.');
        }
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
    const membershipUrl = selectedEvent.organizer?.membership_app_url;
    const membershipOnly = selectedEvent.organizer?.membership_only;
    const isMembershipOnly = !!(membershipUrl && membershipOnly);
    const ticketLabel = isMembershipOnly
        ? 'Apply For Membership'
        : isAvailableSoon
            ? 'Available Soon'
            : 'Get Tickets';
    const ticketDisabled = isAvailableSoon && !isMembershipOnly;
    const handleTicketPress = () => {
        if (isMembershipOnly && membershipUrl) {
            Linking.openURL(membershipUrl);
            return;
        }
        handleGetTickets();
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
            <View style={styles.heroWrapper}>
                <View style={styles.heroMedia}>
                    {selectedEvent.video_url ? (
                        <VideoPlayer uri={selectedEvent.video_url} />
                    ) : selectedEvent.image_url ? (
                        <Image
                            source={{ uri: selectedEvent.image_url }}
                            style={styles.heroImage}
                            contentFit="cover"
                        />
                    ) : (
                        <View style={styles.heroPlaceholder}>
                            <MaterialIcons name="event" size={56} color="#c7b9ff" />
                        </View>
                    )}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.75)']}
                        style={styles.heroGradient}
                    />
                    {promoBadgeLabel && (
                        <View style={styles.heroPromoBadge}>
                            <Text style={styles.heroPromoText}>{promoBadgeLabel}</Text>
                        </View>
                    )}
                    <View style={styles.heroFooter}>
                        <Text style={styles.heroTitle} numberOfLines={2}>
                            {selectedEvent.name}
                        </Text>
                        {selectedEvent.organizer?.name ? (
                            <TouchableOpacity onPress={handleOrganizerClick} style={styles.heroOrganizer}>
                                <View
                                    style={[
                                        styles.organizerDot,
                                        { backgroundColor: selectedEvent.organizerColor || '#fff' },
                                    ]}
                                />
                                <Text style={styles.heroOrganizerText} numberOfLines={1}>
                                    {selectedEvent.organizer?.name}
                                </Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>
            </View>

            <View style={styles.headerSheet}>
                <View style={styles.ctaRow}>
                    <TouchableOpacity
                        style={[
                            styles.ticketButton,
                            ticketDisabled && styles.ticketButtonDisabled,
                        ]}
                        onPress={handleTicketPress}
                        disabled={ticketDisabled}
                    >
                        <MaterialIcons
                            name={ticketDisabled ? 'schedule' : 'confirmation-number'}
                            size={18}
                            color="#fff"
                            style={styles.ticketIcon}
                        />
                        <Text style={styles.ticketText}>{ticketLabel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.calendarButton} onPress={handleToggleWishlist}>
                        <FAIcon
                            name="heart"
                            size={22}
                            color="#ef4444"
                            solid={isWishlisted}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                        <FAIcon name="share-square" size={18} color="#6B57D0" />
                    </TouchableOpacity>
                </View>

                {infoItems.length > 0 && (
                    <View style={styles.metaList}>
                        {infoItems.map((item, index) => (
                            <View key={`${item.label}-${index}`} style={styles.metaLine}>
                                <View style={styles.metaIconWrap}>
                                    <MaterialIcons
                                        name={item.icon}
                                        size={16}
                                        color="#5D4BB7"
                                    />
                                </View>
                                <Text style={styles.metaText} numberOfLines={2}>
                                    {item.label}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {quickChips.length > 0 && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.quickRowScroll}
                        contentContainerStyle={styles.quickRow}
                    >
                        {quickChips.map((chip, index) => (
                            <View key={`${chip.label}-${index}`} style={styles.quickPill}>
                                <FAIcon
                                    name={chip.icon}
                                    size={11}
                                    color="#5A43B5"
                                    style={styles.quickPillIcon}
                                />
                                <Text style={styles.quickPillText}>{chip.label}</Text>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>
        </>
    );
}

const MediaTab = ({ event }: { event: EventWithMetadata }) => {
    return (
        <View style={styles.mediaSection}>
            <MediaCarousel
                medias={event.media || []}
            />
        </View>
    )
}
const TABS = [
    { name: 'Details', value: 'details' },
    { name: 'Organizer', value: 'organizer' },
    { name: 'Media', value: 'media' },
]

const DetailsTab = ({ event, handleCopyPromoCode }: { event: EventWithMetadata, handleCopyPromoCode: () => void }) => {
    const { currentDeepLink } = useUserContext();
    const promoCode = getBestPromoCode(event, currentDeepLink);
    const navigation = useNavigation<NavStack>();
    const [showAllTags, setShowAllTags] = useState(false);

    const isAvailableSoon = !event.ticket_url?.includes('https');

    const rawDescription = event.description || '';
    const description = (isAvailableSoon && !rawDescription)
        ? 'This event is available soon. Please check back later.'
        : rawDescription;
    const markdownDescription = description ? description.replace('\n', '\n\n') : '';
    const tagList = Array.from(
        new Set([...(event.classification?.tags || []), ...(event.tags || [])])
    );
    const hasHiddenTags = tagList.length > MAX_COLLAPSED_TAGS;
    const visibleTags = showAllTags ? tagList : tagList.slice(0, MAX_COLLAPSED_TAGS);
    const hiddenTagCount = hasHiddenTags ? tagList.length - MAX_COLLAPSED_TAGS : 0;

    useEffect(() => {
        setShowAllTags(false);
    }, [event.id]);

    return (
        <View style={styles.contentContainer}>
            {event.short_description && (
                <SectionCard title="Summary" icon="subject" tone="default">
                    <Text style={styles.bodyText}>{event.short_description}</Text>
                </SectionCard>
            )}

            {promoCode && (
                <SectionCard title="Promo Code" icon="local-offer" tone="warning">
                    <PromoCodeSection promoCode={promoCode} onCopy={handleCopyPromoCode} />
                </SectionCard>
            )}

            {tagList.length > 0 && (
                <SectionCard title="Tags" icon="local-offer">
                    <View style={styles.tagWrap}>
                        {visibleTags.map((theme, i) => {
                            const tone = getTagTone(theme);
                            return (
                                <View
                                    key={`theme-${i}`}
                                    style={[
                                        styles.tagPill,
                                        { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor },
                                    ]}
                                >
                                    <Text style={[styles.tagText, { color: tone.textColor }]}>{theme}</Text>
                                </View>
                            );
                        })}
                        {hasHiddenTags && !showAllTags && (
                            <TouchableOpacity
                                style={[styles.tagPill, styles.tagMorePill]}
                                onPress={() => setShowAllTags(true)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.tagText, styles.tagMoreText]}>+{hiddenTagCount} more</Text>
                            </TouchableOpacity>
                        )}
                        {hasHiddenTags && showAllTags && (
                            <TouchableOpacity
                                style={[styles.tagPill, styles.tagMorePill]}
                                onPress={() => setShowAllTags(false)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.tagText, styles.tagMoreText]}>Show less</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </SectionCard>
            )}


            {event.vetted && (
                <SectionCard title="Vetted" icon="verified-user" tone="info">
                    <Text style={styles.vettedInfoText}>
                        This is a <Text style={{ fontWeight: 'bold' }}>vetted</Text> event. To attend you must fill out an application{' '}
                        {event.vetting_url && <Text style={{ color: '#4a6ee0', fontWeight: 'bold' }}>
                            <Text onPress={() => Linking.openURL(event.vetting_url || '')}>here</Text>
                        </Text>}
                    </Text>
                </SectionCard>
            )}

            {event.munch_id && (
                <SectionCard title="Munch" icon="restaurant" tone="warning">
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
                <SectionCard title="FetLife" icon="link" tone="info">
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

            {markdownDescription ? (
                <SectionCard title="About" icon="subject">
                    <Markdown style={markdownStyles}>{markdownDescription}</Markdown>
                </SectionCard>
            ) : null}
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
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

                <EventHeader selectedEvent={selectedEvent} />

                {enabledTabs.length > 1 && (
                    <View style={styles.tabBarWrap}>
                        <LinearGradient
                            colors={['#6B57D0', '#7F5AF0']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.tabBarGradient}
                        >
                            <TabBar tabs={enabledTabs} active={activeTab} onPress={setActiveTab} />
                        </LinearGradient>
                    </View>
                )}

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
        backgroundColor: '#f6f2ff',
    },
    scrollContent: {
        paddingBottom: 24,
    },
    heroWrapper: {
        marginBottom: 0,
    },
    heroMedia: {
        height: 260,
        width: '100%',
        backgroundColor: '#1f1b2e',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        overflow: 'hidden',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    heroPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2a2438',
    },
    heroGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 120,
    },
    heroPromoBadge: {
        position: 'absolute',
        left: 16,
        top: 16,
        backgroundColor: '#FFD700',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 6,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
        elevation: 2,
    },
    heroPromoText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1f1f1f',
    },
    heroFooter: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 36,
    },
    heroTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
    },
    heroOrganizer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(0,0,0,0.68)',
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.55)',
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    organizerDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 10,
        backgroundColor: '#fff',
    },
    heroOrganizerText: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.2,
        color: '#fff',
    },
    headerSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -18,
        paddingTop: 16,
        paddingBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: -2 },
        shadowRadius: 10,
        elevation: 3,
    },
    metaList: {
        paddingHorizontal: 16,
        paddingTop: 12,
        gap: 6,
    },
    metaLine: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 2,
    },
    metaIconWrap: {
        width: 20,
        alignItems: 'center',
        marginRight: 8,
        marginTop: 2,
    },
    metaText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#3b2f74',
        lineHeight: 20,
    },
    quickRowScroll: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 8,
    },
    quickRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    quickPill: {
        backgroundColor: '#F8F6FF',
        borderRadius: 999,
        paddingVertical: 4,
        paddingHorizontal: 10,
        marginRight: 6,
        borderWidth: 1,
        borderColor: '#E5DFF9',
        flexDirection: 'row',
        alignItems: 'center',
    },
    quickPillIcon: {
        marginRight: 6,
    },
    quickPillText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#5A43B5',
    },
    ctaRow: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 16,
        paddingTop: 6,
    },
    ticketButton: {
        flex: 1.2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6B57D0',
        paddingVertical: 12,
        borderRadius: 24,
    },
    ticketButtonDisabled: {
        backgroundColor: '#9A8ED8',
    },
    ticketIcon: {
        marginRight: 6,
    },
    ticketText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
    calendarButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: '#ef4444',
        backgroundColor: '#FFF5F6',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    shareButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#C9B8FF',
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabBarWrap: {
        paddingHorizontal: 16,
        marginTop: 12,
    },
    tabBarGradient: {
        borderRadius: 24,
        paddingVertical: 6,
        paddingHorizontal: 4,
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 24,
        backgroundColor: 'transparent',
    },
    bodyText: {
        fontSize: 14,
        color: '#2f2f2f',
        lineHeight: 20,
    },
    mediaSection: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 24,
    },
    vettedInfoText: {
        fontSize: 14,
        color: '#2E7D32',
        fontWeight: '500',
    },
    infoCardText: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
        marginBottom: 8,
    },
    infoCardButton: {
        backgroundColor: '#6B57D0',
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
    tagPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 3,
        paddingHorizontal: 12,
        borderRadius: 999,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
    },
    tagWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingTop: 6,
    },
    tagText: {
        fontSize: 12,
        fontWeight: '600',
    },
    tagMorePill: {
        backgroundColor: '#F4F4F7',
        borderColor: '#DADAE6',
    },
    tagMoreText: {
        color: '#6B7280',
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
