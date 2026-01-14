import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Linking,
    ScrollView,
    Alert,
    Share,
    useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Markdown from 'react-native-markdown-display';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import moment from 'moment-timezone';

import { formatDate } from '../hooks/calendarUtils';
import { logEvent } from '../../../Common/hooks/logger';
import { EventWithMetadata, NavStack } from '../../../Common/Nav/NavStackType';
import { useUserContext } from '../../Auth/hooks/UserContext';
import { UE } from '../../../userEventTypes';
import { getBestPromoCode } from '../../../utils/getBestPromoCode';
import { useFetchEvents } from '../../../Common/db-axios/useEvents';
import { useFetchAttendees } from '../../../Common/db-axios/useAttendees';
import { useFetchFollows } from '../../../Common/db-axios/useFollows';
import { useCommonContext } from '../../../Common/hooks/CommonContext';
import { useJoinCommunity, useLeaveCommunity } from '../../../Common/hooks/useCommunities';
import PromoCodeSection from './PromoCodeSection';
import { useCalendarContext } from '../hooks/CalendarContext';
import TabBar from '../../../components/TabBar';
import { MediaCarousel } from '../../../components/MediaCarousel';
import { AvatarCircle } from '../../Auth/Buttons/AvatarCircle';
import { useEventAnalyticsProps } from '../../../Common/hooks/useAnalytics';
import { getSafeImageUrl } from '../../../Common/hooks/imageUtils';
import { calendarTagTones, colors, fontFamilies, fontSizes, lineHeights, radius, shadows, spacing } from '../../../components/styles';
import { ACTIVE_EVENT_TYPES } from '../../../Common/types/commonTypes';
import SectionCard from './SectionCard';
import { TZ } from '../ListView/calendarNavUtils';

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

const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const TAG_TONES = calendarTagTones;

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
const RECOMMENDED_EVENTS_TOTAL = 5;
const ORGANIZER_RECOMMENDATION_COUNT = 2;
const FOLLOWED_RECOMMENDATION_COUNT = 3;

const EventHeader = ({ selectedEvent }: { selectedEvent: EventWithMetadata }) => {
    const { currentDeepLink, authUserId } = useUserContext();
    const { toggleWishlistEvent, isOnWishlist } = useCalendarContext();
    const { data: allEvents } = useFetchEvents()
    const navigation = useNavigation<NavStack>();
    const { myCommunities, communities } = useCommonContext();
    const joinCommunity = useJoinCommunity();
    const leaveCommunity = useLeaveCommunity();

    const fullEvent = allEvents?.find(event => event.id === selectedEvent.id) || selectedEvent;
    const organizerId = selectedEvent.organizer?.id?.toString();
    const eventCommunities = fullEvent.communities || selectedEvent.communities || [];
    const organizerCommunityIds = organizerId
        ? Array.from(
            new Set([
                ...eventCommunities
                    .filter(
                        (community) =>
                            community.type === 'organizer_public_community' &&
                            community.organizer_id?.toString() === organizerId
                    )
                    .map((community) => community.id),
                ...communities.organizerPublicCommunities
                    .filter((community) => community.organizer_id?.toString() === organizerId)
                    .map((community) => community.id),
            ])
        ).filter((id) => isUuid(id))
        : [];
    const myCommunityIds = useMemo(
        () => new Set(myCommunities.allMyCommunities.map((community) => community.id)),
        [myCommunities.allMyCommunities]
    );
    const isOrganizerFollowed = organizerCommunityIds.some((id) => myCommunityIds.has(id));
    const canFollowOrganizer = organizerCommunityIds.length > 0;

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

    const isActiveEventType = (value?: string | null) =>
        !!value && ACTIVE_EVENT_TYPES.includes(value as (typeof ACTIVE_EVENT_TYPES)[number]);

    const typeLabelMap: Record<string, string> = {
        play_party: 'Play Party',
        munch: 'Munch',
        retreat: 'Retreat',
        festival: 'Festival',
        conference: 'Conference',
        workshop: 'Workshop',
    };
    const typeIconMap: Record<string, string> = {
        play_party: 'glass-cheers',
        munch: 'utensils',
        retreat: 'leaf',
        festival: 'music',
        conference: 'users',
        workshop: 'chalkboard-teacher',
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
    if (selectedEvent.type && isActiveEventType(selectedEvent.type)) {
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

    const navigateToOrganizerCommunity = () => {
        // From the allEvents array, find the community that the organizer is in.
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

    // Navigates to the organizer’s community events page.
    const handleOrganizerClick = () => {
        if (!eventAnalyticsProps.event_id) {
            return;
        }
        logEvent(UE.EventDetailOrganizerClicked, eventAnalyticsProps);
        navigateToOrganizerCommunity();
    };

    const handleOrganizerFollow = () => {
        if (!canFollowOrganizer) return;
        if (!authUserId) {
            Alert.alert('Create an account to follow organizers!');
            return;
        }
        if (isOrganizerFollowed) {
            organizerCommunityIds.forEach((communityId) => {
                if (!myCommunityIds.has(communityId)) return;
                leaveCommunity.mutate({ community_id: communityId });
            });
            return;
        }
        organizerCommunityIds.forEach((communityId) => {
            if (myCommunityIds.has(communityId)) return;
            joinCommunity.mutate({
                community_id: communityId,
                type: 'organizer_public_community',
            });
        });
        navigateToOrganizerCommunity();
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

        const ticketUrl = buildTicketUrl(
            selectedEvent.ticket_url || '',
            promoCode ? { promoCode: promoCode.promo_code } : undefined
        );
        Linking.openURL(ticketUrl);
        logEvent(UE.EventDetailTicketPressed, eventAnalyticsProps);
    };

    const handleShare = async () => {
        if (!eventAnalyticsProps.event_id) {
            return;
        }
        logEvent(UE.EventListItemSharePressed, eventAnalyticsProps);

        const shareUrl = selectedEvent.ticket_url
            ? buildTicketUrl(
                selectedEvent.ticket_url,
                promoCode ? { promoCode: promoCode.promo_code } : undefined
            )
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

    const heroImageUrl = getSafeImageUrl(selectedEvent.image_url);

    return (
        <>
            <View style={styles.heroWrapper}>
                <View style={styles.heroMedia}>
                    {selectedEvent.video_url ? (
                        <VideoPlayer uri={selectedEvent.video_url} />
                    ) : heroImageUrl ? (
                        <Image
                            source={{ uri: heroImageUrl }}
                            style={styles.heroImage}
                            contentFit="cover"
                            cachePolicy="disk"
                            allowDownscaling
                            decodeFormat="rgb"
                        />
                    ) : (
                        <View style={styles.heroPlaceholder}>
                            <MaterialIcons name="event" size={56} color={colors.borderAccent} />
                        </View>
                    )}
                    <LinearGradient
                        colors={[colors.overlayNone, colors.overlayDeep]}
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
                            <View style={styles.heroOrganizerRow}>
                                <TouchableOpacity onPress={handleOrganizerClick} style={styles.heroOrganizer}>
                                    <View
                                        style={[
                                            styles.organizerDot,
                                            { backgroundColor: selectedEvent.organizerColor || colors.white },
                                        ]}
                                    />
                                    <Text style={styles.heroOrganizerText} numberOfLines={1}>
                                        {selectedEvent.organizer?.name}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleOrganizerFollow}
                                    style={[
                                        styles.heroFollowButton,
                                        isOrganizerFollowed
                                            ? styles.heroFollowButtonActive
                                            : styles.heroFollowButtonInactive,
                                        !canFollowOrganizer && styles.heroFollowButtonDisabled,
                                    ]}
                                    activeOpacity={0.85}
                                    accessibilityRole="button"
                                    accessibilityLabel={
                                        isOrganizerFollowed ? 'Following organizer' : 'Follow organizer'
                                    }
                                    disabled={!canFollowOrganizer}
                                >
                                    <FAIcon
                                        name="heart"
                                        size={12}
                                        color={isOrganizerFollowed ? colors.white : colors.headerPurple}
                                        solid={isOrganizerFollowed}
                                        regular={!isOrganizerFollowed}
                                        style={styles.heroFollowIcon}
                                    />
                                    <Text
                                        style={[
                                            styles.heroFollowText,
                                            isOrganizerFollowed && styles.heroFollowTextActive,
                                        ]}
                                    >
                                        {isOrganizerFollowed ? 'Following' : 'Follow'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
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
                                color={colors.white}
                                style={styles.ticketIcon}
                            />
                        <Text style={styles.ticketText}>{ticketLabel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.calendarButton} onPress={handleToggleWishlist}>
                        <FAIcon
                            name="heart"
                            size={22}
                            color={colors.badgeAlert}
                            solid={isWishlisted}
                            regular={!isWishlisted}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                        <FAIcon name="share-square" size={18} color={colors.brandIndigo} />
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
                                        color={colors.brandPurpleDark}
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
                                    color={colors.brandPurpleDark}
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

const ATTENDEE_AVATAR_SIZE = 64;
const ATTENDEE_ITEM_WIDTH = 88;

const AttendeesSection = ({ eventId }: { eventId: number }) => {
    const { data: attendees = [] } = useFetchAttendees();

    const attendeesForEvent = useMemo(() => {
        const eventAttendees = attendees.find((entry) => entry.event_id === eventId)?.attendees || [];
        const seen = new Set<string>();
        return eventAttendees.filter((attendee) => {
            const attendeeId = attendee?.id;
            if (!attendeeId || seen.has(attendeeId)) return false;
            const name = attendee?.name?.trim();
            if (name === '0') return false;
            seen.add(attendeeId);
            return true;
        });
    }, [attendees, eventId]);

    if (attendeesForEvent.length === 0) return null;

    return (
        <View style={styles.attendeesSection}>
            <SectionCard title={`Attendees (${attendeesForEvent.length})`} icon="people">
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.attendeesScroll}
                >
                    {attendeesForEvent.map((attendee) => {
                        const displayName = attendee?.name?.trim() || 'Anonymous';
                        return (
                            <View key={attendee.id} style={styles.attendeeItem}>
                                <AvatarCircle userProfile={attendee} size={ATTENDEE_AVATAR_SIZE} />
                                <Text style={styles.attendeeName} numberOfLines={2}>
                                    {displayName}
                                </Text>
                            </View>
                        );
                    })}
                </ScrollView>
            </SectionCard>
        </View>
    );
};

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
                                        { backgroundColor: tone.background, borderColor: tone.border },
                                    ]}
                                >
                                    <Text style={[styles.tagText, { color: tone.text }]}>{theme}</Text>
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
                        {event.vetting_url && <Text style={{ color: colors.linkAccent, fontWeight: 'bold' }}>
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

const RecommendedEvents = ({ event }: { event: EventWithMetadata }) => {
    const navigation = useNavigation<NavStack>();
    const { allEvents } = useCalendarContext();
    const { authUserId, currentDeepLink } = useUserContext();
    const { data: follows } = useFetchFollows(authUserId);
    const { myCommunities } = useCommonContext();
    const [recommendationsLaneWidth, setRecommendationsLaneWidth] = useState(0);
    const { width: windowWidth } = useWindowDimensions();

    const organizerIdsFromCommunities = useMemo(() => {
        const organizerIds = myCommunities.allMyCommunities
            .map((community) => community.organizer_id)
            .filter(Boolean)
            .map((id) => id.toString());
        return Array.from(new Set(organizerIds));
    }, [myCommunities.allMyCommunities]);

    const followedOrganizerIds = useMemo(() => {
        const followIds = (follows?.organizer || []).map((id) => id.toString());
        return new Set([...followIds, ...organizerIdsFromCommunities]);
    }, [follows?.organizer, organizerIdsFromCommunities]);

    const recommendationCardWidth = useMemo(() => {
        const baseWidth =
            recommendationsLaneWidth > 0
                ? recommendationsLaneWidth
                : Math.max(0, windowWidth - spacing.lg * 2 - spacing.md * 2);
        return Math.round(baseWidth * 0.4);
    }, [recommendationsLaneWidth, windowWidth]);

    const recommendations = useMemo(() => {
        if (!allEvents || allEvents.length === 0) return [] as EventWithMetadata[];

        const currentEvent = allEvents.find((item) => item.id === event.id) || event;
        const currentOrganizerId = currentEvent.organizer?.id?.toString();
        const now = moment().tz(TZ).startOf('day');

        const isUpcomingEvent = (item: EventWithMetadata) => {
            const eventStart = moment.tz(item.start_date, TZ);
            if (!eventStart.isValid()) return false;
            return !eventStart.isBefore(now);
        };

        const eligibleEvents = allEvents.filter(
            (item) => item.id !== currentEvent.id && isUpcomingEvent(item)
        );

        const shuffle = <T,>(items: T[]) => {
            const shuffled = [...items];
            for (let i = shuffled.length - 1; i > 0; i -= 1) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        };

        const hasPromo = (item: EventWithMetadata) =>
            (item.promo_codes && item.promo_codes.length > 0) ||
            (item.organizer?.promo_codes && item.organizer.promo_codes.length > 0);

        const fromOrganizer = currentOrganizerId
            ? eligibleEvents.filter(
                (item) => item.organizer?.id?.toString() === currentOrganizerId
            )
            : [];

        const fromFollowed =
            followedOrganizerIds.size > 0
                ? eligibleEvents.filter((item) => {
                    const organizerId = item.organizer?.id?.toString();
                    return (
                        organizerId &&
                        organizerId !== currentOrganizerId &&
                        followedOrganizerIds.has(organizerId)
                    );
                })
                : [];

        const fromPromoOrganizers = eligibleEvents.filter(hasPromo);

        const usedIds = new Set<number>();
        const pickRandom = (items: EventWithMetadata[], count: number) => {
            const selection: EventWithMetadata[] = [];
            if (count <= 0) return selection;
            for (const item of shuffle(items)) {
                if (usedIds.has(item.id)) continue;
                usedIds.add(item.id);
                selection.push(item);
                if (selection.length === count) break;
            }
            return selection;
        };

        const picks: EventWithMetadata[] = [];
        picks.push(...pickRandom(fromOrganizer, ORGANIZER_RECOMMENDATION_COUNT));
        picks.push(...pickRandom(fromFollowed, FOLLOWED_RECOMMENDATION_COUNT));
        const remaining = RECOMMENDED_EVENTS_TOTAL - picks.length;
        if (remaining > 0) {
            picks.push(...pickRandom(fromPromoOrganizers, remaining));
        }

        const shuffled = shuffle(picks);
        if (currentOrganizerId) {
            const organizerIndex = shuffled.findIndex(
                (item) => item.organizer?.id?.toString() === currentOrganizerId
            );
            if (organizerIndex > 0) {
                const [organizerPick] = shuffled.splice(organizerIndex, 1);
                shuffled.unshift(organizerPick);
            }
        }
        return shuffled;
    }, [allEvents, event, followedOrganizerIds]);

    if (!allEvents || allEvents.length === 0) return null;

    return (
        <View style={styles.recommendationsHeaderWrap}>
            <View style={styles.recommendationsCard}>
                <View style={styles.recommendationsHeader}>
                    <Text style={styles.recommendationsTitle}>Recommended events</Text>
                </View>
                {recommendations.length === 0 ? (
                    <View style={styles.recommendationsEmpty}>
                        <Text style={styles.recommendationsEmptyText}>No recommended events yet.</Text>
                    </View>
                ) : (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.recommendationsScroll}
                        onLayout={(layoutEvent) => {
                            const nextWidth = Math.round(layoutEvent.nativeEvent.layout.width);
                            setRecommendationsLaneWidth((prev) => (prev === nextWidth ? prev : nextWidth));
                        }}
                    >
                        {recommendations.map((item, index) => {
                            const deepLinkPromo =
                                currentDeepLink?.type !== 'generic' &&
                                currentDeepLink?.featured_event?.id === item.id
                                    ? currentDeepLink.featured_promo_code
                                    : null;
                            const promoCandidates = [
                                ...(deepLinkPromo ? [deepLinkPromo] : []),
                                ...(item.promo_codes ?? []).filter((code) => code.scope === 'event'),
                                ...(item.organizer?.promo_codes ?? []).filter(
                                    (code) => code.scope === 'organizer'
                                ),
                            ];
                            const promoCodes: typeof promoCandidates = [];
                            const seenPromoCodes = new Set<string>();
                            for (const code of promoCandidates) {
                                const key = code.id || code.promo_code;
                                if (!key || seenPromoCodes.has(key)) continue;
                                seenPromoCodes.add(key);
                                promoCodes.push(code);
                                if (promoCodes.length === 2) break;
                            }
                            const promoLabels = promoCodes.map((promoCode) =>
                                promoCode.discount_type === 'percent'
                                    ? `${promoCode.discount}% off`
                                    : `$${promoCode.discount} off`
                            );
                            const imageUrl = getSafeImageUrl(item.image_url);

                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[
                                        styles.recommendationCard,
                                        {
                                            width: recommendationCardWidth,
                                            marginRight:
                                                index === recommendations.length - 1 ? 0 : spacing.sm,
                                        },
                                    ]}
                                    onPress={() =>
                                        navigation.push('Event Details', {
                                            selectedEvent: item,
                                            title: item.name,
                                        })
                                    }
                                    activeOpacity={0.9}
                                >
                                    <View style={styles.recommendationMedia}>
                                        {imageUrl ? (
                                            <Image
                                                source={{ uri: imageUrl }}
                                                style={styles.recommendationImage}
                                                contentFit="cover"
                                                cachePolicy="disk"
                                            />
                                        ) : (
                                            <View style={styles.recommendationPlaceholder}>
                                                <FAIcon name="calendar-day" size={16} color={colors.textMuted} />
                                            </View>
                                        )}
                                        {promoLabels.length > 0 && (
                                            <View style={styles.recommendationPromoBadgeStack}>
                                                {promoLabels.map((label, labelIndex) => (
                                                    <View
                                                        key={`${label}-${labelIndex}`}
                                                        style={[
                                                            styles.recommendationPromoBadge,
                                                            labelIndex > 0 &&
                                                                styles.recommendationPromoBadgeOffset,
                                                        ]}
                                                    >
                                                        <Text style={styles.recommendationPromoText}>
                                                            {label}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.recommendationBody}>
                                        <Text style={styles.recommendationTitle} numberOfLines={2}>
                                            {item.name}
                                        </Text>
                                        <Text style={styles.recommendationOrganizer} numberOfLines={1}>
                                            {item.organizer?.name || 'Organizer'}
                                        </Text>
                                        <Text style={styles.recommendationDate} numberOfLines={1}>
                                            {formatDate(item, true)}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                )}
            </View>
        </View>
    );
};

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
                            colors={[colors.brandIndigo, colors.accentPurple]}
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

                <AttendeesSection eventId={selectedEvent.id} />

                <RecommendedEvents event={selectedEvent} />

            </ScrollView>

        </>
    );
};

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
        backgroundColor: colors.lavenderBackground,
    },
    scrollContent: {
        paddingBottom: spacing.xxxl,
    },
    heroWrapper: {
        marginBottom: 0,
    },
    heroMedia: {
        height: 260,
        width: '100%',
        backgroundColor: colors.heroDark,
        borderBottomLeftRadius: radius.hero,
        borderBottomRightRadius: radius.hero,
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
        backgroundColor: colors.heroDarkMuted,
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
        left: spacing.lg,
        top: spacing.lg,
        backgroundColor: colors.gold,
        borderRadius: radius.smPlus,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xsPlus,
        shadowColor: colors.black,
        shadowOpacity: 0.2,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
        elevation: 2,
    },
    heroPromoText: {
        fontSize: fontSizes.smPlus,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    heroFooter: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.overlayDeep,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.smPlus,
        paddingBottom: spacing.xxl,
    },
    heroTitle: {
        fontSize: fontSizes.xxl,
        fontWeight: '700',
        color: colors.white,
        fontFamily: fontFamilies.display,
        marginBottom: spacing.sm,
    },
    heroOrganizer: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: colors.overlayHero,
        borderRadius: radius.pill,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.mdPlus,
        borderWidth: 1,
        borderColor: colors.borderOnDarkMedium,
        shadowColor: colors.black,
        shadowOpacity: 0.25,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    heroOrganizerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.xsPlus,
        marginBottom: spacing.smPlus,
    },
    organizerDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: spacing.smPlus,
        backgroundColor: colors.white,
    },
    heroOrganizerText: {
        fontSize: fontSizes.lg,
        fontWeight: '800',
        letterSpacing: 0.2,
        color: colors.white,
        fontFamily: fontFamilies.body,
    },
    heroFollowButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: radius.pill,
        paddingVertical: spacing.xsPlus,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
    },
    heroFollowButtonActive: {
        backgroundColor: colors.overlayHero,
        borderColor: colors.borderOnDarkMedium,
    },
    heroFollowButtonInactive: {
        backgroundColor: colors.white,
        borderColor: colors.white,
    },
    heroFollowButtonDisabled: {
        opacity: 0.6,
    },
    heroFollowIcon: {
        marginRight: spacing.xsPlus,
    },
    heroFollowText: {
        fontSize: fontSizes.smPlus,
        fontWeight: '700',
        color: colors.headerPurple,
        fontFamily: fontFamilies.body,
    },
    heroFollowTextActive: {
        color: colors.white,
    },
    headerSheet: {
        backgroundColor: colors.white,
        borderTopLeftRadius: radius.hero,
        borderTopRightRadius: radius.hero,
        marginTop: -18,
        paddingTop: spacing.lg,
        paddingBottom: spacing.lg,
        shadowColor: colors.black,
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: -2 },
        shadowRadius: 10,
        elevation: 3,
    },
    metaList: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        gap: spacing.xsPlus,
    },
    metaLine: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 2,
    },
    metaIconWrap: {
        width: 20,
        alignItems: 'center',
        marginRight: spacing.sm,
        marginTop: spacing.xxs,
    },
    metaText: {
        flex: 1,
        fontSize: fontSizes.base,
        fontWeight: '600',
        color: colors.brandInk,
        lineHeight: lineHeights.md,
        fontFamily: fontFamilies.body,
    },
    quickRowScroll: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.smPlus,
        paddingBottom: spacing.sm,
    },
    quickRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    quickPill: {
        backgroundColor: colors.surfaceSoft,
        borderRadius: radius.pill,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.smPlus,
        marginRight: spacing.xsPlus,
        borderWidth: 1,
        borderColor: colors.borderLavender,
        flexDirection: 'row',
        alignItems: 'center',
    },
    quickPillIcon: {
        marginRight: spacing.xsPlus,
    },
    quickPillText: {
        fontSize: fontSizes.sm,
        fontWeight: '600',
        color: colors.brandPurpleDark,
        fontFamily: fontFamilies.body,
    },
    ctaRow: {
        flexDirection: 'row',
        gap: spacing.smPlus,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xsPlus,
    },
    ticketButton: {
        flex: 1.2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.brandIndigo,
        paddingVertical: spacing.md,
        borderRadius: radius.hero,
    },
    ticketButtonDisabled: {
        backgroundColor: colors.brandMuted,
    },
    ticketIcon: {
        marginRight: spacing.xsPlus,
    },
    ticketText: {
        fontSize: fontSizes.lg,
        fontWeight: '700',
        color: colors.white,
        fontFamily: fontFamilies.body,
    },
    calendarButton: {
        width: 44,
        height: 44,
        borderRadius: radius.xxl,
        borderWidth: 1.5,
        borderColor: colors.badgeAlert,
        backgroundColor: colors.surfaceRose,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.black,
        shadowOpacity: 0.12,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    shareButton: {
        width: 44,
        height: 44,
        borderRadius: radius.xxl,
        borderWidth: 1,
        borderColor: colors.borderAccent,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabBarWrap: {
        paddingHorizontal: spacing.lg,
        marginTop: spacing.md,
    },
    tabBarGradient: {
        borderRadius: radius.hero,
        paddingVertical: spacing.xsPlus,
        paddingHorizontal: spacing.xs,
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xs,
        paddingBottom: spacing.xxl,
        backgroundColor: 'transparent',
    },
    bodyText: {
        fontSize: fontSizes.base,
        color: colors.textPrimary,
        lineHeight: lineHeights.md,
        fontFamily: fontFamilies.body,
    },
    mediaSection: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.xxl,
    },
    attendeesSection: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
    },
    attendeesScroll: {
        alignItems: 'flex-start',
        paddingRight: spacing.sm,
    },
    attendeeItem: {
        width: ATTENDEE_ITEM_WIDTH,
        alignItems: 'center',
        marginRight: spacing.md,
    },
    attendeeName: {
        marginTop: spacing.xsPlus,
        fontSize: fontSizes.smPlus,
        lineHeight: lineHeights.sm,
        color: colors.textPrimary,
        textAlign: 'center',
        fontFamily: fontFamilies.body,
    },
    vettedInfoText: {
        fontSize: fontSizes.base,
        color: colors.success,
        fontWeight: '500',
        fontFamily: fontFamilies.body,
    },
    infoCardText: {
        fontSize: fontSizes.base,
        color: colors.textPrimary,
        lineHeight: lineHeights.md,
        marginBottom: spacing.sm,
        fontFamily: fontFamilies.body,
    },
    infoCardButton: {
        backgroundColor: colors.brandIndigo,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.hero,
        alignSelf: 'flex-start',
        shadowColor: colors.black,
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 5,
        elevation: 2,
    },
    infoCardButtonText: {
        fontSize: fontSizes.base,
        fontWeight: '600',
        color: colors.white,
        fontFamily: fontFamilies.body,
    },
    tagPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: radius.pill,
        marginRight: spacing.sm,
        marginBottom: spacing.sm,
        borderWidth: 1,
    },
    tagWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingTop: spacing.xsPlus,
    },
    tagText: {
        fontSize: fontSizes.sm,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    tagMorePill: {
        backgroundColor: colors.surfaceSubtle,
        borderColor: colors.borderMuted,
    },
    tagMoreText: {
        color: colors.textSlate,
    },
    recommendationsHeaderWrap: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.xs,
    },
    recommendationsCard: {
        width: '100%',
        backgroundColor: colors.surfaceWhiteFrosted,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        padding: spacing.md,
        ...shadows.card,
    },
    recommendationsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    recommendationsTitle: {
        color: colors.textPrimary,
        fontSize: fontSizes.xxl,
        fontWeight: '700',
        fontFamily: fontFamilies.display,
    },
    recommendationsScroll: {
        paddingBottom: spacing.xs,
    },
    recommendationsEmpty: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        backgroundColor: colors.surfaceMutedLight,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderMutedLight,
        marginBottom: spacing.sm,
    },
    recommendationsEmptyText: {
        color: colors.textMuted,
        fontSize: fontSizes.smPlus,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    recommendationCard: {
        flexGrow: 0,
        backgroundColor: colors.white,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        overflow: 'hidden',
    },
    recommendationMedia: {
        width: '100%',
        height: 92,
    },
    recommendationImage: {
        width: '100%',
        height: '100%',
    },
    recommendationPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    recommendationPromoBadgeStack: {
        position: 'absolute',
        top: 0,
        left: 0,
        alignItems: 'flex-start',
    },
    recommendationPromoBadge: {
        backgroundColor: 'rgba(255, 215, 0, 0.9)',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderTopLeftRadius: radius.md,
        borderBottomRightRadius: radius.md,
    },
    recommendationPromoBadgeOffset: {
        marginTop: spacing.xs,
    },
    recommendationPromoText: {
        color: colors.black,
        fontSize: fontSizes.smPlus,
        fontWeight: '700',
        fontFamily: fontFamilies.body,
    },
    recommendationBody: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.smPlus,
    },
    recommendationTitle: {
        color: colors.textPrimary,
        fontSize: fontSizes.basePlus,
        fontWeight: '700',
        fontFamily: fontFamilies.body,
    },
    recommendationOrganizer: {
        color: colors.textMuted,
        fontSize: fontSizes.smPlus,
        fontFamily: fontFamilies.body,
        marginTop: spacing.xs,
    },
    recommendationDate: {
        color: colors.textSlate,
        fontSize: fontSizes.sm,
        fontFamily: fontFamilies.body,
        marginTop: spacing.xs,
    },
});

const markdownStyles = {
    heading1: {
        marginTop: spacing.xl,
    },
    heading2: {
        marginTop: spacing.xl,
    },
    bullet_list: {
        marginTop: spacing.sm,
    },
    list_item: {
        marginBottom: spacing.md,
    },
    paragraph: {
        marginBottom: spacing.md,
    },
};


export default EventDetails;
