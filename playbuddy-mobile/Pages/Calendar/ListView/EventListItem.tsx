import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome';

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
import { calendarTypeChips, colors, fontFamilies, fontSizes, radius, shadows, spacing } from '../../../components/styles';
import { AttendeeCarousel } from '../common/AttendeeCarousel';
import { useEventAnalyticsProps } from '../../../Common/hooks/useAnalytics';
import { WishlistHeart } from './WishlistHeart';
import type { EventListViewMode } from './eventListViewMode';

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
}) => {
    const { toggleWishlistEvent, isOnWishlist } = useCalendarContext();
    const { authUserId } = useUserContext();
    const eventAnalyticsProps = useEventAnalyticsProps(item);

    const promoCode = getEventPromoCodes(item)?.[0];
    const formattedDate = formatDate(item, fullDate);
    const itemIsOnWishlist = isOnWishlist(item.id);
    const imageUrl = getSafeImageUrl(item.image_url ? getSmallAvatarUrl(item.image_url) : undefined);
    const locationLabel = (item.neighborhood || '').trim();
    const organizerName = item.organizer?.name?.trim() || 'Organizer';
    const priceLabel = item.short_price || item.price || '';
    const metaLine = [formattedDate, locationLabel, priceLabel].filter(Boolean).join(' - ');
    const typeLabelMap: Record<string, string> = {
        play_party: 'Play Party',
        munch: 'Munch',
        retreat: 'Retreat',
        festival: 'Festival',
        workshop: 'Workshop',
        performance: 'Performance',
        discussion: 'Discussion',
    };
    const primaryTypeLabel = item.play_party
        ? 'Play Party'
        : item.is_munch
            ? 'Munch'
            : item.type && item.type !== 'event'
                ? typeLabelMap[item.type] || item.type.replace(/_/g, ' ')
                : 'Event';

    const extraTags = [...(item.classification?.tags || []), ...(item.tags || [])];
    const normalizedTypeLabel = primaryTypeLabel.trim().toLowerCase();
    const primaryTagLabel =
        extraTags
            .map(tag => tag.trim())
            .find(tag => tag && tag.toLowerCase() !== normalizedTypeLabel) || '';
    const displayTypeLabel = primaryTypeLabel === 'Event' ? '' : primaryTypeLabel;
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
    const placeholderIconName = isPlayParty ? 'birthday-cake' : isMunch ? 'cutlery' : 'calendar';
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

        logEvent(UE.EventListItemWishlistToggled, {
            ...eventAnalyticsProps,
            is_on_wishlist: !itemIsOnWishlist,
        });

        toggleWishlistEvent.mutate({
            eventId: item.id,
            isOnWishlist: !itemIsOnWishlist,
        });
    };

    const showApprovalBorder = isAdmin && item.approval_status && item.approval_status !== 'approved';
    const resolvedCardVariant = cardVariant ?? 'heart';

    const resolvedHeight = cardHeight ?? ITEM_HEIGHT;
    const resolvedCardHeight = Math.max(0, resolvedHeight - spacing.lg);
    const useAutoHeight = autoHeight === true;
    // Keep the text panel height consistent so extra card height goes to the image.
    const detailsPanelHeight = 92;
    const imageHeight = Math.max(
        Math.round(resolvedCardHeight * 0.5),
        resolvedCardHeight - detailsPanelHeight
    );
    const detailsHeight = Math.max(0, resolvedCardHeight - imageHeight);
    const heartSize = 48;
    const heartOffset = imageHeight < 140 ? 6 : 0;
    const heartTop = Math.max(0, imageHeight / 2 - heartSize / 2 - heartOffset);
    const typeIconBubbleSize = Math.round(heartSize * 0.9);
    const typeIconSize = Math.round(typeIconBubbleSize * 0.5);
    const placeholderIconSize = Math.max(28, Math.round(imageHeight * 0.4));
    const hasFooter = !!footerContent;
    const showTypeIconOverlay = resolvedCardVariant === 'type-icon' && !imageUrl;
    const showPlaceholderIcon = !imageUrl && !showTypeIconOverlay && resolvedCardVariant !== 'heart';

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
                                <View style={styles.posterPlaceholder}>
                                    {showPlaceholderIcon && (
                                        <FAIcon
                                            name={placeholderIconName}
                                            size={placeholderIconSize}
                                            color={colors.textSlate}
                                        />
                                    )}
                                </View>
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
                                    ]}
                                >
                                    <Text style={[styles.typeTagText, { color: typeTagColors.text }]}>
                                        {typeTagLabel}
                                    </Text>
                                </View>
                            )}
                            {resolvedCardVariant === 'heart' ? (
                                <View style={[styles.heartOverlay, { top: heartTop }]}>
                                    <WishlistHeart
                                        itemIsOnWishlist={itemIsOnWishlist}
                                        handleToggleEventWishlist={handleToggleEventWishlist}
                                        size={heartSize}
                                        variant="thick-outline"
                                    />
                                </View>
                            ) : showTypeIconOverlay ? (
                                <View style={[styles.typeIconOverlay, { top: heartTop }]}>
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
                                        <FAIcon
                                            name={placeholderIconName}
                                            size={typeIconSize}
                                            color={colors.textSlate}
                                        />
                                    </View>
                                </View>
                            ) : null}
                            {(attendees?.length ?? 0) > 0 && (
                                <View
                                    style={[
                                        styles.attendeeWrap,
                                        { bottom: spacing.xs, right: spacing.xs },
                                    ]}
                                >
                                    <AttendeeCarousel attendees={attendees} scrollEnabled={false} />
                                </View>
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
                                <Text style={styles.metaText} numberOfLines={1}>
                                    {metaLine}
                                </Text>
                            ) : null}
                        </LinearGradient>
                    </View>
                </TouchableOpacity>
                {footerContent && (
                    <View style={styles.footer}>{footerContent}</View>
                )}
            </View>
        </View>
    );
};


const CARD_HEIGHT = 250;
export const ITEM_HEIGHT = CARD_HEIGHT + spacing.lg;

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
    footer: {
        borderTopWidth: 1,
        borderTopColor: colors.borderSubtle,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.white,
    },
    poster: {
        width: '100%',
        backgroundColor: colors.textDisabled,
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
    heartOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    typeIconOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
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
        paddingBottom: spacing.md,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.borderLavenderSoft,
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
    typeTagText: {
        fontSize: fontSizes.smPlus,
        fontWeight: '700',
        color: colors.textOnDarkStrong,
    },
    eventTitle: {
        fontSize: fontSizes.basePlus,
        fontWeight: '700',
        color: colors.textPrimary,
        marginTop: spacing.xsPlus,
        fontFamily: fontFamilies.body,
    },
    organizerName: {
        fontSize: fontSizes.smPlus,
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
        fontSize: fontSizes.sm,
        color: colors.textSlate,
        fontFamily: fontFamilies.body,
        marginTop: spacing.xs,
    },
    attendeeWrap: {
        position: 'absolute',
        alignItems: 'flex-end',
        maxWidth: '45%',
        paddingHorizontal: spacing.xs,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: colors.black,
        shadowColor: colors.black,
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
});
