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
import { colors, fontSizes, radius, shadows, spacing } from '../../../components/styles';
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
}

const TAG_TONES = {
    spiritual: { background: '#FFF4E6', text: '#B45309', border: '#FFD7A8' },
    social: { background: '#E9FBF3', text: '#1F8A5B', border: '#BDEDD8' },
    skill: { background: '#EEF5FF', text: '#2B5AD7', border: '#CFE0FF' },
    scene: { background: '#F6EEFF', text: '#6B35C6', border: '#DEC8FF' },
    default: { background: '#F5F1FF', text: '#4B2ABF', border: '#E3DBFF' },
};

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

export const EventListItem: React.FC<ListItemProps> = ({ item, onPress, noPadding, fullDate, attendees, isAdmin }) => {
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
        if (tagChips.length >= 6) return;
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

    const tagChipColors: Record<string, { background: string; text: string; border: string }> = {
        'play party': { background: '#EFE9FF', text: '#5A43B5', border: '#DED7FF' },
        'munch': { background: '#FFE2B6', text: '#8A5200', border: '#F1C07A' },
        'retreat': { background: '#EAF6EE', text: '#2E6B4D', border: '#D6EBDC' },
        'festival': { background: '#E8F1FF', text: '#2F5DA8', border: '#D6E4FB' },
        'workshop': { background: '#FDEBEC', text: '#9A3D42', border: '#F6D7DA' },
        'performance': { background: '#F1E9FF', text: '#5D3FA3', border: '#E2D6FB' },
        'discussion': { background: '#E8F5F8', text: '#2D5E6F', border: '#D3E7EE' },
        'vetted': { background: '#E9F8EF', text: '#2F6E4A', border: '#D7F0E1' },
    };
    const levelChipColors = { background: '#E7F0FF', text: '#2F5DA8', border: '#D6E4FB' };
    const eventTypeKey = (() => {
        if (item.play_party) return 'play party';
        if (item.is_munch) return 'munch';
        if (item.type && item.type !== 'event') return item.type.replace(/_/g, ' ').toLowerCase();
        return 'event';
    })();
    const eventTypeLabel = (() => {
        if (item.play_party) return 'Play Party';
        if (item.is_munch) return 'Munch';
        if (item.type && item.type !== 'event') {
            return typeLabelMap[item.type] || item.type.replace(/_/g, ' ');
        }
        return 'Event';
    })();
    const typePillColors = tagChipColors[eventTypeKey] || TAG_TONES.default;

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
        <FAIcon name="cutlery" size={42} color="#666" />
    ) : (
        <FAIcon name="calendar" size={42} color="#666" />
    );

    const showApprovalBorder = isAdmin && item.approval_status && item.approval_status !== 'approved';

    return (
        <View style={styles.wrapper}>
            <View style={[
                styles.cardWrapper,
                noPadding && styles.noPadding,
                showApprovalBorder && styles.pendingBorder
            ]}>
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
                            colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.85)']}
                            style={styles.posterGradient}
                        />
                        <View style={styles.posterBadges}>
                            <View
                                style={[
                                    styles.typePill,
                                    { backgroundColor: typePillColors.background, borderColor: typePillColors.border },
                                ]}
                            >
                                <FAIcon
                                    name={TYPE_ICONS[eventTypeKey] || 'calendar'}
                                    size={10}
                                    color={typePillColors.text}
                                    style={styles.typePillIcon}
                                />
                                <Text style={[styles.typePillText, { color: typePillColors.text }]}>
                                    {eventTypeLabel}
                                </Text>
                            </View>
                            {promoCode && (
                                <View style={styles.discountBadge}>
                                    <Text style={styles.discountText}>
                                        {promoCode.discount_type === 'percent'
                                            ? `${promoCode.discount}% off`
                                            : `$${promoCode.discount} off`}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.posterActions}>
                            <WishlistHeart
                                itemIsOnWishlist={itemIsOnWishlist}
                                handleToggleEventWishlist={handleToggleEventWishlist}
                                backgroundColor="#9ca3af"
                                size={32}
                            />
                        </View>
                        <View style={styles.posterFooter}>
                            <Text style={styles.eventTitle} numberOfLines={1}>
                                {item.name}
                            </Text>
                            <View style={styles.organizerRow}>
                                <View style={[styles.organizerDot, { backgroundColor: item.organizerColor || '#ccc' }]} />
                                <Text style={styles.organizerName} numberOfLines={1}>
                                    {item.organizer?.name}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.metaRowScroll}
                        contentContainerStyle={styles.metaRow}
                        onScrollBeginDrag={() => setScrolling(true)}
                        onScrollEndDrag={() => setTimeout(() => setScrolling(false), 200)}
                    >
                        <View style={styles.metaItem}>
                            <FAIcon name="calendar" size={12} color="#555" style={styles.metaIcon} />
                            <Text style={styles.metaText} numberOfLines={1}>{formattedDate}</Text>
                        </View>
                        {locationLabel ? (
                            <View style={styles.metaItem}>
                                <FAIcon name="map-marker" size={12} color="#555" style={styles.metaIcon} />
                                <Text style={styles.metaText} numberOfLines={1}>{locationLabel}</Text>
                            </View>
                        ) : null}
                        {item.price ? (
                            <View style={styles.metaItem}>
                                <FAIcon name="tag" size={11} color="#555" style={styles.metaIcon} />
                                <Text style={styles.metaText} numberOfLines={1}>{item.price}</Text>
                            </View>
                        ) : null}
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
                                                        size={10}
                                                        color={colors.text}
                                                        style={styles.tagChipIcon}
                                                    />
                                                )}
                                                {tag.kind === 'tag' && (
                                                    <FAIcon
                                                        name="tag"
                                                        size={10}
                                                        color={colors.text}
                                                        style={styles.tagChipIcon}
                                                    />
                                                )}
                                                {tag.kind === 'level' && (
                                                    <FAIcon
                                                        name="signal"
                                                        size={10}
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
            </View>
        </View>
    );
};


export const ITEM_HEIGHT = 196;

const styles = StyleSheet.create({
    // Container
    wrapper: {
        height: ITEM_HEIGHT,
    },
    cardWrapper: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderLavender,
        borderRadius: radius.lg,
        overflow: 'hidden',
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        height: ITEM_HEIGHT - 16,
        position: 'relative',
        ...shadows.card,
    },
    noPadding: {
        marginHorizontal: 0,
    },
    pendingBorder: {
        borderColor: '#d97706',
        borderStyle: 'dotted',
        borderWidth: 3,
    },
    poster: {
        height: 120,
        width: '100%',
        backgroundColor: '#f2f2f2',
    },
    posterImage: {
        width: '100%',
        height: '100%',
    },
    posterPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'flex-start',
        alignItems: 'center',
        backgroundColor: '#e9e9e9',
        paddingTop: 10,
    },
    posterGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 78,
    },
    posterBadges: {
        position: 'absolute',
        left: spacing.mdPlus,
        top: spacing.mdPlus,
        alignItems: 'flex-start',
        gap: spacing.xs,
    },
    typePill: {
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xxs,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    typePillIcon: {
        marginRight: spacing.xs,
    },
    typePillText: {
        fontSize: fontSizes.xsPlus,
        fontWeight: '700',
    },
    posterFooter: {
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        bottom: spacing.md,
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
        color: '#f2f2f2',
    },
    discountBadge: {
        backgroundColor: '#FFD700',
        borderRadius: 8,
        paddingHorizontal: spacing.smPlus,
        paddingVertical: spacing.xs,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
        elevation: 2,
    },
    discountText: {
        fontSize: fontSizes.smPlus,
        fontWeight: 'bold',
        color: 'black',
    },
    metaRowScroll: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: spacing.smPlus,
    },
    metaIcon: {
        marginRight: spacing.sm,
    },
    metaText: {
        fontSize: fontSizes.xs,
        color: '#555',
        fontWeight: '600',
    },
    tagRowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xxs,
        paddingBottom: spacing.xs,
        marginTop: spacing.xxs,
        minHeight: 24,
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
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xxs,
        marginRight: spacing.sm,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    tagChipIcon: {
        marginRight: spacing.xs,
    },
    tagChipText: {
        fontSize: fontSizes.xsPlus,
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
