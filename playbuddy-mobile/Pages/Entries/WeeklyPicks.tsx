import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavStack } from '../../Common/Nav/NavStackType';
import { format, addWeeks, startOfWeek, endOfWeek } from 'date-fns';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import moment from 'moment-timezone';
import { useEventAnalyticsProps } from '../../Common/hooks/useAnalytics';
import { UE } from '../../userEventTypes';
import { logEvent } from '@amplitude/analytics-react-native';
import { useFetchEvents } from '../../Common/db-axios/useEvents';
import { colors, fontFamilies, fontSizes, gradients, lineHeights, radius, shadows, spacing } from '../../components/styles';

const NY_TIMEZONE = 'America/New_York';

type WeeklyPickItem = {
    dateKey: string;
    dayOfWeek: string;
    dateLabel: string;
    title: string;
    organizer: string;
    description: string;
    image: string;
    promoCodeDiscount: string | null;
    eventId: number;
    typeKey: string;
};

const DEFAULT_IMAGE_THEMES: Record<string, { label: string; icon: string; colors: string[]; textColor: string }> = {
    event: {
        label: 'Event',
        icon: 'calendar',
        colors: [colors.surfaceLavenderLight, colors.surfaceLavenderStrong],
        textColor: colors.brandViolet,
    },
    munch: {
        label: 'Munch',
        icon: 'restaurant',
        colors: [colors.surfaceGoldLight, colors.surfaceGoldWarm],
        textColor: colors.textGold,
    },
    play_party: {
        label: 'Play Party',
        icon: 'sparkles',
        colors: [colors.surfaceLavenderAlt, colors.surfaceLavenderStrong],
        textColor: colors.brandPurpleDark,
    },
    retreat: {
        label: 'Retreat',
        icon: 'leaf',
        colors: [colors.surfaceMuted, colors.surfaceLavenderLight],
        textColor: colors.success,
    },
    festival: {
        label: 'Festival',
        icon: 'musical-notes',
        colors: [colors.surfaceInfo, colors.surfaceInfoStrong],
        textColor: colors.brandBlue,
    },
    workshop: {
        label: 'Workshop',
        icon: 'construct',
        colors: [colors.surfaceRoseSoft, colors.surfaceRose],
        textColor: colors.warning,
    },
    performance: {
        label: 'Performance',
        icon: 'mic',
        colors: [colors.surfaceLavenderWarm, colors.surfaceLavenderAlt],
        textColor: colors.brandPlum,
    },
    discussion: {
        label: 'Discussion',
        icon: 'chatbubble-ellipses',
        colors: [colors.surfaceInfo, colors.surfaceGoldLight],
        textColor: colors.brandInk,
    },
};

const normalizeType = (value?: string) =>
    value?.toLowerCase().replace(/[\s-]+/g, '_').trim();

const resolveTypeKey = (event: any) => {
    if (event?.is_munch) return 'munch';
    if (event?.play_party) return 'play_party';
    const typeValue = normalizeType(event?.type) || normalizeType(event?.classification?.type);
    return typeValue || 'event';
};

const getImageTheme = (typeKey: string) =>
    DEFAULT_IMAGE_THEMES[typeKey] || DEFAULT_IMAGE_THEMES.event;

export const WeeklyPicks = () => {
    const { data: events } = useFetchEvents();
    const navigation = useNavigation<NavStack>();
    const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
    const [weekDates, setWeekDates] = useState<string[]>([]);

    const analyticsProps = useEventAnalyticsProps();

    // Build the 3 week labels (this week + next two)
    useEffect(() => {
        const dates: string[] = [];
        for (let i = 0; i < 3; i++) {
            const nyNow = moment().tz(NY_TIMEZONE);
            const start = startOfWeek(addWeeks(nyNow.toDate(), i), { weekStartsOn: 1 });
            const end = endOfWeek(start, { weekStartsOn: 1 });
            dates.push(`${format(start, 'MMM d')} - ${format(end, 'MMM d')}`);
        }
        setWeekDates(dates);
    }, []);

    const getWeeklyPicks = useCallback(
        (weekOffset: number): WeeklyPickItem[] => {
            const nyNow = moment().tz(NY_TIMEZONE);
            const startDate = startOfWeek(addWeeks(nyNow.toDate(), weekOffset), { weekStartsOn: 1 });
            const endDate = endOfWeek(startDate, { weekStartsOn: 1 });

            const picks = events
                ?.filter((e) => e?.weekly_pick)
                ?.filter((e) => {
                    const eventDate = new Date(e?.start_date ?? '');
                    return !Number.isNaN(eventDate.getTime()) && eventDate >= startDate && eventDate <= endDate;
                })
                ?.map((e) => {
                    const organizerPromoCode = e?.organizer?.promo_codes?.find((code: any) => code.scope === 'organizer');
                    const eventPromoCode = e?.promo_codes?.find((code: any) => code.scope === 'event');
                    const promoCodeDiscount = eventPromoCode || organizerPromoCode;

                    const eventDate = moment(new Date(e.start_date)).tz(NY_TIMEZONE);
                    const typeKey = resolveTypeKey(e);
                    return {
                        dateKey: eventDate.format('YYYY-MM-DD'),
                        dayOfWeek: eventDate.format('ddd'),
                        dateLabel: eventDate.format('MMM D'),
                        title: e?.name ?? '(Untitled)',
                        organizer: e?.organizer?.name ?? '(Unknown organizer)',
                        description: e?.short_description ?? '',
                        image: e?.image_url ?? '',
                        promoCodeDiscount: promoCodeDiscount ? `${promoCodeDiscount.discount}% off` : null,
                        eventId: e.id,
                        typeKey,
                    };
                })
                ?.sort((a, b) => new Date(a.dateKey).getTime() - new Date(b.dateKey).getTime());

            return picks || [];
        },
        [events]
    );

    const computedVisibleWeeks = useMemo(() => {
        if (weekDates.length === 0) return [];
        const arr: number[] = [];
        for (let i = 0; i < weekDates.length; i++) {
            if (getWeeklyPicks(i).length > 0) arr.push(i);
        }
        return arr;
    }, [weekDates, getWeeklyPicks]);

    useEffect(() => {
        if (computedVisibleWeeks.length > 0 && !computedVisibleWeeks.includes(currentWeekOffset)) {
            setCurrentWeekOffset(computedVisibleWeeks[0]);
        }
    }, [computedVisibleWeeks, currentWeekOffset]);

    const weeklyPicks = useMemo<WeeklyPickItem[]>(
        () => getWeeklyPicks(currentWeekOffset),
        [getWeeklyPicks, currentWeekOffset]
    );

    const eventsByDate = useMemo(() => {
        return weeklyPicks.reduce<Record<string, WeeklyPickItem[]>>((acc, ev) => {
            (acc[ev.dateKey] = acc[ev.dateKey] || []).push(ev);
            return acc;
        }, {});
    }, [weeklyPicks]);

    const onPressEvent = (eventId: number) => {
        const full = events?.find((ev: any) => ev?.id === eventId);

        logEvent(UE.WeeklyPicksEventDetailsClicked, { ...analyticsProps, event_id: eventId });

        if (full) {
            navigation.push('Event Details', { selectedEvent: full, title: full.name });
        }
    };

    const handlePrevWeek = () => {
        const idx = computedVisibleWeeks.findIndex((w) => w === currentWeekOffset) - 1;
        logEvent(UE.WeeklyPicksPrevWeekClicked, { ...analyticsProps, index: idx });
        if (idx >= 0) setCurrentWeekOffset(computedVisibleWeeks[idx]);
    };

    const handleNextWeek = () => {
        const idx = computedVisibleWeeks.findIndex((w) => w === currentWeekOffset) + 1;
        logEvent(UE.WeeklyPicksNextWeekClicked, { ...analyticsProps, index: idx });
        if (idx < computedVisibleWeeks.length) setCurrentWeekOffset(computedVisibleWeeks[idx]);
    };

    const showEmptyState = computedVisibleWeeks.length === 0 || !events;
    const isFirst = currentWeekOffset === computedVisibleWeeks[0];
    const isLast = currentWeekOffset === computedVisibleWeeks[computedVisibleWeeks.length - 1];

    return (
        <LinearGradient
            colors={gradients.welcome}
            locations={[0, 0.45, 0.78, 1]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.gradient}
        >
            <View pointerEvents="none" style={styles.glowTop} />
            <View pointerEvents="none" style={styles.glowMid} />
            <View pointerEvents="none" style={styles.glowBottom} />
            <View style={styles.container} /* ensure nothing transparent sits on top */>
                {showEmptyState ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.noEventsText}>No events available for the next few weeks.</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.weekSelector}>
                            <Pressable
                                onPress={handlePrevWeek}
                                disabled={isFirst}
                                hitSlop={8}
                                style={[styles.weekNavButton, isFirst && styles.weekNavButtonDisabled]}
                            >
                                <Ionicons name="chevron-back" size={24} color={isFirst ? colors.textDisabled : colors.brandViolet} />
                            </Pressable>

                            <View style={styles.weekTextWrap}>
                                <Text style={styles.weekKicker}>Week of</Text>
                                <Text style={styles.weekText}>{weekDates[currentWeekOffset] ?? ''}</Text>
                            </View>

                            <Pressable
                                onPress={handleNextWeek}
                                disabled={isLast}
                                hitSlop={8}
                                style={[styles.weekNavButton, isLast && styles.weekNavButtonDisabled]}
                            >
                                <Ionicons name="chevron-forward" size={24} color={isLast ? colors.textDisabled : colors.brandViolet} />
                            </Pressable>
                        </View>

                        <ScrollView
                            contentContainerStyle={styles.eventsContainer}
                            keyboardShouldPersistTaps="always"         // <- critical to avoid ScrollView swallowing taps
                            nestedScrollEnabled
                            removeClippedSubviews
                            showsVerticalScrollIndicator={false}
                        >
                            {Object.entries(eventsByDate).map(([dateKey, dayEvents]) => {
                                const header = dayEvents[0];
                                return (
                                    <View key={dateKey} style={styles.daySection}>
                                        <View style={styles.dayHeader}>
                                            <View>
                                                <Text style={styles.dayOfWeek}>{header?.dayOfWeek ?? ''}</Text>
                                                <Text style={styles.dateLabel}>{header?.dateLabel ?? ''}</Text>
                                            </View>
                                            <View style={styles.dayRule} />
                                        </View>
                                        {dayEvents.map((item) => {
                                            const imageTheme = getImageTheme(item.typeKey);
                                            return (
                                                <Pressable
                                                    key={item.eventId}
                                                    onPress={() => onPressEvent(item.eventId)}
                                                    android_ripple={{}}
                                                    hitSlop={6}
                                                    style={({ pressed }) => [styles.eventCard, pressed && styles.pressed]}
                                                >
                                                    <View style={styles.imageWrapper}>
                                                        {item.image ? (
                                                            <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
                                                        ) : (
                                                            <LinearGradient colors={imageTheme.colors} style={styles.imageFallback}>
                                                                <Ionicons name={imageTheme.icon} size={34} color={imageTheme.textColor} />
                                                                <Text style={[styles.imageFallbackText, { color: imageTheme.textColor }]}>
                                                                    {imageTheme.label}
                                                                </Text>
                                                            </LinearGradient>
                                                        )}
                                                        <View style={styles.imageTextBackdrop} pointerEvents="none">
                                                            <Text style={styles.eventTitle} numberOfLines={2}>
                                                                {item.title}
                                                            </Text>
                                                            <Text style={styles.organizer}>{item.organizer}</Text>
                                                            {!!item.description && (
                                                                <Text style={styles.description} numberOfLines={2}>
                                                                    {item.description}
                                                                </Text>
                                                            )}
                                                        </View>
                                                        {item.promoCodeDiscount && (
                                                            <View style={styles.discountBubble} pointerEvents="none">
                                                                <Text style={styles.discountText}>{item.promoCodeDiscount}</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </>
                )}
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    glowTop: {
        position: 'absolute',
        top: -80,
        right: -90,
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: colors.brandGlowTop,
    },
    glowMid: {
        position: 'absolute',
        top: 120,
        left: -110,
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: colors.brandGlowMid,
    },
    glowBottom: {
        position: 'absolute',
        bottom: -80,
        left: -90,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: colors.brandGlowWarm,
    },
    container: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xl,
    },
    title: {
        fontSize: fontSizes.display,
        fontWeight: '700',
        color: colors.white,
        textAlign: 'center',
        marginBottom: spacing.xs,
        fontFamily: fontFamilies.display,
        letterSpacing: 0.4,
    },
    subtitle: {
        fontSize: fontSizes.base,
        fontWeight: '600',
        color: colors.textOnDarkMuted,
        textAlign: 'center',
        fontFamily: fontFamilies.body,
        maxWidth: 300,
        lineHeight: lineHeights.md,
    },
    weekSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lgPlus,
        backgroundColor: colors.surfaceWhiteFrosted,
        borderRadius: radius.hero,
        borderWidth: 1,
        borderColor: colors.borderOnDarkStrong,
        ...shadows.brandCard,
    },
    weekNavButton: {
        width: 44,
        height: 44,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceWhiteStrong,
        borderWidth: 1,
        borderColor: colors.borderOnDarkSoft,
    },
    weekNavButtonDisabled: {
        backgroundColor: colors.surfaceMuted,
        borderColor: colors.borderMuted,
        opacity: 0.7,
    },
    weekTextWrap: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
    },
    weekKicker: {
        fontSize: fontSizes.xsPlus,
        letterSpacing: 1.6,
        textTransform: 'uppercase',
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    weekText: {
        fontSize: fontSizes.display,
        fontWeight: '700',
        color: colors.brandDeep,
        textAlign: 'center',
        fontFamily: fontFamilies.display,
        letterSpacing: 0.4,
    },
    eventsContainer: {
        paddingBottom: spacing.xxl,
    },
    daySection: {
        marginBottom: spacing.xl,
    },
    dayHeader: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: spacing.md,
    },
    dayOfWeek: {
        fontSize: fontSizes.headline,
        fontWeight: '700',
        color: colors.white,
        fontFamily: fontFamilies.display,
        letterSpacing: 1.8,
        textTransform: 'uppercase',
    },
    dateLabel: {
        fontSize: fontSizes.smPlus,
        color: colors.textOnDarkMuted,
        fontFamily: fontFamilies.body,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    dayRule: {
        flex: 1,
        height: 1,
        backgroundColor: colors.white,
        opacity: 0.4,
        marginLeft: spacing.md,
        marginBottom: spacing.xs,
    },
    eventCard: {
        backgroundColor: colors.surfaceWhiteStrong,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.borderOnDarkSoft,
        marginBottom: spacing.lg,
        overflow: 'hidden',
        ...shadows.brandCard,
    },
    pressed: {
        opacity: 0.85,
    },
    imageWrapper: {
        width: '100%',
        height: 200,
        position: 'relative',
        backgroundColor: colors.surfaceWhiteStrong,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    imageFallback: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.sm,
    },
    imageFallbackText: {
        fontSize: fontSizes.sm,
        fontWeight: '600',
        marginTop: spacing.xs,
        textAlign: 'center',
        fontFamily: fontFamilies.body,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    imageTextBackdrop: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
        backgroundColor: 'rgba(20,20,20,0.82)',
    },
    eventTitle: {
        fontSize: fontSizes.xxl,
        fontWeight: '700',
        color: colors.white,
        fontFamily: fontFamilies.display,
        lineHeight: lineHeights.lg,
    },
    organizer: {
        fontSize: fontSizes.smPlus,
        color: colors.textOnDarkMuted,
        marginTop: spacing.xs,
        fontFamily: fontFamilies.body,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    description: {
        fontSize: fontSizes.base,
        color: colors.textOnDarkMuted,
        marginTop: spacing.sm,
        lineHeight: lineHeights.md,
        fontFamily: fontFamilies.body,
    },
    discountBubble: {
        position: 'absolute',
        top: spacing.xs,
        left: spacing.xs,
        backgroundColor: colors.gold,
        paddingVertical: spacing.xxs,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.sm,
        shadowColor: colors.black,
        shadowOpacity: 0.16,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },
    discountText: {
        color: colors.textPrimary,
        fontSize: fontSizes.sm,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    noEventsText: {
        fontSize: fontSizes.lg,
        textAlign: 'center',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    emptyCard: {
        backgroundColor: colors.surfaceWhiteFrosted,
        borderRadius: radius.hero,
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderOnDarkStrong,
        ...shadows.brandCard,
    },
});
