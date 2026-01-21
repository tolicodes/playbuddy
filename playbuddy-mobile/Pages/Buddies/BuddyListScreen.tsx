import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { useIsFocused, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { LoginToAccess } from '../../components/LoginToAccess';
import { AvatarCircle } from '../Auth/Buttons/AvatarCircle';
import { useUserContext } from '../Auth/hooks/UserContext';
import { ShareCalendarModal } from '../ShareCalendarModal';
import { useAnalyticsProps } from '../../Common/hooks/useAnalytics';
import { logEvent } from '../../Common/hooks/logger';
import type { NavStack, NavStackProps } from '../../Common/Nav/NavStackType';
import { navigateToTab } from '../../Common/Nav/navigationHelpers';
import {
    type BuddyProfile,
    useCreateBuddy,
    useDeleteBuddy,
    useFetchBuddies,
    useFetchBuddyWishlists,
    useSearchBuddies,
} from '../../Common/db-axios/useBuddies';
import { useFetchEvents } from '../../Common/db-axios/useEvents';
import { UE } from '../../userEventTypes';
import { colors, fontFamilies, fontSizes, radius, shadows, spacing } from '../../components/styles';

const TABS = [
    { name: 'My Buddies', value: 'list' },
    { name: 'Search', value: 'search' },
];

const MIN_SEARCH_LENGTH = 2;
type BuddyTab = (typeof TABS)[number]['value'];
const SHARE_CALENDAR_PROMPT_INTRO =
    'Enable sharing so your buddies can coordinate with you.';
const SHARE_CALENDAR_PROMPT_MESSAGE =
    'You can share your calendar by clicking';

const useDebouncedValue = (value: string, delay = 300) => {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timeout = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timeout);
    }, [value, delay]);

    return debounced;
};

const buddySortName = (buddy: BuddyProfile) => (buddy.name || '').trim().toLowerCase();

export const BuddyListScreen = () => {
    const navigation = useNavigation<NavStack>();
    const route = useRoute<RouteProp<NavStackProps, 'Buddy List'>>();
    const isFocused = useIsFocused();
    const { authUserId, userProfile } = useUserContext();
    const insets = useSafeAreaInsets();
    const analyticsProps = useAnalyticsProps();

    const [activeTab, setActiveTab] = useState<BuddyTab>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedQuery = useDebouncedValue(searchQuery);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [shareCalendarVisible, setShareCalendarVisible] = useState(false);
    const toastAnim = useRef(new Animated.Value(0)).current;
    const viewLoggedRef = useRef(false);
    const lastSearchLoggedRef = useRef<string | null>(null);
    const promptHandledRef = useRef<string | null>(null);

    const { data: buddies = [], isLoading: isLoadingBuddies } = useFetchBuddies(authUserId);
    const { data: buddyWishlists = [] } = useFetchBuddyWishlists(authUserId);
    const { data: allEvents = [] } = useFetchEvents({ includePrivate: !!authUserId });
    const { mutateAsync: createBuddy, isPending: isAddingBuddy } = useCreateBuddy(authUserId);
    const { mutateAsync: deleteBuddy, isPending: isRemovingBuddy } = useDeleteBuddy(authUserId);

    const futureEventIdSet = useMemo(() => {
        const now = Date.now();
        const ids = new Set<string>();
        for (const event of allEvents) {
            const startTime = Date.parse(event.start_date);
            if (Number.isNaN(startTime)) continue;
            if (startTime >= now) ids.add(String(event.id));
        }
        return ids;
    }, [allEvents]);

    const buddyEventCountMap = useMemo(() => {
        const map = new Map<string, number>();
        for (const entry of buddyWishlists) {
            if (!entry.user_id || entry.user_id === authUserId) continue;
            const futureCount = entry.events.filter((eventId) =>
                futureEventIdSet.has(String(eventId))
            ).length;
            map.set(entry.user_id, futureCount);
        }
        return map;
    }, [authUserId, buddyWishlists, futureEventIdSet]);

    const buddyIdSet = useMemo(() => {
        const ids = new Set<string>();
        for (const buddy of buddies) {
            if (buddy.user_id) ids.add(buddy.user_id);
        }
        return ids;
    }, [buddies]);

    const sortedBuddies = useMemo(
        () => [...buddies].sort((a, b) => {
            const aIsSelf = a.user_id === authUserId;
            const bIsSelf = b.user_id === authUserId;
            if (aIsSelf !== bIsSelf) return aIsSelf ? -1 : 1;
            return buddySortName(a).localeCompare(buddySortName(b));
        }),
        [authUserId, buddies]
    );

    const {
        data: searchResults = [],
        isLoading: isSearching,
    } = useSearchBuddies(debouncedQuery, authUserId);

    const filteredSearchResults = useMemo(
        () =>
            searchResults.filter((buddy) => {
                if (!buddy.user_id) return false;
                if (buddy.user_id === authUserId) return false;
                return !buddyIdSet.has(buddy.user_id);
            }),
        [authUserId, buddyIdSet, searchResults]
    );

    const [pendingBuddyId, setPendingBuddyId] = useState<string | null>(null);
    const listExtraData = useMemo(
        () => ({
            pendingBuddyId,
            isRemovingBuddy,
            isAddingBuddy,
            shareCalendar: userProfile?.share_calendar ?? null,
            futureEventCount: futureEventIdSet.size,
        }),
        [pendingBuddyId, isRemovingBuddy, isAddingBuddy, userProfile?.share_calendar, futureEventIdSet]
    );
    const searchExtraData = useMemo(
        () => ({
            pendingBuddyId,
            isAddingBuddy,
        }),
        [pendingBuddyId, isAddingBuddy]
    );

    useEffect(() => {
        if (!isFocused) {
            viewLoggedRef.current = false;
            return;
        }
        if (!viewLoggedRef.current) {
            logEvent(UE.BuddyListViewed, analyticsProps);
            viewLoggedRef.current = true;
        }
    }, [analyticsProps, isFocused]);

    useEffect(() => {
        if (activeTab !== 'search') return;
        const normalizedQuery = debouncedQuery.trim();
        if (normalizedQuery.length < MIN_SEARCH_LENGTH) {
            lastSearchLoggedRef.current = null;
            return;
        }
        if (lastSearchLoggedRef.current === normalizedQuery) return;
        lastSearchLoggedRef.current = normalizedQuery;
        logEvent(UE.BuddySearchTyped, {
            ...analyticsProps,
            search_text: normalizedQuery,
        });
    }, [activeTab, analyticsProps, debouncedQuery]);


    const showToast = useCallback((message: string) => {
        setToastMessage(message);
        toastAnim.setValue(0);
        Animated.timing(toastAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
        }).start();
    }, [toastAnim]);

    const closeShareCalendarModal = useCallback(() => {
        setShareCalendarVisible(false);
    }, []);

    const handleShareFromToast = useCallback(() => {
        Animated.timing(toastAnim, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
        }).start(() => {
            setToastMessage(null);
            setShareCalendarVisible(true);
        });
    }, [toastAnim]);

    const closeToast = useCallback(() => {
        Animated.timing(toastAnim, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
        }).start(() => setToastMessage(null));
    }, [toastAnim]);

    const getNotSharedMessage = (name: string) => `${name} hasn't shared their calendar yet`;

    useEffect(() => {
        const promptName = route.params?.promptBuddyName?.trim();
        if (!promptName) return;
        if (promptHandledRef.current === promptName) return;
        promptHandledRef.current = promptName;
        setActiveTab('list');
        showToast(getNotSharedMessage(promptName));
        navigation.setParams({ promptBuddyName: undefined, promptBuddyId: undefined } as never);
    }, [
        navigation,
        route.params?.promptBuddyName,
        showToast,
    ]);

    const handleAddBuddy = useCallback(async (buddyId: string, name?: string | null) => {
        if (!authUserId) {
            Alert.alert('Login required', 'Create an account to add buddies.');
            return;
        }
        if (!buddyId || buddyId === authUserId || buddyIdSet.has(buddyId)) return;

        try {
            setPendingBuddyId(buddyId);
            logEvent(UE.BuddyAddPressed, {
                ...analyticsProps,
                buddy_user_id: buddyId,
                source: 'search',
            });
            await createBuddy({ buddyUserId: buddyId });
            logEvent(UE.BuddyAddSucceeded, {
                ...analyticsProps,
                buddy_user_id: buddyId,
                source: 'search',
            });
        } catch (error) {
            console.error('Failed to add buddy', error);
            logEvent(UE.BuddyAddFailed, {
                ...analyticsProps,
                buddy_user_id: buddyId,
                source: 'search',
            });
            Alert.alert('Could not add buddy', `Try again later${name ? ` for ${name}.` : '.'}`);
        } finally {
            setPendingBuddyId(null);
        }
    }, [analyticsProps, authUserId, buddyIdSet, createBuddy]);

    const handleRemoveBuddy = useCallback(async (buddyId: string, name?: string | null) => {
        if (!authUserId) {
            Alert.alert('Login required', 'Create an account to manage buddies.');
            return;
        }
        if (!buddyId || buddyId === authUserId) return;

        try {
            setPendingBuddyId(buddyId);
            await deleteBuddy(buddyId);
        } catch (error) {
            console.error('Failed to remove buddy', error);
            Alert.alert('Could not remove buddy', `Try again later${name ? ` for ${name}.` : '.'}`);
        } finally {
            setPendingBuddyId(null);
        }
    }, [authUserId, deleteBuddy]);

    if (!authUserId) {
        return <LoginToAccess entityToAccess="Buddy list" />;
    }

    const renderBuddyRow = ({ item }: { item: BuddyProfile }) => {
        const name = item.name?.trim() || 'Anonymous';
        const isSelf = item.user_id === authUserId;
        const shareCalendar = userProfile?.share_calendar;
        const eventCount = buddyEventCountMap.get(item.user_id);
        const eventLabel = isSelf
            ? shareCalendar === true
                ? 'Your calendar is shared'
                : shareCalendar === false
                    ? 'Your calendar is not shared'
                    : 'Calendar sharing pending'
            : eventCount === undefined
                ? 'Calendar not shared'
                : eventCount === 0
                    ? 'No shared events yet'
                    : `${eventCount} shared ${eventCount === 1 ? 'event' : 'events'}`;
        const hasEvents = isSelf ? shareCalendar === true : eventCount !== undefined && eventCount > 0;
        const isPending = pendingBuddyId === item.user_id;

        return (
            <TouchableOpacity
                style={[styles.buddyItem, !hasEvents && styles.buddyItemMuted]}
                onPress={() => {
                    if (isSelf) {
                        navigateToTab(navigation, 'My Calendar');
                        return;
                    }
                    if (eventCount === undefined) {
                        logEvent(UE.BuddyListBuddyNoCalendar, {
                            ...analyticsProps,
                            buddy_user_id: item.user_id,
                        });
                        showToast(getNotSharedMessage(name));
                        return;
                    }
                    logEvent(UE.BuddyListBuddyPressed, {
                        ...analyticsProps,
                        buddy_user_id: item.user_id,
                    });
                    navigation.navigate('Buddy Events', { buddyId: item.user_id, buddyName: name });
                }}
                activeOpacity={0.85}
            >
                <View style={styles.itemContent}>
                    <View style={[styles.iconBadge, !hasEvents && styles.iconBadgeMuted]}>
                        <AvatarCircle
                            userProfile={{ id: item.user_id, name, avatar_url: item.avatar_url || '' }}
                            size={36}
                            name={name}
                        />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.buddyName} numberOfLines={1}>{name}</Text>
                        <View style={[styles.eventCountPill, !hasEvents && styles.eventCountPillMuted]}>
                            <Text style={[styles.eventCountText, !hasEvents && styles.eventCountTextMuted]}>
                                {eventLabel}
                            </Text>
                        </View>
                    </View>
                    {!isSelf && (
                        <TouchableOpacity
                            style={[
                                styles.removeButton,
                                (isPending || isRemovingBuddy) && styles.removeButtonDisabled,
                            ]}
                            onPress={(event) => {
                                event.stopPropagation?.();
                                Alert.alert(
                                    `Remove ${name}?`,
                                    'They will no longer appear in your buddy list.',
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                            text: 'Remove',
                                            style: 'destructive',
                                            onPress: () => handleRemoveBuddy(item.user_id, name),
                                        },
                                    ]
                                );
                            }}
                            disabled={isPending || isRemovingBuddy}
                            accessibilityLabel={`Remove ${name} from buddies`}
                        >
                            <FAIcon name="user-times" size={14} color={colors.danger} />
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderSearchRow = ({ item }: { item: BuddyProfile }) => {
        const name = item.name?.trim() || 'Anonymous';
        const isPending = pendingBuddyId === item.user_id;
        const isDisabled = buddyIdSet.has(item.user_id) || isPending || isAddingBuddy;

        return (
            <View style={styles.buddyItem}>
                <View style={styles.itemContent}>
                    <View style={styles.iconBadge}>
                        <AvatarCircle
                            userProfile={{ id: item.user_id, name, avatar_url: item.avatar_url || '' }}
                            size={36}
                            name={name}
                        />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.buddyName} numberOfLines={1}>{name}</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.addButton, isDisabled && styles.addButtonDisabled]}
                        onPress={() => handleAddBuddy(item.user_id, name)}
                        disabled={isDisabled}
                    >
                        {isPending ? (
                            <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                            <>
                                <FAIcon
                                    name="heart"
                                    size={14}
                                    color={colors.white}
                                    solid
                                    style={styles.addButtonIcon}
                                />
                                <Text style={styles.addButtonText}>Add</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderBuddyEmpty = () => (
        <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>You don&apos;t have any buddies yet.</Text>
            <Text style={styles.emptySubtitle}>Go to search to find some.</Text>
        </View>
    );

    const renderSearchEmpty = () => {
        if (debouncedQuery.trim().length < MIN_SEARCH_LENGTH) {
            return (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>Search for buddies</Text>
                    <Text style={styles.emptySubtitle}>Type at least {MIN_SEARCH_LENGTH} characters.</Text>
                </View>
            );
        }

        if (isSearching) return null;

        return (
            <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No matches</Text>
                <Text style={styles.emptySubtitle}>Try a different name or share code.</Text>
            </View>
        );
    };

    const toastTranslateY = toastAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [18, 0],
    });
    const toastScale = toastAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.96, 1],
    });
    const toastBottom = Math.max(insets.bottom + spacing.lg, spacing.lg);
    const canShareCalendar = userProfile?.share_calendar !== true;
    const shareCalendarMessage = canShareCalendar
        ? SHARE_CALENDAR_PROMPT_MESSAGE
        : 'Their shared events will appear here once they enable sharing.';

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <View style={styles.tabBarWrap}>
                <View style={styles.segmentedWrap}>
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.value;
                        return (
                            <TouchableOpacity
                                key={tab.value}
                                onPress={() => {
                                    const nextTab = tab.value === 'search' ? 'search' : 'list';
                                    setActiveTab(nextTab);
                                    logEvent(UE.BuddyListTabChanged, {
                                        ...analyticsProps,
                                        tab: nextTab,
                                    });
                                }}
                                style={[
                                    styles.segmentedButton,
                                    isActive && styles.segmentedButtonActive,
                                ]}
                                activeOpacity={0.85}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isActive }}
                            >
                                <Text style={isActive ? styles.segmentedTextActive : styles.segmentedText}>
                                    {tab.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {activeTab === 'list' ? (
                isLoadingBuddies ? (
                    <View style={styles.loadingState}>
                        <ActivityIndicator size="large" color={colors.brandPurple} />
                    </View>
                ) : (
                    <FlatList
                        data={sortedBuddies}
                        keyExtractor={(item) => item.user_id}
                        renderItem={renderBuddyRow}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={renderBuddyEmpty}
                        extraData={listExtraData}
                    />
                )
            ) : (
                <FlatList
                    data={filteredSearchResults}
                    keyExtractor={(item) => item.user_id}
                    renderItem={renderSearchRow}
                    contentContainerStyle={styles.listContent}
                    keyboardShouldPersistTaps="handled"
                    extraData={searchExtraData}
                    ListHeaderComponent={(
                        <View style={styles.controlsCard}>
                            <View style={styles.searchRow}>
                                <FAIcon name="search" size={fontSizes.base} color={colors.textSlate} style={styles.searchIcon} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search by name or share code..."
                                    placeholderTextColor={colors.textNightSubtle}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    autoCorrect={false}
                                    autoCapitalize="none"
                                    clearButtonMode="while-editing"
                                />
                            </View>
                            {isSearching && (
                                <View style={styles.searchLoading}>
                                    <ActivityIndicator size="small" color={colors.brandPurple} />
                                </View>
                            )}
                        </View>
                    )}
                    ListEmptyComponent={renderSearchEmpty}
                />
            )}
            {toastMessage && (
                <View
                    pointerEvents="box-none"
                    accessibilityElementsHidden={!toastMessage}
                    importantForAccessibility={toastMessage ? 'yes' : 'no-hide-descendants'}
                    style={[styles.toastBackdrop, { bottom: toastBottom }]}
                >
                    <Animated.View
                        style={[
                            styles.toastCard,
                            {
                                opacity: toastAnim,
                                transform: [{ translateY: toastTranslateY }, { scale: toastScale }],
                            },
                        ]}
                    >
                        <LinearGradient
                            colors={[colors.accentPurple, colors.accentSkyDeep]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={styles.toastAccent}
                        />
                        <View style={styles.toastHeader}>
                            <View style={styles.toastIconBadge}>
                                <FAIcon name="share-alt" size={14} color={colors.brandPurple} />
                            </View>
                            <Text style={styles.toastTitle}>{toastMessage}</Text>
                            <TouchableOpacity
                                style={styles.toastClose}
                                onPress={closeToast}
                                accessibilityLabel="Dismiss buddy sharing message"
                            >
                                <FAIcon name="times" size={14} color={colors.textSlate} />
                            </TouchableOpacity>
                        </View>
                        {canShareCalendar ? (
                            <View style={styles.toastBody}>
                                <Text style={styles.toastBodyText}>{SHARE_CALENDAR_PROMPT_INTRO}</Text>
                                <View style={styles.toastLinkRow}>
                                    <Text style={styles.toastBodyText}>{shareCalendarMessage}</Text>
                                <TouchableOpacity
                                    style={styles.toastLinkButton}
                                    onPress={handleShareFromToast}
                                    accessibilityRole="button"
                                    accessibilityLabel="Share your calendar"
                                    activeOpacity={0.7}
                                >
                                    <FAIcon name="share-alt" size={12} color={colors.accentSkyDeep} />
                                    <Text style={styles.toastLink}>here</Text>
                                </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.toastBody}>
                                <Text style={styles.toastBodyText}>{shareCalendarMessage}</Text>
                            </View>
                        )}
                    </Animated.View>
                </View>
            )}
            <ShareCalendarModal
                visible={shareCalendarVisible}
                onDismiss={closeShareCalendarModal}
                onSnooze={closeShareCalendarModal}
                source="buddy_list"
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    tabBarWrap: {
        paddingTop: spacing.sm,
        paddingBottom: spacing.xs,
        alignItems: 'center',
    },
    segmentedWrap: {
        flexDirection: 'row',
        alignSelf: 'center',
        padding: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceGlass,
        borderWidth: 1,
        borderColor: colors.borderOnDark,
        marginBottom: spacing.smPlus,
    },
    segmentedButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.pill,
    },
    segmentedButtonActive: {
        backgroundColor: colors.accentPurple,
        shadowColor: colors.black,
        shadowOpacity: 0.18,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 3,
    },
    segmentedText: {
        fontSize: fontSizes.base,
        fontWeight: '600',
        color: colors.textOnDarkMuted,
        fontFamily: fontFamilies.body,
    },
    segmentedTextActive: {
        fontSize: fontSizes.base,
        fontWeight: '700',
        color: colors.white,
        fontFamily: fontFamilies.body,
    },
    listContent: {
        paddingTop: spacing.xs,
        paddingBottom: spacing.xxxl,
    },
    controlsCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.mdPlus,
        padding: spacing.md,
        backgroundColor: colors.surfaceWhiteFrosted,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        shadowColor: colors.black,
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 2,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surfaceLavenderLight,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
    },
    searchIcon: {
        marginRight: spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: fontSizes.lg,
        color: colors.textDeep,
        paddingVertical: 0,
        fontFamily: fontFamilies.body,
    },
    searchLoading: {
        marginTop: spacing.sm,
        alignItems: 'flex-start',
    },
    buddyItem: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        borderRadius: radius.lg,
        paddingVertical: spacing.mdPlus,
        paddingHorizontal: spacing.mdPlus,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        shadowColor: colors.black,
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 6,
        elevation: 3,
    },
    buddyItemMuted: {
        backgroundColor: colors.surfaceMutedLight,
        borderColor: colors.borderMutedLight,
    },
    itemContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBadge: {
        width: 44,
        height: 44,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceLavenderAlt,
        borderWidth: 1,
        borderColor: colors.borderLavenderAlt,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    iconBadgeMuted: {
        backgroundColor: colors.surfaceMutedAlt,
        borderColor: colors.borderMutedAlt,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    buddyName: {
        fontSize: fontSizes.xl,
        fontWeight: '700',
        color: colors.textDeep,
        fontFamily: fontFamilies.body,
    },
    eventCountText: {
        fontSize: fontSizes.sm,
        fontWeight: '600',
        color: colors.brandPurpleDark,
        fontFamily: fontFamilies.body,
    },
    eventCountTextMuted: {
        color: colors.textSlate,
    },
    eventCountPill: {
        alignSelf: 'flex-start',
        marginTop: spacing.xsPlus,
        paddingHorizontal: spacing.smPlus,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceLavenderAlt,
        borderWidth: 1,
        borderColor: colors.borderLavenderAlt,
    },
    eventCountPillMuted: {
        backgroundColor: colors.surfaceMutedAlt,
        borderColor: colors.borderMutedDark,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.danger,
        borderRadius: radius.pill,
        paddingVertical: spacing.xsPlus,
        paddingHorizontal: spacing.md,
    },
    addButtonDisabled: {
        backgroundColor: colors.textDisabled,
    },
    addButtonIcon: {
        marginRight: spacing.xs,
    },
    addButtonText: {
        fontSize: fontSizes.smPlus,
        fontWeight: '600',
        color: colors.white,
        fontFamily: fontFamilies.body,
    },
    removeButton: {
        width: spacing.jumbo,
        height: spacing.jumbo,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.borderRose,
        backgroundColor: colors.surfaceRoseSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeButtonDisabled: {
        opacity: 0.45,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
        paddingHorizontal: spacing.lg,
    },
    emptyTitle: {
        fontSize: fontSizes.xxl,
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: fontFamilies.display,
        textAlign: 'center',
    },
    emptySubtitle: {
        marginTop: spacing.sm,
        fontSize: fontSizes.basePlus,
        color: colors.textSecondary,
        fontFamily: fontFamilies.body,
        textAlign: 'center',
    },
    loadingState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toastBackdrop: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        zIndex: 20,
    },
    toastCard: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: colors.surfaceWhiteFrosted,
        borderRadius: radius.xl,
        paddingTop: spacing.mdPlus,
        paddingBottom: spacing.mdPlus,
        paddingHorizontal: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        overflow: 'hidden',
        ...shadows.card,
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 14,
        elevation: 8,
    },
    toastAccent: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: 6,
    },
    toastHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    toastIconBadge: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: colors.surfaceLavenderStrong,
        borderWidth: 1,
        borderColor: colors.borderLavenderAlt,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toastTitle: {
        flex: 1,
        fontSize: fontSizes.basePlus,
        fontWeight: '700',
        color: colors.textDeep,
        fontFamily: fontFamilies.display,
    },
    toastClose: {
        padding: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceLavenderLight,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
    },
    toastBody: {
        marginTop: spacing.sm,
    },
    toastBodyText: {
        fontSize: fontSizes.base,
        color: colors.textSlate,
        fontFamily: fontFamilies.body,
        lineHeight: fontSizes.base * 1.4,
    },
    toastLinkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginTop: spacing.xs,
        gap: spacing.xs,
    },
    toastLinkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.xs,
        paddingVertical: 2,
        borderRadius: radius.pill,
        backgroundColor: colors.accentSkySoft,
        borderWidth: 1,
        borderColor: colors.accentSkyDeep,
    },
    toastLink: {
        color: colors.accentSkyDeep,
        fontWeight: '700',
    },
});
