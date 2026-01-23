import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FAIcon from 'react-native-vector-icons/FontAwesome5';

import EventCalendarView from '../Calendar/ListView/EventCalendarView';
import { LoginToAccess } from '../../components/LoginToAccess';
import { AvatarCircle } from '../Auth/Buttons/AvatarCircle';
import { useUserContext } from '../Auth/hooks/UserContext';
import { useAnalyticsProps } from '../../Common/hooks/useAnalytics';
import { logEvent } from '../../Common/hooks/logger';
import { useTabHighlight } from '../../Common/Nav/TabHighlightContext';
import type { NavStack } from '../../Common/Nav/NavStackType';
import {
    useCreateBuddy,
    useDeleteBuddy,
    useFetchBuddies,
    useFetchBuddyWishlist,
} from '../../Common/db-axios/useBuddies';
import { useFetchEvents } from '../../Common/db-axios/useEvents';
import { UE } from '../../userEventTypes';
import { colors, fontFamilies, fontSizes, radius, shadows, spacing } from '../../components/styles';

type BuddyEventsRoute = {
    params: {
        buddyId: string;
        buddyName?: string;
    };
};

const BUDDY_LIST_TOAST_DISMISSED_KEY = 'buddy_list_toast_dismissed_v1';
const BUDDY_LIST_TOAST_SCROLL_OFFSET = 200;

export const BuddyEventsScreen = ({ route }: { route: BuddyEventsRoute }) => {
    const navigation = useNavigation<NavStack>();
    const isFocused = useIsFocused();
    const { authUserId, userProfile } = useUserContext();
    const insets = useSafeAreaInsets();
    const { buddyId, buddyName: initialBuddyName } = route.params || {};
    const analyticsProps = useAnalyticsProps();
    const { setHighlightedTab } = useTabHighlight();
    const viewLoggedRef = useRef<string | null>(null);
    const [pendingBuddyId, setPendingBuddyId] = useState<string | null>(null);
    const [buddyListToastDismissed, setBuddyListToastDismissed] = useState<boolean | null>(null);
    const [buddyToastScrollToken, setBuddyToastScrollToken] = useState<number | null>(null);

    const { data: buddies = [] } = useFetchBuddies(authUserId);
    const { data: buddyWishlist, isLoading: isLoadingBuddyWishlist } = useFetchBuddyWishlist(buddyId, authUserId);
    const { data: allEvents = [], isLoading: isLoadingEvents } = useFetchEvents({
        includePrivate: !!authUserId,
    });
    const { mutateAsync: createBuddy, isPending: isAddingBuddy } = useCreateBuddy(authUserId);
    const { mutateAsync: deleteBuddy, isPending: isRemovingBuddy } = useDeleteBuddy(authUserId);

    const buddyProfile = useMemo(() => {
        return buddies.find((buddy) => buddy.user_id === buddyId)
            || (buddyWishlist
                ? {
                    user_id: buddyWishlist.user_id,
                    name: buddyWishlist.name,
                    avatar_url: buddyWishlist.avatar_url,
                }
                : null);
    }, [buddies, buddyId, buddyWishlist]);

    const isBuddy = useMemo(
        () => buddies.some((buddy) => buddy.user_id === buddyId),
        [buddies, buddyId]
    );

    const displayName = buddyProfile?.name?.trim()
        || buddyWishlist?.name?.trim()
        || initialBuddyName
        || 'Buddy';

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

    const isPendingBuddyAction = pendingBuddyId === buddyId || isAddingBuddy || isRemovingBuddy;
    const canToggleBuddy = !!authUserId && !!buddyId && buddyId !== authUserId;

    const handleAddBuddy = useCallback(async () => {
        if (!authUserId || !buddyId || buddyId === authUserId || isBuddy) return;

        try {
            setPendingBuddyId(buddyId);
            logEvent(UE.BuddyAddPressed, {
                ...analyticsProps,
                buddy_user_id: buddyId,
                source: 'buddy_list',
            });
            await createBuddy({ buddyUserId: buddyId });
            logEvent(UE.BuddyAddSucceeded, {
                ...analyticsProps,
                buddy_user_id: buddyId,
                source: 'buddy_list',
            });
        } catch (error) {
            console.error('Failed to add buddy', error);
            logEvent(UE.BuddyAddFailed, {
                ...analyticsProps,
                buddy_user_id: buddyId,
                source: 'buddy_list',
            });
            Alert.alert('Could not add buddy', `Try again later for ${displayName}.`);
        } finally {
            setPendingBuddyId(null);
        }
    }, [analyticsProps, authUserId, buddyId, createBuddy, displayName, isBuddy]);

    const handleRemoveBuddy = useCallback(async () => {
        if (!authUserId || !buddyId || buddyId === authUserId) return;

        try {
            setPendingBuddyId(buddyId);
            await deleteBuddy(buddyId);
        } catch (error) {
            console.error('Failed to remove buddy', error);
            Alert.alert('Could not remove buddy', `Try again later for ${displayName}.`);
        } finally {
            setPendingBuddyId(null);
        }
    }, [authUserId, buddyId, deleteBuddy, displayName]);

    const handleHeartPress = useCallback(() => {
        if (!canToggleBuddy || isPendingBuddyAction) return;
        if (isBuddy) {
            Alert.alert(
                `Remove ${displayName}?`,
                'They will no longer appear in your buddy list.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => void handleRemoveBuddy() },
                ]
            );
            return;
        }
        void handleAddBuddy();
    }, [canToggleBuddy, displayName, handleAddBuddy, handleRemoveBuddy, isBuddy, isPendingBuddyAction]);

    const handleBuddyListPress = useCallback(() => {
        navigation.navigate('Buddy List');
    }, [navigation]);

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const dismissed = await AsyncStorage.getItem(BUDDY_LIST_TOAST_DISMISSED_KEY);
                if (!mounted) return;
                setBuddyListToastDismissed(dismissed === 'true');
            } catch (error) {
                console.warn('[buddy list toast] failed to load dismissal state', error);
                if (mounted) {
                    setBuddyListToastDismissed(false);
                }
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    const shouldShowBuddyListToast =
        buddyListToastDismissed === false && !!authUserId && isFocused;

    useEffect(() => {
        setHighlightedTab(shouldShowBuddyListToast ? 'More' : null);
        return () => setHighlightedTab(null);
    }, [setHighlightedTab, shouldShowBuddyListToast]);

    useEffect(() => {
        if (!shouldShowBuddyListToast) {
            setBuddyToastScrollToken(null);
            return;
        }
        setBuddyToastScrollToken(Date.now());
    }, [shouldShowBuddyListToast]);

    const buddyToastScrim = shouldShowBuddyListToast ? (
        <View pointerEvents="none" style={styles.buddyToastScrim} />
    ) : null;

    const buddyListToast = shouldShowBuddyListToast ? (
        <View style={[styles.buddyToastBackdrop, { bottom: Math.max(insets.bottom + spacing.lg, spacing.lg) }]}>
            <View style={styles.buddyToastCard}>
                <View style={styles.buddyToastIcon}>
                    <FAIcon name="user-friends" size={12} color={colors.brandInk} />
                </View>
                <Text style={styles.buddyToastText}>
                    <Text
                        style={styles.buddyToastLink}
                        onPress={handleBuddyListPress}
                        accessibilityRole="link"
                    >
                        View your Buddy List
                    </Text>
                    <Text> in More &gt; Buddy List</Text>
                </Text>
                <TouchableOpacity
                    style={styles.buddyToastClose}
                    onPress={() => {
                        setBuddyListToastDismissed(true);
                        void AsyncStorage.setItem(BUDDY_LIST_TOAST_DISMISSED_KEY, 'true');
                    }}
                    accessibilityLabel="Dismiss buddy list tip"
                >
                    <FAIcon name="times" size={12} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>
        </View>
    ) : null;

    const renderHeaderCard = (subtitle: string) => (
        <View style={styles.headerCard}>
            <View style={styles.headerMainRow}>
                <AvatarCircle
                    userProfile={{ id: buddyId, name: displayName, avatar_url: buddyProfile?.avatar_url || '' }}
                    size={52}
                    name={displayName}
                />
                <View style={styles.headerCopy}>
                    <View style={styles.headerTitleRow}>
                        <Text style={styles.headerTitle}>{displayName}</Text>
                        <TouchableOpacity
                            style={[
                                styles.headerHeartButton,
                                isBuddy && styles.headerHeartButtonActive,
                                (!canToggleBuddy || isPendingBuddyAction) && styles.headerHeartButtonDisabled,
                            ]}
                            onPress={handleHeartPress}
                            disabled={!canToggleBuddy || isPendingBuddyAction}
                            accessibilityLabel={isBuddy ? `Remove ${displayName} as a buddy` : `Add ${displayName} as a buddy`}
                            accessibilityRole="button"
                        >
                            <FAIcon
                                name="heart"
                                size={12}
                                color={isBuddy ? colors.white : colors.danger}
                                solid={isBuddy}
                            />
                        </TouchableOpacity>
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

    if (isLoadingEvents || isLoadingBuddyWishlist) {
        return (
            <SafeAreaView style={styles.loadingState} edges={['left', 'right', 'bottom']}>
                <ActivityIndicator size="large" color={colors.brandPurple} />
            </SafeAreaView>
        );
    }

    const buddySharesCalendar = buddyWishlist?.share_calendar === true;

    if (!buddyEvents.length) {
        const shareCalendarStatus = userProfile?.share_calendar;
        const isSharingCalendar = shareCalendarStatus === true;
        const shouldPromptShareCalendar = shareCalendarStatus === false;
        const emptyMessage = buddySharesCalendar
            ? 'No shared events yet.'
            : 'This user hasn\'t shared their calendar yet.';
        const secondaryMessage = buddySharesCalendar
            ? 'Check back soon for their next plans.'
            : isSharingCalendar
                ? `Once they share, their events will show up here.${isBuddy ? '' : ' Tap the heart to add them as a buddy.'}`
                : shouldPromptShareCalendar
                    ? 'You haven\'t shared yours either. Turn it on below so others can see your events.'
                    : `Once they share, their events will show up here.${isBuddy ? '' : ' Tap the heart to add them as a buddy.'}`;

        return (
            <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
                <View style={styles.headerCardWrap}>
                    {renderHeaderCard(
                        buddySharesCalendar ? `${buddyWishlist?.events.length ?? 0} shared events` : 'Calendar not shared'
                    )}
                </View>
                <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>{emptyMessage}</Text>
                    <Text style={styles.emptySubtitle}>{secondaryMessage}</Text>
                    {!buddySharesCalendar && shouldPromptShareCalendar && (
                        <TouchableOpacity
                            style={styles.shareCalendarButton}
                            onPress={() => navigation.navigate('Consent', { source: 'settings' })}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.shareCalendarButtonText}>Share my calendar</Text>
                        </TouchableOpacity>
                    )}
                </View>
                {buddyToastScrim}
                {buddyListToast}
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
                scrollToTodayToken={buddyToastScrollToken}
                scrollToTodayOffset={BUDDY_LIST_TOAST_SCROLL_OFFSET}
            />
            {buddyToastScrim}
            {buddyListToast}
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
        padding: spacing.md,
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
    headerMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerCardWrap: {
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    headerCopy: {
        flex: 1,
        marginLeft: spacing.sm,
    },
    headerTitle: {
        fontSize: fontSizes.xl,
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: fontFamilies.display,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    headerHeartButton: {
        paddingHorizontal: spacing.xs,
        paddingVertical: spacing.xxs,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceWhiteFrosted,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
    },
    headerHeartButtonActive: {
        backgroundColor: colors.danger,
        borderColor: colors.danger,
    },
    headerHeartButtonDisabled: {
        opacity: 0.5,
    },
    headerSubtitle: {
        marginTop: spacing.xxs,
        fontSize: fontSizes.base,
        color: colors.textSecondary,
        fontFamily: fontFamilies.body,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
    },
    emptyTitle: {
        fontSize: fontSizes.lg,
        color: colors.textOnDarkStrong,
        textAlign: 'center',
        fontFamily: fontFamilies.body,
    },
    emptySubtitle: {
        marginTop: spacing.sm,
        fontSize: fontSizes.basePlus,
        color: colors.textOnDarkMuted,
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
    buddyToastBackdrop: {
        position: 'absolute',
        left: 0,
        right: 0,
        paddingHorizontal: spacing.lg,
        zIndex: 12,
    },
    buddyToastScrim: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(128, 128, 128, 0.8)',
        zIndex: 10,
    },
    buddyToastCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surfaceLavender,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.borderLavenderStrong,
        paddingHorizontal: spacing.mdPlus,
        paddingVertical: spacing.smPlus,
        ...shadows.card,
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
        elevation: 7,
    },
    buddyToastIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.surfaceLavenderOpaque,
        borderWidth: 1,
        borderColor: colors.borderLavenderStrong,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buddyToastText: {
        flex: 1,
        flexWrap: 'wrap',
        color: colors.textPrimary,
        fontSize: fontSizes.basePlus,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
        lineHeight: 20,
    },
    buddyToastLink: {
        color: colors.brandInk,
        textDecorationLine: 'underline',
    },
    buddyToastClose: {
        padding: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceLavenderOpaque,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
    },
});
