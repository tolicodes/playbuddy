import React, { useCallback, useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as StoreReview from 'expo-store-review';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

import { useAnalyticsProps } from '../Common/hooks/useAnalytics';
import { logEvent } from '../Common/hooks/logger';
import { UE } from '../userEventTypes';
import { colors, fontFamilies, fontSizes, lineHeights, radius, spacing } from '../components/styles';

type RateAppModalProps = {
    visible: boolean;
    onDismiss: () => void;
    onSnooze: () => void;
};

export function RateAppModal({ visible, onDismiss, onSnooze }: RateAppModalProps) {
    const analyticsProps = useAnalyticsProps();
    const [isRequesting, setIsRequesting] = useState(false);

    useEffect(() => {
        if (!visible) return;
        logEvent(UE.RateAppModalShown, analyticsProps);
    }, [analyticsProps, visible]);

    useEffect(() => {
        if (!visible) {
            setIsRequesting(false);
        }
    }, [visible]);

    const handleDismiss = () => {
        logEvent(UE.RateAppModalSkipped, analyticsProps);
        onDismiss();
    };

    const handleSnooze = () => {
        logEvent(UE.RateAppModalSkipped, analyticsProps);
        onSnooze();
    };

    const handleRequestReview = useCallback(() => {
        if (isRequesting) return;
        setIsRequesting(true);

        void (async () => {
            let didRequest = false;
            try {
                const isAvailable = await StoreReview.isAvailableAsync();
                if (isAvailable) {
                    didRequest = true;
                    logEvent(UE.RateAppModalOpenStore, analyticsProps);
                    await StoreReview.requestReview();
                }
            } catch {
                // Ignore failures; we'll retry after snooze.
            } finally {
                setIsRequesting(false);
                if (didRequest) {
                    onDismiss();
                } else {
                    logEvent(UE.RateAppModalSkipped, analyticsProps);
                    onSnooze();
                }
            }
        })();
    }, [analyticsProps, isRequesting, onDismiss, onSnooze]);

    if (!visible) return null;

    return (
        <Modal transparent animationType="fade" onRequestClose={handleDismiss}>
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.close} onPress={handleDismiss} hitSlop={8}>
                        <Text style={styles.closeText}>X</Text>
                    </TouchableOpacity>

                    <View style={styles.iconWrap}>
                        <FontAwesome5 name="star" size={24} color={colors.textGold} />
                    </View>
                    <Text style={styles.title}>Could you rate PlayBuddy?</Text>
                    <Text style={styles.subtitle}>
                        If you are enjoying PlayBuddy, a quick rating helps more people find us.
                    </Text>

                    <View style={styles.highlightBox}>
                        <Text style={styles.highlightLabel}>Why it helps</Text>
                        <View style={styles.bulletRow}>
                            <View style={styles.bulletDot} />
                            <Text style={styles.bulletText}>
                                More ratings help PlayBuddy reach more people.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.primaryBtn, isRequesting && styles.primaryBtnDisabled]}
                            onPress={handleRequestReview}
                            activeOpacity={0.85}
                            disabled={isRequesting}
                        >
                            <Text style={styles.primaryText}>
                                {isRequesting ? 'Opening...' : 'Rate PlayBuddy'}
                            </Text>
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
        paddingHorizontal: spacing.xl,
    },
    card: {
        width: '100%',
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
        backgroundColor: colors.surfaceGoldLight,
        borderRadius: radius.pill,
        padding: spacing.md,
        marginBottom: spacing.smPlus,
        borderWidth: 1,
        borderColor: colors.borderGoldSoft,
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
    highlightBox: {
        width: '100%',
        backgroundColor: colors.surfaceGoldWarm,
        borderRadius: radius.mdPlus,
        padding: spacing.mdPlus,
        borderWidth: 1,
        borderColor: colors.borderGoldLight,
        marginBottom: spacing.lg,
    },
    highlightLabel: {
        color: colors.textGold,
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
    },
    bulletDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.textGold,
    },
    bulletText: {
        color: colors.textNight,
        fontSize: fontSizes.base,
        lineHeight: lineHeights.md,
        fontFamily: fontFamilies.body,
        flex: 1,
    },
    buttonContainer: {
        width: '100%',
        gap: spacing.smPlus,
    },
    primaryBtn: {
        backgroundColor: colors.gold,
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
