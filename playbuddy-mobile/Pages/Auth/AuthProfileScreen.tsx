import React, { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserContext } from './hooks/UserContext';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { Avatar } from './Buttons/Avatar';
import { ScrollView } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { NavStack } from '../../Common/Nav/NavStackType';
import { logEvent } from '../../Common/hooks/logger';
import { useAnalyticsProps } from '../../Common/hooks/useAnalytics';
import { UE } from '../../userEventTypes';
import { navigateToHome, navigateToTab } from '../../Common/Nav/navigationHelpers';
import { colors, fontFamilies, fontSizes, radius, shadows, spacing } from '../../components/styles';
import { EventListViewMode, getEventListViewMode, setEventListViewMode } from '../Calendar/ListView/eventListViewMode';

export default function AccountDetails() {
    const { userProfile, signOut, fullNameFromOAuthedUser } = useUserContext();
    const navigation = useNavigation<NavStack>();
    const analyticsProps = useAnalyticsProps();
    const isFocused = useIsFocused();
    const [listViewMode, setListViewMode] = useState<EventListViewMode>('image');

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

    const onToggleClassicView = (value: boolean) => {
        const nextMode: EventListViewMode = value ? 'classic' : 'image';
        setListViewMode(nextMode);
        void setEventListViewMode(nextMode);
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
                    </View>

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
