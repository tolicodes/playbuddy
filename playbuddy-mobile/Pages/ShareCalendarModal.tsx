import React from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

import { useUserContext } from './Auth/hooks/UserContext';
import { useUpdateUserProfile } from './Auth/hooks/useUserProfile';
import { useAnalyticsProps } from '../Common/hooks/useAnalytics';
import { logEvent } from '../Common/hooks/logger';
import { UE } from '../userEventTypes';
import { colors, fontFamilies, fontSizes, lineHeights, radius, spacing } from '../components/styles';

type ShareCalendarModalProps = {
    visible: boolean;
    onDismiss: () => void;
    onSnooze: () => void;
    source?: 'buddy_list' | 'popup';
    contextTitle?: string;
    contextMessage?: string;
};

const SHARE_CALENDAR_TITLE = 'Share your calendar';
const SHARE_CALENDAR_DESCRIPTION = 'Allow other PlayBuddy users to see your calendar and events you\'re going to.';

export function ShareCalendarModal({
    visible,
    onDismiss,
    onSnooze,
    source = 'popup',
    contextTitle,
    contextMessage,
}: ShareCalendarModalProps) {
    const { authUserId } = useUserContext();
    const { mutateAsync: updateUserProfile, isPending } = useUpdateUserProfile(authUserId ?? '');
    const queryClient = useQueryClient();
    const analyticsProps = useAnalyticsProps();

    if (!visible) return null;

    const handleDismiss = () => {
        onDismiss();
    };

    const handleSnooze = () => {
        onSnooze();
    };

    const handleEnableSharing = async () => {
        if (!authUserId) {
            handleSnooze();
            return;
        }
        try {
            logEvent(UE.BuddyShareCalendarPressed, {
                ...analyticsProps,
                source,
            });
            await updateUserProfile({ share_calendar: true });
            queryClient.invalidateQueries({ queryKey: ['userProfile', authUserId] });
            queryClient.invalidateQueries({ queryKey: ['buddies', authUserId] });
            queryClient.invalidateQueries({ queryKey: ['buddyWishlists', authUserId] });
            logEvent(UE.BuddyShareCalendarCompleted, {
                ...analyticsProps,
                source,
            });
            onDismiss();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Please try again.';
            Alert.alert('Unable to share calendar', message);
        }
    };

    return (
        <Modal transparent animationType="fade" onRequestClose={handleDismiss}>
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.close} onPress={handleDismiss} hitSlop={8}>
                        <Text style={styles.closeText}>✕</Text>
                    </TouchableOpacity>

                    {(contextTitle || contextMessage) && (
                        <View style={styles.contextBox}>
                            {contextTitle && <Text style={styles.contextTitle}>{contextTitle}</Text>}
                            {contextMessage && <Text style={styles.contextMessage}>{contextMessage}</Text>}
                        </View>
                    )}

                    <View style={styles.titleRow}>
                        <View style={styles.iconBadge}>
                            <FontAwesome5 name="calendar-check" size={26} color={colors.accentGreen} />
                        </View>
                    </View>
                    <Text style={styles.title}>{SHARE_CALENDAR_TITLE}</Text>
                    <Text style={styles.subtitle}>{SHARE_CALENDAR_DESCRIPTION}</Text>

                    <View style={styles.highlightBox}>
                        <Text style={styles.highlightLabel}>What you get</Text>
                        <View style={styles.bulletRow}>
                            <View style={styles.bulletDot} />
                            <Text style={styles.bulletText}>Buddies can see the events you save</Text>
                        </View>
                        <View style={styles.bulletRow}>
                            <View style={styles.bulletDot} />
                            <Text style={styles.bulletText}>Easier planning for shared nights out</Text>
                        </View>
                    </View>

                    <View style={styles.noteBox}>
                        <Text style={styles.note}>
                            You can update this later in Consent from the user menu.
                        </Text>
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.primaryBtn, isPending && styles.primaryBtnDisabled]}
                            onPress={handleEnableSharing}
                            disabled={isPending}
                            activeOpacity={0.85}
                        >
                            {isPending ? (
                                <ActivityIndicator color={colors.white} />
                            ) : (
                                <View style={styles.primaryContent}>
                                    <FontAwesome5 name="share-alt" size={16} color={colors.white} />
                                    <Text style={styles.primaryText}>Share my calendar</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.secondaryBtn} onPress={handleSnooze}>
                            <Text style={styles.secondaryText}>Not now</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: colors.backdropNight,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    card: {
        width: '90%',
        backgroundColor: colors.surfaceNight,
        borderRadius: radius.xl,
        padding: spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.borderNight,
        shadowColor: colors.black,
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 16,
        elevation: 12,
        overflow: 'hidden',
    },
    close: {
        alignSelf: 'flex-end',
        padding: spacing.xs,
    },
    closeText: {
        color: colors.textNightSubtle,
        fontSize: fontSizes.xl,
        fontFamily: fontFamilies.body,
    },
    contextBox: {
        width: '100%',
        backgroundColor: colors.surfaceNightOverlay,
        borderRadius: radius.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderNightMuted,
        marginBottom: spacing.mdPlus,
    },
    contextTitle: {
        color: colors.textNight,
        fontSize: fontSizes.basePlus,
        fontWeight: '700',
        textAlign: 'center',
        fontFamily: fontFamilies.body,
        marginBottom: spacing.xs,
    },
    contextMessage: {
        color: colors.textNightMuted,
        fontSize: fontSizes.base,
        textAlign: 'center',
        fontFamily: fontFamilies.body,
        lineHeight: lineHeights.md,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        marginBottom: spacing.xsPlus,
        position: 'relative',
    },
    iconBadge: {
        backgroundColor: 'rgba(22, 163, 74, 0.12)',
        borderRadius: radius.pill,
        padding: spacing.smPlus,
        borderWidth: 1,
        borderColor: 'rgba(22, 163, 74, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: fontSizes.xxxl,
        fontWeight: '700',
        textAlign: 'center',
        color: colors.white,
        marginBottom: spacing.smPlus,
        fontFamily: fontFamilies.display,
    },
    subtitle: {
        fontSize: fontSizes.xl,
        color: colors.textNightMuted,
        textAlign: 'center',
        lineHeight: lineHeights.xl,
        marginBottom: spacing.lg,
        fontFamily: fontFamilies.body,
    },
    highlightBox: {
        width: '100%',
        backgroundColor: colors.accentBlueSoft,
        borderRadius: radius.mdPlus,
        padding: spacing.mdPlus,
        borderWidth: 1,
        borderColor: colors.accentBlueBorder,
        marginBottom: spacing.lg,
        shadowColor: colors.accentBlue,
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
        elevation: 6,
    },
    highlightLabel: {
        color: colors.accentBlueLight,
        fontSize: fontSizes.smPlus,
        fontWeight: '700',
        marginBottom: spacing.sm,
        textAlign: 'center',
        fontFamily: fontFamilies.body,
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    bulletDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.accentOrange,
    },
    bulletText: {
        color: colors.textNight,
        fontSize: fontSizes.base,
        lineHeight: lineHeights.md,
        fontFamily: fontFamilies.body,
        flex: 1,
    },
    noteBox: {
        width: '100%',
        backgroundColor: colors.surfaceNightOverlay,
        borderRadius: radius.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderNightMuted,
        marginBottom: spacing.lg,
        shadowColor: colors.accentSkyDeep,
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 10,
        elevation: 5,
    },
    note: {
        color: colors.textNight,
        fontSize: fontSizes.base,
        lineHeight: lineHeights.md,
        fontFamily: fontFamilies.body,
        textAlign: 'center',
    },
    buttonContainer: {
        width: '100%',
        gap: spacing.smPlus,
    },
    primaryBtn: {
        backgroundColor: colors.accentGreen,
        borderRadius: radius.mdPlus,
        paddingVertical: spacing.mdPlus,
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
        width: '100%',
        shadowColor: colors.accentGreen,
        shadowOpacity: 0.4,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 16,
        elevation: 8,
    },
    primaryBtnDisabled: {
        opacity: 0.7,
    },
    primaryContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    primaryText: {
        color: colors.white,
        fontSize: fontSizes.xl,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    secondaryBtn: {
        borderRadius: radius.mdPlus,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.borderNightMuted,
    },
    secondaryText: {
        color: colors.textNightMuted,
        fontSize: fontSizes.base,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
});
