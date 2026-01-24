import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    Modal,
    ActivityIndicator,
    Alert,
} from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { useFetchEvents } from '../../Common/db-axios/useEvents';
import { useFetchOrganizers } from '../../Common/db-axios/useOrganizers';
import { useMergeOrganizer } from '../../Common/db-axios/useMergeOrganizer';
import { useUpdateOrganizer } from '../../Common/db-axios/useUpdateOrganizer';
import type { Event, Organizer } from '../../Common/types/commonTypes';
import { useUserContext } from '../Auth/hooks/UserContext';
import { OrganizerEditModal, type OrganizerEditForm } from './OrganizerEditModal';
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

type OrganizerDraft = Partial<Organizer> & {
    aliases?: string | string[] | null;
    fetlife_handles?: string | string[] | null;
};
type OrganizerWithCounts = Organizer & { _futureCount: number; _totalCount: number };
type OrganizerOption = { id: number; label: string; handles?: string };

const normalizeHandle = (val?: string | null) => (val || '').replace(/^@/, '').trim().toLowerCase();
const formatOrganizerLabel = (org: Organizer) =>
    org.name || org.fetlife_handle || org.instagram_handle || `Organizer ${org.id}`;
const collectFetlifeHandles = (org: Organizer) => {
    const handles = [
        ...(org.fetlife_handles || []),
        org.fetlife_handle,
    ];
    const normalized = handles.map((handle) => normalizeHandle(handle)).filter(Boolean);
    return Array.from(new Set(normalized));
};

const formatSourceHost = (value?: string | null) => {
    if (!value) return '';
    try {
        return new URL(value).hostname.replace(/^www\./, '');
    } catch {
        return value;
    }
};

const formatEventSourceLabel = (event: Event) => {
    return (
        event.source_ticketing_platform ||
        event.source_origination_platform ||
        event.dataset ||
        formatSourceHost(event.source_url) ||
        formatSourceHost(event.event_url) ||
        formatSourceHost(event.ticket_url) ||
        ''
    );
};

const formatEventDate = (event: Event) => {
    const dateStr = event.start_date || event.end_date;
    if (!dateStr) return 'Date TBD';
    const date = new Date(dateStr);
    if (!Number.isFinite(date.getTime())) return dateStr;
    return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const getApprovalMeta = (status?: Event['approval_status']) => {
    const normalized = status ?? 'approved';
    if (normalized === 'approved') return { label: 'Approved', color: colors.success };
    if (normalized === 'pending') return { label: 'Pending', color: colors.warning };
    return { label: 'Rejected', color: colors.danger };
};

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

const parseFetlifeHandles = (
    value: OrganizerDraft['fetlife_handles'],
    fallbackHandles?: string[] | null,
    fallbackSingle?: string | null
) => {
    if (value === undefined) {
        const handles = [
            ...(fallbackHandles || []),
            fallbackSingle,
        ];
        const normalized = handles.map((handle) => normalizeHandle(handle)).filter(Boolean);
        return Array.from(new Set(normalized));
    }
    if (typeof value === 'string') {
        return value
            .split(/[,\n]/)
            .map((handle) => normalizeHandle(handle))
            .filter(Boolean);
    }
    const normalized = (value || []).map((handle) => normalizeHandle(handle)).filter(Boolean);
    return Array.from(new Set(normalized));
};

const deriveFetlifeHandleValue = (
    draftValue: OrganizerDraft['fetlife_handles'],
    fallbackHandles?: string[] | null,
    fallbackSingle?: string | null
) => {
    if (draftValue === undefined) {
        const handles = [
            ...(fallbackHandles || []),
            fallbackSingle,
        ].filter(Boolean) as string[];
        return handles.join(', ');
    }
    if (typeof draftValue === 'string') return draftValue;
    return (draftValue || []).join(', ');
};

type OrganizerAdminHeaderProps = {
    search: string;
    onSearchChange: (value: string) => void;
    hideNoEvents: boolean;
    onToggleHideNoEvents: () => void;
    showOnlyHidden: boolean;
    onToggleShowOnlyHidden: () => void;
    filteredCount: number;
    isSaving: boolean;
};

const OrganizerAdminHeader = React.memo((props: OrganizerAdminHeaderProps) => {
    const {
        search,
        onSearchChange,
        hideNoEvents,
        onToggleHideNoEvents,
        showOnlyHidden,
        onToggleShowOnlyHidden,
        filteredCount,
        isSaving,
    } = props;

    return (
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
                        onChangeText={onSearchChange}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>
                <View style={styles.filterRow}>
                    <TouchableOpacity
                        style={[styles.filterPill, hideNoEvents && styles.filterPillActive]}
                        onPress={onToggleHideNoEvents}
                    >
                        <Text style={[styles.filterText, hideNoEvents && styles.filterTextActive]}>
                            Hide no-events
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterPill, showOnlyHidden && styles.filterPillActive]}
                        onPress={onToggleShowOnlyHidden}
                    >
                        <Text style={[styles.filterText, showOnlyHidden && styles.filterTextActive]}>
                            Hidden only
                        </Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.filterMetaRow}>
                    <Text style={styles.filterMetaText}>{filteredCount} organizers</Text>
                    {isSaving && (
                        <Text style={styles.filterMetaText}>Saving...</Text>
                    )}
                </View>
            </View>
        </View>
    );
});

OrganizerAdminHeader.displayName = 'OrganizerAdminHeader';

const emptyEditForm: OrganizerEditForm = {
    name: '',
    url: '',
    original_id: '',
    aliases: '',
    fetlife_handles: '',
    instagram_handle: '',
    membership_app_url: '',
    membership_only: false,
    hidden: false,
    vetted: false,
    vetted_instructions: '',
};

export const OrganizerAdminScreen = () => {
    const { userProfile } = useUserContext();
    const isAdmin = !!userProfile?.email && ADMIN_EMAILS.includes(userProfile.email);

    const { data: organizers = [], isLoading, error } = useFetchOrganizers({ includeHidden: true });
    const { data: events = [], isLoading: eventsLoading, error: eventsError } = useFetchEvents({
        includeFacilitatorOnly: true,
        includeHiddenOrganizers: true,
        includeHidden: true,
        approvalStatuses: ['approved', 'pending', 'rejected'],
    });
    const updateOrganizer = useUpdateOrganizer();
    const mergeOrganizer = useMergeOrganizer();

    const [search, setSearch] = useState('');
    const [hideNoEvents, setHideNoEvents] = useState(true);
    const [showOnlyHidden, setShowOnlyHidden] = useState(false);
    const [mergeModalVisible, setMergeModalVisible] = useState(false);
    const [mergeSource, setMergeSource] = useState<OrganizerWithCounts | null>(null);
    const [mergeTarget, setMergeTarget] = useState<OrganizerOption | null>(null);
    const [mergeSearch, setMergeSearch] = useState('');
    const [expandedOrganizers, setExpandedOrganizers] = useState<Record<number, boolean>>({});
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editTarget, setEditTarget] = useState<OrganizerWithCounts | null>(null);
    const [editForm, setEditForm] = useState<OrganizerEditForm>(emptyEditForm);

    const toggleExpanded = (organizerId: number) => {
        setExpandedOrganizers((prev) => ({ ...prev, [organizerId]: !prev[organizerId] }));
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
                    fet: collectFetlifeHandles(org),
                    ig: (org.instagram_handle || '').toLowerCase(),
                    aliases: (org.aliases || []).map((alias) => (alias || '').toLowerCase()),
                };
            })
            .sort((a, b) => (a.org.name || '').localeCompare(b.org.name || ''));
    }, [organizers]);

    const eventsByOrganizerId = useMemo(() => {
        const map: Record<number, Event[]> = {};
        events.forEach((event) => {
            const organizerId = event.organizer?.id ?? event.organizer_id;
            if (!organizerId) return;
            if (!map[organizerId]) map[organizerId] = [];
            map[organizerId].push(event);
        });
        Object.values(map).forEach((list) => {
            list.sort((a, b) => {
                const aTime = a.start_date ? new Date(a.start_date).getTime() : Number.POSITIVE_INFINITY;
                const bTime = b.start_date ? new Date(b.start_date).getTime() : Number.POSITIVE_INFINITY;
                const aScore = Number.isFinite(aTime) ? aTime : Number.POSITIVE_INFINITY;
                const bScore = Number.isFinite(bTime) ? bTime : Number.POSITIVE_INFINITY;
                if (aScore === bScore) return (a.name || '').localeCompare(b.name || '');
                return aScore - bScore;
            });
        });
        return map;
    }, [events]);

    const organizerOptions = useMemo<OrganizerOption[]>(() => {
        return [...organizers]
            .map((org) => {
                const handles = [
                    ...collectFetlifeHandles(org),
                    normalizeHandle(org.instagram_handle),
                ].filter(Boolean);
                return {
                    id: org.id,
                    label: formatOrganizerLabel(org),
                    handles: handles.join(' • '),
                };
            })
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [organizers]);

    const mergeOptions = useMemo(() => {
        if (!mergeSource) return organizerOptions;
        return organizerOptions.filter((option) => option.id !== mergeSource.id);
    }, [organizerOptions, mergeSource]);

    const filteredMergeOptions = useMemo(() => {
        const needle = mergeSearch.trim().toLowerCase();
        if (!needle) return mergeOptions;
        return mergeOptions.filter((option) => {
            const handles = option.handles?.toLowerCase() || '';
            return (
                option.label.toLowerCase().includes(needle) ||
                handles.includes(needle) ||
                String(option.id).includes(needle)
            );
        });
    }, [mergeOptions, mergeSearch]);

    const filtered = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return normalized
            .filter((item) => {
                if (hideNoEvents && item.futureCount === 0) return false;
                if (showOnlyHidden && !item.org.hidden) return false;
                if (!needle) return true;
                return (
                    item.name.includes(needle) ||
                    item.fet.some((handle) => handle.includes(needle)) ||
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

    const buildEditForm = (org: OrganizerWithCounts): OrganizerEditForm => ({
        name: org.name ?? '',
        url: org.url ?? '',
        original_id: org.original_id ?? '',
        aliases: deriveAliasValue(undefined, org.aliases),
        fetlife_handles: deriveFetlifeHandleValue(undefined, org.fetlife_handles, org.fetlife_handle),
        instagram_handle: org.instagram_handle ?? '',
        membership_app_url: org.membership_app_url ?? '',
        membership_only: !!org.membership_only,
        hidden: !!org.hidden,
        vetted: !!org.vetted,
        vetted_instructions: org.vetted_instructions ?? '',
    });

    const openEditModal = (org: OrganizerWithCounts) => {
        setEditTarget(org);
        setEditForm(buildEditForm(org));
        setEditModalVisible(true);
    };

    const closeEditModal = () => {
        if (updateOrganizer.isPending) return;
        setEditModalVisible(false);
        setEditTarget(null);
        setEditForm(emptyEditForm);
    };

    const updateEditFormField = <K extends keyof OrganizerEditForm>(key: K, value: OrganizerEditForm[K]) => {
        setEditForm((prev) => ({ ...prev, [key]: value }));
    };

    const saveEditModal = async () => {
        if (!editTarget) return;
        const name = editForm.name.trim();
        if (!name) {
            Alert.alert('Missing name', 'Organizer name is required.');
            return;
        }
        try {
            await updateOrganizer.mutateAsync({
                id: editTarget.id,
                name,
                url: editForm.url.trim(),
                original_id: editForm.original_id.trim() || null,
                aliases: parseAliases(editForm.aliases),
                fetlife_handles: parseFetlifeHandles(editForm.fetlife_handles, [], null),
                instagram_handle: editForm.instagram_handle.trim(),
                membership_app_url: editForm.membership_app_url.trim() || null,
                membership_only: editForm.membership_only,
                hidden: editForm.hidden,
                vetted: editForm.vetted,
                vetted_instructions: editForm.vetted_instructions.trim() || null,
            });
            closeEditModal();
        } catch (err: any) {
            Alert.alert('Save failed', err?.message || 'Unable to update organizer details.');
        }
    };

    const openMergeModal = (org: OrganizerWithCounts) => {
        setMergeSource(org);
        setMergeTarget(null);
        setMergeSearch('');
        setMergeModalVisible(true);
    };

    const closeMergeModal = () => {
        if (mergeOrganizer.isPending) return;
        setMergeModalVisible(false);
        setMergeSource(null);
        setMergeTarget(null);
        setMergeSearch('');
    };

    const runMerge = async (sourceId: number, targetId: number) => {
        try {
            const result = await mergeOrganizer.mutateAsync({
                sourceOrganizerId: sourceId,
                targetOrganizerId: targetId,
                deleteSource: true,
            });
            closeMergeModal();
            if (result?.warnings?.length) {
                const warningText = result.warnings.map((warn) => `${warn.table}: ${warn.message}`).join('\n');
                Alert.alert('Merge completed with warnings', warningText);
            } else {
                Alert.alert('Merge complete', `Organizer #${sourceId} merged into #${targetId}.`);
            }
        } catch (err: any) {
            Alert.alert('Merge failed', err?.message || 'Unable to merge organizers.');
        }
    };

    const confirmMerge = () => {
        if (!mergeSource || !mergeTarget) {
            Alert.alert('Missing info', 'Pick a destination organizer to merge into.');
            return;
        }
        if (mergeSource.id === mergeTarget.id) {
            Alert.alert('Invalid merge', 'Source and target organizers must be different.');
            return;
        }
        const sourceLabel = formatOrganizerLabel(mergeSource);
        Alert.alert(
            'Confirm merge',
            `Merge "${sourceLabel}" (#${mergeSource.id}) into "${mergeTarget.label}" (#${mergeTarget.id})? This moves events, communities, promo codes, facilitators, deep links, and munches, then deletes the source organizer.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Merge', style: 'destructive', onPress: () => void runMerge(mergeSource.id, mergeTarget.id) },
            ]
        );
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

    const renderItem = ({ item }: { item: OrganizerWithCounts }) => {
        const hiddenValue = !!item.hidden;
        const membershipOnlyValue = !!item.membership_only;
        const vettedValue = !!item.vetted;
        const aliasValue = (item.aliases || []).join(', ');
        const fetlifeHandlesValue = collectFetlifeHandles(item).join(', ');
        const isSaving = updateOrganizer.isPending;
        const organizerEvents = eventsByOrganizerId[item.id] || [];
        const isExpanded = !!expandedOrganizers[item.id];
        const eventsHint = eventsError
            ? 'Events unavailable.'
            : eventsLoading
                ? 'Loading events...'
                : organizerEvents.length
                    ? 'Upcoming events'
                    : 'No upcoming events';

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
                    <View style={styles.metaPill}>
                        <Text style={styles.metaLabel}>Hidden</Text>
                        <Text style={styles.metaValue}>{hiddenValue ? 'Yes' : 'No'}</Text>
                    </View>
                    <View style={styles.metaPill}>
                        <Text style={styles.metaLabel}>Vetted</Text>
                        <Text style={styles.metaValue}>{vettedValue ? 'Yes' : 'No'}</Text>
                    </View>
                    <View style={styles.metaPill}>
                        <Text style={styles.metaLabel}>Members</Text>
                        <Text style={styles.metaValue}>{membershipOnlyValue ? 'Only' : 'Open'}</Text>
                    </View>
                </View>

                <Text style={styles.organizerName}>{item.name || 'Organizer'}</Text>

                <View style={styles.eventsSection}>
                    <TouchableOpacity
                        style={styles.eventsToggle}
                        onPress={() => toggleExpanded(item.id)}
                    >
                        <View style={styles.eventsToggleRow}>
                            <Text style={styles.eventsToggleText}>
                                {isExpanded ? 'Hide events' : 'Show events'}
                                {eventsLoading || eventsError ? '' : ` (${organizerEvents.length})`}
                            </Text>
                            <Ionicons
                                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                size={16}
                                color={colors.textMuted}
                            />
                        </View>
                        <Text style={styles.eventsToggleSubtext}>{eventsHint}</Text>
                    </TouchableOpacity>
                    {isExpanded && (
                        <View style={styles.eventsList}>
                            {eventsLoading ? (
                                <View style={styles.eventsLoadingRow}>
                                    <ActivityIndicator size="small" color={colors.textMuted} />
                                    <Text style={styles.eventsLoadingText}>Loading events...</Text>
                                </View>
                            ) : eventsError ? (
                                <Text style={styles.eventsEmptyText}>Unable to load events.</Text>
                            ) : organizerEvents.length ? (
                                organizerEvents.map((event) => {
                                    const approvalMeta = getApprovalMeta(event.approval_status);
                                    const sourceLabel = formatEventSourceLabel(event);
                                    return (
                                        <View key={event.id} style={styles.eventRow}>
                                            <Text style={styles.eventName}>
                                                {event.name || `Event ${event.id}`}
                                            </Text>
                                            <View style={styles.eventMetaRow}>
                                                <Text style={styles.eventMetaText}>
                                                    {formatEventDate(event)}
                                                </Text>
                                                <View style={[styles.statusPill, { borderColor: approvalMeta.color }]}>
                                                    <Text style={[styles.statusPillText, { color: approvalMeta.color }]}>
                                                        {approvalMeta.label}
                                                    </Text>
                                                </View>
                                                {sourceLabel ? (
                                                    <View style={styles.sourcePill}>
                                                        <Text style={styles.sourcePillText}>{sourceLabel}</Text>
                                                    </View>
                                                ) : null}
                                            </View>
                                        </View>
                                    );
                                })
                            ) : (
                                <Text style={styles.eventsEmptyText}>No upcoming events.</Text>
                            )}
                        </View>
                    )}
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Website</Text>
                    <Text style={styles.valueText}>
                        {item.url || '—'}
                    </Text>
                </View>

                <View style={styles.fieldRow}>
                    <View style={styles.fieldCol}>
                        <Text style={styles.label}>FetLife handles</Text>
                        <Text style={styles.valueText}>
                            {fetlifeHandlesValue || '—'}
                        </Text>
                    </View>
                    <View style={styles.fieldCol}>
                        <Text style={styles.label}>Instagram</Text>
                        <Text style={styles.valueText}>
                            {item.instagram_handle || '—'}
                        </Text>
                    </View>
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Aliases</Text>
                    <Text style={styles.valueText}>
                        {aliasValue || '—'}
                    </Text>
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Membership URL</Text>
                    <Text style={styles.valueText}>
                        {item.membership_app_url || '—'}
                    </Text>
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Vetted instructions</Text>
                    <Text style={styles.valueText} numberOfLines={3}>
                        {item.vetted_instructions?.trim() || 'No instructions yet.'}
                    </Text>
                </View>

                <TouchableOpacity
                    style={[
                        styles.primaryButton,
                        isSaving && styles.primaryButtonDisabled,
                    ]}
                    onPress={() => openEditModal(item)}
                    disabled={isSaving}
                >
                    <Text style={styles.primaryButtonText}>Edit organizer</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.mergeInlineButton,
                        mergeOrganizer.isPending && styles.mergeInlineButtonDisabled,
                    ]}
                    onPress={() => openMergeModal(item)}
                    disabled={mergeOrganizer.isPending}
                >
                    {mergeOrganizer.isPending && mergeSource?.id === item.id ? (
                        <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                        <Text style={styles.mergeInlineButtonText}>Merge into…</Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <>
            <FlatList
                data={filtered}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderItem}
                ListHeaderComponent={
                    <OrganizerAdminHeader
                        search={search}
                        onSearchChange={setSearch}
                        hideNoEvents={hideNoEvents}
                        onToggleHideNoEvents={() => setHideNoEvents((prev) => !prev)}
                        showOnlyHidden={showOnlyHidden}
                        onToggleShowOnlyHidden={() => setShowOnlyHidden((prev) => !prev)}
                        filteredCount={filtered.length}
                        isSaving={updateOrganizer.isPending}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No organizers found.</Text>
                    </View>
                }
                contentContainerStyle={styles.listContent}
                style={styles.list}
                keyboardShouldPersistTaps="handled"
            />
            <Modal
                transparent
                visible={mergeModalVisible}
                animationType="fade"
                onRequestClose={closeMergeModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Merge organizer</Text>
                        <Text style={styles.modalSubtitle}>
                            {mergeSource
                                ? `Merge "${formatOrganizerLabel(mergeSource)}" (#${mergeSource.id}) into:`
                                : 'Choose a destination organizer.'}
                        </Text>
                        <TextInput
                            style={styles.modalSearchInput}
                            value={mergeSearch}
                            onChangeText={setMergeSearch}
                            placeholder="Type to search destination organizer"
                            placeholderTextColor={colors.textSubtle}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <FlatList
                            data={filteredMergeOptions}
                            keyExtractor={(item) => String(item.id)}
                            style={styles.modalList}
                            renderItem={({ item }) => {
                                const isSelected = mergeTarget?.id === item.id;
                                return (
                                    <TouchableOpacity
                                        style={[
                                            styles.modalOption,
                                            isSelected && styles.modalOptionSelected,
                                        ]}
                                        onPress={() => setMergeTarget(item)}
                                    >
                                        <Text style={styles.modalOptionLabel}>{item.label}</Text>
                                        {!!item.handles && (
                                            <Text style={styles.modalOptionHandles}>{item.handles}</Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={
                                <Text style={styles.modalEmpty}>No organizers match your search.</Text>
                            }
                        />
                        <Text style={styles.modalHint}>
                            Destination organizer stays; source organizer is deleted after moving events,
                            communities, promo codes, facilitators, deep links, and munches.
                        </Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={closeMergeModal}
                                disabled={mergeOrganizer.isPending}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modalMergeButton,
                                    (!mergeTarget || mergeOrganizer.isPending) && styles.modalMergeButtonDisabled,
                                ]}
                                onPress={confirmMerge}
                                disabled={!mergeTarget || mergeOrganizer.isPending}
                            >
                                {mergeOrganizer.isPending ? (
                                    <ActivityIndicator size="small" color={colors.white} />
                                ) : (
                                    <Text style={styles.modalMergeText}>Merge into destination</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            <OrganizerEditModal
                visible={editModalVisible}
                organizer={editTarget}
                values={editForm}
                onChange={updateEditFormField}
                onSave={saveEditModal}
                onClose={closeEditModal}
                saving={updateOrganizer.isPending}
            />
        </>
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
    organizerName: {
        fontSize: fontSizes.title,
        color: colors.textPrimary,
        fontFamily: fontFamilies.display,
        fontWeight: '700',
        marginBottom: spacing.sm,
    },
    eventsSection: {
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        paddingTop: spacing.sm,
        marginBottom: spacing.md,
    },
    eventsToggle: {
        paddingVertical: spacing.sm,
    },
    eventsToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    eventsToggleText: {
        fontSize: fontSizes.smPlus,
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
        fontWeight: '600',
    },
    eventsToggleSubtext: {
        marginTop: spacing.xs,
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    eventsList: {
        marginTop: spacing.sm,
        gap: spacing.sm,
    },
    eventsLoadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    eventsLoadingText: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    eventsEmptyText: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    eventRow: {
        padding: spacing.sm,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        backgroundColor: colors.surfaceSubtle,
    },
    eventName: {
        fontSize: fontSizes.smPlus,
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
        fontWeight: '600',
    },
    eventMetaRow: {
        marginTop: spacing.xs,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: spacing.xs,
    },
    eventMetaText: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    statusPill: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: radius.pill,
        borderWidth: 1,
        backgroundColor: colors.surfaceWhiteStrong,
    },
    statusPillText: {
        fontSize: fontSizes.xxs,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    sourcePill: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        backgroundColor: colors.surfaceWhiteStrong,
    },
    sourcePillText: {
        fontSize: fontSizes.xxs,
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
    valueText: {
        fontSize: fontSizes.base,
        color: colors.textPrimary,
        lineHeight: lineHeights.md,
        fontFamily: fontFamilies.body,
    },
    primaryButton: {
        backgroundColor: colors.brandIndigo,
        borderRadius: radius.pill,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonDisabled: {
        backgroundColor: colors.brandMuted,
    },
    primaryButtonText: {
        color: colors.white,
        fontSize: fontSizes.smPlus,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    mergeInlineButton: {
        marginTop: spacing.sm,
        backgroundColor: colors.danger,
        borderRadius: radius.pill,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mergeInlineButtonDisabled: {
        backgroundColor: colors.brandMuted,
    },
    mergeInlineButtonText: {
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        padding: spacing.lg,
        justifyContent: 'center',
    },
    modalCard: {
        backgroundColor: colors.white,
        borderRadius: radius.lg,
        padding: spacing.lg,
        ...shadows.card,
    },
    modalTitle: {
        fontSize: fontSizes.lg,
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: fontFamilies.display,
    },
    modalSubtitle: {
        marginTop: spacing.xs,
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        lineHeight: lineHeights.md,
        fontFamily: fontFamilies.body,
    },
    modalSearchInput: {
        marginTop: spacing.md,
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
    modalList: {
        marginTop: spacing.md,
        maxHeight: 220,
    },
    modalOption: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        backgroundColor: colors.surfaceSubtle,
        marginBottom: spacing.sm,
    },
    modalOptionSelected: {
        borderColor: colors.brandIndigo,
        backgroundColor: colors.surfaceInfo,
    },
    modalOptionLabel: {
        fontSize: fontSizes.base,
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
        fontWeight: '600',
    },
    modalOptionHandles: {
        marginTop: spacing.xs,
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    modalEmpty: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
        marginTop: spacing.sm,
    },
    modalHint: {
        marginTop: spacing.sm,
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        lineHeight: lineHeights.sm,
        fontFamily: fontFamilies.body,
    },
    modalActions: {
        marginTop: spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    modalCancelButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        borderRadius: radius.pill,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceWhiteStrong,
    },
    modalCancelText: {
        fontSize: fontSizes.smPlus,
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
        fontWeight: '600',
    },
    modalMergeButton: {
        flex: 1,
        borderRadius: radius.pill,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.danger,
    },
    modalMergeButtonDisabled: {
        backgroundColor: colors.brandMuted,
    },
    modalMergeText: {
        fontSize: fontSizes.smPlus,
        color: colors.white,
        fontFamily: fontFamilies.body,
        fontWeight: '600',
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
