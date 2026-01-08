import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { Attendee, Event } from '../../../commonTypes';
import { UE } from '../../../Common/types/userEventTypes';
import { EventWithMetadata } from '../../../Common/Nav/NavStackType';
import { useCalendarContext } from '../hooks/CalendarContext';
import { useUserContext } from '../../Auth/hooks/UserContext';
import { formatDate } from '../hooks/calendarUtils';
import { getSafeImageUrl, getSmallAvatarUrl } from '../../../Common/hooks/imageUtils';
import { logEvent } from '../../../Common/hooks/logger';
import { getEventPromoCodes } from '../../Auth/usePromoCode';
import { calendarTypeChips, colors, fontSizes, radius, shadows, spacing } from '../../../components/styles';
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
}) => {
    const { toggleWishlistEvent, isOnWishlist } = useCalendarContext();
    const { authUserId } = useUserContext();
    const [scrolling, setScrolling] = useState(false);
    const [titleLineCount, setTitleLineCount] = useState(0);
    const eventAnalyticsProps = useEventAnalyticsProps(item);

    const promoCode = getEventPromoCodes(item)?.[0];
    const formattedDate = formatDate(item, fullDate);
    const itemIsOnWishlist = isOnWishlist(item.id);
    const imageUrl = getSafeImageUrl(item.image_url ? getSmallAvatarUrl(item.image_url) : undefined);
    const locationLabel = (item.neighborhood || '').trim();
    const metaItems = [
        { key: 'date', label: formattedDate, icon: 'clock-o' },
        ...(locationLabel ? [{ key: 'location', label: locationLabel, icon: 'map-marker' }] : []),
    ];
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
    const handlePressEvent = () => {
        // Prevent accidental taps while scrolling horizontal content.
        if (!scrolling) {
            onPress(item);
            const listViewAnalytics = listViewMode ? { list_view_mode: listViewMode } : {};
            logEvent(UE.EventListItemClicked, {
                ...eventAnalyticsProps,
                ...listViewAnalytics,
            });
        }
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

    const resolvedHeight = cardHeight ?? ITEM_HEIGHT;
    const resolvedCardHeight = Math.max(0, resolvedHeight - spacing.lg);
    const useAutoHeight = autoHeight === true;
    const imageHeight = Math.round(resolvedCardHeight * 0.5);
    const detailsHeight = Math.max(0, resolvedCardHeight - imageHeight);
    const heartSize = 48;
    const heartOffset = imageHeight < 140 ? 6 : 0;
    const heartTop = Math.max(0, imageHeight / 2 - heartSize / 2 - heartOffset);
    const isSingleLineTitle = titleLineCount === 1;
    const hasFooter = !!footerContent;

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
                            <View style={[styles.heartOverlay, { top: heartTop }]}>
                                <WishlistHeart
                                    itemIsOnWishlist={itemIsOnWishlist}
                                    handleToggleEventWishlist={handleToggleEventWishlist}
                                    size={heartSize}
                                    variant="thick-outline"
                                />
                            </View>
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
                            colors={['rgba(255, 255, 255, 0.9)', 'rgba(241, 235, 255, 0.75)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={[
                                styles.detailsPanel,
                                !useAutoHeight && { height: detailsHeight },
                                hasFooter && styles.detailsPanelWithFooter,
                            ]}
                        >
                            <View style={styles.organizerRow}>
                                <View style={[styles.organizerDot, { backgroundColor: item.organizerColor || colors.textDisabled }]} />
                                <Text style={styles.organizerName} numberOfLines={1}>
                                    {item.organizer?.name}
                                </Text>
                            </View>
                            <Text
                                style={styles.eventTitle}
                                numberOfLines={2}
                                onTextLayout={(event) => {
                                    const nextLineCount = event.nativeEvent.lines?.length ?? 0;
                                    if (nextLineCount && nextLineCount !== titleLineCount) {
                                        setTitleLineCount(nextLineCount);
                                    }
                                }}
                            >
                                {item.name}
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={isSingleLineTitle && !hasFooter ? styles.metaRowSingleLine : undefined}
                                contentContainerStyle={styles.metaRow}
                                onScrollBeginDrag={() => setScrolling(true)}
                                onScrollEndDrag={() => setTimeout(() => setScrolling(false), 200)}
                            >
                                {metaItems.map((meta, index) => (
                                    <View key={meta.key} style={styles.metaItem}>
                                        {meta.icon && (
                                            <FAIcon name={meta.icon} size={12} color={colors.textMuted} style={styles.metaIcon} />
                                        )}
                                        <Text
                                            style={[
                                                styles.metaText,
                                                meta.key === 'date' && styles.metaTextStrong,
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {meta.label}
                                        </Text>
                                        {index < metaItems.length - 1 && (
                                            <Text style={styles.metaSeparator}>.</Text>
                                        )}
                                    </View>
                                ))}
                            </ScrollView>
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


const CARD_HEIGHT = 220;
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
        paddingHorizontal: spacing.mdPlus,
        paddingVertical: spacing.smPlus,
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
    heartOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    detailsPanel: {
        backgroundColor: colors.surfaceWhiteFrosted,
        paddingHorizontal: spacing.mdPlus,
        paddingTop: spacing.smPlus,
        paddingBottom: spacing.smPlus,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(255, 255, 255, 0.65)',
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
        fontSize: fontSizes.xl,
        fontWeight: '700',
        color: colors.textDeep,
        marginTop: spacing.xsPlus,
    },
    organizerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xxs,
    },
    organizerDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: spacing.sm,
    },
    organizerName: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
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
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        flexGrow: 1,
        paddingTop: 0,
    },
    metaRowSingleLine: {
        marginTop: -spacing.smPlus,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    metaIcon: {
        marginRight: spacing.xs,
    },
    metaSeparator: {
        marginHorizontal: spacing.xs,
        fontSize: fontSizes.sm,
        fontWeight: '600',
        color: colors.textMuted,
    },
    metaText: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontWeight: '600',
        flexShrink: 1,
        textAlign: 'left',
    },
    metaTextStrong: {
        fontWeight: '700',
        color: colors.textDeep,
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
