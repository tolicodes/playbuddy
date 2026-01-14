import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import FAIcon from 'react-native-vector-icons/FontAwesome';

import { UE } from '../../../Common/types/userEventTypes';
import { useCalendarContext } from '../hooks/CalendarContext';
import { useUserContext } from '../../Auth/hooks/UserContext';
import { formatDate } from '../hooks/calendarUtils';
import { getSafeImageUrl, getSmallAvatarUrl } from '../../../Common/hooks/imageUtils';
import { logEvent } from '../../../Common/hooks/logger';
import { colors, eventImageFallbackGradients, fontFamilies, fontSizes, radius, shadows, spacing } from '../../../components/styles';
import { useEventAnalyticsProps } from '../../../Common/hooks/useAnalytics';
import { ACTIVE_EVENT_TYPES, FALLBACK_EVENT_TYPE } from '../../../Common/types/commonTypes';
import type { EventListItemProps } from './EventListItem';

export const CLASSIC_ITEM_HEIGHT = 128;
const THUMB_SIZE = 56;

export const EventListItemClassic: React.FC<EventListItemProps> = ({
    item,
    onPress,
    noPadding,
    fullDate,
    isAdmin,
    footerContent,
    cardHeight,
    autoHeight,
    listViewMode,
}) => {
    const { toggleWishlistEvent, isOnWishlist, wishlistEvents } = useCalendarContext();
    const { authUserId } = useUserContext();
    const eventAnalyticsProps = useEventAnalyticsProps(item);
    const itemIsOnWishlist = isOnWishlist(item.id);
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
            alert('You need an account to add events to your calendar');
            return;
        }

        if (!itemIsOnWishlist && wishlistEvents.length === 0) {
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
    };

    const isPlayParty = item.play_party || item.type === 'play_party';
    const isMunch = item.is_munch || item.munch_id || item.type === 'munch';
    const placeHolderImage = isPlayParty ? (
        <FAIcon name="birthday-cake" size={22} color={colors.textSlate} />
    ) : isMunch ? (
        <FAIcon name="cutlery" size={22} color={colors.textSlate} />
    ) : (
        <FAIcon name="calendar" size={22} color={colors.textSlate} />
    );

    const showApprovalBorder = isAdmin && item.approval_status && item.approval_status !== 'approved';

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
                    showApprovalBorder && styles.pendingBorder,
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
                <TouchableOpacity
                    style={styles.wishlistButton}
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
    noPadding: {
        marginHorizontal: 0,
    },
    pendingBorder: {
        borderColor: colors.warning,
        borderStyle: 'dotted',
        borderWidth: 3,
    },
    cardPressable: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.mdPlus,
        flexGrow: 1,
        paddingHorizontal: spacing.mdPlus,
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
    footer: {
        borderTopWidth: 1,
        borderTopColor: colors.borderSubtle,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        backgroundColor: colors.white,
    },
});
