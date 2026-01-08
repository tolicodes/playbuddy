import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { EventWithMetadata, NavStack } from '../../Common/Nav/NavStackType';
import { format, addWeeks, startOfWeek, endOfWeek } from 'date-fns';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import moment from 'moment-timezone';
import { useEventAnalyticsProps } from '../../Common/hooks/useAnalytics';
import { UE } from '../../userEventTypes';
import { logEvent } from '@amplitude/analytics-react-native';
import { useFetchEvents } from '../../Common/db-axios/useEvents';
import { getAvailableOrganizers } from '../Calendar/hooks/calendarUtils';
import { addEventMetadata, buildOrganizerColorMap as mapOrganizerColors } from '../Calendar/hooks/eventHelpers';
import { EventListItem } from '../Calendar/ListView/EventListItem';
import { colors, fontFamilies, fontSizes, gradients, radius, shadows, spacing } from '../../components/styles';
import type { Attendee } from '../../commonTypes';

const NY_TIMEZONE = 'America/New_York';

type WeeklyPickGroup = {
    dayOfWeek: string;
    dateLabel: string;
    events: EventWithMetadata[];
};

export const WeeklyPicks = () => {
    const { data: events = [] } = useFetchEvents();
    const navigation = useNavigation<NavStack>();
    const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
    const [weekDates, setWeekDates] = useState<string[]>([]);

    const analyticsProps = useEventAnalyticsProps();
    const emptyAttendees = useMemo<Attendee[]>(() => [], []);
    const organizers = useMemo(() => getAvailableOrganizers(events), [events]);
    const organizerColorMap = useMemo(() => mapOrganizerColors(organizers as any), [organizers]);
    const eventsWithMetadata = useMemo(
        () => addEventMetadata({ events, organizerColorMap }),
        [events, organizerColorMap]
    );

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
        (weekOffset: number): EventWithMetadata[] => {
            const nyNow = moment().tz(NY_TIMEZONE);
            const startDate = startOfWeek(addWeeks(nyNow.toDate(), weekOffset), { weekStartsOn: 1 });
            const endDate = endOfWeek(startDate, { weekStartsOn: 1 });

            const picks = eventsWithMetadata
                .filter((e) => e?.weekly_pick)
                .filter((e) => {
                    const eventDate = new Date(e?.start_date ?? '');
                    return !Number.isNaN(eventDate.getTime()) && eventDate >= startDate && eventDate <= endDate;
                })
                .sort((a, b) => new Date(a.start_date ?? '').getTime() - new Date(b.start_date ?? '').getTime());

            return picks || [];
        },
        [eventsWithMetadata]
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

    const weeklyPicks = useMemo<EventWithMetadata[]>(
        () => getWeeklyPicks(currentWeekOffset),
        [getWeeklyPicks, currentWeekOffset]
    );

    const eventsByDate = useMemo(() => {
        return weeklyPicks.reduce<Record<string, WeeklyPickGroup>>((acc, ev) => {
            const eventDate = moment(new Date(ev.start_date)).tz(NY_TIMEZONE);
            if (!eventDate.isValid()) return acc;
            const dateKey = eventDate.format('YYYY-MM-DD');
            if (!acc[dateKey]) {
                acc[dateKey] = {
                    dayOfWeek: eventDate.format('ddd'),
                    dateLabel: eventDate.format('MMM D'),
                    events: [],
                };
            }
            acc[dateKey].events.push(ev);
            return acc;
        }, {});
    }, [weeklyPicks]);

    const onPressEvent = (event: EventWithMetadata) => {
        logEvent(UE.WeeklyPicksEventDetailsClicked, { ...analyticsProps, event_id: event.id });
        navigation.push('Event Details', { selectedEvent: event, title: event.name });
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

    const showEmptyState = computedVisibleWeeks.length === 0;
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
                            {Object.entries(eventsByDate).map(([dateKey, group]) => (
                                <View key={dateKey} style={styles.daySection}>
                                    <View style={styles.dayHeader}>
                                        <View>
                                            <Text style={styles.dayOfWeek}>{group.dayOfWeek}</Text>
                                            <Text style={styles.dateLabel}>{group.dateLabel}</Text>
                                        </View>
                                        <View style={styles.dayRule} />
                                    </View>
                                    {group.events.map((event) => (
                                        <EventListItem
                                            key={event.id}
                                            item={event}
                                            onPress={onPressEvent}
                                            attendees={emptyAttendees}
                                            noPadding
                                        />
                                    ))}
                                </View>
                            ))}
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
