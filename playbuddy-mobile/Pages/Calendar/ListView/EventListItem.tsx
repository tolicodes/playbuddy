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
import { calendarExperienceTone, calendarTagTones, calendarTypeChips, colors, fontSizes, radius, shadows, spacing } from '../../../components/styles';
import { AttendeeCarousel } from '../common/AttendeeCarousel';
import { useEventAnalyticsProps } from '../../../Common/hooks/useAnalytics';
import { WishlistHeart } from './WishlistHeart';

interface ListItemProps {
    item: EventWithMetadata;
    onPress: (event: Event) => void;
    noPadding?: boolean;
    fullDate?: boolean;
    attendees: Attendee[];
    isAdmin?: boolean;
    footerContent?: React.ReactNode;
    cardHeight?: number;
    autoHeight?: boolean;
}

const TAG_TONES = calendarTagTones;

const TAG_TONE_MATCHERS: Array<{ tone: keyof typeof TAG_TONES; keywords: string[] }> = [
    {
        tone: 'spiritual',
        keywords: ['tantra', 'spiritual', 'meditat', 'ritual', 'ceremony', 'sacred', 'yoga', 'breath', 'energy', 'shaman', 'hypnosis'],
    },
    {
        tone: 'social',
        keywords: ['social', 'community', 'munch', 'meet', 'mingle', 'dating', 'poly', 'network', 'party', 'celebration'],
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

const TYPE_ICONS: Record<string, string> = {
    'play party': 'glass',
    'munch': 'cutlery',
    'retreat': 'leaf',
    'festival': 'music',
    'workshop': 'wrench',
    'performance': 'microphone',
    'discussion': 'comments',
    'event': 'calendar',
};

export const EventListItem: React.FC<ListItemProps> = ({
    item,
    onPress,
    noPadding,
    fullDate,
    attendees,
    isAdmin,
    footerContent,
    cardHeight,
    autoHeight,
}) => {
    const { toggleWishlistEvent, isOnWishlist } = useCalendarContext();
    const { authUserId } = useUserContext();
    const [scrolling, setScrolling] = useState(false);
    const eventAnalyticsProps = useEventAnalyticsProps(item);

    const promoCode = getEventPromoCodes(item)?.[0];
    const formattedDate = formatDate(item, fullDate);
    const itemIsOnWishlist = isOnWishlist(item.id);
    const imageUrl = getSafeImageUrl(item.image_url ? getSmallAvatarUrl(item.image_url) : undefined);
    const vetted = item.vetted;
    const locationLabel = item.location || item.city || item.region || '';
    const metaItems = [
        { key: 'date', label: formattedDate, icon: 'clock-o' },
        ...(locationLabel ? [{ key: 'location', label: locationLabel, icon: 'map-marker' }] : []),
        ...(item.price ? [{ key: 'price', label: item.price, icon: 'tag' }] : []),
    ];
    type TagChip = { label: string; kind: 'type' | 'level' | 'vetted' | 'tag' };
    const tagChips: TagChip[] = [];
    const seenTags = new Set<string>();
    const typeLabelMap: Record<string, string> = {
        play_party: 'Play Party',
        munch: 'Munch',
        retreat: 'Retreat',
        festival: 'Festival',
        workshop: 'Workshop',
        performance: 'Performance',
        discussion: 'Discussion',
    };
    const levelLabelMap: Record<string, string> = {
        beginner: 'Beginner',
        intermediate: 'Intermediate',
        advanced: 'Advanced',
    };

    const pushTag = (tag: string, kind: TagChip['kind']) => {
        const clean = tag.trim();
        if (!clean) return;
        const key = clean.toLowerCase();
        if (seenTags.has(key)) return;
        if (tagChips.length >= 3) return;
        seenTags.add(key);
        tagChips.push({ label: clean, kind });
    };

    if (item.play_party) pushTag('Play Party', 'type');
    if (item.is_munch) pushTag('Munch', 'type');
    if (item.type && item.type !== 'event') {
        pushTag(typeLabelMap[item.type] || item.type.replace(/_/g, ' '), 'type');
    }
    if (item.classification?.experience_level) {
        const level = item.classification.experience_level.toLowerCase();
        pushTag(levelLabelMap[level] || level.replace(/_/g, ' '), 'level');
    }
    if (vetted) pushTag('Vetted', 'vetted');

    const extraTags = [...(item.classification?.tags || []), ...(item.tags || [])];
    for (const tag of extraTags) {
        pushTag(tag, 'tag');
    }

    const tagChipColors = calendarTypeChips;
    const levelChipColors = calendarExperienceTone;
    const handlePressEvent = () => {
        // for attendee carousel scroll logic
        if (!scrolling) {
            onPress(item);
            logEvent(UE.EventListItemClicked, eventAnalyticsProps);
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

    const placeHolderImage = item.munch_id ? (
        <FAIcon name="cutlery" size={42} color={colors.textSlate} />
    ) : (
        <FAIcon name="calendar" size={42} color={colors.textSlate} />
    );

    const showApprovalBorder = isAdmin && item.approval_status && item.approval_status !== 'approved';

    const resolvedHeight = cardHeight ?? ITEM_HEIGHT;
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
                <TouchableOpacity onPress={handlePressEvent} activeOpacity={0.9}>
                    <View style={styles.poster}>
                        {imageUrl ? (
                            <Image
                                source={{ uri: imageUrl }}
                                style={styles.posterImage}
                                contentFit="cover"
                                cachePolicy="disk"
                                allowDownscaling
                                decodeFormat="rgb"
                            />
                        ) : (
                            <View style={styles.posterPlaceholder}>
                                {placeHolderImage}
                            </View>
                        )}
                        <LinearGradient
                            colors={[colors.overlayNone, colors.overlayDeep]}
                            style={styles.posterGradient}
                        />
                        {promoCode && (
                            <View style={styles.discountBadge}>
                                <Text style={styles.discountText}>
                                    {promoCode.discount_type === 'percent'
                                        ? `${promoCode.discount}% off`
                                        : `$${promoCode.discount} off`}
                                </Text>
                            </View>
                        )}
                        <View style={styles.posterActions}>
                            <WishlistHeart
                                itemIsOnWishlist={itemIsOnWishlist}
                                handleToggleEventWishlist={handleToggleEventWishlist}
                                size={24}
                            />
                        </View>
                        <View style={styles.posterFooter}>
                            <Text style={styles.eventTitle} numberOfLines={1}>
                                {item.name}
                            </Text>
                            <View style={styles.organizerRow}>
                                <View style={[styles.organizerDot, { backgroundColor: item.organizerColor || colors.textDisabled }]} />
                                <Text style={styles.organizerName} numberOfLines={1}>
                                    {item.organizer?.name}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.metaRow}
                        onScrollBeginDrag={() => setScrolling(true)}
                        onScrollEndDrag={() => setTimeout(() => setScrolling(false), 200)}
                    >
                        {metaItems.map((meta, index) => (
                            <View key={meta.key} style={styles.metaItem}>
                                {meta.icon && (
                                    <FAIcon name={meta.icon} size={12} color={colors.textMuted} style={styles.metaIcon} />
                                )}
                                <Text style={styles.metaText} numberOfLines={1}>{meta.label}</Text>
                                {index < metaItems.length - 1 && (
                                    <Text style={styles.metaSeparator}>.</Text>
                                )}
                            </View>
                        ))}
                    </ScrollView>

                    {(tagChips.length > 0 || attendees.length > 0) && (
                        <View style={styles.tagRowContainer}>
                            {tagChips.length > 0 ? (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.tagRow}
                                    style={styles.tagRowScroll}
                                    onScrollBeginDrag={() => setScrolling(true)}
                                    onScrollEndDrag={() => setTimeout(() => setScrolling(false), 200)}
                                >
                                    {tagChips.map((tag) => {
                                        const key = tag.label.toLowerCase();
                                        const colors =
                                            tag.kind === 'level'
                                                ? levelChipColors
                                                : tag.kind === 'tag'
                                                    ? getTagTone(tag.label)
                                                    : tagChipColors[key] || TAG_TONES.default;
                                        return (
                                            <View
                                                key={`${item.id}-${tag.label}`}
                                                style={[
                                                    styles.tagChip,
                                                    { backgroundColor: colors.background, borderColor: colors.border },
                                                ]}
                                            >
                                                {tag.kind === 'type' && (
                                                    <FAIcon
                                                        name={TYPE_ICONS[key] || 'calendar'}
                                                        size={11}
                                                        color={colors.text}
                                                        style={styles.tagChipIcon}
                                                    />
                                                )}
                                                {tag.kind === 'tag' && (
                                                    <FAIcon
                                                        name="tag"
                                                        size={11}
                                                        color={colors.text}
                                                        style={styles.tagChipIcon}
                                                    />
                                                )}
                                                {tag.kind === 'level' && (
                                                    <FAIcon
                                                        name="signal"
                                                        size={11}
                                                        color={colors.text}
                                                        style={styles.tagChipIcon}
                                                    />
                                                )}
                                                <Text
                                                    style={[
                                                        styles.tagChipText,
                                                        { color: colors.text },
                                                    ]}
                                                    numberOfLines={1}
                                                >
                                                    {tag.label}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </ScrollView>
                            ) : (
                                <View style={styles.tagRowSpacer} />
                            )}
                            {attendees.length > 0 && (
                                <View style={styles.attendeeWrap}>
                                    <AttendeeCarousel attendees={attendees} scrollEnabled={false} />
                                </View>
                            )}
                        </View>
                    )}
                </TouchableOpacity>
                {footerContent && (
                    <View style={styles.footer}>{footerContent}</View>
                )}
            </View>
        </View>
    );
};


export const ITEM_HEIGHT = 285;

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
        paddingVertical: spacing.sm,
        backgroundColor: colors.white,
    },
    poster: {
        height: 192,
        width: '100%',
        backgroundColor: colors.surfaceSubtle,
    },
    posterImage: {
        width: '100%',
        height: '100%',
    },
    posterPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.borderLight,
    },
    posterGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 110,
    },
    posterFooter: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    posterActions: {
        position: 'absolute',
        right: spacing.md,
        top: spacing.md,
    },
    eventTitle: {
        fontSize: fontSizes.xxl,
        fontWeight: '700',
        color: colors.white,
    },
    organizerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.xs,
    },
    organizerDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: spacing.sm,
    },
    organizerName: {
        fontSize: fontSizes.sm,
        color: colors.textOnDarkStrong,
    },
    discountBadge: {
        position: 'absolute',
        left: spacing.mdPlus,
        top: spacing.sm,
        backgroundColor: colors.gold,
        borderRadius: 8,
        paddingHorizontal: spacing.smPlus,
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
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm,
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
    tagRowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xs,
        paddingBottom: spacing.xs,
        marginTop: 0,
        minHeight: 44,
    },
    tagRowScroll: {
        flexGrow: 1,
        flexShrink: 1,
    },
    tagRow: {
        alignItems: 'center',
        flexDirection: 'row',
    },
    tagRowSpacer: {
        flexGrow: 1,
        flexShrink: 1,
    },
    tagChip: {
        borderRadius: radius.pill,
        paddingHorizontal: spacing.mdPlus,
        paddingVertical: spacing.xs,
        marginRight: spacing.sm,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    tagChipIcon: {
        marginRight: spacing.xs,
    },
    tagChipText: {
        fontSize: fontSizes.sm,
        fontWeight: '600',
    },
    attendeeWrap: {
        marginLeft: spacing.smPlus,
        maxWidth: '33%',
        alignItems: 'flex-end',
        flexShrink: 0,
        overflow: 'hidden',
    },
});
