import React from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fontFamilies, fontSizes, lineHeights, radius, shadows, spacing } from '../../components/styles';

type Props = {
    visible: boolean;
    value: string;
    onChangeText: (value: string) => void;
    onSave: () => void;
    onClose: () => void;
};

export const VettedInstructionsModal = ({ visible, value, onChangeText, onSave, onClose }: Props) => {
    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <Text style={styles.title}>Vetted instructions</Text>
                    <Text style={styles.subtitle}>
                        Shown on vetted events for this organizer.
                    </Text>
                    <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChangeText}
                        placeholder="Add instructions (Markdown supported)"
                        placeholderTextColor={colors.textSubtle}
                        multiline
                        textAlignVertical="top"
                        autoCapitalize="sentences"
                    />
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveButton} onPress={onSave}>
                            <Text style={styles.saveText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        padding: spacing.lg,
        justifyContent: 'center',
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: radius.lg,
        padding: spacing.lg,
        ...shadows.card,
    },
    title: {
        fontSize: fontSizes.lg,
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    subtitle: {
        marginTop: spacing.xs,
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        lineHeight: lineHeights.md,
        fontFamily: fontFamilies.body,
    },
    input: {
        marginTop: spacing.md,
        minHeight: 140,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: fontSizes.base,
        color: colors.textPrimary,
        backgroundColor: colors.surfaceWhiteStrong,
        fontFamily: fontFamilies.body,
    },
    actions: {
        marginTop: spacing.md,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: spacing.sm,
    },
    cancelButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        backgroundColor: colors.surfaceSubtle,
    },
    cancelText: {
        fontSize: fontSizes.smPlus,
        fontWeight: '600',
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    saveButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.pill,
        backgroundColor: colors.brandIndigo,
    },
    saveText: {
        fontSize: fontSizes.smPlus,
        fontWeight: '600',
        color: colors.white,
        fontFamily: fontFamilies.body,
    },
});
