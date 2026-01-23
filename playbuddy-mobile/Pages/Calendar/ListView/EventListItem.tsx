import React, { useState } from 'react';
import { Alert, Pressable, Share, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import FA5Icon from 'react-native-vector-icons/FontAwesome5';

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Attendee, Event } from '../../../commonTypes';
import { UE } from '../../../Common/types/userEventTypes';
import { EventWithMetadata } from '../../../Common/Nav/NavStackType';
import { useCalendarContext } from '../hooks/CalendarContext';
import { useUserContext } from '../../Auth/hooks/UserContext';
import { formatDate } from '../hooks/calendarUtils';
import { getSafeImageUrl, getSmallAvatarUrl } from '../../../Common/hooks/imageUtils';
import { logEvent } from '../../../Common/hooks/logger';
import { getEventPromoCodes } from '../../Auth/usePromoCode';
import { calendarTypeChips, colors, eventImageFallbackGradients, fontFamilies, fontSizes, radius, shadows, spacing } from '../../../components/styles';
import { ACTIVE_EVENT_TYPES, FALLBACK_EVENT_TYPE } from '../../../Common/types/commonTypes';
import { ADMIN_EMAILS } from '../../../config';
import { AttendeeCarousel } from '../common/AttendeeCarousel';
import { useEventAnalyticsProps } from '../../../Common/hooks/useAnalytics';
import { WishlistPlusButton, getWishlistButtonWidth } from './WishlistPlusButton';
import type { EventListViewMode } from './eventListViewMode';
import { ActionSheet } from '../../../components/ActionSheet';
import { buildTicketUrl } from '../hooks/ticketUrlUtils';
import { useCalendarCoach } from '../../PopupManager';
import { useGuestSaveModal } from '../../GuestSaveModal';

const DETAILS_PANEL_HEIGHT = 100;
const CARD_IMAGE_ASPECT_RATIO = 2;
const DEFAULT_CARD_WIDTH = Math.max(0, Dimensions.get('window').width - spacing.lg * 2);
const DEFAULT_IMAGE_HEIGHT = Math.round(DEFAULT_CARD_WIDTH / CARD_IMAGE_ASPECT_RATIO);
const CARD_HEIGHT = DEFAULT_IMAGE_HEIGHT + DETAILS_PANEL_HEIGHT;
export const ITEM_HEIGHT = CARD_HEIGHT + spacing.lg;
const CALENDAR_COACH_DIM_OVERLAY = 'rgba(64, 64, 64, 0.8)';
const CALENDAR_COACH_BORDER_COLOR = colors.borderMuted;

export interface EventListItemProps {
    item: EventWithMetadata;
    onPress: (event: Event) => void;
    noPadding?: boolean;
    fullDate?: boolean;
    attendees: Attendee[];
    isAdmin?: boolean;
    footerContent?: React.ReactNode;
    cardHeight?: number;
    autoHeight?: boolean;
    listViewMode?: EventListViewMode;
    cardVariant?: 'heart' | 'type-icon';
    disableClickAnalytics?: boolean;
    hideSaveButton?: boolean;
    wobbleSaveButton?: boolean;
}

export const EventListItem: React.FC<EventListItemProps> = ({
    item,
    onPress,
    noPadding,
    fullDate,
    attendees,
    isAdmin,
    footerContent,
    cardHeight,
    autoHeight,
    listViewMode,
    cardVariant,
    disableClickAnalytics,
    hideSaveButton,
    wobbleSaveButton,
}) => {
    const { toggleWishlistEvent, isOnWishlist, wishlistEvents, isEventSourceExcluded } = useCalendarContext();
    const { authUserId, userProfile } = useUserContext();
    const { showGuestSaveModal } = useGuestSaveModal();
    const eventAnalyticsProps = useEventAnalyticsProps(item);
    const calendarCoach = useCalendarCoach();
    const [shareMenuOpen, setShareMenuOpen] = useState(false);

    const promoCode = getEventPromoCodes(item)?.[0];
    const resolvedIsAdmin = typeof isAdmin === 'boolean'
        ? isAdmin
        : !!userProfile?.email && ADMIN_EMAILS.includes(userProfile.email);
    const formattedDate = formatDate(item, fullDate);
    const itemIsOnWishlist = isOnWishlist(item.id);
    const wobblePlus = calendarCoach?.wobblePlus ?? false;
    const showCoachOverlay = calendarCoach?.showOverlay ?? false;
    const shouldWobbleSave = (wobblePlus || wobbleSaveButton) && !itemIsOnWishlist;
    const imageUrl = getSafeImageUrl(item.image_url ? getSmallAvatarUrl(item.image_url) : undefined);
    const locationLabel = (item.neighborhood || '').trim();
    const organizerName = item.organizer?.name?.trim() || 'Organizer';
    const priceLabel = item.short_price || item.price || '';
    const metaLine = [formattedDate, locationLabel, priceLabel].filter(Boolean).join(' - ');
    const isActiveEventType = (value?: string | null) =>
        !!value && ACTIVE_EVENT_TYPES.includes(value as (typeof ACTIVE_EVENT_TYPES)[number]);
    const typeLabelMap: Record<string, string> = {
        event: 'Event',
        play_party: 'Play Party',
        munch: 'Munch',
        retreat: 'Retreat',
        festival: 'Festival',
        conference: 'Conference',
        workshop: 'Workshop',
    };
    const resolvedType = item.play_party || item.type === 'play_party'
        ? 'play_party'
        : item.is_munch || item.type === 'munch'
            ? 'munch'
            : item.type && isActiveEventType(item.type)
                ? item.type
                : FALLBACK_EVENT_TYPE;
    const fallbackGradient = eventImageFallbackGradients[resolvedType] ?? eventImageFallbackGradients.event;
    const primaryTypeLabel = typeLabelMap[resolvedType] || resolvedType.replace(/_/g, ' ');

    const extraTags = [...(item.classification?.tags || []), ...(item.tags || [])];
    const normalizedTypeLabel = primaryTypeLabel.trim().toLowerCase();
    const primaryTagLabel =
        extraTags
            .map(tag => tag.trim())
            .find(tag => tag && tag.toLowerCase() !== normalizedTypeLabel) || '';
    const displayTypeLabel = resolvedType === FALLBACK_EVENT_TYPE ? '' : primaryTypeLabel;
    const typeTagLabel = displayTypeLabel
        ? (primaryTagLabel ? `${displayTypeLabel} | ${primaryTagLabel}` : displayTypeLabel)
        : primaryTagLabel;
    const typeKey = (displayTypeLabel || primaryTypeLabel).trim().toLowerCase();
    const typeTagColors = calendarTypeChips[typeKey] || {
        background: 'rgba(0, 0, 0, 0.8)',
        text: colors.textOnDarkStrong,
        border: 'transparent',
    };
    const isPlayParty = item.play_party || item.type === 'play_party';
    const isMunch = item.is_munch || item.munch_id || item.type === 'munch';
    const renderPlaceholderIcon = (size: number) =>
        isPlayParty ? (
            <FA5Icon name="compact-disc" size={size} color={colors.textSlate} solid />
        ) : (
            <FAIcon name={isMunch ? 'cutlery' : 'calendar'} size={size} color={colors.textSlate} />
        );
    const handlePressEvent = () => {
        onPress(item);
        if (!disableClickAnalytics) {
            const listViewAnalytics = listViewMode ? { list_view_mode: listViewMode } : {};
            logEvent(UE.EventListItemClicked, {
                ...eventAnalyticsProps,
                ...listViewAnalytics,
            });
        }
    };

    const handleToggleEventWishlist = () => {
        if (!authUserId) {
            showGuestSaveModal({
                title: 'Create an account to save events',
                message: 'Save events to your calendar and keep your picks in sync.',
                iconName: 'heart',
            });
            return;
        }

        const willAdd = !itemIsOnWishlist;

        if (willAdd && wishlistEvents.length === 0) {
            logEvent(UE.WishlistFirstAdded, eventAnalyticsProps);
        }
        logEvent(UE.EventListItemWishlistToggled, {
            ...eventAnalyticsProps,
            is_on_wishlist: !itemIsOnWishlist,
        });

        toggleWishlistEvent.mutate({
            eventId: item.id,
            isOnWishlist: !itemIsOnWishlist,
        });

        if (willAdd) {
            calendarCoach?.notifyWishlistAdded();
        }
    };

    const handleSharePress = async () => {
        const rawShareUrl = item.ticket_url || item.event_url || '';
        if (!rawShareUrl) {
            Alert.alert('No ticket link yet', 'Tickets are not available for this event yet.');
            return;
        }
        logEvent(UE.EventListItemSharePressed, eventAnalyticsProps);
        const shareUrl = buildTicketUrl(
            rawShareUrl,
            promoCode ? { promoCode: promoCode.promo_code } : undefined,
        );
        try {
            await Share.share({ message: shareUrl });
        } catch {
            Alert.alert('Error', 'Unable to share right now.');
        }
    };

    const approvalStatus = item.approval_status ?? null;
    const isSourceExcluded = resolvedIsAdmin && isEventSourceExcluded?.(item);
    const showApprovalBorder = resolvedIsAdmin && approvalStatus && approvalStatus !== 'approved';
    const showRejectedBorder = resolvedIsAdmin && approvalStatus === 'rejected';
    const showPendingBorder = showApprovalBorder && !showRejectedBorder;
    const statusBadge = resolvedIsAdmin
        ? isSourceExcluded
            ? { label: 'Excluded', tone: 'excluded' as const }
            : approvalStatus === 'rejected'
                ? { label: 'Rejected', tone: 'rejected' as const }
                : approvalStatus === 'pending'
                    ? { label: 'Pending', tone: 'pending' as const }
                    : null
        : null;
    const resolvedCardVariant = cardVariant ?? 'heart';
    const showActionButton = !hideSaveButton;

    const resolvedHeight = cardHeight ?? ITEM_HEIGHT;
    const resolvedCardHeight = Math.max(0, resolvedHeight - spacing.lg);
    const useAutoHeight = autoHeight === true;
    const detailsPanelHeight = DETAILS_PANEL_HEIGHT;
    const targetImageHeight = DEFAULT_IMAGE_HEIGHT;
    const maxImageHeight = Math.max(0, resolvedCardHeight - detailsPanelHeight);
    const imageHeight = Math.max(0, Math.min(targetImageHeight, maxImageHeight));
    const detailsHeight = Math.max(0, resolvedCardHeight - imageHeight);
    const actionButtonSize = Math.max(30, Math.min(42, Math.round(resolvedCardHeight * 0.14)));
    const actionButtonWidth = getWishlistButtonWidth(actionButtonSize);
    const badgeInset = spacing.sm;
    const actionButtonInset = spacing.lg;
    const actionButtonRight = spacing.lg;
    const typeIconBubbleSize = Math.round(Math.max(32, Math.min(48, actionButtonSize * 1.1)));
    const typeIconSize = Math.round(typeIconBubbleSize * 0.5);
    const typeIconTop = Math.max(0, imageHeight / 2 - typeIconBubbleSize / 2);
    const placeholderIconSize = Math.max(28, Math.round(imageHeight * 0.4));
    const hasFooter = !!footerContent;
    const showTypeIconOverlay = resolvedCardVariant === 'type-icon' && !imageUrl;
    const showPlaceholderIcon = !imageUrl && !showTypeIconOverlay;
    const actionIconRightInset = actionButtonRight;
    const metaTextPaddingRight = showActionButton
        ? actionButtonRight + actionButtonWidth + spacing.sm
        : 0;

    return (
        <View style={[styles.wrapper, !useAutoHeight && { height: resolvedHeight }]}>
            <View
                style={[
                    styles.cardWrapper,
                    !useAutoHeight && { height: resolvedCardHeight },
                    noPadding && styles.noPadding,
                    showPendingBorder && styles.pendingBorder,
                    showRejectedBorder && styles.rejectedBorder,
                    showCoachOverlay && styles.cardWrapperCoach,
                ]}
            >
                <TouchableOpacity onPress={handlePressEvent} activeOpacity={0.9}>
                    <View>
                        <View style={[styles.poster, { height: imageHeight }]}>
                            {imageUrl && (
                                <Image
                                    source={{ uri: imageUrl }}
                                    style={styles.posterImage}
                                    contentFit="cover"
                                    cachePolicy="disk"
                                    allowDownscaling
                                    decodeFormat="rgb"
                                />
                            )}
                            {!imageUrl && (
                                <LinearGradient
                                    colors={fallbackGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.posterPlaceholder}
                                >
                                    {showPlaceholderIcon && (
                                        renderPlaceholderIcon(placeholderIconSize)
                                    )}
                                </LinearGradient>
                            )}
                            {promoCode && (
                                <View style={styles.discountBadge}>
                                    <Text style={styles.discountText}>
                                        {promoCode.discount_type === 'percent'
                                            ? `${promoCode.discount}% off`
                                            : `$${promoCode.discount} off`}
                                    </Text>
                                </View>
                            )}
                            {typeTagLabel && (
                                <View
                                    style={[
                                        styles.typeTagBadge,
                                        {
                                            backgroundColor: typeTagColors.background,
                                            borderColor: typeTagColors.border || 'rgba(255, 255, 255, 0.25)',
                                        },
                                        showCoachOverlay && styles.typeTagBadgeCoach,
                                    ]}
                                >
                                    <Text style={[styles.typeTagText, { color: typeTagColors.text }]}>
                                        {typeTagLabel}
                                    </Text>
                                </View>
                            )}
                            {showTypeIconOverlay ? (
                                <View style={[styles.typeIconOverlay, { top: typeIconTop }]}>
                                    <View
                                        style={[
                                            styles.typeIconBubble,
                                            {
                                                width: typeIconBubbleSize,
                                                height: typeIconBubbleSize,
                                                borderRadius: typeIconBubbleSize / 2,
                                            },
                                        ]}
                                    >
                                        {renderPlaceholderIcon(typeIconSize)}
                                    </View>
                                </View>
                            ) : null}
                            {(attendees?.length ?? 0) > 0 && (
                                <View
                                    style={[
                                        styles.attendeeWrap,
                                        { bottom: badgeInset, right: actionIconRightInset },
                                    ]}
                                >
                                    <AttendeeCarousel attendees={attendees} scrollEnabled={false} />
                                </View>
                            )}
                            {statusBadge && (
                                <View
                                    style={[
                                        styles.statusBadge,
                                        statusBadge.tone === 'pending' && styles.statusBadgePending,
                                        statusBadge.tone === 'rejected' && styles.statusBadgeRejected,
                                        statusBadge.tone === 'excluded' && styles.statusBadgeExcluded,
                                        { left: badgeInset, bottom: badgeInset },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.statusBadgeText,
                                            statusBadge.tone === 'pending' && styles.statusBadgeTextPending,
                                            statusBadge.tone === 'rejected' && styles.statusBadgeTextRejected,
                                            statusBadge.tone === 'excluded' && styles.statusBadgeTextExcluded,
                                        ]}
                                    >
                                        {statusBadge.label}
                                    </Text>
                                </View>
                            )}
                            {showCoachOverlay && (
                                <View pointerEvents="none" style={styles.calendarCoachScrim} />
                            )}
                        </View>
                        <LinearGradient
                            colors={[colors.white, colors.surfaceLavenderLight]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={[
                                styles.detailsPanel,
                                !useAutoHeight && { height: detailsHeight },
                                hasFooter && styles.detailsPanelWithFooter,
                                showCoachOverlay && styles.detailsPanelCoach,
                            ]}
                        >
                            <Text
                                style={styles.eventTitle}
                                numberOfLines={1}
                            >
                                {item.name}
                            </Text>
                            <Text style={styles.organizerName} numberOfLines={1}>
                                {organizerName}
                            </Text>
                            {metaLine ? (
                                <Text style={[styles.metaText, { paddingRight: metaTextPaddingRight }]} numberOfLines={1}>
                                    {metaLine}
                                </Text>
                            ) : null}
                            {showCoachOverlay && (
                                <View pointerEvents="none" style={styles.calendarCoachScrim} />
                            )}
                            {showActionButton && (
                                <WishlistPlusButton
                                    itemIsOnWishlist={itemIsOnWishlist}
                                    handleToggleEventWishlist={handleToggleEventWishlist}
                                    onLongPress={() => setShareMenuOpen(true)}
                                    size={actionButtonSize}
                                    wobble={shouldWobbleSave}
                                    containerStyle={[
                                        styles.actionButton,
                                        showCoachOverlay && styles.actionButtonCoach,
                                        { right: actionButtonRight, bottom: actionButtonInset },
                                    ]}
                                />
                            )}
                        </LinearGradient>
                    </View>
                </TouchableOpacity>
                {footerContent && (
                    <View style={styles.footer}>{footerContent}</View>
                )}
            </View>
            <ActionSheet
                visible={shareMenuOpen}
                height={120}
                onClose={() => setShareMenuOpen(false)}
                dismissOnBackdropPress
                sheetStyle={styles.shareSheet}
                backdropOpacity={0.35}
            >
                <View style={styles.shareSheetHandle} />
                <Pressable
                    style={({ pressed }) => [
                        styles.shareSheetItem,
                        pressed && styles.shareSheetItemPressed,
                    ]}
                    onPress={() => {
                        setShareMenuOpen(false);
                        void handleSharePress();
                    }}
                >
                    <View style={styles.shareSheetItemContent}>
                        <FAIcon
                            name="share-alt"
                            size={18}
                            color={colors.textPrimary}
                            style={styles.shareSheetItemIcon}
                        />
                        <Text style={styles.shareSheetItemText}>Share</Text>
                    </View>
                </Pressable>
            </ActionSheet>
        </View>
    );
};


const styles = StyleSheet.create({
    // Container
    wrapper: {},
    cardWrapper: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        borderRadius: radius.lg,
        overflow: 'hidden',
        marginHorizontal: spacing.lg,
        marginBottom: spacing.sm,
        position: 'relative',
        ...shadows.card,
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 8,
        elevation: 3,
    },
    cardWrapperCoach: {
        borderColor: CALENDAR_COACH_BORDER_COLOR,
    },
    noPadding: {
        marginHorizontal: 0,
    },
    pendingBorder: {
        borderColor: colors.warning,
        borderStyle: 'dotted',
        borderWidth: 3,
    },
    rejectedBorder: {
        borderColor: colors.danger,
        borderStyle: 'solid',
        borderWidth: 3,
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: colors.borderSubtle,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.mdPlus,
        backgroundColor: colors.white,
    },
    poster: {
        width: '100%',
        backgroundColor: colors.surfaceLavenderLight,
        position: 'relative',
    },
    posterImage: {
        ...StyleSheet.absoluteFillObject,
    },
    posterPlaceholder: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeIconOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    actionButton: {
        position: 'absolute',
    },
    actionButtonCoach: {
        zIndex: 2,
        elevation: 6,
    },
    calendarCoachScrim: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: CALENDAR_COACH_DIM_OVERLAY,
        zIndex: 1,
    },
    typeIconBubble: {
        backgroundColor: colors.surfaceMutedAlt,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.borderMutedLight,
    },
    detailsPanel: {
        backgroundColor: colors.white,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.mdPlus,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.borderLavenderSoft,
    },
    detailsPanelCoach: {
        borderTopColor: CALENDAR_COACH_BORDER_COLOR,
    },
    detailsPanelWithFooter: {
        paddingBottom: spacing.mdPlus,
    },
    typeTagBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        paddingHorizontal: spacing.mdPlus,
        paddingVertical: spacing.xs,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderWidth: 1,
        borderRadius: radius.pill,
        borderTopRightRadius: radius.lg,
        borderBottomRightRadius: 0,
    },
    typeTagBadgeCoach: {
        borderColor: CALENDAR_COACH_BORDER_COLOR,
    },
    typeTagText: {
        fontSize: fontSizes.smPlus,
        fontWeight: '700',
        color: colors.textOnDarkStrong,
    },
    eventTitle: {
        fontSize: fontSizes.lg,
        fontWeight: '700',
        color: colors.textPrimary,
        marginTop: spacing.xsPlus,
        fontFamily: fontFamilies.body,
    },
    organizerName: {
        fontSize: fontSizes.base,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
        marginTop: spacing.xs,
    },
    discountBadge: {
        position: 'absolute',
        top: 0,
        left: 0,
        backgroundColor: 'rgba(255, 215, 0, 0.8)',
        borderTopLeftRadius: radius.lg,
        borderBottomLeftRadius: 0,
        borderTopRightRadius: radius.lg,
        borderBottomRightRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        shadowColor: colors.black,
        shadowOpacity: 0.2,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
        elevation: 2,
    },
    discountText: {
        fontSize: fontSizes.smPlus,
        fontWeight: 'bold',
        color: colors.black,
    },
    metaText: {
        fontSize: fontSizes.smPlus,
        color: colors.textSlate,
        fontFamily: fontFamilies.body,
        marginTop: spacing.xs,
    },
    attendeeWrap: {
        position: 'absolute',
        alignItems: 'flex-end',
        maxWidth: '45%',
        padding: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: colors.black,
        shadowColor: colors.black,
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    statusBadge: {
        position: 'absolute',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        borderWidth: 1,
        backgroundColor: colors.surfaceMuted,
        borderColor: colors.borderMutedLight,
    },
    statusBadgePending: {
        backgroundColor: colors.surfaceWarning,
        borderColor: colors.borderGoldLight,
    },
    statusBadgeRejected: {
        backgroundColor: colors.surfaceRoseSoft,
        borderColor: colors.borderRose,
    },
    statusBadgeExcluded: {
        backgroundColor: colors.surfaceMuted,
        borderColor: colors.borderMutedLight,
    },
    statusBadgeText: {
        fontSize: fontSizes.sm,
        fontWeight: '700',
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    statusBadgeTextPending: {
        color: colors.warning,
    },
    statusBadgeTextRejected: {
        color: colors.danger,
    },
    statusBadgeTextExcluded: {
        color: colors.textMuted,
    },
    shareSheet: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
    },
    shareSheetHandle: {
        alignSelf: 'center',
        width: 44,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.borderMutedLight,
        marginBottom: spacing.lg,
    },
    shareSheetItem: {
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        backgroundColor: colors.surfaceWhiteFrosted,
        paddingVertical: spacing.mdPlus,
        alignItems: 'center',
        justifyContent: 'center',
    },
    shareSheetItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    shareSheetItemIcon: {
        marginRight: spacing.sm,
    },
    shareSheetItemPressed: {
        opacity: 0.72,
    },
    shareSheetItemText: {
        color: colors.textPrimary,
        fontSize: fontSizes.basePlus,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
});
