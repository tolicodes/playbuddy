import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavStack } from '../../Common/Nav/NavStackType';
import { format, addWeeks, startOfWeek, endOfWeek } from 'date-fns';
import Ionicons from 'react-native-vector-icons/Ionicons';
import moment from 'moment-timezone';
import { useEventAnalyticsProps } from '../../Common/hooks/useAnalytics';
import { UE } from '../../userEventTypes';
import { logEvent } from '@amplitude/analytics-react-native';
import { useFetchEvents } from '../../Common/dist/db-axios/useEvents';
import { colors, fontFamilies, fontSizes, lineHeights, radius, spacing } from '../../components/styles';

const NY_TIMEZONE = 'America/New_York';

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
            dates.push(`${format(start, 'MMM d')} - ${format(end, 'MMM d')}${i === 0 ? ' (this week)' : ''}`);
        }
        setWeekDates(dates);
    }, []);

    const getWeeklyPicks = useCallback(
        (weekOffset: number) => {
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
                    return {
                        dateKey: eventDate.format('YYYY-MM-DD'),
                        dayOfWeek: eventDate.format('ddd'),
                        title: e?.name ?? '(Untitled)',
                        organizer: e?.organizer?.name ?? '(Unknown organizer)',
                        description: e?.short_description ?? '',
                        image: e?.image_url ?? '',
                        promoCodeDiscount: promoCodeDiscount ? `${promoCodeDiscount.discount}% off` : null,
                        eventId: e?.id,
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

    const weeklyPicks = useMemo(
        () => getWeeklyPicks(currentWeekOffset),
        [getWeeklyPicks, currentWeekOffset]
    );

    const eventsByDate = useMemo(() => {
        return weeklyPicks.reduce<Record<string, any[]>>((acc, ev) => {
            (acc[ev.dateKey] = acc[ev.dateKey] || []).push(ev);
            return acc;
        }, {});
    }, [weeklyPicks]);

    const onPressEvent = (eventId: number) => {
        const full = events?.find((ev: any) => ev?.id === eventId);

        logEvent(UE.WeeklyPicksEventDetailsClicked, { ...analyticsProps, event_id: eventId });

        if (full) {
            // using push helps in cases where a stale 'Event Details' might already exist on stack
            navigation.navigate('Event Details', { selectedEvent: full });
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

    if (computedVisibleWeeks.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.noEventsText}>No events available for the next few weeks.</Text>
            </View>
        );
    }

    const isFirst = currentWeekOffset === computedVisibleWeeks[0];
    const isLast = currentWeekOffset === computedVisibleWeeks[computedVisibleWeeks.length - 1];

    if (!events) {
        return (
            <View style={styles.container}>
                <Text style={styles.noEventsText}>No events available for the next few weeks.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container} /* ensure nothing transparent sits on top */>
            <View style={styles.weekSelector}>
                <Pressable onPress={handlePrevWeek} disabled={isFirst} hitSlop={8}>
                    <Ionicons name="chevron-back" size={24} color={isFirst ? colors.textDisabled : colors.brandViolet} />
                </Pressable>

                <Text style={styles.weekText}>{weekDates[currentWeekOffset] ?? ''}</Text>

                <Pressable onPress={handleNextWeek} disabled={isLast} hitSlop={8}>
                    <Ionicons name="chevron-forward" size={24} color={isLast ? colors.textDisabled : colors.brandViolet} />
                </Pressable>
            </View>

            <ScrollView
                contentContainerStyle={styles.eventsContainer}
                keyboardShouldPersistTaps="always"         // <- critical to avoid ScrollView swallowing taps
                nestedScrollEnabled
                removeClippedSubviews
            >
                {Object.entries(eventsByDate).map(([dateKey, events]) => (
                    <View key={dateKey} style={styles.card}>
                        <View style={styles.dayWrapper}>
                            <Text style={styles.day}>{events[0]?.dayOfWeek ?? ''}</Text>
                        </View>
                        <View style={styles.detailsColumn}>
                            {events.map((item: any, i: number) => (
                                <React.Fragment key={item.eventId}>
                                    <Pressable
                                        onPress={() => onPressEvent(item.eventId)}
                                        android_ripple={{}}
                                        hitSlop={6}
                                        style={({ pressed }) => [styles.eventRow, pressed && styles.pressed]}
                                    >
                                        <View style={styles.textContainer}>
                                            <Text style={styles.eventTitle} numberOfLines={2}>
                                                {item.title}
                                            </Text>
                                            <Text style={styles.organizer}>{item.organizer}</Text>
                                            <Text style={styles.description} numberOfLines={2}>
                                                {item.description}
                                            </Text>
                                        </View>

                                        <View style={styles.imageWrapper}>
                                            {item.image ? (
                                                <Image source={{ uri: item.image }} style={styles.image} />
                                            ) : (
                                                <View style={styles.imagePlaceholder} />
                                            )}
                                            {item.promoCodeDiscount && (
                                                <View style={styles.discountBubble} pointerEvents="none">
                                                    <Text style={styles.discountText}>{item.promoCodeDiscount}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </Pressable>

                                    {i < events.length - 1 && <View style={styles.separator} />}
                                </React.Fragment>
                            ))}
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    weekSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.xl,
    },
    weekText: {
        fontSize: fontSizes.xl,
        fontWeight: '600',
        color: colors.white,
        fontFamily: fontFamilies.body,
    },
    eventsContainer: {},
    card: {
        flexDirection: 'row',
        backgroundColor: colors.white,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.mdPlus,
        overflow: 'hidden',
    },
    dayWrapper: {
        width: 60,
        backgroundColor: colors.surfaceLavenderWarm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    day: {
        fontSize: fontSizes.xxxl,
        fontWeight: '600',
        color: colors.brandViolet,
        fontFamily: fontFamilies.body,
    },
    detailsColumn: {
        flex: 1,
        padding: spacing.md,
    },
    eventRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pressed: {
        opacity: 0.7,
    },
    separator: {
        height: 1,
        backgroundColor: colors.textDisabled,
        marginVertical: spacing.mdPlus,
    },
    textContainer: {
        flex: 1,
        paddingRight: spacing.sm,
    },
    eventTitle: {
        fontSize: fontSizes.xl,
        fontWeight: '600',
        color: colors.brandDeep,
        fontFamily: fontFamilies.body,
    },
    organizer: {
        fontSize: fontSizes.base,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    description: {
        fontSize: fontSizes.smPlus,
        color: colors.textPrimary,
        marginTop: spacing.xs,
        lineHeight: lineHeights.sm,
        fontFamily: fontFamilies.body,
    },
    imageWrapper: {
        width: 80,
        height: 80,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
        borderRadius: radius.md,
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: radius.md,
        backgroundColor: colors.surfaceSubtle,
    },
    discountBubble: {
        position: 'absolute',
        bottom: spacing.xs,
        right: spacing.xs,
        backgroundColor: colors.gold,
        paddingVertical: spacing.xxs,
        paddingHorizontal: spacing.xsPlus,
        borderRadius: radius.sm,
    },
    discountText: {
        color: colors.textPrimary,
        fontSize: fontSizes.sm,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    noEventsText: {
        fontSize: fontSizes.xl,
        textAlign: 'center',
        marginTop: spacing.xl,
        color: colors.white,
        fontFamily: fontFamilies.body,
    },
});
