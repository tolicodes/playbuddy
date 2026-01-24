import React, { useDeferredValue, useMemo, useState } from 'react';
import {
    Box,
    Collapse,
    Stack,
    Typography,
    Paper,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TextField,
    Button,
    Chip,
    Divider,
    IconButton,
    Pagination,
    Switch,
    Autocomplete,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tooltip,
    FormControlLabel,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useFetchAttendees } from '../../common/db-axios/useAttendees';
import { useFetchEvents } from '../../common/db-axios/useEvents';
import { useFetchOrganizers } from '../../common/db-axios/useOrganizers';
import { useDeleteOrganizerEvents } from '../../common/db-axios/useDeleteOrganizerEvents';
import { useMergeOrganizer } from '../../common/db-axios/useMergeOrganizer';
import { useUpdateOrganizer } from '../../common/db-axios/useUpdateOrganizer';
import { Event, Organizer } from '../../common/types/commonTypes';

type OrganizerOption = { id: number; label: string; handles?: string };
type OrganizerEditForm = {
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

const normalizeHandle = (val?: string | null) => (val || '').replace(/^@/, '').trim().toLowerCase();
const formatOrganizerLabel = (org: Organizer) =>
    org.name || org.fetlife_handles?.[0] || org.fetlife_handle || org.instagram_handle || `Organizer ${org.id}`;
const collectFetlifeHandles = (org: Organizer) => {
    const handles = [
        ...(org.fetlife_handles || []),
        org.fetlife_handle,
    ];
    const normalized = handles.map((handle) => normalizeHandle(handle)).filter(Boolean);
    return Array.from(new Set(normalized));
};
const parseDelimitedList = (value: string) => {
    if (!value) return [];
    return value
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean);
};
const parseHandlesInput = (value: string) =>
    parseDelimitedList(value).map((handle) => normalizeHandle(handle)).filter(Boolean);
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
const buildEditForm = (org: Organizer): OrganizerEditForm => ({
    name: org.name ?? '',
    url: org.url ?? '',
    original_id: org.original_id ?? '',
    aliases: (org.aliases || []).join(', '),
    fetlife_handles: collectFetlifeHandles(org).join(', '),
    instagram_handle: org.instagram_handle ?? '',
    membership_app_url: org.membership_app_url ?? '',
    membership_only: !!org.membership_only,
    hidden: !!org.hidden,
    vetted: !!org.vetted,
    vetted_instructions: org.vetted_instructions ?? '',
});

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
    if (normalized === 'approved') return { label: 'Approved', color: 'success' as const };
    if (normalized === 'pending') return { label: 'Pending', color: 'warning' as const };
    return { label: 'Rejected', color: 'error' as const };
};

export default function OrganizerManager() {
    const { data: organizers = [] } = useFetchOrganizers({ includeHidden: true });
    const { data: events = [], isLoading: eventsLoading } = useFetchEvents({
        includeFacilitatorOnly: true,
        includeHiddenOrganizers: true,
        includeHidden: true,
        approvalStatuses: ['approved', 'pending', 'rejected'],
    });
    const { data: attendees = [], isLoading: attendeesLoading } = useFetchAttendees();
    const deleteOrganizerEvents = useDeleteOrganizerEvents();
    const updateOrganizer = useUpdateOrganizer();
    const mergeOrganizer = useMergeOrganizer();
    const [search, setSearch] = useState('');
    const deferredSearch = useDeferredValue(search);
    const [page, setPage] = useState(1);
    const [hideNoEvents, setHideNoEvents] = useState(true);
    const [showOnlyHidden, setShowOnlyHidden] = useState(false);
    const [mergeSource, setMergeSource] = useState<Organizer | null>(null);
    const [mergeTarget, setMergeTarget] = useState<OrganizerOption | null>(null);
    const [deletingState, setDeletingState] = useState<{ organizerId: number; mode: 'all' | 'withoutAttendees' } | null>(null);
    const [expandedOrganizers, setExpandedOrganizers] = useState<Record<number, boolean>>({});
    const [editDialog, setEditDialog] = useState<{ org: Organizer | null; form: OrganizerEditForm }>({
        org: null,
        form: emptyEditForm,
    });
    const pageSize = 50;

    const organizerOptions = useMemo<OrganizerOption[]>(() => {
        return organizers.map((org) => {
            const handles = [
                ...collectFetlifeHandles(org),
                normalizeHandle(org.instagram_handle),
            ].filter(Boolean);
            return {
                id: org.id,
                label: formatOrganizerLabel(org),
                handles: handles.join(' • ')
            };
        });
    }, [organizers]);

    const mergeTargetOptions = useMemo(() => {
        if (!mergeSource) return organizerOptions;
        return organizerOptions.filter((option) => option.id !== mergeSource.id);
    }, [organizerOptions, mergeSource]);

    const normalized = useMemo(() => {
        const now = Date.now();
        return [...organizers]
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
            .map(org => {
                const events = ((org as any).events || []) as { start_date?: string | null }[];
                const futureCount = events.filter(e => {
                    if (!e?.start_date) return false;
                    const ts = new Date(e.start_date).getTime();
                    return Number.isFinite(ts) && ts >= now;
                }).length;
                return {
                    org,
                    futureCount,
                    name: (org.name || '').toLowerCase(),
                    fet: collectFetlifeHandles(org),
                    ig: (org.instagram_handle || '').toLowerCase(),
                    aliases: (org.aliases || []).map(a => (a || '').toLowerCase()),
                };
            });
    }, [organizers]);

    const attendeeCountByEventId = useMemo(() => {
        const map = new Map<number, number>();
        attendees.forEach((group) => {
            if (Number.isFinite(group.event_id)) {
                map.set(group.event_id, group.attendees?.length ?? 0);
            }
        });
        return map;
    }, [attendees]);

    const organizerIdByEventId = useMemo(() => {
        const map = new Map<number, number>();
        events.forEach((event) => {
            const organizerId = event.organizer?.id;
            if (organizerId) {
                map.set(event.id, organizerId);
            }
        });
        return map;
    }, [events]);

    const savedPeopleByOrganizerId = useMemo(() => {
        const attendeesByOrganizer = new Map<number, Set<string>>();
        attendees.forEach((group) => {
            const organizerId = organizerIdByEventId.get(group.event_id);
            if (!organizerId) return;
            const bucket = attendeesByOrganizer.get(organizerId) ?? new Set<string>();
            attendeesByOrganizer.set(organizerId, bucket);
            (group.attendees || []).forEach((attendee) => {
                if (attendee?.id) bucket.add(attendee.id);
            });
        });
        const counts: Record<number, number> = {};
        attendeesByOrganizer.forEach((bucket, organizerId) => {
            counts[organizerId] = bucket.size;
        });
        return counts;
    }, [attendees, organizerIdByEventId]);

    const eventsByOrganizerId = useMemo(() => {
        const map = new Map<number, Event[]>();
        events.forEach((event) => {
            const organizerId = event.organizer?.id ?? event.organizer_id;
            if (!organizerId) return;
            const list = map.get(organizerId) ?? [];
            list.push(event);
            map.set(organizerId, list);
        });
        map.forEach((list) => {
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

    const eventsWithAttendeesByOrganizerId = useMemo(() => {
        const map = new Map<number, Array<{ id: number; name: string; sourceLabel: string; attendeeCount: number; startDate?: string | null }>>();
        events.forEach((event) => {
            const organizerId = event.organizer?.id;
            if (!organizerId) return;
            const attendeeCount = attendeeCountByEventId.get(event.id) ?? 0;
            if (attendeeCount <= 0) return;
            const list = map.get(organizerId) ?? [];
            list.push({
                id: event.id,
                name: event.name || `Event ${event.id}`,
                sourceLabel: formatEventSourceLabel(event),
                attendeeCount,
                startDate: event.start_date,
            });
            map.set(organizerId, list);
        });
        map.forEach((list) => {
            list.sort((a, b) => {
                const aTime = a.startDate ? new Date(a.startDate).getTime() : Number.POSITIVE_INFINITY;
                const bTime = b.startDate ? new Date(b.startDate).getTime() : Number.POSITIVE_INFINITY;
                if (aTime === bTime) return a.name.localeCompare(b.name);
                return aTime - bTime;
            });
        });
        return map;
    }, [attendeeCountByEventId, events]);

    const filtered = useMemo(() => {
        const needle = deferredSearch.trim().toLowerCase();
        return normalized
            .filter(n => {
                if (hideNoEvents && n.futureCount === 0) return false;
                if (showOnlyHidden && !n.org.hidden) return false;
                if (!needle) return true;
                return (
                    n.name.includes(needle) ||
                    n.fet.some((handle) => handle.includes(needle)) ||
                    n.ig.includes(needle) ||
                    n.aliases.some(a => a.includes(needle))
                );
            })
            .map(n => ({ ...n.org, _futureCount: n.futureCount }));
    }, [normalized, deferredSearch, hideNoEvents, showOnlyHidden]);

    const paged = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page]);

    const toggleExpanded = (organizerId: number) => {
        setExpandedOrganizers((prev) => ({ ...prev, [organizerId]: !prev[organizerId] }));
    };

    const canMerge = !!mergeSource && !!mergeTarget && mergeSource.id !== mergeTarget.id && !mergeOrganizer.isPending;
    const openMergeDialog = (org: Organizer) => {
        setMergeSource(org);
        setMergeTarget(null);
    };
    const closeMergeDialog = () => {
        if (mergeOrganizer.isPending) return;
        setMergeSource(null);
        setMergeTarget(null);
    };
    const handleMerge = async () => {
        if (!mergeSource || !mergeTarget) return;
        if (mergeSource.id === mergeTarget.id) return;
        const sourceLabel = formatOrganizerLabel(mergeSource);
        const confirmed = window.confirm(
            `Merge "${sourceLabel}" (#${mergeSource.id}) into "${mergeTarget.label}" (#${mergeTarget.id})?\n\n` +
            'This moves events, communities, promo codes, facilitators, deep links, and munches, then deletes the source organizer.'
        );
        if (!confirmed) return;
        try {
            const result = await mergeOrganizer.mutateAsync({
                sourceOrganizerId: mergeSource.id,
                targetOrganizerId: mergeTarget.id,
                deleteSource: true,
            });
            closeMergeDialog();
            if (result?.warnings?.length) {
                const warningText = result.warnings.map((warn) => `${warn.table}: ${warn.message}`).join('\n');
                window.alert(`Merge completed with warnings:\n${warningText}`);
            }
        } catch (err: any) {
            window.alert(err?.message || 'Failed to merge organizers.');
        }
    };

    const openEditDialog = (org: Organizer) => {
        setEditDialog({ org, form: buildEditForm(org) });
    };
    const closeEditDialog = () => {
        if (updateOrganizer.isPending) return;
        setEditDialog({ org: null, form: emptyEditForm });
    };
    const updateEditForm = <K extends keyof OrganizerEditForm>(key: K, value: OrganizerEditForm[K]) => {
        setEditDialog((prev) => {
            if (!prev.org) return prev;
            return { ...prev, form: { ...prev.form, [key]: value } };
        });
    };
    const saveEditDialog = async () => {
        if (!editDialog.org) return;
        const { org, form } = editDialog;
        const name = form.name.trim();
        if (!name) {
            window.alert('Organizer name is required.');
            return;
        }
        const aliases = parseDelimitedList(form.aliases);
        const handles = parseHandlesInput(form.fetlife_handles);
        const urlTrimmed = form.url.trim();
        const instagramTrimmed = form.instagram_handle.trim();
        const originalIdTrimmed = form.original_id.trim();
        const membershipUrlTrimmed = form.membership_app_url.trim();
        const vettedInstructionsTrimmed = form.vetted_instructions.trim();
        try {
            await updateOrganizer.mutateAsync({
                id: org.id,
                name,
                url: urlTrimmed || (org.url ? '' : undefined),
                original_id: originalIdTrimmed || (org.original_id ? null : undefined),
                aliases: aliases.length ? aliases : null,
                fetlife_handles: handles.length ? handles : [],
                instagram_handle: instagramTrimmed || (org.instagram_handle ? '' : undefined),
                membership_app_url: membershipUrlTrimmed || (org.membership_app_url ? null : undefined),
                membership_only: form.membership_only,
                hidden: form.hidden,
                vetted: form.vetted,
                vetted_instructions: vettedInstructionsTrimmed || (org.vetted_instructions ? null : undefined),
            });
            closeEditDialog();
        } catch (err: any) {
            window.alert(err?.message || 'Failed to update organizer.');
        }
    };

    const handleDeleteEvents = async ({
        org,
        totalEvents,
        futureCount,
        protectedCount,
        deletableCount,
        onlyWithoutAttendees,
    }: {
        org: Organizer;
        totalEvents: number;
        futureCount: number;
        protectedCount: number;
        deletableCount: number;
        onlyWithoutAttendees: boolean;
    }) => {
        if (deleteOrganizerEvents.isPending) return;
        const label = formatOrganizerLabel(org);
        const confirmText = onlyWithoutAttendees
            ? `Delete ${deletableCount} event${deletableCount === 1 ? '' : 's'} without attendees for "${label}" (#${org.id})?\n\n` +
              `Events with attendees (${protectedCount}) will be kept. This cannot be undone.`
            : `Delete all ${totalEvents} events for "${label}" (#${org.id})?\n\n` +
              `This removes ${futureCount} upcoming event${futureCount === 1 ? '' : 's'} and cannot be undone.`;
        const confirmed = window.confirm(confirmText);
        if (!confirmed) return;
        setDeletingState({ organizerId: org.id, mode: onlyWithoutAttendees ? 'withoutAttendees' : 'all' });
        try {
            const result = await deleteOrganizerEvents.mutateAsync({
                organizerId: org.id,
                onlyWithoutAttendees,
            });
            const deleted = result?.deleted ?? 0;
            const skipped = result?.skippedWithAttendees ?? 0;
            const skippedText = onlyWithoutAttendees && skipped
                ? ` Skipped ${skipped} event${skipped === 1 ? '' : 's'} with attendees.`
                : '';
            window.alert(`Deleted ${deleted} event${deleted === 1 ? '' : 's'} for "${label}".${skippedText}`);
        } catch (err: any) {
            window.alert(err?.message || 'Failed to delete organizer events.');
        } finally {
            setDeletingState(null);
        }
    };

    return (
        <Box p={4} sx={{ background: '#f8fafc', minHeight: '100vh' }}>
            <Typography variant="h4" gutterBottom>Organizer Manager</Typography>
            <Typography color="text.secondary" gutterBottom>
                Edit organizer fields and aliases.
            </Typography>
            <Paper sx={{ p: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                    <Chip label={`${organizers.length}`} size="small" />
                    <TextField
                        size="small"
                        placeholder="Search name/handle/alias"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        sx={{ minWidth: 240 }}
                    />
                    <Chip
                        label={hideNoEvents ? 'Hiding no-events' : 'Including no-events'}
                        color={hideNoEvents ? 'default' : 'primary'}
                        onClick={() => { setHideNoEvents(!hideNoEvents); setPage(1); }}
                        variant={hideNoEvents ? 'filled' : 'outlined'}
                        clickable
                    />
                    <Chip
                        label={showOnlyHidden ? 'Showing hidden' : 'All visibility'}
                        color={showOnlyHidden ? 'secondary' : 'default'}
                        onClick={() => { setShowOnlyHidden(!showOnlyHidden); setPage(1); }}
                        variant={showOnlyHidden ? 'filled' : 'outlined'}
                        clickable
                    />
                    {updateOrganizer.isPending && <Chip label="Saving..." size="small" color="warning" />}
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Events</TableCell>
                            <TableCell>Hidden</TableCell>
                            <TableCell>Vetted org</TableCell>
                            <TableCell>URL</TableCell>
                            <TableCell>FetLife handles (comma separated)</TableCell>
                            <TableCell>Instagram</TableCell>
                            <TableCell>Aliases (comma separated)</TableCell>
                            <TableCell>Vetted instructions</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paged.map((org) => {
                            const aliasString = (org.aliases || []).join(', ');
                            const isHidden = !!org.hidden;
                            const isVetted = !!org.vetted;
                            const vettedInstructions = org.vetted_instructions ?? '';
                            const vettedPreview = vettedInstructions.length > 80
                                ? `${vettedInstructions.slice(0, 80)}…`
                                : vettedInstructions;
                            const handlesLabel = collectFetlifeHandles(org).join(', ');
                            const totalEvents = ((org as any).events || []).length;
                            const futureCount = (org as any)._futureCount ?? 0;
                            const eventsWithAttendees = eventsWithAttendeesByOrganizerId.get(org.id) ?? [];
                            const organizerEvents = eventsByOrganizerId.get(org.id) ?? [];
                            const isExpanded = !!expandedOrganizers[org.id];
                            const protectedCount = eventsWithAttendees.length;
                            const deletableCount = Math.max(0, totalEvents - protectedCount);
                            const isDeleting = deleteOrganizerEvents.isPending && deletingState?.organizerId === org.id;
                            const isDeletingAll = isDeleting && deletingState?.mode === 'all';
                            const isDeletingWithout = isDeleting && deletingState?.mode === 'withoutAttendees';
                            const savedCount = savedPeopleByOrganizerId[org.id] ?? 0;
                            const savedLabel = eventsLoading || attendeesLoading ? 'Saved: ...' : `Saved: ${savedCount}`;
                            const deleteTooltipTitle = (
                                <Box sx={{ maxWidth: 360 }}>
                                    <Typography variant="subtitle2">Events with attendees</Typography>
                                    {eventsWithAttendees.length === 0 ? (
                                        <Typography variant="caption" color="text.secondary">
                                            No events with attendees.
                                        </Typography>
                                    ) : (
                                        <Stack spacing={0.75} mt={0.5} sx={{ maxHeight: 220, overflowY: 'auto' }}>
                                            {eventsWithAttendees.slice(0, 10).map((event) => (
                                                <Box key={event.id}>
                                                    <Typography variant="body2">{event.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {event.sourceLabel || 'Source unknown'} - {event.attendeeCount} saved
                                                    </Typography>
                                                </Box>
                                            ))}
                                            {eventsWithAttendees.length > 10 && (
                                                <Typography variant="caption" color="text.secondary">
                                                    and {eventsWithAttendees.length - 10} more
                                                </Typography>
                                            )}
                                        </Stack>
                                    )}
                                </Box>
                            );
                            return (
                                <React.Fragment key={org.id}>
                                    <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
                                        <TableCell sx={{ minWidth: 180 }}>
                                            <Typography variant="body2">{org.name || '—'}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Chip
                                                    label={(org as any)._futureCount ?? 0}
                                                    size="small"
                                                />
                                                <IconButton
                                                    size="small"
                                                    onClick={() => toggleExpanded(org.id)}
                                                    aria-label={isExpanded ? 'Hide organizer events' : 'Show organizer events'}
                                                >
                                                    {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                                </IconButton>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={isHidden ? 'Hidden' : 'Visible'}
                                                size="small"
                                                color={isHidden ? 'warning' : 'default'}
                                                variant={isHidden ? 'filled' : 'outlined'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={isVetted ? 'Vetted' : 'Not vetted'}
                                                size="small"
                                                color={isVetted ? 'success' : 'default'}
                                                variant={isVetted ? 'filled' : 'outlined'}
                                            />
                                        </TableCell>
                                    <TableCell sx={{ minWidth: 200 }}>
                                        <Typography variant="body2" color={org.url ? 'text.primary' : 'text.secondary'}>
                                            {org.url || '—'}
                                        </Typography>
                                    </TableCell>
                                        <TableCell sx={{ minWidth: 140 }}>
                                            <Typography variant="body2" color={handlesLabel ? 'text.primary' : 'text.secondary'}>
                                                {handlesLabel || '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ minWidth: 140 }}>
                                            <Typography variant="body2" color={org.instagram_handle ? 'text.primary' : 'text.secondary'}>
                                                {org.instagram_handle || '—'}
                                            </Typography>
                                    </TableCell>
                                    <TableCell sx={{ minWidth: 220 }}>
                                        <Typography variant="body2" color={aliasString ? 'text.primary' : 'text.secondary'}>
                                            {aliasString || '—'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ minWidth: 240 }}>
                                        <Stack spacing={1}>
                                            <Tooltip title={vettedInstructions || ''} arrow disableHoverListener={!vettedInstructions}>
                                                <Typography
                                                    variant="body2"
                                                    color={vettedInstructions ? 'text.primary' : 'text.secondary'}
                                                >
                                                    {vettedPreview || '—'}
                                                </Typography>
                                            </Tooltip>
                                        </Stack>
                                    </TableCell>
                                    <TableCell width={320}>
                                        <Stack direction="row" spacing={1} flexWrap="wrap">
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={() => openEditDialog(org)}
                                                disabled={updateOrganizer.isPending}
                                            >
                                                Edit
                                            </Button>
                                                <Button
                                                    variant="outlined"
                                                    color="error"
                                                    size="small"
                                                    onClick={() => openMergeDialog(org)}
                                                    disabled={mergeOrganizer.isPending}
                                                >
                                                    Merge
                                                </Button>
                                                <Tooltip title={deleteTooltipTitle} arrow>
                                                    <span>
                                                        <Button
                                                            variant="contained"
                                                            color="error"
                                                            size="small"
                                                            onClick={() => handleDeleteEvents({
                                                                org,
                                                                totalEvents,
                                                                futureCount,
                                                                protectedCount,
                                                                deletableCount,
                                                                onlyWithoutAttendees: false,
                                                            })}
                                                            disabled={isDeleting || !totalEvents}
                                                        >
                                                            {isDeletingAll ? 'Deleting...' : 'Delete events'}
                                                        </Button>
                                                    </span>
                                                </Tooltip>
                                                <Button
                                                    variant="outlined"
                                                    color="error"
                                                    size="small"
                                                    onClick={() => handleDeleteEvents({
                                                        org,
                                                        totalEvents,
                                                        futureCount,
                                                        protectedCount,
                                                        deletableCount,
                                                        onlyWithoutAttendees: true,
                                                    })}
                                                    disabled={isDeleting || deletableCount === 0}
                                                >
                                                    {isDeletingWithout ? 'Deleting...' : 'Delete no-saves'}
                                                </Button>
                                                <Chip
                                                    label={savedLabel}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell colSpan={10} sx={{ p: 0, borderBottom: 0 }}>
                                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                                <Box sx={{ px: 2, pb: 2 }}>
                                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                                        Events
                                                    </Typography>
                                                    {eventsLoading ? (
                                                        <Typography variant="caption" color="text.secondary">
                                                            Loading events...
                                                        </Typography>
                                                    ) : organizerEvents.length ? (
                                                        <Stack spacing={1}>
                                                            {organizerEvents.map((event) => {
                                                                const approvalMeta = getApprovalMeta(event.approval_status);
                                                                const sourceLabel = formatEventSourceLabel(event);
                                                                return (
                                                                    <Stack
                                                                        key={event.id}
                                                                        direction="row"
                                                                        spacing={1}
                                                                        alignItems="center"
                                                                        flexWrap="wrap"
                                                                    >
                                                                        <Typography variant="body2" sx={{ minWidth: 220 }}>
                                                                            {event.name || `Event ${event.id}`}
                                                                        </Typography>
                                                                        <Typography variant="caption" color="text.secondary">
                                                                            {formatEventDate(event)}
                                                                        </Typography>
                                                                        <Chip label={approvalMeta.label} color={approvalMeta.color} size="small" />
                                                                        {sourceLabel && (
                                                                            <Chip label={sourceLabel} size="small" variant="outlined" />
                                                                        )}
                                                                    </Stack>
                                                                );
                                                            })}
                                                        </Stack>
                                                    ) : (
                                                        <Typography variant="caption" color="text.secondary">
                                                            No events found for this organizer.
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Collapse>
                                        </TableCell>
                                    </TableRow>
                                </React.Fragment>
                            );
                        })}
                        {!filtered.length && (
                            <TableRow><TableCell colSpan={10} align="center">No organizers</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
                {filtered.length > pageSize && (
                    <Stack direction="row" justifyContent="center" mt={2}>
                        <Pagination
                            count={Math.ceil(filtered.length / pageSize)}
                            page={page}
                            onChange={(_, p) => setPage(p)}
                            size="small"
                        />
                    </Stack>
                )}
            </Paper>
            <Dialog
                open={!!mergeSource}
                onClose={closeMergeDialog}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>Merge organizer</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={1}>
                        <Typography variant="body2" color="text.secondary">
                            {mergeSource
                                ? `Merge "${formatOrganizerLabel(mergeSource)}" (#${mergeSource.id}) into another organizer.`
                                : 'Select a destination organizer.'}
                        </Typography>
                        <Autocomplete<OrganizerOption, false, false, false>
                            options={mergeTargetOptions}
                            getOptionLabel={(option) => option?.label || ''}
                            value={mergeTarget}
                            onChange={(_, value) => setMergeTarget(value)}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Destination organizer"
                                    placeholder="Type to search organizers"
                                    helperText="Destination organizer stays; source organizer is deleted after merging."
                                />
                            )}
                            renderOption={(props, option) => (
                                <li {...props} key={option.id}>
                                    <Stack>
                                        <Typography variant="body2">{option.label}</Typography>
                                        {option.handles && (
                                            <Typography variant="caption" color="text.secondary">
                                                {option.handles}
                                            </Typography>
                                        )}
                                    </Stack>
                                </li>
                            )}
                            fullWidth
                        />
                        <Typography variant="caption" color="text.secondary">
                            This moves events, communities, promo codes, facilitators, deep links, and munches.
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeMergeDialog} disabled={mergeOrganizer.isPending}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleMerge}
                        disabled={!canMerge}
                    >
                        {mergeOrganizer.isPending ? 'Merging...' : 'Merge into destination'}
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={!!editDialog.org}
                onClose={closeEditDialog}
                fullWidth
                maxWidth="md"
            >
                <DialogTitle>Edit organizer</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={1}>
                        <Typography variant="body2" color="text.secondary">
                            {editDialog.org ? `Organizer #${editDialog.org.id}` : ''}
                        </Typography>
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                                gap: 2,
                            }}
                        >
                            <TextField
                                label="Name"
                                value={editDialog.form.name}
                                onChange={(e) => updateEditForm('name', e.target.value)}
                                required
                            />
                            <TextField
                                label="Website"
                                value={editDialog.form.url}
                                onChange={(e) => updateEditForm('url', e.target.value)}
                                placeholder="https://"
                            />
                            <TextField
                                label="Original ID"
                                value={editDialog.form.original_id}
                                onChange={(e) => updateEditForm('original_id', e.target.value)}
                            />
                            <TextField
                                label="Instagram handle"
                                value={editDialog.form.instagram_handle}
                                onChange={(e) => updateEditForm('instagram_handle', e.target.value)}
                                placeholder="@handle"
                            />
                            <TextField
                                label="FetLife handles"
                                value={editDialog.form.fetlife_handles}
                                onChange={(e) => updateEditForm('fetlife_handles', e.target.value)}
                                placeholder="handle1, handle2"
                                helperText="Comma or newline separated."
                            />
                            <TextField
                                label="Aliases"
                                value={editDialog.form.aliases}
                                onChange={(e) => updateEditForm('aliases', e.target.value)}
                                placeholder="alias1, alias2"
                                helperText="Comma or newline separated."
                            />
                            <TextField
                                label="Membership URL"
                                value={editDialog.form.membership_app_url}
                                onChange={(e) => updateEditForm('membership_app_url', e.target.value)}
                                placeholder="https://"
                            />
                        </Box>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={editDialog.form.hidden}
                                        onChange={(e) => updateEditForm('hidden', e.target.checked)}
                                        color="warning"
                                    />
                                }
                                label="Hidden"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={editDialog.form.membership_only}
                                        onChange={(e) => updateEditForm('membership_only', e.target.checked)}
                                        color="info"
                                    />
                                }
                                label="Members-only"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={editDialog.form.vetted}
                                        onChange={(e) => updateEditForm('vetted', e.target.checked)}
                                        color="success"
                                    />
                                }
                                label="Vetted organizer"
                            />
                        </Stack>
                        <TextField
                            label="Vetted instructions"
                            value={editDialog.form.vetted_instructions}
                            onChange={(e) => updateEditForm('vetted_instructions', e.target.value)}
                            multiline
                            minRows={4}
                            placeholder="Add instructions (Markdown supported)"
                            fullWidth
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeEditDialog} disabled={updateOrganizer.isPending}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={saveEditDialog}
                        disabled={updateOrganizer.isPending}
                    >
                        {updateOrganizer.isPending ? 'Saving...' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
