import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserContext } from './hooks/UserContext';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { Avatar } from './Buttons/Avatar';
import { ScrollView } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { NavStack } from '../../Common/Nav/NavStackType';
import { logEvent } from '../../Common/hooks/logger';
import { useAnalyticsProps } from '../../Common/hooks/useAnalytics';
import { UE } from '../../userEventTypes';
import { navigateToHome, navigateToTab } from '../../Common/Nav/navigationHelpers';
import { colors, fontFamilies, fontSizes, radius, shadows, spacing } from '../../components/styles';
import { EventListViewMode, getEventListViewMode, setEventListViewMode } from '../Calendar/ListView/eventListViewMode';
import { useCalendarContext } from '../Calendar/hooks/CalendarContext';
import { useFetchFollows } from '../../Common/db-axios/useFollows';
import { useCommonContext } from '../../Common/hooks/CommonContext';
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

export default function AccountDetails() {
    const { authUserId, userProfile, signOut, fullNameFromOAuthedUser } = useUserContext();
    const navigation = useNavigation<NavStack>();
    const analyticsProps = useAnalyticsProps();
    const isFocused = useIsFocused();
    const [listViewMode, setListViewMode] = useState<EventListViewMode>('image');
    const [notificationsEnabled, setNotificationsEnabledState] = useState(false);
    const [scheduledNotifications, setScheduledNotifications] = useState<Notifications.NotificationRequest[]>([]);
    const { allEvents } = useCalendarContext();
    const { myCommunities } = useCommonContext();
    const { data: follows } = useFetchFollows(authUserId || undefined);

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

    useEffect(() => {
        let isActive = true;
        if (!isFocused) {
            return () => {
                isActive = false;
            };
        }
        getEventListViewMode().then((mode) => {
            if (isActive) {
                setListViewMode(mode);
            }
        });
        return () => {
            isActive = false;
        };
    }, [isFocused]);

    useEffect(() => {
        let isActive = true;
        if (!isFocused) {
            return () => {
                isActive = false;
            };
        }
        getPushNotificationsEnabled().then((enabled) => {
            if (isActive) {
                setNotificationsEnabledState(enabled);
            }
        });
        return () => {
            isActive = false;
        };
    }, [isFocused]);

    const refreshScheduledNotifications = useCallback(async () => {
        if (!__DEV__) return;
        try {
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            setScheduledNotifications(scheduled);
        } catch {
            setScheduledNotifications([]);
        }
    }, []);

    useEffect(() => {
        if (!isFocused) return;
        void refreshScheduledNotifications();
    }, [isFocused, refreshScheduledNotifications]);

    const onToggleClassicView = (value: boolean) => {
        const nextMode: EventListViewMode = value ? 'classic' : 'image';
        setListViewMode(nextMode);
        void setEventListViewMode(nextMode);
    };

    const onToggleNotifications = (value: boolean) => {
        void (async () => {
            setNotificationsEnabledState(value);
            if (!value) {
                await setPushNotificationsEnabled(false);
                await cancelOrganizerNotifications();
                await unregisterRemotePushToken();
                await refreshScheduledNotifications();
                return;
            }

            const granted = await ensureNotificationPermissions();
            if (!granted) {
                Alert.alert(
                    'Notifications are off',
                    'Enable notifications in Settings to get workshop reminders.'
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
            await refreshScheduledNotifications();
        })();
    };

    const onPressSignOut = async () => {
        logEvent(UE.AuthProfilePressSignOut, analyticsProps);
        signOut();
        navigateToHome(navigation);
    }

    const onPressHome = () => {
        logEvent(UE.AuthProfilePressHome, analyticsProps);
        navigateToTab(navigation, 'Calendar');
    }

    const onPressDeleteAccount = async () => {
        logEvent(UE.AuthProfilePressDeleteAccount, analyticsProps);
        Alert.alert(
            'Are you sure?',
            'This action will delete your account and all your wishlists. This cannot be undone.',
            [
                {
                    text: 'Delete',
                    onPress: () => {
                        signOut();
                        navigateToTab(navigation, 'Calendar');
                    },
                    style: 'destructive',
                },
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
            ]
        );
    };

    const onPressSupport = () => {
        logEvent(UE.AuthProfilePressSupport, analyticsProps);
        Linking.openURL('mailto:support@playbuddy.me');
    }

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={[colors.brandIndigo, colors.accentPurple]} style={styles.gradient}>
                <ScrollView contentContainerStyle={styles.scrollViewContent}>
                    <View style={styles.sectionCard}>
                        {!userProfile?.avatar_url && (
                            <View style={styles.tipBanner}>
                                <Image
                                    source={{ uri: 'https://bsslnznasebtdktzxjqu.supabase.co/storage/v1/object/public/misc/question_person.png?t=2024-11-05T12%3A57%3A25.907Z' }}
                                    style={styles.tipIcon}
                                />
                                <Text style={styles.tipText}>Your avatar helps your buddies recognize you.</Text>
                            </View>
                        )}
                        <Avatar />
                    </View>

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Account</Text>
                        <InfoItem
                            label="Logged in as"
                            value={userProfile?.email || userProfile?.phone}
                        />
                        <InfoItem
                            label="Display Name"
                            value={userProfile?.name || fullNameFromOAuthedUser || ''}
                        />
                    </View>

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Preferences</Text>
                        <View style={styles.preferenceRow}>
                            <View style={styles.preferenceCopy}>
                                <Text style={styles.preferenceLabel}>Classic list view</Text>
                                <Text style={styles.preferenceDescription}>
                                    Use compact cards instead of the image-first redesign.
                                </Text>
                            </View>
                            <Switch
                                value={listViewMode === 'classic'}
                                onValueChange={onToggleClassicView}
                                trackColor={{ false: colors.borderMutedAlt, true: colors.accentPurple }}
                                thumbColor={colors.white}
                                ios_backgroundColor={colors.borderMutedAlt}
                            />
                        </View>
                        <View style={[styles.preferenceRow, styles.preferenceRowSpaced]}>
                            <View style={styles.preferenceCopy}>
                                <Text style={styles.preferenceLabel}>Push notifications</Text>
                                <Text style={styles.preferenceDescription}>
                                    Workshop reminders every few days from organizers you follow.
                                </Text>
                            </View>
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={onToggleNotifications}
                                trackColor={{ false: colors.borderMutedAlt, true: colors.accentPurple }}
                                thumbColor={colors.white}
                                ios_backgroundColor={colors.borderMutedAlt}
                            />
                        </View>
                    </View>

                    {__DEV__ && (
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>Scheduled notifications</Text>
                            {scheduledNotifications.length === 0 ? (
                                <Text style={styles.metaText}>No scheduled notifications.</Text>
                            ) : (
                                scheduledNotifications.map((notification, index) => (
                                    <View key={notification.identifier || `scheduled-${index}`} style={styles.scheduledRow}>
                                        <Text style={styles.scheduledTitle}>
                                            {notification.content.title || 'Notification'}
                                        </Text>
                                        <Text style={styles.metaText}>
                                            {formatNotificationTrigger(notification.trigger)}
                                        </Text>
                                    </View>
                                ))
                            )}
                        </View>
                    )}

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Actions</Text>
                        <TouchableOpacity style={styles.primaryButton} onPress={onPressHome}>
                            <View style={styles.iconTextContainer}>
                                <Icon name="home" size={20} color={colors.white} />
                                <Text style={styles.primaryButtonText}>Go to Home</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.secondaryButton} onPress={onPressSignOut}>
                            <Text style={styles.secondaryButtonText}>Sign Out</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.dangerButton} onPress={onPressDeleteAccount}>
                            <Text style={styles.dangerButtonText}>Delete Account</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={onPressSupport} style={styles.supportLink}>
                        <Text style={styles.supportText}>support@playbuddy.me</Text>
                        <Text style={styles.supportSubText}>Support or feature ideas</Text>
                    </TouchableOpacity>
                </ScrollView>
            </LinearGradient>
        </SafeAreaView>
    );
}

const InfoItem = ({ label, value }: { label: string, value?: string }) => (
    <View style={styles.infoItem}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
    </View>
);

const formatNotificationTrigger = (trigger: Notifications.NotificationTrigger) => {
    if (!trigger || typeof trigger !== 'object') return 'Trigger: unknown';
    if ('type' in trigger) {
        const typed = trigger as Notifications.NotificationTrigger & {
            type?: string;
            seconds?: number;
            repeats?: boolean;
            weekday?: number;
            hour?: number;
            minute?: number;
        };
        let label = `Trigger: ${typed.type ?? 'unknown'}`;
        if (typeof typed.seconds === 'number') {
            label += ` • every ${typed.seconds}s`;
        }
        if (typeof typed.hour === 'number' && typeof typed.minute === 'number') {
            label += ` • ${typed.hour}:${String(typed.minute).padStart(2, '0')}`;
        }
        if (typeof typed.weekday === 'number') {
            label += ` • weekday ${typed.weekday}`;
        }
        if (typeof typed.repeats === 'boolean') {
            label += typed.repeats ? ' • repeats' : ' • once';
        }
        return label;
    }
    return `Trigger: ${JSON.stringify(trigger)}`;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.brandIndigo,
    },
    gradient: {
        flex: 1,
    },
    scrollViewContent: {
        flexGrow: 1,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        paddingBottom: spacing.jumbo,
    },
    sectionCard: {
        backgroundColor: colors.white,
        borderRadius: radius.xl,
        padding: spacing.lgPlus,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        ...shadows.card,
    },
    sectionTitle: {
        fontSize: fontSizes.lg,
        fontWeight: '700',
        color: colors.brandPurple,
        marginBottom: spacing.md,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontFamily: fontFamilies.body,
    },
    tipBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.smPlus,
        padding: spacing.md,
        backgroundColor: colors.surfaceLavender,
        borderRadius: radius.mdPlus,
        borderWidth: 1,
        borderColor: colors.borderLavenderAlt,
        marginBottom: spacing.md,
    },
    tipIcon: {
        width: spacing.xxl,
        height: spacing.xxl,
    },
    tipText: {
        flex: 1,
        fontSize: fontSizes.base,
        color: colors.brandPurple,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    infoItem: {
        marginBottom: spacing.mdPlus,
    },
    preferenceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
    },
    preferenceCopy: {
        flex: 1,
        paddingRight: spacing.md,
    },
    preferenceLabel: {
        fontSize: fontSizes.base,
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    preferenceDescription: {
        fontSize: fontSizes.sm,
        color: colors.brandTextMuted,
        marginTop: spacing.xs,
        fontFamily: fontFamilies.body,
    },
    iconTextContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    label: {
        fontSize: fontSizes.sm,
        color: colors.brandTextMuted,
        marginBottom: spacing.xs,
        fontFamily: fontFamilies.body,
    },
    value: {
        fontSize: fontSizes.xl,
        color: colors.heroDark,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    primaryButton: {
        backgroundColor: colors.brandIndigo,
        borderRadius: radius.mdPlus,
        paddingVertical: spacing.mdPlus,
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    primaryButtonText: {
        color: colors.white,
        fontSize: fontSizes.xl,
        fontWeight: '700',
        textAlign: 'center',
        fontFamily: fontFamilies.body,
    },
    secondaryButton: {
        backgroundColor: colors.surfaceLavenderAlt,
        borderRadius: radius.mdPlus,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLavenderAlt,
        marginBottom: spacing.smPlus,
    },
    secondaryButtonText: {
        color: colors.brandPurpleDark,
        fontSize: fontSizes.lg,
        fontWeight: '700',
        textAlign: 'center',
        fontFamily: fontFamilies.body,
    },
    dangerButton: {
        backgroundColor: colors.surfaceRoseSoft,
        borderRadius: radius.mdPlus,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderRose,
    },
    dangerButtonText: {
        color: colors.danger,
        fontSize: fontSizes.lg,
        fontWeight: '700',
        textAlign: 'center',
        fontFamily: fontFamilies.body,
    },
    supportLink: {
        alignItems: 'center',
        paddingVertical: spacing.xsPlus,
    },
    supportText: {
        color: colors.white,
        fontSize: fontSizes.base,
        fontWeight: '700',
        fontFamily: fontFamilies.body,
    },
    supportSubText: {
        color: colors.textOnDarkMuted,
        fontSize: fontSizes.sm,
        fontFamily: fontFamilies.body,
    },
});
