import React from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Switch,
} from 'react-native';
import type { Organizer } from '../../Common/types/commonTypes';
import { colors, fontFamilies, fontSizes, lineHeights, radius, shadows, spacing } from '../../components/styles';

export type OrganizerEditForm = {
    name: string;
    url: string;
    original_id: string;
    aliases: string;
    fetlife_handles: string;
    instagram_handle: string;
    membership_app_url: string;
    membership_only: boolean;
    hidden: boolean;
    vetted: boolean;
    vetted_instructions: string;
};

type Props = {
    visible: boolean;
    organizer: Organizer | null;
    values: OrganizerEditForm;
    onChange: <K extends keyof OrganizerEditForm>(key: K, value: OrganizerEditForm[K]) => void;
    onSave: () => void;
    onClose: () => void;
    saving?: boolean;
};

export const OrganizerEditModal = ({
    visible,
    organizer,
    values,
    onChange,
    onSave,
    onClose,
    saving = false,
}: Props) => {
    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <Text style={styles.title}>Edit organizer</Text>
                    <Text style={styles.subtitle}>
                        {organizer ? `${organizer.name || 'Organizer'} · #${organizer.id}` : 'Organizer details'}
                    </Text>
                    <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
                        <View style={styles.field}>
                            <Text style={styles.label}>Name</Text>
                            <TextInput
                                style={styles.input}
                                value={values.name}
                                onChangeText={(value) => onChange('name', value)}
                                placeholder="Organizer name"
                                placeholderTextColor={colors.textSubtle}
                            />
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>Website</Text>
                            <TextInput
                                style={styles.input}
                                value={values.url}
                                onChangeText={(value) => onChange('url', value)}
                                placeholder="https://"
                                placeholderTextColor={colors.textSubtle}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="url"
                            />
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>Original ID</Text>
                            <TextInput
                                style={styles.input}
                                value={values.original_id}
                                onChangeText={(value) => onChange('original_id', value)}
                                placeholder="External ID"
                                placeholderTextColor={colors.textSubtle}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                        <View style={styles.fieldRow}>
                            <View style={styles.fieldCol}>
                                <Text style={styles.label}>FetLife handles</Text>
                                <TextInput
                                    style={styles.input}
                                    value={values.fetlife_handles}
                                    onChangeText={(value) => onChange('fetlife_handles', value)}
                                    placeholder="@handle1, @handle2"
                                    placeholderTextColor={colors.textSubtle}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                            <View style={styles.fieldCol}>
                                <Text style={styles.label}>Instagram</Text>
                                <TextInput
                                    style={styles.input}
                                    value={values.instagram_handle}
                                    onChangeText={(value) => onChange('instagram_handle', value)}
                                    placeholder="@handle"
                                    placeholderTextColor={colors.textSubtle}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>Aliases</Text>
                            <TextInput
                                style={[styles.input, styles.multilineInput]}
                                value={values.aliases}
                                onChangeText={(value) => onChange('aliases', value)}
                                placeholder="alias1, alias2"
                                placeholderTextColor={colors.textSubtle}
                                autoCapitalize="none"
                                autoCorrect={false}
                                multiline
                                textAlignVertical="top"
                            />
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>Membership URL</Text>
                            <TextInput
                                style={styles.input}
                                value={values.membership_app_url}
                                onChangeText={(value) => onChange('membership_app_url', value)}
                                placeholder="https://"
                                placeholderTextColor={colors.textSubtle}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="url"
                            />
                        </View>
                        <View style={styles.switchRow}>
                            <Text style={styles.label}>Members-only</Text>
                            <Switch
                                value={values.membership_only}
                                onValueChange={(value) => onChange('membership_only', value)}
                                trackColor={{ false: colors.borderMutedAlt, true: colors.tintViolet }}
                                thumbColor={values.membership_only ? colors.brandIndigo : colors.surfaceWhiteStrong}
                                ios_backgroundColor={colors.borderMutedAlt}
                                disabled={saving}
                            />
                        </View>
                        <View style={styles.switchRow}>
                            <Text style={styles.label}>Hidden organizer</Text>
                            <Switch
                                value={values.hidden}
                                onValueChange={(value) => onChange('hidden', value)}
                                trackColor={{ false: colors.borderMutedAlt, true: colors.tintViolet }}
                                thumbColor={values.hidden ? colors.brandIndigo : colors.surfaceWhiteStrong}
                                ios_backgroundColor={colors.borderMutedAlt}
                                disabled={saving}
                            />
                        </View>
                        <View style={styles.switchRow}>
                            <Text style={styles.label}>Vetted organizer</Text>
                            <Switch
                                value={values.vetted}
                                onValueChange={(value) => onChange('vetted', value)}
                                trackColor={{ false: colors.borderMutedAlt, true: colors.badgeVetted }}
                                thumbColor={values.vetted ? colors.badgeVetted : colors.surfaceWhiteStrong}
                                ios_backgroundColor={colors.borderMutedAlt}
                                disabled={saving}
                            />
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>Vetted instructions</Text>
                            <TextInput
                                style={[styles.input, styles.instructionsInput]}
                                value={values.vetted_instructions}
                                onChangeText={(value) => onChange('vetted_instructions', value)}
                                placeholder="Add instructions (Markdown supported)"
                                placeholderTextColor={colors.textSubtle}
                                multiline
                                textAlignVertical="top"
                            />
                        </View>
                    </ScrollView>
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onClose}
                            disabled={saving}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                            onPress={onSave}
                            disabled={saving}
                        >
                            <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save changes'}</Text>
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
        maxHeight: '90%',
        ...shadows.card,
    },
    title: {
        fontSize: fontSizes.lg,
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: fontFamilies.display,
    },
    subtitle: {
        marginTop: spacing.xs,
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        lineHeight: lineHeights.md,
        fontFamily: fontFamilies.body,
    },
    formScroll: {
        marginTop: spacing.md,
    },
    formContent: {
        paddingBottom: spacing.md,
    },
    field: {
        marginBottom: spacing.md,
    },
    fieldRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    fieldCol: {
        flex: 1,
    },
    label: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        marginBottom: spacing.xs,
        fontFamily: fontFamilies.body,
    },
    input: {
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
    multilineInput: {
        minHeight: 72,
    },
    instructionsInput: {
        minHeight: 120,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    actions: {
        marginTop: spacing.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    cancelButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        borderRadius: radius.pill,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceSubtle,
    },
    cancelText: {
        fontSize: fontSizes.smPlus,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
        fontWeight: '600',
    },
    saveButton: {
        flex: 1,
        borderRadius: radius.pill,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.brandIndigo,
    },
    saveButtonDisabled: {
        backgroundColor: colors.brandMuted,
    },
    saveText: {
        fontSize: fontSizes.smPlus,
        color: colors.white,
        fontFamily: fontFamilies.body,
        fontWeight: '600',
    },
});
