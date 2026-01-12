import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fontFamilies, fontSizes, radius, shadows, spacing } from '../../../components/styles';

type EventListViewIntroModalProps = {
    visible: boolean;
    onSwitchToClassic: () => void;
    onKeepNew: () => void;
};

export const EventListViewIntroModal = ({
    visible,
    onSwitchToClassic,
    onKeepNew,
}: EventListViewIntroModalProps) => {
    if (!visible) return null;

    return (
        <Modal transparent animationType="fade" onRequestClose={onKeepNew}>
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <Text style={styles.title}>Image-first view</Text>
                    <Text style={styles.body}>
                        You just tried our new image-first list. Want to keep it, or switch back to the
                        classic view?
                    </Text>
                    <TouchableOpacity style={styles.primaryButton} onPress={onKeepNew} activeOpacity={0.85}>
                        <Text style={styles.primaryButtonText}>Keep new view</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryButton} onPress={onSwitchToClassic}>
                        <Text style={styles.secondaryButtonText}>Switch to classic view</Text>
                    </TouchableOpacity>
                    <Text style={styles.footnote}>
                        <Text style={styles.footnoteLabel}>Tip: </Text>
                        Switch anytime from Profile (top right) &gt; Preferences.
                    </Text>
                </View>
            </View>
        </Modal>
    );
};

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
        backgroundColor: colors.surfaceWhiteFrosted,
        borderRadius: radius.xl,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        ...shadows.card,
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 18,
        elevation: 10,
    },
    title: {
        fontSize: fontSizes.xxl,
        fontWeight: '700',
        color: colors.brandPurple,
        marginBottom: spacing.smPlus,
        fontFamily: fontFamilies.display,
    },
    body: {
        fontSize: fontSizes.base,
        color: colors.textDeep,
        marginBottom: spacing.lg,
        fontFamily: fontFamilies.body,
    },
    primaryButton: {
        backgroundColor: colors.brandIndigo,
        borderRadius: radius.mdPlus,
        paddingVertical: spacing.mdPlus,
        alignItems: 'center',
        marginBottom: spacing.smPlus,
    },
    primaryButtonText: {
        color: colors.white,
        fontSize: fontSizes.lg,
        fontWeight: '700',
        fontFamily: fontFamilies.body,
    },
    secondaryButton: {
        backgroundColor: colors.surfaceLavenderAlt,
        borderRadius: radius.mdPlus,
        paddingVertical: spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.borderLavenderAlt,
    },
    secondaryButtonText: {
        color: colors.brandPurpleDark,
        fontSize: fontSizes.base,
        fontWeight: '700',
        fontFamily: fontFamilies.body,
    },
    footnote: {
        marginTop: spacing.md,
        fontSize: fontSizes.base,
        color: colors.textDeep,
        fontFamily: fontFamilies.body,
        lineHeight: Math.round(fontSizes.base * 1.4),
    },
    footnoteLabel: {
        fontWeight: '700',
        color: colors.brandPurpleDark,
    },
});
