import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
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
import Markdown from '../../../components/Markdown';
import { WebView } from 'react-native-webview';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import moment from 'moment-timezone';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDate } from '../hooks/calendarUtils';
import { logEvent } from '../../../Common/hooks/logger';
import { EventWithMetadata, NavStack } from '../../../Common/Nav/NavStackType';
import { useUserContext } from '../../Auth/hooks/UserContext';
import { UE } from '../../../userEventTypes';
import { getBestPromoCode } from '../../../utils/getBestPromoCode';
import { useFetchEvents } from '../../../Common/db-axios/useEvents';
import { useFetchAttendees } from '../../../Common/db-axios/useAttendees';
import { useCreateBuddy, useDeleteBuddy, useFetchBuddies, useFetchBuddyWishlists } from '../../../Common/db-axios/useBuddies';
import { useFetchFollows } from '../../../Common/db-axios/useFollows';
import { useCommonContext } from '../../../Common/hooks/CommonContext';
import { useJoinCommunity, useLeaveCommunity } from '../../../Common/hooks/useCommunities';
import PromoCodeSection from './PromoCodeSection';
import { useCalendarData } from '../hooks/useCalendarData';
import TabBar from '../../../components/TabBar';
import { MediaCarousel } from '../../../components/MediaCarousel';
import { AvatarCircle } from '../../Auth/Buttons/AvatarCircle';
import { useAnalyticsProps, useEventAnalyticsProps } from '../../../Common/hooks/useAnalytics';
import { getSafeImageUrl } from '../../../Common/hooks/imageUtils';
import { calendarTagTones, colors, fontFamilies, fontSizes, lineHeights, radius, shadows, spacing } from '../../../components/styles';
import { EventListBackground } from '../../../components/EventListBackground';
import { ACTIVE_EVENT_TYPES, type Attendee, type EventAttendees } from '../../../Common/types/commonTypes';
import SectionCard from './SectionCard';
import { TZ } from '../ListView/calendarNavUtils';
import { buildTicketUrl } from '../hooks/ticketUrlUtils';
import { WishlistPlusButton } from '../ListView/WishlistPlusButton';
import { navigateToTab } from '../../../Common/Nav/navigationHelpers';
import { useGuestSaveModal } from '../../GuestSaveModal';
import {
    clearForcedPopupId,
    getForcedPopupId,
    getPopupReadyAt,
    loadPopupManagerState,
    normalizePopupManagerState,
    savePopupManagerState,
    type PopupId,
} from '../../popupSchedule';
import { ShareCalendarModal } from '../../ShareCalendarModal';

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
const RECOMMENDED_EVENTS_TOTAL = 10;
const ORGANIZER_RECOMMENDATION_COUNT = 4;
const FOLLOWED_RECOMMENDATION_COUNT = 6;
const RECOMMENDATION_WINDOW_START_DAYS = 2;
const RECOMMENDATION_WINDOW_END_DAYS = 10;
const SECONDARY_ACTION_SIZE = 40;
const SECONDARY_ACTION_HEIGHT = Math.max(28, Math.round(SECONDARY_ACTION_SIZE * 0.86));
const SECONDARY_ACTION_ICON_SIZE = Math.round(SECONDARY_ACTION_HEIGHT * 0.5);
const SECONDARY_ACTION_PADDING_X = Math.round(SECONDARY_ACTION_HEIGHT * 0.18);
const SECONDARY_ACTION_ICON_ONLY_MIN_WIDTH = Math.round(
    SECONDARY_ACTION_PADDING_X * 2 + SECONDARY_ACTION_ICON_SIZE
);
const BUDDY_LIST_COACH_ID: PopupId = 'buddy_list_coach';
const BUDDY_LIST_COACH_MESSAGE =
    'Scroll down to follow your buddies by tapping their profile photos.\nYou can also find them in More > Buddy Lists.';

const EventHeader = ({ selectedEvent, source }: { selectedEvent: EventWithMetadata; source?: string }) => {
    const { currentDeepLink, authUserId } = useUserContext();
    const { toggleWishlistEvent, isOnWishlist, wishlistEvents } = useCalendarData();
    const { data: allEvents } = useFetchEvents()
    const navigation = useNavigation<NavStack>();
    const { myCommunities, communities } = useCommonContext();
    const joinCommunity = useJoinCommunity();
    const leaveCommunity = useLeaveCommunity();
    const analyticsProps = useAnalyticsProps();

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
    const organizerFollowCount =
        myCommunities.myOrganizerPublicCommunities.length +
        myCommunities.myOrganizerPrivateCommunities.length;
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
        play_party: 'compact-disc',
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
            showGuestSaveModal({
                title: 'Create an account to save events',
                message: 'Save events to your calendar and keep your picks in sync.',
                iconName: 'heart',
            });
            return;
        }

        if (!eventAnalyticsProps.event_id) {
            console.error('Event ID is missing');
            return;
        }

        if (!isWishlisted && wishlistEvents.length === 0) {
            logEvent(UE.WishlistFirstAdded, eventAnalyticsProps);
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
            showGuestSaveModal({
                title: 'Create an account to follow organizers',
                message: 'Follow organizers and get new event updates.',
                iconName: 'user-plus',
            });
            return;
        }
        if (isOrganizerFollowed) {
            organizerCommunityIds.forEach((communityId) => {
                if (!myCommunityIds.has(communityId)) return;
                leaveCommunity.mutate({ community_id: communityId });
            });
            return;
        }
        const followSource = source ?? 'event_detail';
        const organizerCommunityId = organizerCommunityIds[0];
        logEvent(UE.OrganizerFollowPressed, {
            ...analyticsProps,
            organizer_id: organizerId,
            community_id: organizerCommunityId,
            source: followSource,
        });
        if (organizerFollowCount === 0) {
            logEvent(UE.OrganizerFirstFollowed, {
                ...analyticsProps,
                organizer_id: organizerId,
                community_id: organizerCommunityId,
                source: followSource,
            });
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
                    <WishlistPlusButton
                        itemIsOnWishlist={isWishlisted}
                        handleToggleEventWishlist={handleToggleWishlist}
                        size={SECONDARY_ACTION_SIZE}
                        variant="subtle"
                    />
                    <TouchableOpacity
                        style={[
                            styles.secondaryActionButton,
                            {
                                height: SECONDARY_ACTION_HEIGHT,
                                borderRadius: SECONDARY_ACTION_HEIGHT / 2,
                                paddingHorizontal: SECONDARY_ACTION_PADDING_X,
                                minWidth: SECONDARY_ACTION_ICON_ONLY_MIN_WIDTH,
                            },
                        ]}
                        onPress={handleShare}
                    >
                        <FAIcon
                            name="share-square"
                            size={SECONDARY_ACTION_ICON_SIZE}
                            color={colors.brandIndigo}
                        />
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

const filterEventAttendees = (entries: EventAttendees[], eventId?: number | null): Attendee[] => {
    if (eventId == null) return [];
    const eventAttendees = entries.find((entry) => entry.event_id === eventId)?.attendees || [];
    const seen = new Set<string>();
    return eventAttendees.filter((attendee) => {
        const attendeeId = attendee?.id;
        if (!attendeeId || seen.has(attendeeId)) return false;
        const name = attendee?.name?.trim();
        if (name === '0') return false;
        seen.add(attendeeId);
        return true;
    });
};

const AttendeesSection = ({ eventId, attendees }: { eventId: number; attendees: Attendee[] }) => {
    const navigation = useNavigation<NavStack>();
    const { authUserId } = useUserContext();
    const { showGuestSaveModal } = useGuestSaveModal();
    const analyticsProps = useAnalyticsProps();
    const { data: buddies = [] } = useFetchBuddies(authUserId);
    const { data: buddyWishlists = [] } = useFetchBuddyWishlists(authUserId);
    const { mutateAsync: createBuddy, isPending: isAddingBuddy } = useCreateBuddy(authUserId);
    const { mutateAsync: deleteBuddy, isPending: isRemovingBuddy } = useDeleteBuddy(authUserId);
    const [pendingBuddyId, setPendingBuddyId] = useState<string | null>(null);

    const attendeesForEvent = attendees;

    const buddyIdSet = useMemo(() => {
        const ids = new Set<string>();
        for (const buddy of buddies) {
            if (buddy.user_id) ids.add(buddy.user_id);
        }
        return ids;
    }, [buddies]);

    const shareableBuddyIds = useMemo(() => {
        const ids = new Set<string>();
        for (const buddy of buddyWishlists) {
            if (buddy.user_id) ids.add(buddy.user_id);
        }
        return ids;
    }, [buddyWishlists]);

    const handleBuddyPress = (buddyId: string, displayName: string) => {
        if (!buddyId) return;
        if (buddyId === authUserId) {
            navigateToTab(navigation, 'My Calendar');
            return;
        }
        navigation.navigate('Buddy Events', { buddyId, buddyName: displayName });
    };

    const handleAddBuddy = async (buddyId: string, displayName: string) => {
        if (!authUserId) {
            showGuestSaveModal({
                title: 'Create an account to add buddies',
                message: 'Add buddies to share calendars and plan nights out.',
                iconName: 'user-friends',
            });
            return;
        }
        if (!buddyId || buddyId === authUserId || buddyIdSet.has(buddyId)) return;

        try {
            setPendingBuddyId(buddyId);
            logEvent(UE.BuddyAddPressed, {
                ...analyticsProps,
                buddy_user_id: buddyId,
                source: 'attendees',
                event_id: eventId,
            });
            await createBuddy({ buddyUserId: buddyId });
            logEvent(UE.BuddyAddSucceeded, {
                ...analyticsProps,
                buddy_user_id: buddyId,
                source: 'attendees',
                event_id: eventId,
            });
        } catch (error) {
            console.error('Failed to add buddy', error);
            logEvent(UE.BuddyAddFailed, {
                ...analyticsProps,
                buddy_user_id: buddyId,
                source: 'attendees',
                event_id: eventId,
            });
            Alert.alert('Could not add buddy', `Try again later for ${displayName}.`);
        } finally {
            setPendingBuddyId(null);
        }
    };

    const handleRemoveBuddy = async (buddyId: string, displayName: string) => {
        if (!authUserId) {
            showGuestSaveModal({
                title: 'Create an account to manage buddies',
                message: 'Manage buddies and shared plans with an account.',
                iconName: 'user-friends',
            });
            return;
        }
        if (!buddyId || buddyId === authUserId) return;

        try {
            setPendingBuddyId(buddyId);
            await deleteBuddy(buddyId);
        } catch (error) {
            console.error('Failed to remove buddy', error);
            Alert.alert('Could not remove buddy', `Try again later for ${displayName}.`);
        } finally {
            setPendingBuddyId(null);
        }
    };

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
                        const isSelf = attendee.id === authUserId;
                        const isBuddy = buddyIdSet.has(attendee.id);
                        const isPending = pendingBuddyId === attendee.id;
                        const canToggleBuddy = !!authUserId && !isSelf;
                        return (
                            <View key={attendee.id} style={styles.attendeeItem}>
                                <TouchableOpacity
                                    style={styles.attendeeProfileButton}
                                    onPress={() => handleBuddyPress(attendee.id, displayName)}
                                    activeOpacity={0.85}
                                >
                                    <AvatarCircle userProfile={attendee} size={ATTENDEE_AVATAR_SIZE} />
                                    <Text style={styles.attendeeName} numberOfLines={2}>
                                        {displayName}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.buddyHeartButton,
                                        isBuddy && styles.buddyHeartButtonActive,
                                        (!canToggleBuddy || isPending || isAddingBuddy || isRemovingBuddy) &&
                                            styles.buddyHeartButtonDisabled,
                                    ]}
                                    onPress={() => {
                                        if (isBuddy) {
                                            Alert.alert(
                                                `Remove ${displayName}?`,
                                                'They will no longer appear in your buddy list.',
                                                [
                                                    { text: 'Cancel', style: 'cancel' },
                                                    {
                                                        text: 'Remove',
                                                        style: 'destructive',
                                                        onPress: () => handleRemoveBuddy(attendee.id, displayName),
                                                    },
                                                ]
                                            );
                                            return;
                                        }
                                        handleAddBuddy(attendee.id, displayName);
                                    }}
                                    disabled={!canToggleBuddy || isPending || isAddingBuddy || isRemovingBuddy}
                                    accessibilityLabel={
                                        isBuddy
                                            ? `Remove ${displayName} from buddies`
                                            : `Add ${displayName} as a buddy`
                                    }
                                >
                                    <MaterialIcons
                                        name={isBuddy ? 'favorite' : 'favorite-border'}
                                        size={16}
                                        color={isBuddy ? colors.white : colors.danger}
                                    />
                                </TouchableOpacity>
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
                        🔗 Imported from FetLife with the organizer's permission. Requires FetLife account. Contact{' '}
                        <Text
                            style={{ color: colors.linkAccent, fontWeight: 'bold' }}
                            onPress={() => Linking.openURL('mailto:support@playbuddy.me')}
                        >
                            support@playbuddy.me
                        </Text>{' '}
                        for questions and concerns.
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
    const { allEvents } = useCalendarData();
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
    const getPromoCodesForEvent = (item: EventWithMetadata) => {
        const deepLinkPromo =
            currentDeepLink?.type !== 'generic' && currentDeepLink?.featured_event?.id === item.id
                ? currentDeepLink.featured_promo_code
                : null;
        const promoCandidates = [
            ...(deepLinkPromo ? [deepLinkPromo] : []),
            ...(item.promo_codes ?? []).filter((code) => code.scope === 'event'),
            ...(item.organizer?.promo_codes ?? []).filter((code) => code.scope === 'organizer'),
        ];
        const promoCodes: typeof promoCandidates = [];
        const seenPromoCodes = new Set<string>();
        for (const code of promoCandidates) {
            if (!code) continue;
            const key = code.id || code.promo_code;
            if (!key || seenPromoCodes.has(key)) continue;
            seenPromoCodes.add(key);
            promoCodes.push(code);
            if (promoCodes.length === 2) break;
        }
        return promoCodes;
    };

    const recommendations = useMemo(() => {
        if (!allEvents || allEvents.length === 0) return [] as EventWithMetadata[];

        const currentEvent = allEvents.find((item) => item.id === event.id) || event;
        const currentOrganizerId = currentEvent.organizer?.id?.toString();
        const now = moment().tz(TZ).startOf('day');
        const windowStart = moment(now).add(RECOMMENDATION_WINDOW_START_DAYS, 'days').startOf('day');
        const windowEnd = moment(now).add(RECOMMENDATION_WINDOW_END_DAYS, 'days').endOf('day');

        const isWithinRecommendationWindow = (item: EventWithMetadata) => {
            const eventStart = moment.tz(item.start_date, TZ);
            if (!eventStart.isValid()) return false;
            return eventStart.isBetween(windowStart, windowEnd, undefined, '[]');
        };

        const eligibleEvents = allEvents.filter(
            (item) => item.id !== currentEvent.id && isWithinRecommendationWindow(item)
        );

        const shuffle = <T,>(items: T[]) => {
            const shuffled = [...items];
            for (let i = shuffled.length - 1; i > 0; i -= 1) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        };

        const hasPromo = (item: EventWithMetadata) => getPromoCodesForEvent(item).length > 0;

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

        const ensurePromoSlots = (items: EventWithMetadata[]) => {
            const desiredPromoCount = Math.min(2, fromPromoOrganizers.length);
            if (desiredPromoCount === 0) return items;

            const currentPromoCount = items.filter(hasPromo).length;
            if (currentPromoCount >= desiredPromoCount) return items;

            const needed = desiredPromoCount - currentPromoCount;
            const pickedIds = new Set(items.map((item) => item.id));
            const promoAdds = shuffle(fromPromoOrganizers.filter((item) => !pickedIds.has(item.id))).slice(0, needed);
            if (promoAdds.length === 0) return items;

            const nextItems = [...items];
            const availableSlots = RECOMMENDED_EVENTS_TOTAL - nextItems.length;
            let promoAddsToUse = promoAdds;

            if (availableSlots < promoAdds.length) {
                let toRemove = promoAdds.length - availableSlots;
                for (let i = nextItems.length - 1; i >= 0 && toRemove > 0; i -= 1) {
                    if (!hasPromo(nextItems[i])) {
                        nextItems.splice(i, 1);
                        toRemove -= 1;
                    }
                }
                const maxAdds = Math.max(0, promoAdds.length - toRemove);
                promoAddsToUse = promoAdds.slice(0, maxAdds);
            }

            return [...nextItems, ...promoAddsToUse];
        };

        const shuffled = shuffle(ensurePromoSlots(picks));
        const promoPicks = shuffled.filter(hasPromo);
        const nonPromoPicks = shuffled.filter((item) => !hasPromo(item));
        const ordered = [...promoPicks, ...nonPromoPicks];

        if (currentOrganizerId) {
            const organizerIndex = ordered.findIndex(
                (item) => item.organizer?.id?.toString() === currentOrganizerId
            );
            if (organizerIndex > -1) {
                const organizerPick = ordered[organizerIndex];
                const organizerIsPromo = hasPromo(organizerPick);
                const targetIndex = organizerIsPromo ? 0 : promoPicks.length;
                if (organizerIndex !== targetIndex) {
                    ordered.splice(organizerIndex, 1);
                    ordered.splice(targetIndex, 0, organizerPick);
                }
            }
        }

        return ordered;
    }, [allEvents, currentDeepLink, event, followedOrganizerIds]);

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
                            const promoCodes = getPromoCodesForEvent(item);
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
                                            source: "event_recommendation",
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

    const { selectedEvent, source }: { selectedEvent: EventWithMetadata; source?: string } = route.params || {};
    const { currentDeepLink, authUserId, userProfile } = useUserContext();
    const { showGuestSaveModal } = useGuestSaveModal();
    const { data: attendees = [] } = useFetchAttendees();
    const analyticsProps = useAnalyticsProps();
    const promoCode = getBestPromoCode(selectedEvent, currentDeepLink);
    const [activeTab, setActiveTab] = useState<string>('details');
    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();
    const [buddyCoachVisible, setBuddyCoachVisible] = useState(false);
    const [shareCalendarVisible, setShareCalendarVisible] = useState(false);
    const buddyCoachAnim = useRef(new Animated.Value(0)).current;
    const buddyCoachArrowAnim = useRef(new Animated.Value(0)).current;
    const buddyCoachArrowLoopRef = useRef<Animated.CompositeAnimation | null>(null);
    const buddyCoachDismissedRef = useRef(false);
    const selectedEventId = selectedEvent?.id;
    const scrollViewRef = useRef<ScrollView>(null);
    const attendeesForEvent = useMemo(
        () => filterEventAttendees(attendees, selectedEventId),
        [attendees, selectedEventId],
    );
    const hasOtherAttendees = useMemo(() => {
        if (!authUserId) return attendeesForEvent.length > 0;
        return attendeesForEvent.some((attendee) => attendee?.id && attendee.id !== authUserId);
    }, [attendeesForEvent, authUserId]);

    const eventAnalyticsProps = useEventAnalyticsProps(selectedEvent);

    const handleCopyPromoCode = () => {
        if (!promoCode) return;
        logEvent(UE.EventDetailPromoCodeCopied, eventAnalyticsProps);
    };

    const hasMedia = (selectedEvent.media?.length || 0) > 1;

    useEffect(() => {
        if (!isFocused || buddyCoachVisible || !selectedEventId || !hasOtherAttendees) return;
        let isActive = true;

        (async () => {
            const [popupState, forcedId] = await Promise.all([
                loadPopupManagerState(),
                getForcedPopupId(),
            ]);
            if (!isActive) return;
            const isForced = forcedId === BUDDY_LIST_COACH_ID;
            if (!isForced && !authUserId) return;
            if (popupState.popups[BUDDY_LIST_COACH_ID]?.dismissed && !isForced) return;
            const now = Date.now();
            if (!isForced && now < getPopupReadyAt(popupState, now, BUDDY_LIST_COACH_ID)) return;

            setBuddyCoachVisible(true);
            logEvent(UE.BuddyListCoachShown, {
                ...analyticsProps,
                event_id: selectedEventId ?? null,
            });
            const shownAt = now;
            const nextState = normalizePopupManagerState({
                ...popupState,
                lastPopupShownAt: Math.max(popupState.lastPopupShownAt ?? 0, shownAt),
                popups: {
                    ...popupState.popups,
                    [BUDDY_LIST_COACH_ID]: {
                        ...popupState.popups[BUDDY_LIST_COACH_ID],
                        dismissed: true,
                        snoozeUntil: undefined,
                        lastShownAt: shownAt,
                    },
                },
            });
            await savePopupManagerState(nextState);
            if (isForced) {
                await clearForcedPopupId();
            }
        })();

        return () => {
            isActive = false;
        };
    }, [authUserId, buddyCoachVisible, hasOtherAttendees, isFocused, selectedEventId]);

    useEffect(() => {
        if (buddyCoachVisible) {
            buddyCoachAnim.setValue(0);
            Animated.spring(buddyCoachAnim, {
                toValue: 1,
                friction: 7,
                tension: 120,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(buddyCoachAnim, {
                toValue: 0,
                duration: 180,
                useNativeDriver: true,
            }).start();
        }
    }, [buddyCoachVisible, buddyCoachAnim]);

    useEffect(() => {
        if (buddyCoachVisible) {
            if (buddyCoachArrowLoopRef.current) {
                buddyCoachArrowLoopRef.current.stop();
            }
            buddyCoachArrowAnim.setValue(0);
            const loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(buddyCoachArrowAnim, {
                        toValue: 1,
                        duration: 520,
                        useNativeDriver: true,
                    }),
                    Animated.timing(buddyCoachArrowAnim, {
                        toValue: 0,
                        duration: 520,
                        useNativeDriver: true,
                    }),
                ])
            );
            buddyCoachArrowLoopRef.current = loop;
            loop.start();
        } else if (buddyCoachArrowLoopRef.current) {
            buddyCoachArrowLoopRef.current.stop();
            buddyCoachArrowLoopRef.current = null;
        }
        return () => {
            if (buddyCoachArrowLoopRef.current) {
                buddyCoachArrowLoopRef.current.stop();
                buddyCoachArrowLoopRef.current = null;
            }
        };
    }, [buddyCoachVisible, buddyCoachArrowAnim]);

    const buddyCoachTranslateY = buddyCoachAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-10, 0],
    });
    const buddyCoachScale = buddyCoachAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.96, 1],
    });
    const buddyCoachArrowTranslateY = buddyCoachArrowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 8],
    });
    const buddyCoachTop = Math.max(insets.top + spacing.lg, spacing.xl);
    const canShareCalendar = userProfile?.share_calendar !== true;
    const markBuddyCoachDismissed = async () => {
        if (buddyCoachDismissedRef.current) return;
        buddyCoachDismissedRef.current = true;
        logEvent(UE.BuddyListCoachDismissed, {
            ...analyticsProps,
            event_id: selectedEventId ?? null,
        });
        const popupState = await loadPopupManagerState();
        if (popupState.popups[BUDDY_LIST_COACH_ID]?.dismissed) return;
        const now = Date.now();
        const nextState = normalizePopupManagerState({
            ...popupState,
            lastPopupShownAt: Math.max(popupState.lastPopupShownAt ?? 0, now),
            popups: {
                ...popupState.popups,
                [BUDDY_LIST_COACH_ID]: {
                    ...popupState.popups[BUDDY_LIST_COACH_ID],
                    dismissed: true,
                    snoozeUntil: undefined,
                    lastShownAt: popupState.popups[BUDDY_LIST_COACH_ID]?.lastShownAt ?? now,
                },
            },
        });
        await savePopupManagerState(nextState);
    };

    const handleBuddyCoachDismiss = () => {
        void markBuddyCoachDismissed();
        setBuddyCoachVisible(false);
    };
    const handleBuddyCoachScroll = () => {
        void markBuddyCoachDismissed();
        scrollViewRef.current?.scrollToEnd({ animated: true });
        setBuddyCoachVisible(false);
    };
    const handleBuddyCoachShare = () => {
        logEvent(UE.BuddyListCoachSharePressed, {
            ...analyticsProps,
            event_id: selectedEventId ?? null,
        });
        setShareCalendarVisible(true);
    };

    useEffect(() => {
        if (isFocused || !buddyCoachVisible) return;
        void markBuddyCoachDismissed();
        setBuddyCoachVisible(false);
    }, [buddyCoachVisible, isFocused, analyticsProps, selectedEventId]);

    // If no event is provided, render nothing.
    if (!selectedEvent || !eventAnalyticsProps.event_id) return null;

    const enabledTabs = [
        { name: 'Details', value: 'details' },
        ...(hasMedia ? [{ name: 'Media', value: 'media' }] : []),
    ]

    return (
        <View style={styles.screen}>
            <EventListBackground />
            <ScrollView ref={scrollViewRef} style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

                <EventHeader selectedEvent={selectedEvent} source={source} />

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

                <AttendeesSection eventId={selectedEvent.id} attendees={attendeesForEvent} />

                <RecommendedEvents event={selectedEvent} />

            </ScrollView>
            <Animated.View
                pointerEvents="none"
                style={[styles.buddyCoachScrim, { opacity: buddyCoachAnim }]}
            />
            <View
                pointerEvents={buddyCoachVisible ? 'box-none' : 'none'}
                accessibilityElementsHidden={!buddyCoachVisible}
                importantForAccessibility={buddyCoachVisible ? 'yes' : 'no-hide-descendants'}
                style={[styles.buddyCoachBackdrop, { top: buddyCoachTop }]}
            >
                <Animated.View
                    style={[
                        styles.buddyCoachCard,
                        {
                            opacity: buddyCoachAnim,
                            transform: [{ translateY: buddyCoachTranslateY }, { scale: buddyCoachScale }],
                        },
                    ]}
                >
                    <View style={styles.buddyCoachHeader}>
                        <View style={styles.buddyCoachIcon}>
                            <FAIcon name="user-friends" size={14} color={colors.brandPurpleDark} />
                        </View>
                        <Text style={styles.buddyCoachTitle}>Buddy tip</Text>
                        <TouchableOpacity
                            style={styles.buddyCoachClose}
                            onPress={handleBuddyCoachDismiss}
                            accessibilityLabel="Close buddy coach"
                        >
                            <MaterialIcons name="close" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.buddyCoachText}>{BUDDY_LIST_COACH_MESSAGE}</Text>
                    {canShareCalendar && (
                        <TouchableOpacity
                            style={styles.buddyCoachShareButton}
                            onPress={handleBuddyCoachShare}
                            activeOpacity={0.85}
                        >
                            <FAIcon name="share-alt" size={14} color={colors.white} />
                            <Text style={styles.buddyCoachShareText}>Share my calendar</Text>
                        </TouchableOpacity>
                    )}
                </Animated.View>
                <TouchableOpacity
                    onPress={handleBuddyCoachScroll}
                    activeOpacity={0.8}
                >
                    <Animated.View
                        style={[
                            styles.buddyCoachArrowWrap,
                            {
                                opacity: buddyCoachAnim,
                                transform: [{ translateY: buddyCoachArrowTranslateY }],
                            },
                        ]}
                    >
                        <MaterialIcons name="keyboard-arrow-down" size={30} color={colors.brandPurpleDark} />
                    </Animated.View>
                </TouchableOpacity>
            </View>
            <ShareCalendarModal
                visible={shareCalendarVisible}
                onDismiss={() => setShareCalendarVisible(false)}
                onSnooze={() => setShareCalendarVisible(false)}
                source="buddy_list"
            />

        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    scrollContent: {
        paddingBottom: spacing.xxxl,
    },
    buddyCoachBackdrop: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        zIndex: 30,
    },
    buddyCoachScrim: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        zIndex: 25,
    },
    buddyCoachCard: {
        maxWidth: 420,
        width: '100%',
        backgroundColor: colors.surfaceInfo,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.accentBlueBorder,
        paddingHorizontal: spacing.lgPlus,
        paddingVertical: spacing.mdPlus,
        ...shadows.card,
        shadowOpacity: 0.16,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 14,
        elevation: 8,
    },
    buddyCoachHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
        gap: spacing.sm,
    },
    buddyCoachIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.surfaceInfoStrong,
        borderWidth: 1,
        borderColor: colors.accentBlueBorder,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buddyCoachTitle: {
        fontSize: fontSizes.basePlus,
        fontWeight: '700',
        color: colors.brandPurpleDark,
        fontFamily: fontFamilies.body,
    },
    buddyCoachClose: {
        marginLeft: 'auto',
        padding: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceWhiteFrosted,
        borderWidth: 1,
        borderColor: colors.borderMutedLight,
    },
    buddyCoachText: {
        color: colors.textPrimary,
        fontSize: fontSizes.basePlus,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
        lineHeight: lineHeights.lg,
        letterSpacing: 0.2,
    },
    buddyCoachShareButton: {
        marginTop: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        alignSelf: 'center',
        paddingHorizontal: spacing.mdPlus,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: colors.brandPurple,
    },
    buddyCoachShareText: {
        color: colors.white,
        fontSize: fontSizes.basePlus,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    buddyCoachArrowWrap: {
        marginTop: spacing.sm,
        width: 34,
        height: 34,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceInfoStrong,
        borderWidth: 1,
        borderColor: colors.accentBlueBorder,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.card,
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 10,
        elevation: 6,
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
        backgroundColor: colors.surfaceGlassStrong,
        borderRadius: radius.pill,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.mdPlus,
        borderWidth: 1,
        borderColor: colors.borderOnDarkSoft,
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
        backgroundColor: colors.surfaceGlassStrong,
        borderColor: colors.borderOnDarkSoft,
    },
    heroFollowButtonInactive: {
        backgroundColor: colors.surfaceGlass,
        borderColor: colors.borderOnDarkSoft,
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
        alignItems: 'center',
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
        minHeight: 50,
        borderRadius: radius.hero,
        shadowColor: colors.black,
        shadowOpacity: 0.24,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 5,
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
    secondaryActionButton: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.borderMutedLight,
        backgroundColor: colors.surfaceWhiteFrosted,
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
    attendeeProfileButton: {
        alignItems: 'center',
    },
    attendeeName: {
        marginTop: spacing.xsPlus,
        fontSize: fontSizes.smPlus,
        lineHeight: lineHeights.sm,
        color: colors.textPrimary,
        textAlign: 'center',
        fontFamily: fontFamilies.body,
    },
    buddyHeartButton: {
        marginTop: spacing.xsPlus,
        padding: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceRoseSoft,
        borderWidth: 1,
        borderColor: colors.borderRose,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buddyHeartButtonActive: {
        backgroundColor: colors.danger,
        borderColor: colors.danger,
    },
    buddyHeartButtonDisabled: {
        opacity: 0.4,
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
