import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    Switch,
    ActivityIndicator,
    Alert,
} from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { useFetchOrganizers } from '../../Common/db-axios/useOrganizers';
import { useUpdateOrganizer } from '../../Common/db-axios/useUpdateOrganizer';
import type { Organizer } from '../../Common/types/commonTypes';
import { useUserContext } from '../Auth/hooks/UserContext';
import { ADMIN_EMAILS } from '../../config';
import {
    colors,
    fontFamilies,
    fontSizes,
    lineHeights,
    radius,
    shadows,
    spacing,
} from '../../components/styles';

type OrganizerDraft = Partial<Organizer> & { aliases?: string | string[] | null };
type OrganizerWithCounts = Organizer & { _futureCount: number; _totalCount: number };

const parseAliases = (value: OrganizerDraft['aliases'], fallback?: string[] | null) => {
    if (value === undefined) return fallback ?? null;
    if (typeof value === 'string') {
        return value
            .split(',')
            .map((alias) => alias.trim())
            .filter(Boolean);
    }
    return value ?? null;
};

const deriveAliasValue = (draftValue: OrganizerDraft['aliases'], fallback?: string[] | null) => {
    if (draftValue === undefined) return (fallback || []).join(', ');
    if (typeof draftValue === 'string') return draftValue;
    return (draftValue || []).join(', ');
};

export const OrganizerAdminScreen = () => {
    const { userProfile } = useUserContext();
    const isAdmin = !!userProfile?.email && ADMIN_EMAILS.includes(userProfile.email);

    const { data: organizers = [], isLoading, error } = useFetchOrganizers({ includeHidden: true });
    const updateOrganizer = useUpdateOrganizer();

    const [drafts, setDrafts] = useState<Record<number, OrganizerDraft>>({});
    const [search, setSearch] = useState('');
    const [hideNoEvents, setHideNoEvents] = useState(true);
    const [showOnlyHidden, setShowOnlyHidden] = useState(false);
    const [savingId, setSavingId] = useState<number | null>(null);

    const setDraft = (id: number, key: keyof OrganizerDraft, value: any) => {
        setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [key]: value } }));
    };

    const clearDraft = (id: number) => {
        setDrafts((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const clearDraftKey = (id: number, key: keyof OrganizerDraft) => {
        setDrafts((prev) => {
            const current = prev[id];
            if (!current) return prev;
            const { [key]: _, ...rest } = current;
            const next = { ...prev };
            if (Object.keys(rest).length === 0) {
                delete next[id];
            } else {
                next[id] = rest;
            }
            return next;
        });
    };

    const normalized = useMemo(() => {
        const now = Date.now();
        return [...organizers]
            .map((org) => {
                const events = ((org as any).events || []) as { start_date?: string | null }[];
                const futureCount = events.filter((event) => {
                    if (!event?.start_date) return false;
                    const ts = new Date(event.start_date).getTime();
                    return Number.isFinite(ts) && ts >= now;
                }).length;
                const totalCount = events.length;
                return {
                    org,
                    futureCount,
                    totalCount,
                    name: (org.name || '').toLowerCase(),
                    fet: (org.fetlife_handle || '').toLowerCase(),
                    ig: (org.instagram_handle || '').toLowerCase(),
                    aliases: (org.aliases || []).map((alias) => (alias || '').toLowerCase()),
                };
            })
            .sort((a, b) => (a.org.name || '').localeCompare(b.org.name || ''));
    }, [organizers]);

    const filtered = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return normalized
            .filter((item) => {
                if (hideNoEvents && item.futureCount === 0) return false;
                if (showOnlyHidden && !item.org.hidden) return false;
                if (!needle) return true;
                return (
                    item.name.includes(needle) ||
                    item.fet.includes(needle) ||
                    item.ig.includes(needle) ||
                    item.aliases.some((alias) => alias.includes(needle))
                );
            })
            .map((item) => ({
                ...item.org,
                _futureCount: item.futureCount,
                _totalCount: item.totalCount,
            })) as OrganizerWithCounts[];
    }, [normalized, search, hideNoEvents, showOnlyHidden]);

    const toggleHidden = async (org: OrganizerWithCounts, nextHidden: boolean) => {
        const prevHidden = (drafts[org.id]?.hidden ?? org.hidden) ?? false;
        setDraft(org.id, 'hidden', nextHidden);
        setSavingId(org.id);
        try {
            await updateOrganizer.mutateAsync({ id: org.id, hidden: nextHidden });
            clearDraftKey(org.id, 'hidden');
        } catch {
            setDraft(org.id, 'hidden', prevHidden);
            Alert.alert('Update failed', 'Unable to update organizer visibility.');
        } finally {
            setSavingId(null);
        }
    };

    const saveOrganizer = async (org: OrganizerWithCounts) => {
        const draft = drafts[org.id] || {};
        setSavingId(org.id);
        try {
            await updateOrganizer.mutateAsync({
                id: org.id,
                name: draft.name ?? org.name,
                url: draft.url ?? org.url,
                aliases: parseAliases(draft.aliases, org.aliases),
                fetlife_handle: draft.fetlife_handle ?? org.fetlife_handle,
                instagram_handle: draft.instagram_handle ?? org.instagram_handle,
                hidden: draft.hidden ?? org.hidden,
                membership_app_url: draft.membership_app_url ?? org.membership_app_url,
                membership_only: draft.membership_only ?? org.membership_only,
            });
            clearDraft(org.id);
        } catch {
            Alert.alert('Save failed', 'Unable to update organizer details.');
        } finally {
            setSavingId(null);
        }
    };

    if (!isAdmin) {
        return (
            <View style={styles.container}>
                <View style={styles.lockedCard}>
                    <View style={styles.lockedIcon}>
                        <FAIcon name="user-lock" size={22} color={colors.textMuted} />
                    </View>
                    <Text style={styles.lockedTitle}>Admins only</Text>
                    <Text style={styles.lockedText}>
                        Organizer tools are reserved for PlayBuddy staff.
                    </Text>
                </View>
            </View>
        );
    }

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.linkBlue} />
                <Text style={styles.loadingText}>Loading organizers...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Failed to load organizers.</Text>
            </View>
        );
    }

    const renderHeader = () => (
        <View>
            <View style={styles.heroCard}>
                <View style={styles.heroIcon}>
                    <FAIcon name="users" size={18} color={colors.brandBlue} />
                </View>
                <Text style={styles.heroTitle}>Organizer Admin</Text>
                <Text style={styles.heroSubtitle}>
                    Edit organizer names, handles, aliases, and visibility.
                </Text>
            </View>

            <View style={styles.filterCard}>
                <View style={styles.searchRow}>
                    <Ionicons name="search" size={16} color={colors.textSubtle} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search name, handle, alias"
                        placeholderTextColor={colors.textSubtle}
                        value={search}
                        onChangeText={setSearch}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>
                <View style={styles.filterRow}>
                    <TouchableOpacity
                        style={[styles.filterPill, hideNoEvents && styles.filterPillActive]}
                        onPress={() => setHideNoEvents((prev) => !prev)}
                    >
                        <Text style={[styles.filterText, hideNoEvents && styles.filterTextActive]}>
                            Hide no-events
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterPill, showOnlyHidden && styles.filterPillActive]}
                        onPress={() => setShowOnlyHidden((prev) => !prev)}
                    >
                        <Text style={[styles.filterText, showOnlyHidden && styles.filterTextActive]}>
                            Hidden only
                        </Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.filterMetaRow}>
                    <Text style={styles.filterMetaText}>{filtered.length} organizers</Text>
                    {updateOrganizer.isPending && (
                        <Text style={styles.filterMetaText}>Saving...</Text>
                    )}
                </View>
            </View>
        </View>
    );

    const renderItem = ({ item }: { item: OrganizerWithCounts }) => {
        const draft = drafts[item.id] || {};
        const hiddenValue = (draft.hidden ?? item.hidden) ?? false;
        const membershipOnlyValue = (draft.membership_only ?? item.membership_only) ?? false;
        const aliasValue = deriveAliasValue(draft.aliases, item.aliases);
        const hasChanges = Object.keys(draft).length > 0;
        const isSaving = updateOrganizer.isPending && savingId === item.id;

        return (
            <View style={styles.card}>
                <View style={styles.metaRow}>
                    <View style={styles.metaPill}>
                        <Text style={styles.metaLabel}>ID</Text>
                        <Text style={styles.metaValue}>#{item.id}</Text>
                    </View>
                    <View style={styles.metaPill}>
                        <Text style={styles.metaLabel}>Upcoming</Text>
                        <Text style={styles.metaValue}>{item._futureCount}</Text>
                    </View>
                    <View style={styles.metaPill}>
                        <Text style={styles.metaLabel}>Total</Text>
                        <Text style={styles.metaValue}>{item._totalCount}</Text>
                    </View>
                    <View style={styles.togglePill}>
                        <Text style={styles.toggleLabel}>Hidden</Text>
                        <Switch
                            value={hiddenValue}
                            onValueChange={(value) => toggleHidden(item, value)}
                            trackColor={{ false: colors.borderMutedAlt, true: colors.tintViolet }}
                            thumbColor={hiddenValue ? colors.brandIndigo : colors.surfaceWhiteStrong}
                            ios_backgroundColor={colors.borderMutedAlt}
                            disabled={isSaving}
                        />
                    </View>
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Name</Text>
                    <TextInput
                        style={styles.input}
                        value={draft.name ?? item.name ?? ''}
                        onChangeText={(value) => setDraft(item.id, 'name', value)}
                        placeholder="Organizer name"
                        placeholderTextColor={colors.textSubtle}
                    />
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Website</Text>
                    <TextInput
                        style={styles.input}
                        value={draft.url ?? item.url ?? ''}
                        onChangeText={(value) => setDraft(item.id, 'url', value)}
                        placeholder="https://"
                        placeholderTextColor={colors.textSubtle}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                    />
                </View>

                <View style={styles.fieldRow}>
                    <View style={styles.fieldCol}>
                        <Text style={styles.label}>Fetlife</Text>
                        <TextInput
                            style={styles.input}
                            value={draft.fetlife_handle ?? item.fetlife_handle ?? ''}
                            onChangeText={(value) => setDraft(item.id, 'fetlife_handle', value)}
                            placeholder="@handle"
                            placeholderTextColor={colors.textSubtle}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>
                    <View style={styles.fieldCol}>
                        <Text style={styles.label}>Instagram</Text>
                        <TextInput
                            style={styles.input}
                            value={draft.instagram_handle ?? item.instagram_handle ?? ''}
                            onChangeText={(value) => setDraft(item.id, 'instagram_handle', value)}
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
                        value={aliasValue}
                        onChangeText={(value) => setDraft(item.id, 'aliases', value)}
                        placeholder="alias1, alias2"
                        placeholderTextColor={colors.textSubtle}
                        autoCapitalize="none"
                        autoCorrect={false}
                        multiline
                    />
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Membership URL</Text>
                    <TextInput
                        style={styles.input}
                        value={draft.membership_app_url ?? item.membership_app_url ?? ''}
                        onChangeText={(value) => setDraft(item.id, 'membership_app_url', value)}
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
                        value={membershipOnlyValue}
                        onValueChange={(value) => setDraft(item.id, 'membership_only', value)}
                        trackColor={{ false: colors.borderMutedAlt, true: colors.tintViolet }}
                        thumbColor={membershipOnlyValue ? colors.brandIndigo : colors.surfaceWhiteStrong}
                        ios_backgroundColor={colors.borderMutedAlt}
                        disabled={isSaving}
                    />
                </View>

                <TouchableOpacity
                    style={[
                        styles.saveButton,
                        (!hasChanges || isSaving) && styles.saveButtonDisabled,
                    ]}
                    onPress={() => saveOrganizer(item)}
                    disabled={!hasChanges || isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                        <Text style={styles.saveButtonText}>
                            {hasChanges ? 'Save changes' : 'Saved'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No organizers found.</Text>
                </View>
            }
            contentContainerStyle={styles.listContent}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
        />
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surfaceMuted,
    },
    list: {
        flex: 1,
        backgroundColor: colors.surfaceMuted,
    },
    listContent: {
        padding: spacing.lg,
        paddingBottom: spacing.xxxl,
        gap: spacing.lg,
    },
    heroCard: {
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing.lg,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.card,
    },
    heroIcon: {
        width: 36,
        height: 36,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceInfo,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    heroTitle: {
        fontSize: fontSizes.display,
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: fontFamilies.display,
    },
    heroSubtitle: {
        marginTop: spacing.xs,
        fontSize: fontSizes.base,
        color: colors.textMuted,
        lineHeight: lineHeights.md,
        fontFamily: fontFamilies.body,
    },
    filterCard: {
        borderRadius: radius.lg,
        padding: spacing.lg,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginBottom: spacing.lg,
        ...shadows.card,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surfaceSubtle,
    },
    searchInput: {
        flex: 1,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        fontSize: fontSizes.base,
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    filterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    filterPill: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        backgroundColor: colors.surfaceSubtle,
    },
    filterPillActive: {
        backgroundColor: colors.tintViolet,
        borderColor: colors.borderLavenderAlt,
    },
    filterText: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    filterTextActive: {
        color: colors.brandIndigo,
        fontWeight: '600',
    },
    filterMetaRow: {
        marginTop: spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    filterMetaText: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: radius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.card,
    },
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    metaPill: {
        paddingHorizontal: spacing.smPlus,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        alignItems: 'center',
    },
    metaLabel: {
        fontSize: fontSizes.xxs,
        color: colors.textSubtle,
        textTransform: 'uppercase',
        fontFamily: fontFamilies.body,
    },
    metaValue: {
        fontSize: fontSizes.sm,
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    togglePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        gap: spacing.xs,
    },
    toggleLabel: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
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
        minHeight: 64,
        textAlignVertical: 'top',
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    saveButton: {
        backgroundColor: colors.brandIndigo,
        borderRadius: radius.pill,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonDisabled: {
        backgroundColor: colors.brandMuted,
    },
    saveButtonText: {
        color: colors.white,
        fontSize: fontSizes.smPlus,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    emptyState: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: fontSizes.base,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceMuted,
        padding: spacing.lg,
    },
    loadingText: {
        marginTop: spacing.sm,
        fontSize: fontSizes.base,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    errorText: {
        fontSize: fontSizes.base,
        color: colors.danger,
        margin: spacing.lg,
        fontFamily: fontFamilies.body,
    },
    lockedCard: {
        margin: spacing.lg,
        padding: spacing.lg,
        borderRadius: radius.xl,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderLight,
        alignItems: 'center',
        ...shadows.card,
    },
    lockedIcon: {
        width: 46,
        height: 46,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    lockedTitle: {
        fontSize: fontSizes.title,
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: fontFamilies.display,
        marginBottom: spacing.xs,
    },
    lockedText: {
        fontSize: fontSizes.base,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 20,
        fontFamily: fontFamilies.body,
    },
});

export default OrganizerAdminScreen;
