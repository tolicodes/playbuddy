import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import FA5Icon from 'react-native-vector-icons/FontAwesome5';

import { UE } from '../../../Common/types/userEventTypes';
import { useUserContext } from '../../Auth/hooks/UserContext';
import { formatDate } from '../hooks/calendarUtils';
import { getSafeImageUrl, getSmallAvatarUrl } from '../../../Common/hooks/imageUtils';
import { logEvent } from '../../../Common/hooks/logger';
import { colors, eventImageFallbackGradients, fontFamilies, fontSizes, radius, shadows, spacing } from '../../../components/styles';
import { useEventAnalyticsProps } from '../../../Common/hooks/useAnalytics';
import { ACTIVE_EVENT_TYPES, FALLBACK_EVENT_TYPE } from '../../../Common/types/commonTypes';
import { ADMIN_EMAILS } from '../../../config';
import type { EventListItemProps } from './EventListItem';
import { useCalendarCoach } from '../../PopupManager';
import { useGuestSaveModal } from '../../GuestSaveModal';

export const CLASSIC_ITEM_HEIGHT = 128;
const THUMB_SIZE = 56;
const CALENDAR_COACH_DIM_OVERLAY = 'rgba(64, 64, 64, 0.8)';
const CALENDAR_COACH_BORDER_COLOR = 'transparent';

export const EventListItemClassic: React.FC<EventListItemProps> = ({
    item,
    onPress,
    noPadding,
    fullDate,
    isAdmin,
    isOnWishlist,
    onToggleWishlist,
    wishlistEventsCount,
    isEventSourceExcluded,
    footerContent,
    cardHeight,
    autoHeight,
    listViewMode,
    hideSaveButton,
}) => {
    const { authUserId, userProfile } = useUserContext();
    const { showGuestSaveModal } = useGuestSaveModal();
    const calendarCoach = useCalendarCoach();
    const eventAnalyticsProps = useEventAnalyticsProps(item);
    const itemIsOnWishlist = isOnWishlist ? isOnWishlist(item.id) : false;
    const canToggleWishlist = typeof onToggleWishlist === 'function';
    const resolvedWishlistCount = wishlistEventsCount ?? 0;
    const showCoachOverlay = calendarCoach?.showOverlay ?? false;
    const formattedDate = formatDate(item, fullDate);
    const imageUrl = getSafeImageUrl(item.image_url ? getSmallAvatarUrl(item.image_url) : undefined);
    const organizerName = item.organizer?.name?.trim();
    const organizerColor = item.organizerColor || colors.textDisabled;
    const isActiveEventType = (value?: string | null) =>
        !!value && ACTIVE_EVENT_TYPES.includes(value as (typeof ACTIVE_EVENT_TYPES)[number]);
    const resolvedType = item.play_party || item.type === 'play_party'
        ? 'play_party'
        : item.is_munch || item.munch_id || item.type === 'munch'
            ? 'munch'
            : item.type && isActiveEventType(item.type)
                ? item.type
                : FALLBACK_EVENT_TYPE;
    const fallbackGradient = eventImageFallbackGradients[resolvedType] ?? eventImageFallbackGradients.event;

    const handlePressEvent = () => {
        onPress(item);
        const listViewAnalytics = listViewMode ? { list_view_mode: listViewMode } : {};
        logEvent(UE.EventListItemClicked, {
            ...eventAnalyticsProps,
            ...listViewAnalytics,
        });
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
        if (!canToggleWishlist) return;

        if (!itemIsOnWishlist && resolvedWishlistCount === 0) {
            logEvent(UE.WishlistFirstAdded, eventAnalyticsProps);
        }
        logEvent(UE.EventListItemWishlistToggled, {
            ...eventAnalyticsProps,
            is_on_wishlist: !itemIsOnWishlist,
        });

        onToggleWishlist(item.id, !itemIsOnWishlist);
    };

    const isPlayParty = item.play_party || item.type === 'play_party';
    const isMunch = item.is_munch || item.munch_id || item.type === 'munch';
    const placeHolderImage = isPlayParty ? (
        <FA5Icon name="compact-disc" size={22} color={colors.textSlate} solid />
    ) : isMunch ? (
        <FAIcon name="cutlery" size={22} color={colors.textSlate} />
    ) : (
        <FAIcon name="calendar" size={22} color={colors.textSlate} />
    );

    const approvalStatus = item.approval_status ?? null;
    const resolvedIsAdmin = typeof isAdmin === 'boolean'
        ? isAdmin
        : !!userProfile?.email && ADMIN_EMAILS.includes(userProfile.email);
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

    const resolvedHeight = cardHeight ?? CLASSIC_ITEM_HEIGHT;
    const resolvedCardHeight = Math.max(0, resolvedHeight - spacing.lg);
    const useAutoHeight = autoHeight === true;

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
                <TouchableOpacity onPress={handlePressEvent} activeOpacity={0.9} style={styles.cardPressable}>
                    <View style={styles.thumbWrap}>
                        {imageUrl ? (
                            <Image
                                source={{ uri: imageUrl }}
                                style={styles.thumbImage}
                                contentFit="cover"
                                cachePolicy="disk"
                                allowDownscaling
                                decodeFormat="rgb"
                            />
                        ) : (
                            <LinearGradient
                                colors={fallbackGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.thumbPlaceholder}
                            >
                                {placeHolderImage}
                            </LinearGradient>
                        )}
                    </View>
                    <View style={styles.content}>
                        {organizerName && (
                            <View style={styles.organizerRow}>
                                <View style={[styles.organizerDot, { backgroundColor: organizerColor }]} />
                                <Text style={styles.organizerName} numberOfLines={1}>
                                    {organizerName}
                                </Text>
                            </View>
                        )}
                        <Text style={styles.eventTitle} numberOfLines={2}>
                            {item.name}
                        </Text>
                        <View style={styles.metaRow}>
                            <FAIcon name="clock-o" size={12} color={colors.textMuted} style={styles.metaIcon} />
                            <Text style={styles.metaText} numberOfLines={1}>
                                {formattedDate}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
                {showCoachOverlay && (
                    <View pointerEvents="none" style={styles.calendarCoachScrim} />
                )}
                {!hideSaveButton && canToggleWishlist && (
                    <TouchableOpacity
                        style={[styles.wishlistButton, showCoachOverlay && styles.wishlistButtonCoach]}
                        onPress={(event) => {
                            event.stopPropagation?.();
                            handleToggleEventWishlist();
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <FAIcon
                            name={itemIsOnWishlist ? 'heart' : 'heart-o'}
                            size={18}
                            color={itemIsOnWishlist ? colors.danger : colors.textMuted}
                        />
                    </TouchableOpacity>
                )}
                {statusBadge && (
                    <View
                        style={[
                            styles.statusBadge,
                            statusBadge.tone === 'pending' && styles.statusBadgePending,
                            statusBadge.tone === 'rejected' && styles.statusBadgeRejected,
                            statusBadge.tone === 'excluded' && styles.statusBadgeExcluded,
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
                {footerContent && <View style={styles.footer}>{footerContent}</View>}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {},
    cardWrapper: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        borderRadius: radius.lg,
        overflow: 'hidden',
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        position: 'relative',
        ...shadows.card,
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 8,
        elevation: 3,
    },
    cardWrapperCoach: {
        borderColor: CALENDAR_COACH_BORDER_COLOR,
        borderWidth: 0,
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
    cardPressable: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.mdPlus,
        flexGrow: 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.smPlus,
    },
    thumbWrap: {
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: THUMB_SIZE / 2,
        backgroundColor: colors.surfaceLavenderLight,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    thumbImage: {
        width: '100%',
        height: '100%',
    },
    thumbPlaceholder: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        minHeight: THUMB_SIZE,
    },
    organizerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    organizerDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: spacing.sm,
    },
    organizerName: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    eventTitle: {
        fontSize: fontSizes.lg,
        fontWeight: '700',
        color: colors.textDeep,
        marginBottom: spacing.xs,
        fontFamily: fontFamilies.body,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaIcon: {
        marginRight: spacing.xs,
    },
    metaText: {
        fontSize: fontSizes.sm,
        color: colors.textSecondary,
        fontFamily: fontFamilies.body,
    },
    wishlistButton: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        padding: spacing.xs,
        backgroundColor: colors.surfaceWhiteOpaque,
        borderRadius: radius.pill,
    },
    wishlistButtonCoach: {
        zIndex: 2,
        elevation: 6,
    },
    calendarCoachScrim: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: CALENDAR_COACH_DIM_OVERLAY,
        zIndex: 1,
    },
    statusBadge: {
        position: 'absolute',
        left: spacing.sm,
        bottom: spacing.sm,
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
    footer: {
        borderTopWidth: 1,
        borderTopColor: colors.borderSubtle,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.white,
    },
});
