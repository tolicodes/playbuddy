import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
    Alert,
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import * as Notifications from 'expo-notifications';

import { NavStack, NavStackProps } from '../../Common/Nav/NavStackType';
import { navigateToTab } from '../../Common/Nav/navigationHelpers';
import { useUserContext } from './hooks/UserContext';
import { useUpdateUserProfile } from './hooks/useUserProfile';
import { useCalendarContext } from '../Calendar/hooks/CalendarContext';
import { useCommonContext } from '../../Common/hooks/CommonContext';
import { useGuestSaveModal } from '../GuestSaveModal';
import { useFetchFollows } from '../../Common/db-axios/useFollows';
import {
    cancelOrganizerNotifications,
    ensureNotificationPermissions,
    getPushNotificationsEnabled,
    registerRemotePushToken,
    scheduleOrganizerNotifications,
    setPushNotificationsEnabled,
    setPushNotificationsPrompted,
    unregisterRemotePushToken,
} from '../../Common/notifications/organizerPushNotifications';
import { colors, fontFamilies, fontSizes, radius, shadows, spacing } from '../../components/styles';

const CONSENT_TITLE = 'Consent';
const CONSENT_PARAGRAPH_ONE =
    'At PlayBuddy, consent comes first. We only count a full, enthusiastic "fuck yes." You can change your mind at any time.';
const CONSENT_PARAGRAPH_TWO =
    'Tell us what you are comfortable with below. You can update this later from the user icon in the top right by tapping Consent.';

type ConsentRoute = RouteProp<NavStackProps, 'Consent'>;

type ConsentRowProps = {
    title: string;
    description: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    disabled?: boolean;
    isLast?: boolean;
};

const isPermissionGranted = (settings: Notifications.NotificationPermissionsStatus) =>
    settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

const ConsentRow = ({
    title,
    description,
    value,
    onValueChange,
    disabled,
    isLast,
}: ConsentRowProps) => (
    <View style={[styles.consentRow, isLast && styles.consentRowLast]}>
        <View style={styles.consentCopy}>
            <Text style={styles.consentTitle}>{title}</Text>
            <Text style={styles.consentDescription}>{description}</Text>
        </View>
        <Switch
            value={value}
            onValueChange={onValueChange}
            disabled={disabled}
            trackColor={{ false: colors.borderMutedAlt, true: colors.brandIndigo }}
            thumbColor={colors.white}
            ios_backgroundColor={colors.borderMutedAlt}
        />
    </View>
);

export const ConsentScreen = () => {
    const navigation = useNavigation<NavStack>();
    const route = useRoute<ConsentRoute>();
    const { authUserId, userProfile, isLoadingUserProfile } = useUserContext();
    const { showGuestSaveModal } = useGuestSaveModal();
    const { mutateAsync: updateUserProfile } = useUpdateUserProfile(authUserId || '');
    const { allEvents } = useCalendarContext();
    const { myCommunities } = useCommonContext();
    const { data: follows } = useFetchFollows(authUserId || undefined);
    const isFocused = useIsFocused();

    const isSignupFlow = route.params?.source === 'signup';
    const initializedRef = useRef(false);

    const [subscribeToNewsletter, setSubscribeToNewsletter] = useState(true);
    const [shareCalendar, setShareCalendar] = useState(true);
    const [notificationsEnabled, setNotificationsEnabledState] = useState(false);
    const [notificationsPermissionGranted, setNotificationsPermissionGranted] = useState(false);
    const [isNotificationBusy, setIsNotificationBusy] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const saveConsent = useCallback(
        async (nextValues: { joined_newsletter?: boolean; share_calendar?: boolean }, onError?: () => void) => {
            if (!authUserId) {
                showGuestSaveModal({
                    title: 'Create an account to update consent',
                    message: 'Create an account or sign in to manage your preferences.',
                    iconName: 'shield-alt',
                });
                onError?.();
                return;
            }
            try {
                await updateUserProfile(nextValues);
            } catch (error) {
                const errorMessage = axios.isAxiosError(error)
                    ? error.response?.data?.error || error.message
                    : error instanceof Error
                    ? error.message
                    : 'Something went wrong.';
                Alert.alert('Unable to update consent', errorMessage);
                onError?.();
            }
        },
        [authUserId, showGuestSaveModal, updateUserProfile]
    );

    const handleToggleNewsletter = useCallback(
        (value: boolean) => {
            const previousValue = subscribeToNewsletter;
            setSubscribeToNewsletter(value);
            void saveConsent(
                { joined_newsletter: value, share_calendar: shareCalendar },
                () => setSubscribeToNewsletter(previousValue)
            );
        },
        [saveConsent, shareCalendar, subscribeToNewsletter]
    );

    const handleToggleShareCalendar = useCallback(
        (value: boolean) => {
            const previousValue = shareCalendar;
            setShareCalendar(value);
            void saveConsent(
                { joined_newsletter: subscribeToNewsletter, share_calendar: value },
                () => setShareCalendar(previousValue)
            );
        },
        [saveConsent, shareCalendar, subscribeToNewsletter]
    );

    const refreshNotificationState = useCallback(async () => {
        const [enabled, settings] = await Promise.all([
            getPushNotificationsEnabled(),
            Notifications.getPermissionsAsync(),
        ]);
        const granted = isPermissionGranted(settings);
        if (!granted && enabled) {
            await setPushNotificationsEnabled(false);
        }
        setNotificationsPermissionGranted(granted);
        setNotificationsEnabledState(enabled && granted);
    }, []);

    useEffect(() => {
        if (!isFocused) return;
        void refreshNotificationState();
    }, [isFocused, refreshNotificationState]);

    useEffect(() => {
        if (initializedRef.current) return;
        if (!userProfile) return;
        if (!isSignupFlow) {
            setSubscribeToNewsletter(userProfile.joined_newsletter ?? true);
            setShareCalendar(userProfile.share_calendar ?? true);
        }
        initializedRef.current = true;
    }, [isSignupFlow, userProfile]);

    const organizerIdsFromCommunities = useMemo(() => {
        const organizerCommunities = [
            ...myCommunities.myOrganizerPublicCommunities,
            ...myCommunities.myOrganizerPrivateCommunities,
        ];
        return organizerCommunities
            .map((community) => community.organizer_id)
            .filter(Boolean)
            .map((id) => id.toString());
    }, [myCommunities.myOrganizerPrivateCommunities, myCommunities.myOrganizerPublicCommunities]);

    const followedOrganizerIds = useMemo(() => {
        const followIds = (follows?.organizer || []).map((id) => id.toString());
        return new Set([...followIds, ...organizerIdsFromCommunities]);
    }, [follows?.organizer, organizerIdsFromCommunities]);

    const handleToggleNotifications = useCallback(
        (value: boolean) => {
            void (async () => {
                if (isNotificationBusy) return;
                setIsNotificationBusy(true);
                try {
                    setNotificationsEnabledState(value);

                    if (!value) {
                        await setPushNotificationsEnabled(false);
                        await setPushNotificationsPrompted(true);
                        await cancelOrganizerNotifications();
                        await unregisterRemotePushToken();
                        return;
                    }

                    const granted = await ensureNotificationPermissions();
                    setNotificationsPermissionGranted(granted);
                    if (!granted) {
                        Alert.alert(
                            'Notifications are off',
                            'Enable notifications in Settings to get reminders from organizers you follow.'
                        );
                        setNotificationsEnabledState(false);
                        await setPushNotificationsEnabled(false);
                        await setPushNotificationsPrompted(true);
                        return;
                    }

                    await setPushNotificationsEnabled(true);
                    await setPushNotificationsPrompted(true);
                    try {
                        await registerRemotePushToken();
                    } catch (error) {
                        console.warn('[notifications] failed to register push token', error);
                    }
                    await scheduleOrganizerNotifications({
                        events: allEvents,
                        followedOrganizerIds,
                    });
                    await refreshNotificationState();
                } finally {
                    setIsNotificationBusy(false);
                }
            })();
        },
        [allEvents, followedOrganizerIds, isNotificationBusy, refreshNotificationState]
    );

    const handleSave = async () => {
        if (!authUserId) {
            showGuestSaveModal({
                title: 'Create an account to update consent',
                message: 'Create an account or sign in to manage your preferences.',
                iconName: 'shield-alt',
            });
            return;
        }
        setIsSaving(true);
        try {
            await updateUserProfile({
                joined_newsletter: subscribeToNewsletter,
                share_calendar: shareCalendar,
            });
            if (isSignupFlow) {
                navigation.popToTop();
                navigateToTab(navigation, 'Calendar');
            } else {
                navigation.goBack();
            }
        } catch (error) {
            const errorMessage = axios.isAxiosError(error)
                ? error.response?.data?.error || error.message
                : error instanceof Error
                ? error.message
                : 'Something went wrong.';
            Alert.alert('Unable to update consent', errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoadingUserProfile && !initializedRef.current) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.brandIndigo} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                contentInsetAdjustmentBehavior="never"
                automaticallyAdjustContentInsets={false}
            >
                <View style={styles.heroCard}>
                    <View style={styles.heroIcon}>
                        <FontAwesome5 name="hand-holding-heart" size={20} color={colors.brandIndigo} />
                    </View>
                    <Text style={styles.heroTitle}>{CONSENT_TITLE}</Text>
                    <Text style={styles.heroLead}>{CONSENT_PARAGRAPH_ONE}</Text>
                    <Text style={styles.heroBody}>{CONSENT_PARAGRAPH_TWO}</Text>
                </View>

                <View style={styles.sectionCard}>
                    <ConsentRow
                        title="Newsletter"
                        description="Weekly event drops and community tips in your inbox."
                        value={subscribeToNewsletter}
                        onValueChange={handleToggleNewsletter}
                    />
                    <ConsentRow
                        title="Share your calendar"
                        description="Allow other PlayBuddy users to see your calendar and events you're going to."
                        value={shareCalendar}
                        onValueChange={handleToggleShareCalendar}
                    />
                    <ConsentRow
                        title="Event notifications"
                        description="Get notifications about upcoming events from organizers you follow."
                        value={notificationsEnabled && notificationsPermissionGranted}
                        onValueChange={handleToggleNotifications}
                        disabled={isNotificationBusy}
                        isLast
                    />
                </View>

                <TouchableOpacity
                    style={[styles.primaryButton, isSaving && styles.primaryButtonDisabled]}
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    <Text style={styles.primaryButtonText}>
                        {isSaving ? 'Saving...' : isSignupFlow ? 'Continue' : 'Save changes'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surfaceSubtle,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceSubtle,
    },
    scrollContent: {
        paddingHorizontal: spacing.xl,
        paddingTop: 0,
        paddingBottom: spacing.jumbo,
    },
    heroCard: {
        backgroundColor: colors.surfaceLavenderAlt,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLavenderAlt,
        ...shadows.card,
    },
    heroIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.surfaceWhiteStrong,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
    },
    heroTitle: {
        fontSize: fontSizes.display,
        fontWeight: '700',
        color: colors.brandText,
        marginBottom: spacing.sm,
        fontFamily: fontFamilies.display,
    },
    heroBody: {
        fontSize: fontSizes.base,
        color: colors.brandTextMuted,
        lineHeight: fontSizes.xl,
        marginBottom: spacing.sm,
        fontFamily: fontFamilies.body,
    },
    heroLead: {
        fontSize: fontSizes.xxl,
        color: colors.brandText,
        lineHeight: 26,
        marginBottom: spacing.md,
        fontFamily: fontFamilies.body,
    },
    sectionCard: {
        backgroundColor: colors.white,
        borderRadius: radius.xl,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        ...shadows.card,
        marginBottom: spacing.lg,
    },
    consentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.mdPlus,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderMutedLight,
        gap: spacing.md,
    },
    consentRowLast: {
        borderBottomWidth: 0,
    },
    consentCopy: {
        flex: 1,
        paddingRight: spacing.sm,
    },
    consentTitle: {
        fontSize: fontSizes.lg,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
        fontFamily: fontFamilies.body,
    },
    consentDescription: {
        fontSize: fontSizes.sm,
        color: colors.brandTextMuted,
        fontFamily: fontFamilies.body,
    },
    primaryButton: {
        backgroundColor: colors.brandIndigo,
        paddingVertical: spacing.mdPlus,
        borderRadius: radius.mdPlus,
        alignItems: 'center',
        ...shadows.card,
    },
    primaryButtonDisabled: {
        backgroundColor: colors.brandMuted,
    },
    primaryButtonText: {
        color: colors.white,
        fontSize: fontSizes.xl,
        fontWeight: '700',
        fontFamily: fontFamilies.body,
    },
});

export default ConsentScreen;
