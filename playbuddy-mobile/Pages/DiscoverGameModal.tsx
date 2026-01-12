import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from '@react-navigation/native';

import type { NavStack } from '../Common/Nav/NavStackType';
import { colors, fontFamilies, fontSizes, lineHeights, radius, spacing } from '../components/styles';

type DiscoverGameModalProps = {
    visible: boolean;
    onDismiss: () => void;
    onSnooze: () => void;
};

export function DiscoverGameModal({ visible, onDismiss, onSnooze }: DiscoverGameModalProps) {
    const navigation = useNavigation<NavStack>();

    if (!visible) return null;

    const dismiss = () => {
        onDismiss();
    };

    const snooze = () => {
        onSnooze();
    };

    const openDiscoverGame = () => {
        navigation.navigate('Discover Game' as never);
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
                        <FontAwesome5 name="gamepad" size={26} color={colors.accentGreen} />
                    </View>
                    <Text style={styles.title}>Try Discover Game</Text>
                    <Text style={styles.subtitle}>
                        Discover Game is a fast, fun way to swipe through events and add favorites to your
                        calendar. Plan your week in minutes.
                    </Text>

                    <View style={styles.highlightBox}>
                        <Text style={styles.highlightLabel}>How it works</Text>
                        <View style={styles.bulletRow}>
                            <View style={styles.bulletDot} />
                            <Text style={styles.bulletText}>Swipe right to add events to your calendar</Text>
                        </View>
                        <View style={styles.bulletRow}>
                            <View style={styles.bulletDot} />
                            <Text style={styles.bulletText}>Swipe left to skip, undo anytime</Text>
                        </View>
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.primaryBtn} onPress={openDiscoverGame} activeOpacity={0.85}>
                            <Text style={styles.primaryText}>Play now</Text>
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
        backgroundColor: 'rgba(22, 163, 74, 0.12)',
        borderRadius: radius.pill,
        padding: spacing.md,
        marginBottom: spacing.smPlus,
        borderWidth: 1,
        borderColor: 'rgba(22, 163, 74, 0.3)',
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
        backgroundColor: 'rgba(22, 163, 74, 0.12)',
        borderRadius: radius.mdPlus,
        padding: spacing.mdPlus,
        borderWidth: 1,
        borderColor: 'rgba(22, 163, 74, 0.28)',
        marginBottom: spacing.lg,
    },
    highlightLabel: {
        color: colors.accentGreen,
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
        backgroundColor: colors.accentGreen,
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
        backgroundColor: colors.accentGreen,
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
