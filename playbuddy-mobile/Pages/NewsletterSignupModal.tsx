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

import { useAnalyticsProps } from '../Common/hooks/useAnalytics';
import { logEvent } from '../Common/hooks/logger';
import { UE } from '../userEventTypes';
import { useUserContext } from './Auth/hooks/UserContext';
import { useUpdateUserProfile } from './Auth/hooks/useUserProfile';
import { colors, fontFamilies, fontSizes, lineHeights, radius, spacing } from '../components/styles';

type NewsletterSignupModalProps = {
    visible: boolean;
    onDismiss: () => void;
    onSnooze: () => void;
};

export function NewsletterSignupModal({ visible, onDismiss, onSnooze }: NewsletterSignupModalProps) {
    const analyticsProps = useAnalyticsProps();
    const { authUserId } = useUserContext();
    const { mutateAsync: updateUserProfile, isPending } = useUpdateUserProfile(authUserId ?? '');

    if (!visible) return null;

    const handleDismiss = () => {
        logEvent(UE.NewsletterSignupModalDismissed, analyticsProps);
        onDismiss();
    };

    const handleSnooze = () => {
        logEvent(UE.NewsletterSignupModalDismissed, analyticsProps);
        onSnooze();
    };

    const handleSignup = async () => {
        if (!authUserId) {
            handleSnooze();
            return;
        }
        logEvent(UE.NewsletterSignupModalOpenSignup, analyticsProps);
        try {
            await updateUserProfile({ joined_newsletter: true });
            onDismiss();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Please try again.';
            Alert.alert('Unable to update newsletter', message);
        }
    };

    return (
        <Modal transparent animationType="fade" onRequestClose={handleDismiss}>
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.close} onPress={handleDismiss} hitSlop={8}>
                        <Text style={styles.closeText}>X</Text>
                    </TouchableOpacity>

                    <Text style={styles.title}>Sign up for the weekly PlayBuddy newsletter</Text>
                    <Text style={styles.subtitle}>
                        To get Weekly Picks and other cool kinky tips in NYC!
                    </Text>

                    <Text style={styles.note}>
                        You can opt out anytime in Consent. Tap the user icon in the top right.
                    </Text>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.primaryBtn, isPending && styles.primaryBtnDisabled]}
                            onPress={handleSignup}
                            disabled={isPending}
                            activeOpacity={0.85}
                        >
                            {isPending ? (
                                <ActivityIndicator color={colors.surfaceNight} />
                            ) : (
                                <Text style={styles.primaryText}>Sign up</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.secondaryBtn} onPress={handleSnooze}>
                            <Text style={styles.secondaryText}>Maybe later</Text>
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
    },
    card: {
        width: '88%',
        backgroundColor: colors.surfaceNight,
        borderRadius: radius.lgPlus,
        padding: spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.borderNight,
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
    title: {
        fontSize: fontSizes.xxxl,
        fontWeight: '700',
        textAlign: 'center',
        color: colors.white,
        marginBottom: spacing.smPlus,
        fontFamily: fontFamilies.display,
    },
    subtitle: {
        fontSize: fontSizes.lg,
        color: colors.textNightMuted,
        textAlign: 'center',
        lineHeight: lineHeights.lg,
        marginBottom: spacing.lg,
        fontFamily: fontFamilies.body,
    },
    note: {
        fontSize: fontSizes.sm,
        color: colors.textNightSubtle,
        textAlign: 'center',
        lineHeight: lineHeights.md,
        marginBottom: spacing.lg,
        fontFamily: fontFamilies.body,
    },
    buttonContainer: {
        width: '100%',
        gap: spacing.smPlus,
    },
    primaryBtn: {
        backgroundColor: colors.accentGreen,
        borderRadius: radius.mdPlus,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
        width: '100%',
    },
    primaryBtnDisabled: {
        opacity: 0.7,
    },
    primaryText: {
        color: colors.surfaceNight,
        fontSize: fontSizes.xl,
        fontWeight: '700',
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
