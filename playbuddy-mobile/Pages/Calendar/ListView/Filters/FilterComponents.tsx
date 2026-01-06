import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontFamilies, fontSizes, radius, spacing } from '../../../../components/styles';

export const TagPill = ({ label, onRemove, variant = 'selected' }: {
    label: string;
    onRemove?: () => void;
    variant?: 'selected' | 'suggestion';
}) => (
    <View style={[styles.tagPill, variant === 'suggestion' && styles.suggestionPill]}>
        <Text style={styles.tagText}>{label}</Text>
        {onRemove && (
            <TouchableOpacity onPress={onRemove} style={styles.removeIcon}>
                <Ionicons name="close-circle" size={16} color={colors.textDisabled} />
            </TouchableOpacity>
        )}
    </View>
);

// Pill component
export const Pill = ({ label, selected, onPress }: {
    label: string;
    selected: boolean;
    onPress: () => void;
}) => (
    <TouchableOpacity
        style={[styles.pill, selected && styles.pillSelected]}
        onPress={onPress}
    >
        <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    tagPill: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceSubtle,
        paddingHorizontal: spacing.smPlus,
        paddingVertical: spacing.xs,
        borderRadius: radius.xl,
        marginRight: spacing.xsPlus,
        alignItems: 'center',
    },
    suggestionPill: {
        backgroundColor: colors.surfaceInfoStrong,
    },
    tagText: {
        fontSize: fontSizes.sm,
        fontWeight: '500',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    removeIcon: {
        marginLeft: spacing.xsPlus,
    },
    pillList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    pill: {
        paddingHorizontal: spacing.mdPlus,
        paddingVertical: spacing.xsPlus,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceSubtle,
        marginRight: spacing.sm,
    },
    pillSelected: {
        backgroundColor: colors.accentPurple,
    },
    pillText: {
        color: colors.textMuted,
        fontSize: fontSizes.smPlus,
        fontWeight: '500',
        fontFamily: fontFamilies.body,
    },
    pillTextSelected: {
        color: colors.white,
    },
    dropdownContainer: {
        flex: 1,
        marginVertical: spacing.md,
    },
    dropdownLabel: {
        fontSize: fontSizes.base,
        fontWeight: '600',
        marginBottom: spacing.xsPlus,
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    dropdownPillContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    dropdownPill: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xsPlus,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceSubtle,
        marginBottom: spacing.sm,
    },
    dropdownPillSelected: {
        backgroundColor: colors.accentPurple,
    },
    dropdownPillText: {
        fontSize: fontSizes.smPlus,
        fontWeight: '500',
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    dropdownPillTextSelected: {
        color: colors.white,
    },
});

export default { TagPill, Pill };
