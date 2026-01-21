import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import FAIcon from 'react-native-vector-icons/FontAwesome5';

import EventCalendarView from '../Calendar/ListView/EventCalendarView';
import { LoginToAccess } from '../../components/LoginToAccess';
import { AvatarCircle } from '../Auth/Buttons/AvatarCircle';
import { useUserContext } from '../Auth/hooks/UserContext';
import { useAnalyticsProps } from '../../Common/hooks/useAnalytics';
import { logEvent } from '../../Common/hooks/logger';
import type { NavStack } from '../../Common/Nav/NavStackType';
import { useFetchBuddies, useFetchBuddyWishlists } from '../../Common/db-axios/useBuddies';
import { useFetchEvents } from '../../Common/db-axios/useEvents';
import { UE } from '../../userEventTypes';
import { colors, fontFamilies, fontSizes, radius, shadows, spacing } from '../../components/styles';

type BuddyEventsRoute = {
    params: {
        buddyId: string;
        buddyName?: string;
    };
};

export const BuddyEventsScreen = ({ route }: { route: BuddyEventsRoute }) => {
    const navigation = useNavigation<NavStack>();
    const isFocused = useIsFocused();
    const { authUserId, userProfile } = useUserContext();
    const { buddyId, buddyName: initialBuddyName } = route.params || {};
    const analyticsProps = useAnalyticsProps();
    const viewLoggedRef = useRef<string | null>(null);

    const { data: buddies = [] } = useFetchBuddies(authUserId);
    const { data: buddyWishlists = [], isLoading: isLoadingWishlists } = useFetchBuddyWishlists(authUserId);
    const { data: allEvents = [], isLoading: isLoadingEvents } = useFetchEvents({
        includePrivate: !!authUserId,
    });

    const buddyProfile = useMemo(() => {
        return buddies.find((buddy) => buddy.user_id === buddyId)
            || buddyWishlists.find((buddy) => buddy.user_id === buddyId);
    }, [buddies, buddyId, buddyWishlists]);

    const isBuddy = useMemo(
        () => buddies.some((buddy) => buddy.user_id === buddyId),
        [buddies, buddyId]
    );

    const displayName = buddyProfile?.name?.trim() || initialBuddyName || 'Buddy';

    useLayoutEffect(() => {
        navigation.setOptions({ title: `${displayName}'s Events` });
    }, [displayName, navigation]);

    useEffect(() => {
        if (!isFocused) {
            viewLoggedRef.current = null;
            return;
        }
        if (!buddyId || viewLoggedRef.current === buddyId) return;
        logEvent(UE.BuddyEventsViewed, {
            ...analyticsProps,
            buddy_user_id: buddyId,
        });
        viewLoggedRef.current = buddyId;
    }, [analyticsProps, buddyId, isFocused]);

    const buddyWishlist = buddyWishlists.find((buddy) => buddy.user_id === buddyId);
    const buddyEventIdSet = useMemo(() => {
        const ids = new Set<string>();
        for (const eventId of buddyWishlist?.events || []) {
            ids.add(String(eventId));
        }
        return ids;
    }, [buddyWishlist]);

    const buddyEvents = useMemo(() => {
        if (!buddyEventIdSet.size) return [];
        return allEvents.filter((event) => buddyEventIdSet.has(String(event.id)));
    }, [allEvents, buddyEventIdSet]);

    const renderHeaderCard = (subtitle: string) => (
        <View style={styles.headerCard}>
            <TouchableOpacity
                style={styles.headerListButton}
                onPress={() => navigation.navigate('Buddy List')}
                activeOpacity={0.85}
                accessibilityLabel="View your buddy list"
            >
                <FAIcon name="user-friends" size={14} color={colors.brandPurpleDark} />
                <Text style={styles.headerListButtonText}>View your buddy list</Text>
            </TouchableOpacity>
            <View style={styles.headerMainRow}>
                <AvatarCircle
                    userProfile={{ id: buddyId, name: displayName, avatar_url: buddyProfile?.avatar_url || '' }}
                    size={64}
                    name={displayName}
                />
                <View style={styles.headerCopy}>
                    <View style={styles.headerTitleRow}>
                        <Text style={styles.headerTitle}>{displayName}</Text>
                        <View style={[styles.headerHeartBadge, !isBuddy && styles.headerHeartBadgeMuted]}>
                            <FAIcon
                                name="heart"
                                size={12}
                                color={isBuddy ? colors.white : colors.textSlate}
                                solid={isBuddy}
                            />
                        </View>
                    </View>
                    <Text style={styles.headerSubtitle}>{subtitle}</Text>
                </View>
            </View>
        </View>
    );

    const buddyHeader = renderHeaderCard(
        `${buddyEvents.length} shared ${buddyEvents.length === 1 ? 'event' : 'events'}`
    );

    if (!authUserId) {
        return <LoginToAccess entityToAccess="Buddy events" />;
    }

    if (isLoadingEvents || isLoadingWishlists) {
        return (
            <SafeAreaView style={styles.loadingState} edges={['left', 'right', 'bottom']}>
                <ActivityIndicator size="large" color={colors.brandPurple} />
            </SafeAreaView>
        );
    }

    if (!buddyEvents.length) {
        const shareCalendarStatus = userProfile?.share_calendar;
        const isSharingCalendar = shareCalendarStatus === true;
        const shouldPromptShareCalendar = shareCalendarStatus === false;
        const emptyMessage = buddyWishlist
            ? 'No shared events yet.'
            : isBuddy
                ? 'This user hasn\'t shared their calendar yet.'
                : 'Add this user as a buddy to see their shared events.';
        const secondaryMessage = buddyWishlist
            ? 'Check back soon for their next plans.'
            : isBuddy
                ? isSharingCalendar
                    ? 'Once they share, their events will show up here.'
                    : shouldPromptShareCalendar
                        ? 'You haven\'t shared yours either. Turn it on below so others can see your events.'
                        : 'Once they share, their events will show up here.'
                : 'You can add them from the heart button in Attendees.';

        return (
            <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
                <View style={styles.headerCardWrap}>
                    {renderHeaderCard(
                        buddyWishlist ? `${buddyWishlist.events.length} shared events` : 'Calendar not shared'
                    )}
                </View>
                <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>{emptyMessage}</Text>
                    <Text style={styles.emptySubtitle}>{secondaryMessage}</Text>
                    {!buddyWishlist && shouldPromptShareCalendar && (
                        <TouchableOpacity
                            style={styles.shareCalendarButton}
                            onPress={() => navigation.navigate('Consent', { source: 'settings' })}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.shareCalendarButtonText}>Share my calendar</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <EventCalendarView
                events={buddyEvents}
                entity="buddy_events"
                entityId={buddyId}
                headerContent={buddyHeader}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    loadingState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    headerCard: {
        padding: spacing.mdPlus,
        borderRadius: radius.xl,
        backgroundColor: colors.surfaceWhiteFrosted,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        flexDirection: 'column',
        shadowColor: colors.black,
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 3,
    },
    headerListButton: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.borderLavenderAlt,
        backgroundColor: colors.surfaceLavenderAlt,
        marginBottom: spacing.md,
    },
    headerListButtonText: {
        fontSize: fontSizes.basePlus,
        fontWeight: '600',
        color: colors.brandPurpleDark,
        fontFamily: fontFamilies.body,
    },
    headerMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerCardWrap: {
        marginHorizontal: spacing.lg,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    headerCopy: {
        flex: 1,
        marginLeft: spacing.md,
    },
    headerTitle: {
        fontSize: fontSizes.xxl,
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: fontFamilies.display,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    headerHeartBadge: {
        paddingHorizontal: spacing.xs,
        paddingVertical: 4,
        borderRadius: radius.pill,
        backgroundColor: colors.danger,
    },
    headerHeartBadgeMuted: {
        backgroundColor: colors.surfaceMutedAlt,
    },
    headerSubtitle: {
        marginTop: spacing.xs,
        fontSize: fontSizes.basePlus,
        color: colors.textSecondary,
        fontFamily: fontFamilies.body,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xxl,
        paddingTop: spacing.xxl,
    },
    emptyTitle: {
        fontSize: fontSizes.xl,
        color: colors.textSecondary,
        textAlign: 'center',
        fontFamily: fontFamilies.body,
    },
    emptySubtitle: {
        marginTop: spacing.sm,
        fontSize: fontSizes.basePlus,
        color: colors.textSubtle,
        textAlign: 'center',
        fontFamily: fontFamilies.body,
    },
    shareCalendarButton: {
        marginTop: spacing.lg,
        paddingVertical: spacing.smPlus,
        paddingHorizontal: spacing.xl,
        borderRadius: radius.pill,
        backgroundColor: colors.brandIndigo,
    },
    shareCalendarButtonText: {
        color: colors.white,
        fontSize: fontSizes.basePlus,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
});
