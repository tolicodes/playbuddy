import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

import { useAnalyticsProps } from '../Common/hooks/useAnalytics';
import { logEvent } from '../Common/hooks/logger';
import { useUserContext } from './Auth/hooks/UserContext';
import { useUpdateUserProfile } from './Auth/hooks/useUserProfile';
import { MISC_URLS } from '../config';
import { UE } from '../userEventTypes';
import { colors, fontFamilies, fontSizes, lineHeights, radius, spacing } from '../components/styles';

type NewsletterSignupModalProps = {
    visible: boolean;
    onDismiss: () => void;
    onSnooze: () => void;
};

export function NewsletterSignupModal({ visible, onDismiss, onSnooze }: NewsletterSignupModalProps) {
    const analyticsProps = useAnalyticsProps();
    const { authUserId, userProfile } = useUserContext();
    const { mutateAsync: updateUserProfile } = useUpdateUserProfile(authUserId || '');

    if (!visible) return null;

    const dismiss = () => {
        logEvent(UE.NewsletterSignupModalDismissed, analyticsProps);
        onDismiss();
    };

    const snooze = () => {
        logEvent(UE.NewsletterSignupModalDismissed, analyticsProps);
        onSnooze();
    };

    const openNewsletter = () => {
        logEvent(UE.NewsletterSignupModalOpenSignup, analyticsProps);
        if (authUserId && !userProfile?.joined_newsletter) {
            void updateUserProfile({ joined_newsletter: true });
        }
        void Linking.openURL(MISC_URLS.newsletterSignup);
        onDismiss();
    };

    return (
        <Modal transparent animationType="fade" onRequestClose={dismiss}>
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.close} onPress={dismiss}>
                        <Text style={styles.closeText}>X</Text>
                    </TouchableOpacity>

                    <View style={styles.iconWrap}>
                        <FontAwesome5 name="envelope-open-text" size={26} color={colors.accentSky} />
                    </View>
                    <Text style={styles.title}>Join our newsletter</Text>
                    <Text style={styles.subtitle}>
                        Get the latest NYC kink events, news, and community tips in a short weekly email.
                    </Text>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.primaryBtn} onPress={openNewsletter} activeOpacity={0.85}>
                            <Text style={styles.primaryText}>Join the newsletter</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.secondaryBtn} onPress={snooze}>
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
        shadowColor: colors.black,
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 16,
        elevation: 12,
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
    iconWrap: {
        backgroundColor: colors.accentSkySoft,
        borderRadius: radius.pill,
        padding: spacing.md,
        marginBottom: spacing.smPlus,
    },
    title: {
        fontSize: fontSizes.xxxl,
        fontWeight: '700',
        textAlign: 'center',
        color: colors.white,
        marginBottom: spacing.sm,
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
    buttonContainer: {
        width: '100%',
        gap: spacing.smPlus,
    },
    primaryBtn: {
        backgroundColor: colors.accentSky,
        borderRadius: radius.mdPlus,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
        width: '100%',
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
