import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SectionList,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

import type { EventAttendees } from '../../commonTypes';
import type { EventWithMetadata, NavStack } from '../../Common/Nav/NavStackType';
import { useUserContext } from '../Auth/hooks/UserContext';
import { useCalendarContext } from '../Calendar/hooks/CalendarContext';
import { useGroupedEvents } from '../Calendar/hooks/useGroupedEventsMain';
import { EventListItem } from '../Calendar/ListView/EventListItem';
import { useFetchAttendees } from '../../Common/db-axios/useAttendees';
import { useFetchWishlistByCode } from '../../Common/db-axios/useWishlist';
import { useToggleWeeklyPickEvent } from '../../Common/db-axios/useEvents';
import { ADMIN_EMAILS } from '../../config';
import {
    colors,
    eventListThemes,
    fontFamilies,
    fontSizes,
    radius,
    shadows,
    spacing,
} from '../../components/styles';

const PB_SHARE_CODE = 'DCK9PD';
const HEADER_HEIGHT = 34;

export const WeeklyPicksAdminScreen = () => {
    const navigation = useNavigation<NavStack>();
    const { userProfile } = useUserContext();
    const isAdmin = !!userProfile?.email && ADMIN_EMAILS.includes(userProfile.email);

    const { allEvents, isLoadingEvents } = useCalendarContext();
    const { data: attendees = [] } = useFetchAttendees();
    const { data: wishlist = [], isLoading: wishlistLoading, error: wishlistError } = useFetchWishlistByCode(PB_SHARE_CODE);
    const { mutate: toggleWeeklyPickEvent, isPending: togglePending } = useToggleWeeklyPickEvent();

    const attendeesByEvent = useMemo(() => {
        const map = new Map<number, EventAttendees['attendees']>();
        attendees.forEach((entry) => map.set(entry.event_id, entry.attendees || []));
        return map;
    }, [attendees]);

    const wishlistSet = useMemo(() => new Set(wishlist), [wishlist]);
    const { sections } = useGroupedEvents(allEvents);
    const eventListConfig = eventListThemes.welcome;

    if (!isAdmin) {
        return (
            <View style={styles.container}>
                <View style={styles.lockedCard}>
                    <View style={styles.lockedIcon}>
                        <Ionicons name="lock-closed" size={20} color={colors.textMuted} />
                    </View>
                    <Text style={styles.lockedTitle}>Admins only</Text>
                    <Text style={styles.lockedText}>
                        Weekly Picks tools are reserved for PlayBuddy staff.
                    </Text>
                </View>
            </View>
        );
    }

    if (isLoadingEvents || wishlistLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.linkBlue} />
                <Text style={styles.loadingText}>Loading Weekly Picks...</Text>
            </View>
        );
    }

    if (wishlistError) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Failed to load weekly picks data.</Text>
            </View>
        );
    }

    const renderItem = ({ item }: { item: EventWithMetadata }) => {
        const attendeesForEvent = attendeesByEvent.get(item.id) || [];
        const isWeeklyPick = !!item.weekly_pick;
        const isInWishlist = wishlistSet.has(item.id);

        const adminFooter = (
            <View style={styles.adminActions}>
                <TouchableOpacity
                    style={[
                        styles.actionPill,
                        isWeeklyPick && styles.actionPillActive,
                    ]}
                    onPress={() =>
                        toggleWeeklyPickEvent({ eventId: item.id, status: !isWeeklyPick })
                    }
                    disabled={togglePending}
                >
                    <Ionicons
                        name={isWeeklyPick ? 'checkbox' : 'square-outline'}
                        size={16}
                        color={isWeeklyPick ? colors.brandIndigo : colors.textMuted}
                    />
                    <Text
                        style={[
                            styles.actionText,
                            isWeeklyPick && styles.actionTextActive,
                        ]}
                    >
                        Weekly Pick
                    </Text>
                </TouchableOpacity>

                <View
                    style={[
                        styles.actionPill,
                        styles.actionPillReadOnly,
                        isInWishlist && styles.actionPillWishlist,
                    ]}
                >
                    <Ionicons
                        name={isInWishlist ? 'heart' : 'heart-outline'}
                        size={16}
                        color={isInWishlist ? colors.brandPink : colors.textMuted}
                    />
                    <Text
                        style={[
                            styles.actionText,
                            isInWishlist && styles.actionTextWishlist,
                        ]}
                    >
                        PB Wishlist
                    </Text>
                </View>
            </View>
        );

        return (
            <EventListItem
                item={item}
                attendees={attendeesForEvent}
                onPress={(event) =>
                    navigation.push('Event Details', {
                        selectedEvent: event,
                        title: event.name,
                    })
                }
                isAdmin
                footerContent={adminFooter}
                autoHeight
            />
        );
    };

    const renderSectionHeader = ({ section }: { section: { title: string } }) => (
        <View style={styles.sectionHeaderOuterWrapper}>
            <View style={styles.sectionHeaderPill}>
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
        </View>
    );

    return (
        <LinearGradient
            colors={eventListConfig.colors}
            locations={eventListConfig.locations}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.screenGradient}
        >
            <View pointerEvents="none" style={[styles.screenGlowTop, { backgroundColor: eventListConfig.glows[0] }]} />
            <View pointerEvents="none" style={[styles.screenGlowMid, { backgroundColor: eventListConfig.glows[1] }]} />
            <View pointerEvents="none" style={[styles.screenGlowBottom, { backgroundColor: eventListConfig.glows[2] }]} />

            <View style={styles.container}>
                <SectionList
                    sections={sections}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderItem}
                    renderSectionHeader={renderSectionHeader}
                    stickySectionHeadersEnabled
                    style={styles.sectionList}
                    contentContainerStyle={styles.sectionListContent}
                    ListEmptyComponent={
                        <View style={styles.emptyList}>
                            <Text style={styles.emptyText}>No events found</Text>
                        </View>
                    }
                />
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    screenGradient: {
        flex: 1,
    },
    screenGlowTop: {
        position: 'absolute',
        top: -70,
        right: -80,
        width: 240,
        height: 240,
        borderRadius: 120,
    },
    screenGlowMid: {
        position: 'absolute',
        top: 140,
        left: -120,
        width: 220,
        height: 220,
        borderRadius: 110,
    },
    screenGlowBottom: {
        position: 'absolute',
        bottom: -70,
        left: -90,
        width: 300,
        height: 300,
        borderRadius: 150,
    },
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    sectionList: {
        flex: 1,
        marginTop: spacing.xs,
    },
    sectionListContent: {
        paddingBottom: spacing.xxxl,
    },
    sectionHeaderOuterWrapper: {
        paddingBottom: spacing.md,
        paddingTop: spacing.md,
        marginHorizontal: spacing.lg,
    },
    sectionHeaderPill: {
        width: '100%',
        backgroundColor: colors.white,
        paddingHorizontal: spacing.lg,
        height: HEADER_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.borderLavenderSoft,
        alignSelf: 'stretch',
        shadowColor: colors.black,
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },
    sectionHeaderText: {
        fontSize: fontSizes.base,
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
        fontFamily: fontFamilies.body,
    },
    adminActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flexWrap: 'wrap',
    },
    actionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        backgroundColor: colors.surfaceWhiteStrong,
        paddingHorizontal: spacing.smPlus,
        paddingVertical: spacing.xxs,
        marginRight: spacing.sm,
    },
    actionPillActive: {
        backgroundColor: colors.tintViolet,
        borderColor: colors.borderLavenderAlt,
    },
    actionPillReadOnly: {
        backgroundColor: colors.surfaceSubtle,
        borderColor: colors.borderSubtle,
    },
    actionPillWishlist: {
        backgroundColor: 'rgba(255, 38, 117, 0.12)',
        borderColor: 'rgba(255, 38, 117, 0.35)',
    },
    actionText: {
        marginLeft: spacing.xs,
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    actionTextActive: {
        color: colors.brandIndigo,
        fontWeight: '600',
    },
    actionTextWishlist: {
        color: colors.brandPink,
        fontWeight: '600',
    },
    emptyList: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing.jumbo,
    },
    emptyText: {
        fontSize: fontSizes.xl,
        color: colors.textSlate,
        fontFamily: fontFamilies.body,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceMuted,
        padding: spacing.lg,
    },
    loadingText: {
        marginTop: spacing.sm,
        fontSize: fontSizes.base,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    errorText: {
        fontSize: fontSizes.base,
        color: colors.danger,
        margin: spacing.lg,
        fontFamily: fontFamilies.body,
    },
    lockedCard: {
        margin: spacing.lg,
        padding: spacing.lg,
        borderRadius: radius.xl,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderLight,
        alignItems: 'center',
        ...shadows.card,
    },
    lockedIcon: {
        width: 46,
        height: 46,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    lockedTitle: {
        fontSize: fontSizes.title,
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: fontFamilies.display,
        marginBottom: spacing.xs,
    },
    lockedText: {
        fontSize: fontSizes.base,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 20,
        fontFamily: fontFamilies.body,
    },
});

export default WeeklyPicksAdminScreen;
