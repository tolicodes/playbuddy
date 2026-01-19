import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SectionList,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Switch,
    Modal,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';

import type { EventAttendees } from '../../commonTypes';
import type { EventWithMetadata, NavStack } from '../../Common/Nav/NavStackType';
import { useFetchAttendees } from '../../Common/db-axios/useAttendees';
import { useFetchEvents, useUpdateEvent } from '../../Common/db-axios/useEvents';
import { ACTIVE_EVENT_TYPES, FALLBACK_EVENT_TYPE, type Event } from '../../Common/types/commonTypes';
import { useUserContext } from '../Auth/hooks/UserContext';
import { useGroupedEvents } from '../Calendar/hooks/useGroupedEventsMain';
import { EventListItem } from '../Calendar/ListView/EventListItem';
import { ADMIN_EMAILS } from '../../config';
import {
    colors,
    eventListThemes,
    fontFamilies,
    fontSizes,
    lineHeights,
    radius,
    shadows,
    spacing,
} from '../../components/styles';

type VisibilityFilter = 'all' | 'visible' | 'hidden';
type ApprovalFilter = 'all' | 'approved' | 'unapproved';

type EventDraft = {
    name?: string;
    start_date?: string;
    end_date?: string;
    ticket_url?: string;
    event_url?: string;
    image_url?: string;
    location?: string;
    city?: string;
    region?: string;
    country?: string;
    price?: string;
    short_description?: string;
    custom_description?: string;
    description?: string;
    tagsText?: string;
    type?: string;
    visibility?: 'public' | 'private';
    approval_status?: 'pending' | 'approved' | 'rejected' | null;
    weekly_pick?: boolean;
    play_party?: boolean;
    vetted?: boolean;
    non_ny?: boolean;
    facilitator_only?: boolean;
    frozen?: boolean;
    hidden?: boolean;
};

const parseTags = (value?: string) =>
    (value || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

const buildDraftFromEvent = (event: Event): EventDraft => ({
    name: event.name ?? '',
    start_date: event.start_date ?? '',
    end_date: event.end_date ?? '',
    ticket_url: event.ticket_url ?? '',
    event_url: event.event_url ?? '',
    image_url: event.image_url ?? '',
    location: event.location ?? '',
    city: event.city ?? '',
    region: event.region ?? '',
    country: event.country ?? '',
    price: event.price ?? '',
    short_description: event.short_description ?? '',
    custom_description: event.custom_description ?? '',
    description: event.description ?? '',
    tagsText: (event.tags || []).join(', '),
    type: event.type ?? FALLBACK_EVENT_TYPE,
    visibility: event.visibility ?? 'public',
    approval_status: event.approval_status ?? 'approved',
    weekly_pick: !!event.weekly_pick,
    play_party: !!event.play_party,
    vetted: !!event.vetted,
    non_ny: !!event.non_ny,
    facilitator_only: !!event.facilitator_only,
    frozen: !!event.frozen,
    hidden: !!event.hidden,
});

const buildPayload = (event: Event, draft: EventDraft) => ({
    ...event,
    ...draft,
    tags: draft.tagsText !== undefined ? parseTags(draft.tagsText) : event.tags,
    organizer: event.organizer,
});

const isApprovedStatus = (status?: Event['approval_status']) => !status || status === 'approved';

const toValidDate = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
};

const formatDateTimeDisplay = (value?: string | null) => {
    const date = toValidDate(value);
    return date ? date.toLocaleString() : '';
};

const formatEventTypeLabel = (value: string) =>
    value
        .replace(/[_-]+/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(' ');

const BASE_EVENT_TYPES: string[] = [FALLBACK_EVENT_TYPE, ...ACTIVE_EVENT_TYPES];

const OptionPill = ({
    label,
    active,
    onPress,
}: {
    label: string;
    active: boolean;
    onPress: () => void;
}) => (
    <TouchableOpacity
        style={[styles.optionPill, active && styles.optionPillActive]}
        onPress={onPress}
    >
        <Text style={[styles.optionText, active && styles.optionTextActive]}>{label}</Text>
    </TouchableOpacity>
);

export const EventAdminScreen = () => {
    const navigation = useNavigation<NavStack>();
    const { userProfile } = useUserContext();
    const isAdmin = !!userProfile?.email && ADMIN_EMAILS.includes(userProfile.email);
    const queryClient = useQueryClient();
    const insets = useSafeAreaInsets();
    const fallbackTopInset = initialWindowMetrics?.insets?.top ?? 0;
    const statusBarTop = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;
    const safeTop = Math.max(insets.top, fallbackTopInset, statusBarTop);
    const approvalStatuses = useMemo(
        () => (isAdmin ? ['approved', 'pending', 'rejected'] : undefined),
        [isAdmin]
    );

    const { data: events = [], isLoading, error } = useFetchEvents({
        includeFacilitatorOnly: true,
        includeHidden: true,
        includeHiddenOrganizers: true,
        approvalStatuses,
    });
    const { data: attendees = [] } = useFetchAttendees();
    const updateEvent = useUpdateEvent();

    const [search, setSearch] = useState('');
    const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');
    const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>('unapproved');
    const [userSubmittedOnly, setUserSubmittedOnly] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [draft, setDraft] = useState<EventDraft | null>(null);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [savingOrganizerId, setSavingOrganizerId] = useState<number | null>(null);
    const [activePicker, setActivePicker] = useState<'start' | 'end' | null>(null);

    const eventTypeOptions = useMemo(() => {
        if (!draft?.type || BASE_EVENT_TYPES.includes(draft.type)) {
            return BASE_EVENT_TYPES;
        }
        return [...BASE_EVENT_TYPES, draft.type];
    }, [draft?.type]);

    const sortedEvents = useMemo(() => {
        return [...events].sort((a, b) => {
            const aTime = toValidDate(a.start_date)?.getTime() ?? Number.POSITIVE_INFINITY;
            const bTime = toValidDate(b.start_date)?.getTime() ?? Number.POSITIVE_INFINITY;
            return aTime - bTime;
        });
    }, [events]);

    const visibilityFilteredEvents = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return sortedEvents.filter((event) => {
            const isHidden = !!event.hidden;
            if (visibilityFilter === 'hidden' && !isHidden) return false;
            if (visibilityFilter === 'visible' && isHidden) return false;

            if (!needle) return true;
            const name = (event.name || '').toLowerCase();
            const organizer = (event.organizer?.name || '').toLowerCase();
            return name.includes(needle) || organizer.includes(needle);
        });
    }, [sortedEvents, search, visibilityFilter]);

    const filteredEvents = useMemo(() => {
        if (approvalFilter === 'all') {
            return userSubmittedOnly
                ? visibilityFilteredEvents.filter((event) => !!event.user_submitted)
                : visibilityFilteredEvents;
        }
        const wantsApproved = approvalFilter === 'approved';
        const approvalFiltered = visibilityFilteredEvents.filter((event) => {
            const approved = isApprovedStatus(event.approval_status);
            return wantsApproved ? approved : !approved;
        });
        if (!userSubmittedOnly) return approvalFiltered;
        return approvalFiltered.filter((event) => !!event.user_submitted);
    }, [approvalFilter, userSubmittedOnly, visibilityFilteredEvents]);

    const attendeesByEvent = useMemo(() => {
        const map = new Map<number, EventAttendees['attendees']>();
        attendees.forEach((entry) => map.set(entry.event_id, entry.attendees || []));
        return map;
    }, [attendees]);

    const { sections } = useGroupedEvents(filteredEvents as EventWithMetadata[]);
    const eventListConfig = eventListThemes.welcome;
    const emptyStateLabel = approvalFilter === 'unapproved'
        ? 'No unapproved events.'
        : 'No events found.';

    const closeEditor = () => {
        setEditingEvent(null);
        setDraft(null);
        setActivePicker(null);
    };

    const openEditor = (event: Event) => {
        if (!event.organizer) {
            Alert.alert('Missing organizer', 'This event is missing organizer data.');
            return;
        }
        setEditingEvent(event);
        setDraft(buildDraftFromEvent(event));
        setActivePicker(null);
    };

    const saveEvent = async () => {
        if (!editingEvent || !draft) return;
        if (!editingEvent.organizer) {
            Alert.alert('Missing organizer', 'This event is missing organizer data.');
            return;
        }
        setSavingId(editingEvent.id);
        try {
            await updateEvent.mutateAsync(buildPayload(editingEvent, draft));
            await queryClient.invalidateQueries({ queryKey: ['events'] });
            closeEditor();
        } catch {
            Alert.alert('Save failed', 'Unable to update event.');
        } finally {
            setSavingId(null);
        }
    };

    const toggleHidden = async (event: Event, nextHidden: boolean) => {
        if (!event.organizer) {
            Alert.alert('Missing organizer', 'This event is missing organizer data.');
            return;
        }
        setSavingId(event.id);
        try {
            await updateEvent.mutateAsync(buildPayload(event, { hidden: nextHidden }));
            await queryClient.invalidateQueries({ queryKey: ['events'] });
        } catch {
            Alert.alert('Update failed', 'Unable to update event visibility.');
        } finally {
            setSavingId(null);
        }
    };

    const approveEvent = async (event: Event) => {
        if (!event.organizer) {
            Alert.alert('Missing organizer', 'This event is missing organizer data.');
            return;
        }
        setSavingId(event.id);
        try {
            await updateEvent.mutateAsync(buildPayload(event, { approval_status: 'approved' }));
            await queryClient.invalidateQueries({ queryKey: ['events'] });
        } catch {
            Alert.alert('Update failed', 'Unable to approve event.');
        } finally {
            setSavingId(null);
        }
    };

    const approveOrganizer = async (event: Event) => {
        const organizerId = event.organizer?.id;
        if (!organizerId) {
            Alert.alert('Missing organizer', 'This event is missing organizer data.');
            return;
        }
        if (savingOrganizerId !== null) return;
        const pendingEvents = events.filter(
            (item) => item.organizer?.id === organizerId && !isApprovedStatus(item.approval_status)
        );
        if (!pendingEvents.length) {
            Alert.alert('All approved', 'All events for this organizer are already approved.');
            return;
        }
        setSavingOrganizerId(organizerId);
        try {
            for (const pendingEvent of pendingEvents) {
                await updateEvent.mutateAsync(buildPayload(pendingEvent, { approval_status: 'approved' }));
            }
            await queryClient.invalidateQueries({ queryKey: ['events'] });
        } catch {
            Alert.alert('Update failed', 'Unable to approve organizer events.');
        } finally {
            setSavingOrganizerId(null);
        }
    };

    if (!isAdmin) {
        return (
            <View style={styles.standaloneContainer}>
                <View style={styles.lockedCard}>
                    <View style={styles.lockedIcon}>
                        <FAIcon name="user-lock" size={22} color={colors.textMuted} />
                    </View>
                    <Text style={styles.lockedTitle}>Admins only</Text>
                    <Text style={styles.lockedText}>
                        Event tools are reserved for PlayBuddy staff.
                    </Text>
                </View>
            </View>
        );
    }

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.linkBlue} />
                <Text style={styles.loadingText}>Loading events...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.standaloneContainer}>
                <Text style={styles.errorText}>Failed to load events.</Text>
            </View>
        );
    }

    return (
        <>
            <LinearGradient
                colors={eventListConfig.colors}
                locations={eventListConfig.locations}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.screenGradient}
            >
                <View pointerEvents="none" style={[styles.screenGlowTop, { backgroundColor: eventListConfig.glows[0] }]} />
                <View pointerEvents="none" style={[styles.screenGlowMid, { backgroundColor: eventListConfig.glows[1] }]} />
                <View pointerEvents="none" style={[styles.screenGlowBottom, { backgroundColor: eventListConfig.glows[2] }]} />

                <View style={styles.container}>
                    <SectionList
                        sections={sections}
                        keyExtractor={(item) => String(item.id)}
                        renderItem={({ item }) => {
                            const attendeesForEvent = attendeesByEvent.get(item.id) || [];
                            const isHidden = !!item.hidden;
                            const organizerId = item.organizer?.id;
                            const isSavingEvent = savingId === item.id && updateEvent.isPending;
                            const isOrganizerSaving = !!organizerId && savingOrganizerId === organizerId;
                            const isActionDisabled = isSavingEvent || isOrganizerSaving;
                            const isApproved = isApprovedStatus(item.approval_status);
                            const approvalStatus = item.approval_status ?? 'approved';
                            const approvalLabel = approvalStatus === 'approved'
                                ? 'Approved'
                                : approvalStatus === 'rejected'
                                    ? 'Rejected'
                                    : 'Pending';
                            const approvalIcon = approvalStatus === 'approved'
                                ? 'checkmark-circle-outline'
                                : approvalStatus === 'rejected'
                                    ? 'close-circle-outline'
                                    : 'alert-circle-outline';
                            const approvalTint = approvalStatus === 'approved'
                                ? colors.success
                                : approvalStatus === 'rejected'
                                    ? colors.danger
                                    : colors.warning;
                            const approvalPillStyle = approvalStatus === 'approved'
                                ? styles.actionPillSuccess
                                : approvalStatus === 'rejected'
                                    ? styles.actionPillDanger
                                    : styles.actionPillWarning;
                            const approvalTextStyle = approvalStatus === 'approved'
                                ? styles.actionTextSuccess
                                : approvalStatus === 'rejected'
                                    ? styles.actionTextDanger
                                    : styles.actionTextWarning;

                            const adminFooter = (
                                <View style={styles.adminActions}>
                                    <View style={[styles.actionPill, styles.actionPillReadOnly, approvalPillStyle]}>
                                        <Ionicons name={approvalIcon} size={16} color={approvalTint} />
                                        <Text style={[styles.actionText, approvalTextStyle]}>
                                            {approvalLabel}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={[
                                            styles.actionPill,
                                            isHidden && styles.actionPillActive,
                                        ]}
                                        onPress={() => toggleHidden(item, !isHidden)}
                                        disabled={isActionDisabled}
                                    >
                                        {isSavingEvent ? (
                                            <ActivityIndicator size="small" color={colors.brandIndigo} />
                                        ) : (
                                            <Ionicons
                                                name={isHidden ? 'eye-outline' : 'eye-off-outline'}
                                                size={16}
                                                color={isHidden ? colors.brandIndigo : colors.textMuted}
                                            />
                                        )}
                                        <Text
                                            style={[
                                                styles.actionText,
                                                isHidden && styles.actionTextActive,
                                            ]}
                                        >
                                            {isHidden ? 'Unhide' : 'Hide'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.actionPill}
                                        onPress={() => openEditor(item)}
                                        disabled={isActionDisabled}
                                    >
                                        <Ionicons name="create-outline" size={16} color={colors.textMuted} />
                                        <Text style={styles.actionText}>Edit</Text>
                                    </TouchableOpacity>
                                    {!isApproved && (
                                        <TouchableOpacity
                                            style={[styles.actionPill, styles.actionPillApprove]}
                                            onPress={() => approveEvent(item)}
                                            disabled={isActionDisabled}
                                        >
                                            {isSavingEvent || isOrganizerSaving ? (
                                                <ActivityIndicator size="small" color={colors.brandIndigo} />
                                            ) : (
                                                <Ionicons name="checkmark-circle-outline" size={16} color={colors.brandIndigo} />
                                            )}
                                            <Text style={[styles.actionText, styles.actionTextApprove]}>Approve</Text>
                                        </TouchableOpacity>
                                    )}
                                    {!isApproved && (
                                        <TouchableOpacity
                                            style={[styles.actionPill, styles.actionPillApprove]}
                                            onPress={() => approveOrganizer(item)}
                                            disabled={isActionDisabled}
                                        >
                                            {isOrganizerSaving ? (
                                                <ActivityIndicator size="small" color={colors.brandIndigo} />
                                            ) : (
                                                <Ionicons name="checkmark-done-outline" size={16} color={colors.brandIndigo} />
                                            )}
                                            <Text style={[styles.actionText, styles.actionTextApprove]}>
                                                Approve organizer
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                    {isHidden && (
                                        <View style={[styles.actionPill, styles.actionPillReadOnly]}>
                                            <Ionicons name="alert-circle-outline" size={16} color={colors.textMuted} />
                                            <Text style={styles.actionText}>Hidden</Text>
                                        </View>
                                    )}
                                </View>
                            );

                            return (
                                <EventListItem
                                    item={item}
                                    attendees={attendeesForEvent}
                                    onPress={(event) =>
                                        navigation.push('Event Details', {
                                            selectedEvent: event,
                                            title: event.name,
                                        })
                                    }
                                    isAdmin
                                    footerContent={adminFooter}
                                    autoHeight
                                />
                            );
                        }}
                        renderSectionHeader={({ section }) => (
                            <View style={styles.sectionHeaderOuterWrapper}>
                                <View style={styles.sectionHeaderPill}>
                                    <Text style={styles.sectionHeaderText}>{section.title}</Text>
                                </View>
                            </View>
                        )}
                        stickySectionHeadersEnabled
                        style={styles.sectionList}
                        contentContainerStyle={styles.sectionListContent}
                        ListHeaderComponent={
                            <View style={styles.listHeader}>
                                <View style={styles.heroCard}>
                                    <View style={styles.heroIcon}>
                                        <FAIcon name="calendar-alt" size={18} color={colors.brandBlue} />
                                    </View>
                                    <Text style={styles.heroTitle}>Event Admin</Text>
                                    <Text style={styles.heroSubtitle}>
                                        Review unapproved events, edit details, and hide listings.
                                    </Text>
                                </View>

                                <View style={styles.filterCard}>
                                    <View style={styles.searchRow}>
                                        <Ionicons name="search" size={16} color={colors.textSubtle} />
                                        <TextInput
                                            style={styles.searchInput}
                                            placeholder="Search event or organizer"
                                            placeholderTextColor={colors.textSubtle}
                                            value={search}
                                            onChangeText={setSearch}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                        />
                                    </View>
                                    <Text style={styles.filterLabel}>Visibility</Text>
                                    <View style={styles.filterRow}>
                                        <OptionPill
                                            label="All"
                                            active={visibilityFilter === 'all'}
                                            onPress={() => setVisibilityFilter('all')}
                                        />
                                        <OptionPill
                                            label="Visible"
                                            active={visibilityFilter === 'visible'}
                                            onPress={() => setVisibilityFilter('visible')}
                                        />
                                        <OptionPill
                                            label="Hidden"
                                            active={visibilityFilter === 'hidden'}
                                            onPress={() => setVisibilityFilter('hidden')}
                                        />
                                    </View>
                                    <Text style={styles.filterLabel}>Approval</Text>
                                    <View style={styles.filterRow}>
                                        <OptionPill
                                            label="All"
                                            active={approvalFilter === 'all'}
                                            onPress={() => setApprovalFilter('all')}
                                        />
                                        <OptionPill
                                            label="Approved"
                                            active={approvalFilter === 'approved'}
                                            onPress={() => setApprovalFilter('approved')}
                                        />
                                        <OptionPill
                                            label="Unapproved"
                                            active={approvalFilter === 'unapproved'}
                                            onPress={() => setApprovalFilter('unapproved')}
                                        />
                                    </View>
                                    <View style={styles.filterToggleRow}>
                                        <Text style={styles.filterToggleLabel}>User submitted only</Text>
                                        <Switch
                                            value={userSubmittedOnly}
                                            onValueChange={setUserSubmittedOnly}
                                            trackColor={{ false: colors.borderMutedAlt, true: colors.tintViolet }}
                                            thumbColor={userSubmittedOnly ? colors.brandIndigo : colors.surfaceWhiteStrong}
                                            ios_backgroundColor={colors.borderMutedAlt}
                                        />
                                    </View>
                                    <View style={styles.filterMetaRow}>
                                        <Text style={styles.filterMetaText}>{filteredEvents.length} events</Text>
                                        {(updateEvent.isPending || savingOrganizerId !== null) && (
                                            <Text style={styles.filterMetaText}>Saving...</Text>
                                        )}
                                    </View>
                                </View>
                            </View>
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>{emptyStateLabel}</Text>
                            </View>
                        }
                    />
                </View>
            </LinearGradient>

            <Modal
                visible={!!editingEvent}
                animationType="slide"
                onRequestClose={closeEditor}
            >
                <SafeAreaView style={styles.modalSafe} edges={['bottom']}>
                    <KeyboardAvoidingView
                        style={styles.modalContainer}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    >
                        <View style={[styles.modalHeader, { paddingTop: safeTop + spacing.xs }]}>
                            <Text style={styles.modalTitle}>Edit Event</Text>
                            <TouchableOpacity onPress={closeEditor} style={styles.modalCloseButton}>
                                <Ionicons name="close" size={18} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={styles.modalContent}>
                            {editingEvent && draft && (
                                <>
                                    <Text style={styles.modalMeta}>
                                        {editingEvent.organizer?.name || 'Unknown organizer'}
                                    </Text>

                                    <View style={styles.field}>
                                        <Text style={styles.label}>Name</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={draft.name ?? ''}
                                            onChangeText={(value) => setDraft((prev) => ({ ...prev!, name: value }))}
                                        />
                                    </View>

                                    <View style={styles.fieldRow}>
                                        <View style={styles.fieldCol}>
                                            <Text style={styles.label}>Start</Text>
                                            <TouchableOpacity
                                                style={styles.inputPressable}
                                                onPress={() => setActivePicker('start')}
                                                activeOpacity={0.8}
                                            >
                                                <TextInput
                                                    style={styles.input}
                                                    value={formatDateTimeDisplay(draft.start_date)}
                                                    placeholder="Select start date"
                                                    placeholderTextColor={colors.textSubtle}
                                                    editable={false}
                                                    pointerEvents="none"
                                                />
                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.fieldCol}>
                                            <Text style={styles.label}>End</Text>
                                            <TouchableOpacity
                                                style={styles.inputPressable}
                                                onPress={() => setActivePicker('end')}
                                                activeOpacity={0.8}
                                            >
                                                <TextInput
                                                    style={styles.input}
                                                    value={formatDateTimeDisplay(draft.end_date)}
                                                    placeholder="Select end date"
                                                    placeholderTextColor={colors.textSubtle}
                                                    editable={false}
                                                    pointerEvents="none"
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {activePicker && (
                                        <View style={styles.pickerCard}>
                                            <DateTimePicker
                                                value={
                                                    activePicker === 'end'
                                                        ? toValidDate(draft.end_date)
                                                            ?? toValidDate(draft.start_date)
                                                            ?? new Date()
                                                        : toValidDate(draft.start_date) ?? new Date()
                                                }
                                                mode="datetime"
                                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                                onChange={(_, date) => {
                                                    if (date) {
                                                        if (activePicker === 'start') {
                                                            setDraft((prev) => ({ ...prev!, start_date: date.toISOString() }));
                                                        } else {
                                                            setDraft((prev) => ({ ...prev!, end_date: date.toISOString() }));
                                                        }
                                                    }
                                                    if (Platform.OS !== 'ios') {
                                                        setActivePicker(null);
                                                    }
                                                }}
                                            />
                                            {Platform.OS === 'ios' && (
                                                <TouchableOpacity
                                                    style={styles.pickerDoneButton}
                                                    onPress={() => setActivePicker(null)}
                                                >
                                                    <Text style={styles.pickerDoneText}>Done</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    )}

                                    <View style={styles.field}>
                                        <Text style={styles.label}>Ticket URL</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={draft.ticket_url ?? ''}
                                            onChangeText={(value) => setDraft((prev) => ({ ...prev!, ticket_url: value }))}
                                            placeholder="https://"
                                            placeholderTextColor={colors.textSubtle}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            keyboardType="url"
                                        />
                                    </View>

                                    <View style={styles.field}>
                                        <Text style={styles.label}>Event URL</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={draft.event_url ?? ''}
                                            onChangeText={(value) => setDraft((prev) => ({ ...prev!, event_url: value }))}
                                            placeholder="https://"
                                            placeholderTextColor={colors.textSubtle}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            keyboardType="url"
                                        />
                                    </View>

                                    <View style={styles.field}>
                                        <Text style={styles.label}>Image URL</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={draft.image_url ?? ''}
                                            onChangeText={(value) => setDraft((prev) => ({ ...prev!, image_url: value }))}
                                            placeholder="https://"
                                            placeholderTextColor={colors.textSubtle}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            keyboardType="url"
                                        />
                                    </View>

                                    <View style={styles.field}>
                                        <Text style={styles.label}>Location</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={draft.location ?? ''}
                                            onChangeText={(value) => setDraft((prev) => ({ ...prev!, location: value }))}
                                            placeholder="Venue name or address"
                                            placeholderTextColor={colors.textSubtle}
                                        />
                                    </View>

                                    <View style={styles.fieldRow}>
                                        <View style={styles.fieldCol}>
                                            <Text style={styles.label}>City</Text>
                                            <TextInput
                                                style={styles.input}
                                                value={draft.city ?? ''}
                                                onChangeText={(value) => setDraft((prev) => ({ ...prev!, city: value }))}
                                                placeholder="City"
                                                placeholderTextColor={colors.textSubtle}
                                            />
                                        </View>
                                        <View style={styles.fieldCol}>
                                            <Text style={styles.label}>Region</Text>
                                            <TextInput
                                                style={styles.input}
                                                value={draft.region ?? ''}
                                                onChangeText={(value) => setDraft((prev) => ({ ...prev!, region: value }))}
                                                placeholder="State/Region"
                                                placeholderTextColor={colors.textSubtle}
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.field}>
                                        <Text style={styles.label}>Country</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={draft.country ?? ''}
                                            onChangeText={(value) => setDraft((prev) => ({ ...prev!, country: value }))}
                                            placeholder="Country"
                                            placeholderTextColor={colors.textSubtle}
                                        />
                                    </View>

                                    <View style={styles.field}>
                                        <Text style={styles.label}>Price</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={draft.price ?? ''}
                                            onChangeText={(value) => setDraft((prev) => ({ ...prev!, price: value }))}
                                            placeholder="$"
                                            placeholderTextColor={colors.textSubtle}
                                        />
                                    </View>

                                    <View style={styles.field}>
                                        <Text style={styles.label}>Tags (comma separated)</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={draft.tagsText ?? ''}
                                            onChangeText={(value) => setDraft((prev) => ({ ...prev!, tagsText: value }))}
                                            placeholder="rope, dance, beginner"
                                            placeholderTextColor={colors.textSubtle}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                        />
                                    </View>

                                    <View style={styles.field}>
                                        <Text style={styles.label}>Short description</Text>
                                        <TextInput
                                            style={[styles.input, styles.multilineInput]}
                                            value={draft.short_description ?? ''}
                                            onChangeText={(value) => setDraft((prev) => ({ ...prev!, short_description: value }))}
                                            placeholder="Short summary"
                                            placeholderTextColor={colors.textSubtle}
                                            multiline
                                        />
                                    </View>

                                    <View style={styles.field}>
                                        <Text style={styles.label}>Custom description</Text>
                                        <TextInput
                                            style={[styles.input, styles.multilineInput]}
                                            value={draft.custom_description ?? ''}
                                            onChangeText={(value) => setDraft((prev) => ({ ...prev!, custom_description: value }))}
                                            placeholder="Optional override"
                                            placeholderTextColor={colors.textSubtle}
                                            multiline
                                        />
                                    </View>

                                    <View style={styles.field}>
                                        <Text style={styles.label}>Description</Text>
                                        <TextInput
                                            style={[styles.input, styles.multilineInput]}
                                            value={draft.description ?? ''}
                                            onChangeText={(value) => setDraft((prev) => ({ ...prev!, description: value }))}
                                            placeholder="Full description"
                                            placeholderTextColor={colors.textSubtle}
                                            multiline
                                        />
                                    </View>

                                    <View style={styles.optionGroup}>
                                        <Text style={styles.label}>Event type</Text>
                                        <View style={styles.optionRow}>
                                            {eventTypeOptions.map((eventType) => (
                                                <OptionPill
                                                    key={eventType}
                                                    label={formatEventTypeLabel(eventType)}
                                                    active={draft.type === eventType}
                                                    onPress={() => setDraft((prev) => ({ ...prev!, type: eventType }))}
                                                />
                                            ))}
                                        </View>
                                    </View>

                                    <View style={styles.optionGroup}>
                                        <Text style={styles.label}>Visibility</Text>
                                        <View style={styles.optionRow}>
                                            <OptionPill
                                                label="Public"
                                                active={draft.visibility === 'public'}
                                                onPress={() => setDraft((prev) => ({ ...prev!, visibility: 'public' }))}
                                            />
                                            <OptionPill
                                                label="Private"
                                                active={draft.visibility === 'private'}
                                                onPress={() => setDraft((prev) => ({ ...prev!, visibility: 'private' }))}
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.optionGroup}>
                                        <Text style={styles.label}>Approval status</Text>
                                        <View style={styles.optionRow}>
                                            <OptionPill
                                                label="Approved"
                                                active={draft.approval_status === 'approved'}
                                                onPress={() => setDraft((prev) => ({ ...prev!, approval_status: 'approved' }))}
                                            />
                                            <OptionPill
                                                label="Pending"
                                                active={draft.approval_status === 'pending'}
                                                onPress={() => setDraft((prev) => ({ ...prev!, approval_status: 'pending' }))}
                                            />
                                            <OptionPill
                                                label="Rejected"
                                                active={draft.approval_status === 'rejected'}
                                                onPress={() => setDraft((prev) => ({ ...prev!, approval_status: 'rejected' }))}
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.flagsGroup}>
                                        <Text style={styles.label}>Flags</Text>
                                        <View style={styles.flagsGrid}>
                                            <View style={styles.flagRow}>
                                                <Text style={styles.flagLabel}>Hidden</Text>
                                                <Switch
                                                    value={!!draft.hidden}
                                                    onValueChange={(value) => setDraft((prev) => ({ ...prev!, hidden: value }))}
                                                    trackColor={{ false: colors.borderMutedAlt, true: colors.tintViolet }}
                                                    thumbColor={draft.hidden ? colors.brandIndigo : colors.surfaceWhiteStrong}
                                                    ios_backgroundColor={colors.borderMutedAlt}
                                                />
                                            </View>
                                            <View style={styles.flagRow}>
                                                <Text style={styles.flagLabel}>Weekly pick</Text>
                                                <Switch
                                                    value={!!draft.weekly_pick}
                                                    onValueChange={(value) => setDraft((prev) => ({ ...prev!, weekly_pick: value }))}
                                                    trackColor={{ false: colors.borderMutedAlt, true: colors.tintViolet }}
                                                    thumbColor={draft.weekly_pick ? colors.brandIndigo : colors.surfaceWhiteStrong}
                                                    ios_backgroundColor={colors.borderMutedAlt}
                                                />
                                            </View>
                                            <View style={styles.flagRow}>
                                                <Text style={styles.flagLabel}>Play party</Text>
                                                <Switch
                                                    value={!!draft.play_party}
                                                    onValueChange={(value) => setDraft((prev) => ({ ...prev!, play_party: value }))}
                                                    trackColor={{ false: colors.borderMutedAlt, true: colors.tintViolet }}
                                                    thumbColor={draft.play_party ? colors.brandIndigo : colors.surfaceWhiteStrong}
                                                    ios_backgroundColor={colors.borderMutedAlt}
                                                />
                                            </View>
                                            <View style={styles.flagRow}>
                                                <Text style={styles.flagLabel}>Vetted</Text>
                                                <Switch
                                                    value={!!draft.vetted}
                                                    onValueChange={(value) => setDraft((prev) => ({ ...prev!, vetted: value }))}
                                                    trackColor={{ false: colors.borderMutedAlt, true: colors.tintViolet }}
                                                    thumbColor={draft.vetted ? colors.brandIndigo : colors.surfaceWhiteStrong}
                                                    ios_backgroundColor={colors.borderMutedAlt}
                                                />
                                            </View>
                                            <View style={styles.flagRow}>
                                                <Text style={styles.flagLabel}>Non-NY</Text>
                                                <Switch
                                                    value={!!draft.non_ny}
                                                    onValueChange={(value) => setDraft((prev) => ({ ...prev!, non_ny: value }))}
                                                    trackColor={{ false: colors.borderMutedAlt, true: colors.tintViolet }}
                                                    thumbColor={draft.non_ny ? colors.brandIndigo : colors.surfaceWhiteStrong}
                                                    ios_backgroundColor={colors.borderMutedAlt}
                                                />
                                            </View>
                                            <View style={styles.flagRow}>
                                                <Text style={styles.flagLabel}>Facilitator only</Text>
                                                <Switch
                                                    value={!!draft.facilitator_only}
                                                    onValueChange={(value) => setDraft((prev) => ({ ...prev!, facilitator_only: value }))}
                                                    trackColor={{ false: colors.borderMutedAlt, true: colors.tintViolet }}
                                                    thumbColor={draft.facilitator_only ? colors.brandIndigo : colors.surfaceWhiteStrong}
                                                    ios_backgroundColor={colors.borderMutedAlt}
                                                />
                                            </View>
                                            <View style={styles.flagRow}>
                                                <Text style={styles.flagLabel}>Frozen</Text>
                                                <Switch
                                                    value={!!draft.frozen}
                                                    onValueChange={(value) => setDraft((prev) => ({ ...prev!, frozen: value }))}
                                                    trackColor={{ false: colors.borderMutedAlt, true: colors.tintViolet }}
                                                    thumbColor={draft.frozen ? colors.brandIndigo : colors.surfaceWhiteStrong}
                                                    ios_backgroundColor={colors.borderMutedAlt}
                                                />
                                            </View>
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        style={[
                                            styles.saveButton,
                                            (savingId === editingEvent.id || updateEvent.isPending) && styles.saveButtonDisabled,
                                        ]}
                                        onPress={saveEvent}
                                        disabled={savingId === editingEvent.id || updateEvent.isPending}
                                    >
                                        {savingId === editingEvent.id && updateEvent.isPending ? (
                                            <ActivityIndicator size="small" color={colors.white} />
                                        ) : (
                                            <Text style={styles.saveButtonText}>Save changes</Text>
                                        )}
                                    </TouchableOpacity>
                                </>
                            )}
                        </ScrollView>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    standaloneContainer: {
        flex: 1,
        backgroundColor: colors.surfaceMuted,
    },
    screenGradient: {
        flex: 1,
    },
    screenGlowTop: {
        position: 'absolute',
        top: -70,
        right: -80,
        width: 240,
        height: 240,
        borderRadius: 120,
    },
    screenGlowMid: {
        position: 'absolute',
        top: 140,
        left: -120,
        width: 220,
        height: 220,
        borderRadius: 110,
    },
    screenGlowBottom: {
        position: 'absolute',
        bottom: -70,
        left: -90,
        width: 300,
        height: 300,
        borderRadius: 150,
    },
    sectionList: {
        flex: 1,
        marginTop: spacing.xs,
    },
    sectionListContent: {
        paddingBottom: spacing.xxxl,
    },
    listHeader: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
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
    filterLabel: {
        marginTop: spacing.md,
        fontSize: fontSizes.sm,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: colors.textSubtle,
        fontFamily: fontFamilies.body,
    },
    filterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.xs,
    },
    filterToggleRow: {
        marginTop: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        backgroundColor: colors.surfaceSubtle,
    },
    filterToggleLabel: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
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
    optionPill: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        backgroundColor: colors.surfaceSubtle,
    },
    optionPillActive: {
        backgroundColor: colors.tintViolet,
        borderColor: colors.borderLavenderAlt,
    },
    optionText: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    optionTextActive: {
        color: colors.brandIndigo,
        fontWeight: '600',
    },
    sectionHeaderOuterWrapper: {
        paddingBottom: spacing.lg,
        paddingTop: spacing.md,
        marginHorizontal: spacing.lg,
    },
    sectionHeaderPill: {
        width: '100%',
        backgroundColor: colors.surfaceWhiteFrosted,
        paddingHorizontal: spacing.lg,
        height: 34,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.borderLavenderSoft,
        alignSelf: 'stretch',
        shadowColor: colors.black,
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },
    sectionHeaderText: {
        fontSize: fontSizes.base,
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
        fontFamily: fontFamilies.body,
    },
    adminActions: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    actionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        backgroundColor: colors.surfaceWhiteStrong,
        paddingHorizontal: spacing.smPlus,
        paddingVertical: spacing.xxs,
    },
    actionPillActive: {
        backgroundColor: colors.tintViolet,
        borderColor: colors.borderLavenderAlt,
    },
    actionPillApprove: {
        backgroundColor: colors.surfaceLavenderLight,
        borderColor: colors.borderLavenderAlt,
    },
    actionPillWarning: {
        backgroundColor: colors.surfaceWarning,
        borderColor: colors.borderGoldSoft,
    },
    actionPillSuccess: {
        backgroundColor: 'rgba(46, 125, 50, 0.1)',
        borderColor: 'rgba(46, 125, 50, 0.25)',
    },
    actionPillDanger: {
        backgroundColor: 'rgba(255, 59, 48, 0.08)',
        borderColor: 'rgba(255, 59, 48, 0.25)',
    },
    actionPillReadOnly: {
        backgroundColor: colors.surfaceSubtle,
        borderColor: colors.borderSubtle,
    },
    actionText: {
        marginLeft: spacing.xs,
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    actionTextActive: {
        color: colors.brandIndigo,
        fontWeight: '600',
    },
    actionTextApprove: {
        color: colors.brandIndigo,
        fontWeight: '600',
    },
    actionTextWarning: {
        color: colors.warning,
        fontWeight: '600',
    },
    actionTextSuccess: {
        color: colors.success,
        fontWeight: '600',
    },
    actionTextDanger: {
        color: colors.danger,
        fontWeight: '600',
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
    modalContainer: {
        flex: 1,
        backgroundColor: colors.surfaceMuted,
    },
    modalSafe: {
        flex: 1,
        backgroundColor: colors.surfaceMuted,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        backgroundColor: colors.white,
    },
    modalTitle: {
        fontSize: fontSizes.xl,
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: fontFamilies.display,
    },
    modalCloseButton: {
        width: 32,
        height: 32,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalContent: {
        padding: spacing.lg,
        paddingBottom: spacing.xxxl,
    },
    modalMeta: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        marginBottom: spacing.md,
        fontFamily: fontFamilies.body,
    },
    field: {
        marginBottom: spacing.md,
    },
    fieldRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.md,
        flexWrap: 'wrap',
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
    inputPressable: {
        borderRadius: radius.md,
    },
    multilineInput: {
        minHeight: 96,
        textAlignVertical: 'top',
    },
    pickerCard: {
        marginTop: spacing.sm,
        padding: spacing.sm,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        backgroundColor: colors.surfaceWhiteStrong,
        alignSelf: 'stretch',
    },
    pickerDoneButton: {
        marginTop: spacing.sm,
        alignSelf: 'flex-end',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceSubtle,
    },
    pickerDoneText: {
        fontSize: fontSizes.sm,
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
    optionGroup: {
        marginBottom: spacing.md,
    },
    optionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.xs,
    },
    flagsGroup: {
        marginBottom: spacing.lg,
    },
    flagsGrid: {
        gap: spacing.sm,
        marginTop: spacing.xs,
    },
    flagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        backgroundColor: colors.surfaceSubtle,
    },
    flagLabel: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontFamily: fontFamilies.body,
    },
    saveButton: {
        backgroundColor: colors.brandIndigo,
        borderRadius: radius.pill,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.sm,
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
});

export default EventAdminScreen;
