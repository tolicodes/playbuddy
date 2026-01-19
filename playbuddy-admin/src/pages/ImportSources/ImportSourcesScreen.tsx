import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Autocomplete,
    Box, Stack, Typography, Paper, TextField, Button, MenuItem, Chip, Table, TableHead, TableRow, TableCell, TableBody, Tab, Tabs, Accordion, AccordionSummary, AccordionDetails, Checkbox, FormControlLabel, CircularProgress, Link, Collapse, IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useImportSources } from '../../common/db-axios/useImportSources';
import { useCreateImportSource } from '../../common/db-axios/useCreateImportSource';
import { useUpdateImportSource } from '../../common/db-axios/useUpdateImportSource';
import { useUpdateOrganizer } from '../../common/db-axios/useUpdateOrganizer';
import { useApproveImportSource } from '../../common/db-axios/useApproveImportSource';
import { useDeleteImportSource } from '../../common/db-axios/useDeleteImportSource';
import { useMarkImportSourceMessageSent } from '../../common/db-axios/useMarkImportSourceMessageSent';
import { Event, ImportSource } from '../../common/types/commonTypes';
import { useFetchOrganizers } from '../../common/db-axios/useOrganizers';
import { useFetchEvents } from '../../common/db-axios/useEvents';

const METHODS = ['chrome_scraper', 'eb_scraper', 'ai_scraper'];
const SOURCES = ['fetlife_handle', 'eb_url', 'url'];
const ID_TYPES = ['handle', 'url'];
const ADMIN_APPROVAL_STATUSES = ['approved', 'pending', 'rejected'];
const SOURCES_STICKY_TOP = 48;
const SOURCES_STICKY_BAR_HEIGHT = 64;
const SOURCES_TABLE_HEADER_TOP = SOURCES_STICKY_TOP + SOURCES_STICKY_BAR_HEIGHT;

const normalizeHandle = (val?: string | null) => (val || '').replace(/^@/, '').toLowerCase().trim();
const normalizeUrl = (val?: string | null) => {
    if (!val) return '';
    const raw = val.trim();
    if (!raw) return '';
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
        const url = new URL(withScheme);
        url.hash = '';
        url.search = '';
        const normalized = `${url.host}${url.pathname}`.replace(/\/$/, '');
        return normalized.toLowerCase();
    } catch {
        return raw.replace(/^https?:\/\//i, '').replace(/\/$/, '').toLowerCase();
    }
};
const getNormalizedEventUrls = (ev: Event) => {
    const urls = [
        ev.ticket_url,
        ev.event_url,
        (ev as any)?.source_url,
    ].filter(Boolean) as string[];
    const normalized = urls.map(normalizeUrl).filter(Boolean);
    return Array.from(new Set(normalized));
};
const getOrganizerFetlifeHandles = (org: any) => {
    const handles = [
        ...(org?.fetlife_handles || []),
        org?.fetlife_handle,
    ];
    const normalized = handles.map((handle) => normalizeHandle(handle)).filter(Boolean);
    return Array.from(new Set(normalized));
};

const getSourceApprovalState = (status?: ImportSource['approval_status']) => {
    if (status === 'pending') return 'pending';
    if (status === 'rejected') return 'rejected';
    return 'approved';
};

const SOURCE_STATUS_COLORS = {
    rejected: '#d32f2f',
    approved: '#2e7d32',
    messaged: '#1976d2',
    festival: '#7b1fa2',
    none: '#d81b60',
};

const SOURCE_ROW_COLORS = {
    rejected: '#fdecea',
    approved: '#e8f5e9',
    messaged: '#e3f2fd',
    festival: '#f3e5f5',
    none: '#fce4ec',
};

type SourceStatusKey = keyof typeof SOURCE_STATUS_COLORS;

type SourceStatusFlags = {
    isRejected: boolean;
    isExcluded: boolean;
    isApproved: boolean;
    isMessaged: boolean;
    isFestival: boolean;
};

type SourceStatusDotFlags = Pick<SourceStatusFlags, 'isRejected' | 'isApproved' | 'isMessaged' | 'isFestival'>;

const getSourceStatusFlags = (src: ImportSource): SourceStatusFlags => {
    const approvalState = getSourceApprovalState(src.approval_status);
    const isRejected = approvalState === 'rejected';
    const isExcluded = isRejected || !!src.is_excluded;
    const isApproved = approvalState === 'approved' && !isExcluded;
    const isMessaged = !!src.message_sent;
    const isFestival = !!src.is_festival;
    return { isRejected, isExcluded, isApproved, isMessaged, isFestival };
};

const getSourcePrimaryStatus = (flags: SourceStatusFlags): SourceStatusKey => {
    if (flags.isRejected) return 'rejected';
    if (flags.isApproved) return 'approved';
    if (flags.isMessaged) return 'messaged';
    if (flags.isFestival) return 'festival';
    return 'none';
};

const SOURCE_SECTION_INDEX: Record<SourceStatusKey, number> = {
    none: 0,
    festival: 1,
    messaged: 2,
    approved: 3,
    rejected: 4,
};

const SOURCE_SECTION_LABELS: Record<SourceStatusKey, string> = {
    none: 'All Other',
    festival: 'Festival',
    messaged: 'Messaged',
    approved: 'Approved',
    rejected: 'Rejected',
};

const getSourceSection = (src: ImportSource) => SOURCE_SECTION_INDEX[getSourcePrimaryStatus(getSourceStatusFlags(src))];

const getSourceStatusDots = (flags: SourceStatusDotFlags) => {
    const { isRejected, isApproved, isMessaged, isFestival } = flags;
    const dots: { key: string; color: string; title: string }[] = [];
    if (isRejected) dots.push({ key: 'rejected', color: SOURCE_STATUS_COLORS.rejected, title: 'Rejected' });
    if (isApproved) dots.push({ key: 'approved', color: SOURCE_STATUS_COLORS.approved, title: 'Approved' });
    if (isMessaged) dots.push({ key: 'messaged', color: SOURCE_STATUS_COLORS.messaged, title: 'Messaged' });
    if (isFestival) dots.push({ key: 'festival', color: SOURCE_STATUS_COLORS.festival, title: 'Festival' });
    if (!dots.length) dots.push({ key: 'none', color: SOURCE_STATUS_COLORS.none, title: 'None' });
    return dots;
};

const formatOrganizer = (src: ImportSource): string => {
    const meta = src?.metadata || {};
    const defaults = src?.event_defaults || {};

    const pickName = (val: any) => {
        if (!val) return '';
        if (typeof val === 'string') return val;
        if (typeof val === 'object') {
            if (typeof val.name === 'string') return val.name;
            if (typeof val.title === 'string') return val.title;
        }
        return '';
    };

    const name =
        pickName(meta.organizer) ||
        pickName(meta.organizer_name) ||
        pickName(defaults.organizer) ||
        pickName(defaults.organizer_name);

    const organizerId = meta.organizer_id || defaults.organizer_id || defaults.organizerId;

    return name || organizerId || '';
};

export default function ImportSourcesScreen() {
    const { data: sources = [], isLoading: isSourcesLoading } = useImportSources({ includeAll: true });
    const { data: organizers = [] } = useFetchOrganizers({ includeHidden: true });
    const { data: events = [], isLoading: isEventsLoading } = useFetchEvents({
        approvalStatuses: ADMIN_APPROVAL_STATUSES,
        includeHiddenOrganizers: true,
        includeHidden: true,
        includeFacilitatorOnly: true,
    });
    const createSource = useCreateImportSource();
    const updateSource = useUpdateImportSource();
    const updateOrganizer = useUpdateOrganizer();
    const approveSource = useApproveImportSource();
    const deleteSource = useDeleteImportSource();
    const markMessageSent = useMarkImportSourceMessageSent();
    const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
    const [tab, setTab] = useState<'sources' | 'fet'>('sources');
    const [showSuggestedFestivals, setShowSuggestedFestivals] = useState(false);
    const [sourceSearch, setSourceSearch] = useState('');
    const scrollRestoreRef = useRef<number | null>(null);
    const [form, setForm] = useState({
        source: '',
        method: METHODS[0],
        identifier: '',
        identifier_type: 'handle',
        organizerId: '',
    });

    const rememberScrollPosition = useCallback(() => {
        if (typeof window === 'undefined') return;
        scrollRestoreRef.current = window.scrollY;
    }, []);

    useEffect(() => {
        if (scrollRestoreRef.current === null) return;
        const y = scrollRestoreRef.current;
        scrollRestoreRef.current = null;
        window.requestAnimationFrame(() => {
            window.scrollTo({ top: y });
        });
    }, [sources]);

    const handleChange = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

    const updateOrganizerHandleIfNeeded = async (organizerId: string, identifier: string, identifierType?: string | null, source?: string) => {
        const isHandleType = (identifierType || '').toLowerCase() === 'handle' || source === 'fetlife_handle';
        const looksLikeHandle = !/^https?:\/\//i.test(identifier || '');
        const norm = (isHandleType || looksLikeHandle) ? normalizeHandle(identifier) : '';
        if (!organizerId || !norm) return;
        const org = organizers.find((item: any) => String(item?.id) === String(organizerId));
        const existingHandles = org ? getOrganizerFetlifeHandles(org) : [];
        const nextHandles = Array.from(new Set([...existingHandles, norm]));
        try {
            await updateOrganizer.mutateAsync({ id: Number(organizerId), fetlife_handles: nextHandles });
        } catch (err) {
            console.warn('Failed to update organizer handle', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.source || !form.identifier) return;
        rememberScrollPosition();
        const saved = await createSource.mutateAsync({
            source: form.source,
            method: form.method,
            identifier: form.identifier,
            identifier_type: form.identifier_type,
            event_defaults: form.organizerId ? { organizer_id: form.organizerId } : undefined,
        });
        if (form.organizerId) {
            await updateOrganizerHandleIfNeeded(form.organizerId, form.identifier, form.identifier_type, form.source);
        } else if (saved?.event_defaults?.organizer_id) {
            await updateOrganizerHandleIfNeeded(saved.event_defaults.organizer_id, form.identifier, form.identifier_type, form.source);
        }
        setForm(f => ({ ...f, identifier: '' }));
    };

    const organizerByHandle = useMemo(() => {
        const map: Record<string, string> = {};
        organizers.forEach((org: any) => {
            if (!org?.name) return;
            getOrganizerFetlifeHandles(org).forEach((handle) => {
                if (handle && !map[handle]) map[handle] = org.name;
            });
            const ig = normalizeHandle(org.instagram_handle);
            if (ig && !map[ig]) map[ig] = org.name;
        });
        return map;
    }, [organizers]);

    const organizerById = useMemo(() => {
        const map: Record<string, string> = {};
        organizers.forEach((org: any) => {
            if (!org?.id) return;
            map[String(org.id)] = org.name || org.fetlife_handles?.[0] || org.fetlife_handle || org.instagram_handle || `Organizer ${org.id}`;
        });
        return map;
    }, [organizers]);

    const organizerIdByHandle = useMemo(() => {
        const map: Record<string, string> = {};
        organizers.forEach((org: any) => {
            const id = org?.id ? String(org.id) : '';
            if (!id) return;
            getOrganizerFetlifeHandles(org).forEach((handle) => {
                if (handle && !map[handle]) map[handle] = id;
            });
            const ig = normalizeHandle(org.instagram_handle);
            if (ig && !map[ig]) map[ig] = id;
        });
        return map;
    }, [organizers]);

    type OrganizerOption = { id: string; label: string; handles?: string };
    type FetSourceEntry = {
        handle: string;
        source: ImportSource;
        events: Event[];
        hasApprovedEvents: boolean;
        hasPendingEvents: boolean;
        approval_status: ImportSource['approval_status'];
        message_sent: boolean;
    };

    const formatOrganizerFromSources = useCallback((src: ImportSource): string => {
        const organizerId = (src.event_defaults as any)?.organizer_id || (src.event_defaults as any)?.organizerId || (src.metadata as any)?.organizer_id || (src.metadata as any)?.organizerId;
        if (organizerId && organizerById[organizerId]) return organizerById[organizerId];

        const isHandle = (src.identifier_type || '').toLowerCase() === 'handle' || src.source === 'fetlife_handle';
        if (isHandle) {
            const norm = normalizeHandle(src.identifier);
            if (norm && organizerByHandle[norm]) return organizerByHandle[norm];
        }
        return formatOrganizer(src);
    }, [organizerByHandle, organizerById]);

    const organizerOptions: OrganizerOption[] = useMemo(() => {
        return organizers.map((org: any) => ({
            id: String(org.id),
            label: org.name || org.fetlife_handles?.[0] || org.fetlife_handle || org.instagram_handle || `Organizer ${org.id}`,
            handles: [...getOrganizerFetlifeHandles(org), normalizeHandle(org.instagram_handle)].filter(Boolean).join(' • '),
        }));
    }, [organizers]);

    const handleOrganizerUpdate = async (src: ImportSource, organizerId: string) => {
        const nextEventDefaults = {
            ...(src.event_defaults || {}),
            organizer_id: organizerId || null,
        };
        rememberScrollPosition();
        const updated = await updateSource.mutateAsync({
            id: src.id,
            source: src.source,
            method: src.method,
            identifier: src.identifier,
            identifier_type: src.identifier_type,
            metadata: src.metadata,
            event_defaults: nextEventDefaults,
            approval_status: src.approval_status,
            message_sent: src.message_sent,
        });
        if (organizerId) {
            await updateOrganizerHandleIfNeeded(organizerId, src.identifier, src.identifier_type, src.source);
        } else if ((updated as any)?.event_defaults?.organizer_id) {
            await updateOrganizerHandleIfNeeded((updated as any).event_defaults.organizer_id, src.identifier, src.identifier_type, src.source);
        }
    };

    const handleMessagedToggle = async (src: ImportSource, checked: boolean) => {
        if (!src?.id) return;
        rememberScrollPosition();
        await markMessageSent.mutateAsync({ id: String(src.id), message_sent: checked });
    };

    const handleApprovalToggle = async (src: ImportSource, checked: boolean) => {
        if (!src?.id) return;
        rememberScrollPosition();
        const nextExcluded = checked ? false : undefined;
        await updateSource.mutateAsync({
            id: src.id,
            source: src.source,
            method: src.method,
            identifier: src.identifier,
            identifier_type: src.identifier_type,
            metadata: src.metadata,
            event_defaults: src.event_defaults,
            approval_status: checked ? 'approved' : 'pending',
            message_sent: src.message_sent,
            is_excluded: nextExcluded,
        });
    };

    const handleRejectedToggle = async (src: ImportSource, checked: boolean) => {
        if (!src?.id) return;
        rememberScrollPosition();
        const nextExcluded = checked ? true : undefined;
        await updateSource.mutateAsync({
            id: src.id,
            source: src.source,
            method: src.method,
            identifier: src.identifier,
            identifier_type: src.identifier_type,
            metadata: src.metadata,
            event_defaults: src.event_defaults,
            approval_status: checked ? 'rejected' : 'pending',
            message_sent: src.message_sent,
            is_excluded: nextExcluded,
        });
    };

    const handleFestivalToggle = async (src: ImportSource, checked: boolean) => {
        if (!src?.id || src.source !== 'fetlife_handle') return;
        rememberScrollPosition();
        await updateSource.mutateAsync({
            id: src.id,
            source: src.source,
            method: src.method,
            identifier: src.identifier,
            identifier_type: src.identifier_type,
            metadata: src.metadata,
            event_defaults: src.event_defaults,
            approval_status: src.approval_status,
            message_sent: src.message_sent,
            is_festival: checked,
        });
    };

    const handleExcludedToggle = async (src: ImportSource, checked: boolean) => {
        if (!src?.id) return;
        rememberScrollPosition();
        const approvalState = src.approval_status === 'pending'
            ? 'pending'
            : src.approval_status === 'rejected'
                ? 'rejected'
                : 'approved';
        const nextApprovalStatus = checked && approvalState === 'approved'
            ? 'pending'
            : src.approval_status;
        await updateSource.mutateAsync({
            id: src.id,
            source: src.source,
            method: src.method,
            identifier: src.identifier,
            identifier_type: src.identifier_type,
            metadata: src.metadata,
            event_defaults: src.event_defaults,
            approval_status: nextApprovalStatus,
            message_sent: src.message_sent,
            is_excluded: checked,
        });
    };

    const toggleExpandedSource = (id: string) => {
        setExpandedSources(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleDeleteSource = async (src: ImportSource) => {
        if (!src?.id) return;
        const name = src.identifier || src.source || 'this source';
        const confirmed = window.confirm(`Delete import source "${name}"?`);
        if (!confirmed) return;
        rememberScrollPosition();
        try {
            await deleteSource.mutateAsync(String(src.id));
        } catch (err) {
            console.warn('Failed to delete import source', err);
        }
    };

    const renderFetSourceAccordion = (entry: FetSourceEntry, showMessaged: boolean) => {
        const approvalState = getSourceApprovalState(entry.approval_status);
        const isApproved = approvalState === 'approved';
        const approvalColor: 'success' | 'warning' | 'error' =
            approvalState === 'approved' ? 'success' : (approvalState === 'rejected' ? 'error' : 'warning');
        const approvalLabel = approvalState === 'approved' ? 'Approved' : (approvalState === 'rejected' ? 'Rejected' : 'Pending approval');
        const fetUrl = `https://fetlife.com/${entry.handle}`;
        return (
            <Accordion key={entry.handle} disableGutters>
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ px: 1.5 }}
                >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" width="100%" spacing={1}>
                        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" rowGap={0.5}>
                            <Link href={fetUrl} target="_blank" rel="noopener noreferrer" underline="hover">
                                <Typography variant="subtitle1" color="primary">{entry.handle}</Typography>
                            </Link>
                            <Chip label={`${entry.events.length} event${entry.events.length === 1 ? '' : 's'}`} size="small" />
                            {entry.hasPendingEvents && <Chip label="Pending events" size="small" color="warning" />}
                            <Chip label={approvalLabel} size="small" color={approvalColor} />
                            {!isApproved && (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (entry.source?.id) approveSource.mutate(String(entry.source.id));
                                    }}
                                    disabled={approveSource.isPending}
                                >
                                    Approve
                                </Button>
                            )}
                            <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    void handleDeleteSource(entry.source);
                                }}
                                disabled={deleteSource.isPending}
                            >
                                Delete
                            </Button>
                            {showMessaged && (
                                <FormControlLabel
                                    label="Messaged"
                                    control={
                                        <Checkbox
                                            size="small"
                                            checked={!!entry.message_sent}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                void handleMessagedToggle(entry.source, e.target.checked);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                    sx={{ ml: 1 }}
                                />
                            )}
                        </Stack>
                    </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 1.5 }}>
                    {entry.events.length ? (
                        <Stack spacing={1.5}>
                            {entry.events.map((ev) => {
                                const { label: statusLabel, color: statusColor } = getApprovalMeta(ev.approval_status);
                                const ticketHref = ev.ticket_url || ev.event_url || '';
                                return (
                                    <Stack key={`${entry.handle}-${ev.id}`} direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                                        <Stack spacing={0.25}>
                                            {ticketHref ? (
                                                <Link href={ticketHref} target="_blank" rel="noopener noreferrer" underline="hover">
                                                    <Typography variant="body2" color="primary">
                                                        {ev.name || `Event ${ev.id}`}
                                                    </Typography>
                                                </Link>
                                            ) : (
                                                <Typography variant="body2">{ev.name || `Event ${ev.id}`}</Typography>
                                            )}
                                            <Typography variant="caption" color="text.secondary">
                                                {formatEventDate(ev)}{ev.location ? ` • ${ev.location}` : ''}
                                            </Typography>
                                        </Stack>
                                        <Chip label={statusLabel} size="small" color={statusColor} />
                                    </Stack>
                                );
                            })}
                        </Stack>
                    ) : (
                        <Typography color="text.secondary">No events yet for this handle.</Typography>
                    )}
                </AccordionDetails>
            </Accordion>
        );
    };

    const sorted = useMemo(() => [...sources].sort((a, b) => {
        const createdDiff = (b.created_at || '').localeCompare(a.created_at || '');
        if (createdDiff !== 0) return createdDiff;
        const idDiff = String(a.id || '').localeCompare(String(b.id || ''));
        if (idDiff !== 0) return idDiff;
        const sourceDiff = (a.source || '').localeCompare(b.source || '');
        if (sourceDiff !== 0) return sourceDiff;
        const methodDiff = (a.method || '').localeCompare(b.method || '');
        if (methodDiff !== 0) return methodDiff;
        return (a.identifier || '').localeCompare(b.identifier || '');
    }), [sources]);

    const filteredSources = useMemo(() => {
        const query = sourceSearch.trim().toLowerCase();
        const baseList = query ? sorted.filter((src: ImportSource) => {
            const isHandleSource =
                (src.identifier_type || '').toLowerCase() === 'handle' ||
                src.source === 'fetlife_handle';
            const isUrlSource =
                (src.identifier_type || '').toLowerCase() === 'url' ||
                src.source === 'eb_url' ||
                src.source === 'url' ||
                /^https?:\/\//i.test(src.identifier || '');
            const identifier = src.identifier || '';
            const normalizedIdentifier = isHandleSource
                ? normalizeHandle(identifier)
                : (isUrlSource ? normalizeUrl(identifier) : '');
            const organizerLabel = formatOrganizerFromSources(src);
            const parts = [
                src.source,
                src.method,
                identifier,
                normalizedIdentifier,
                src.identifier_type,
                organizerLabel,
            ].filter(Boolean) as string[];
            return parts.join(' ').toLowerCase().includes(query);
        }) : [...sorted];
        const decorated = baseList.map((src, index) => ({
            src,
            index,
            section: getSourceSection(src),
        }));
        decorated.sort((a, b) => {
            if (a.section !== b.section) return a.section - b.section;
            return a.index - b.index;
        });
        return decorated.map(({ src }) => src);
    }, [sorted, sourceSearch, formatOrganizerFromSources]);

    const formatEventDate = (ev: Event) => {
        const dateStr = ev.start_date || ev.end_date;
        if (!dateStr) return 'Date TBD';
        const date = new Date(dateStr);
        if (Number.isNaN(date.getTime())) return dateStr;
        return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    };

    const getApprovalMeta = (status?: Event['approval_status']) => {
        const normalized = status ?? 'approved';
        if (normalized === 'approved') return { label: 'Approved', color: 'success' as const };
        if (normalized === 'pending') return { label: 'Pending', color: 'warning' as const };
        return { label: 'Rejected', color: 'error' as const };
    };

    const eventsByOrganizerId = useMemo(() => {
        const map: Record<string, Event[]> = {};
        events.forEach((ev: Event) => {
            const organizerId = (ev as any)?.organizer_id ?? ev?.organizer?.id;
            if (!organizerId) return;
            const key = String(organizerId);
            if (!map[key]) map[key] = [];
            map[key].push(ev);
        });
        return map;
    }, [events]);

    const eventsByUrl = useMemo(() => {
        const map: Record<string, Event[]> = {};
        events.forEach((ev: Event) => {
            getNormalizedEventUrls(ev).forEach((url) => {
                if (!map[url]) map[url] = [];
                map[url].push(ev);
            });
        });
        return map;
    }, [events]);

    const fetEventsByHandle = useMemo(() => {
        const map: Record<string, Event[]> = {};
        events.forEach((ev: Event) => {
            const handle = normalizeHandle(
                (ev as any)?.fetlife_handle
                || (ev as any)?.organizer?.fetlife_handle
                || (ev as any)?.organizer?.fetlife_handles?.[0]
            );
            if (!handle) return;
            if (!map[handle]) map[handle] = [];
            map[handle].push(ev);
        });
        Object.keys(map).forEach((h) => {
            map[h] = map[h].sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
        });
        return map;
    }, [events]);

    const associatedEventsBySourceId = useMemo(() => {
        const map = new Map<string, Event[]>();
        sorted.forEach((src: ImportSource) => {
            if (!src?.id) return;
            const eventMap = new Map<number, Event>();
            const addEvents = (list?: Event[]) => {
                (list || []).forEach((ev) => eventMap.set(ev.id, ev));
            };

            const organizerIds = new Set<string>();
            const addOrganizerId = (val: any) => {
                if (val === undefined || val === null) return;
                const trimmed = String(val).trim();
                if (trimmed) organizerIds.add(trimmed);
            };
            const defaults = src.event_defaults || {};
            const metadata = src.metadata || {};
            addOrganizerId((defaults as any).organizer_id);
            addOrganizerId((defaults as any).organizerId);
            addOrganizerId((metadata as any).organizer_id);
            addOrganizerId((metadata as any).organizerId);
            organizerIds.forEach((id) => addEvents(eventsByOrganizerId[id]));

            const isHandleSource =
                (src.identifier_type || '').toLowerCase() === 'handle' ||
                src.source === 'fetlife_handle';
            const handle = isHandleSource ? normalizeHandle(src.identifier) : '';
            if (handle) addEvents(fetEventsByHandle[handle]);

            const isUrlSource =
                (src.identifier_type || '').toLowerCase() === 'url' ||
                src.source === 'eb_url' ||
                src.source === 'url' ||
                /^https?:\/\//i.test(src.identifier || '');
            if (isUrlSource && src.identifier) {
                const normalized = normalizeUrl(src.identifier);
                if (normalized) addEvents(eventsByUrl[normalized]);
            }

            const ordered = Array.from(eventMap.values()).sort((a, b) =>
                (a.start_date || '').localeCompare(b.start_date || '')
            );
            map.set(String(src.id), ordered);
        });
        return map;
    }, [eventsByOrganizerId, eventsByUrl, fetEventsByHandle, sorted]);

    const fetSourceEntries = useMemo<FetSourceEntry[]>(() => {
        const map = new Map<string, ImportSource>();
        sorted.forEach((src: ImportSource) => {
            if (src.source !== 'fetlife_handle') return;
            const handle = normalizeHandle(src.identifier);
            if (!handle) return;
            if (!map.has(handle)) map.set(handle, src);
        });
        return Array.from(map.entries()).map(([handle, source]) => {
            const handleEvents = fetEventsByHandle[handle] || [];
            const hasApprovedEvents = handleEvents.some(ev => (!ev.approval_status || ev.approval_status === 'approved'));
            const hasPendingEvents = handleEvents.some(ev => (ev.approval_status || 'approved') !== 'approved');
            return {
                handle,
                source,
                events: handleEvents,
                hasApprovedEvents,
                hasPendingEvents,
                approval_status: source.approval_status,
                message_sent: !!source.message_sent,
            };
        }).sort((a, b) => {
            if (b.events.length !== a.events.length) return b.events.length - a.events.length;
            return a.handle.localeCompare(b.handle);
        });
    }, [fetEventsByHandle, sorted]);

    const approvedFetSources = useMemo(() => fetSourceEntries.filter(entry =>
        getSourceApprovalState(entry.approval_status) !== 'pending' || entry.hasApprovedEvents
    ), [fetSourceEntries]);

    const pendingFetSources = useMemo(() => fetSourceEntries.filter(entry =>
        !(getSourceApprovalState(entry.approval_status) !== 'pending' || entry.hasApprovedEvents)
    ), [fetSourceEntries]);

    return (
        <Box p={4} sx={{ background: '#f8fafc', minHeight: '100vh' }}>
            <Typography variant="h4" gutterBottom>Import Sources</Typography>
            <Typography color="text.secondary" gutterBottom>
                Add or view sources used by scrapers (FetLife handles, Eventbrite URLs, etc.).
            </Typography>

            <Tabs value={tab} onChange={(_, val) => setTab(val)} sx={{ mb: 3 }}>
                <Tab value="sources" label="All Sources" />
                <Tab value="fet" label="Fet Sources" />
            </Tabs>

            {tab === 'sources' && (
                <>
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Stack component="form" spacing={2} onSubmit={handleSubmit}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField
                                    label="Source"
                                    select
                                    value={form.source}
                                    onChange={e => handleChange('source', e.target.value)}
                                    fullWidth
                                    required
                                >
                                    {SOURCES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                                </TextField>
                                <TextField
                                    label="Method"
                                    select
                                    value={form.method}
                                    onChange={e => handleChange('method', e.target.value)}
                                    sx={{ minWidth: 180 }}
                                >
                                    {METHODS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                                </TextField>
                            </Stack>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField
                                    label="Identifier (handle or URL)"
                                    value={form.identifier}
                                    onChange={e => handleChange('identifier', e.target.value)}
                                    fullWidth
                                    required
                                />
                                <TextField
                                    label="Identifier Type"
                                    select
                                    value={form.identifier_type}
                                    onChange={e => handleChange('identifier_type', e.target.value)}
                                    sx={{ minWidth: 180 }}
                                >
                                    {ID_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                                </TextField>
                            </Stack>
                            <Autocomplete
                                options={organizerOptions}
                                getOptionLabel={(option) => option.label}
                                value={organizerOptions.find(o => o.id === form.organizerId) || null}
                                onChange={(_, val) => handleChange('organizerId', val?.id || '')}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Map to Organizer (optional)"
                                        placeholder="Search organizers by name or handle"
                                        helperText={form.organizerId ? `Linked to organizer ID ${form.organizerId}` : 'Leave blank to auto-match from handles/URLs'}
                                    />
                                )}
                                renderOption={(props, option) => (
                                    <li {...props} key={option.id}>
                                        <Stack>
                                            <Typography variant="body2">{option.label}</Typography>
                                            {option.handles && <Typography variant="caption" color="text.secondary">{option.handles}</Typography>}
                                        </Stack>
                                    </li>
                                )}
                                fullWidth
                            />
                            <Button type="submit" variant="contained" disabled={createSource.isPending}>
                                {createSource.isPending ? 'Saving...' : 'Add Source'}
                            </Button>
                        </Stack>
                    </Paper>

                    <Paper sx={{ p: 0 }}>
                        <Box
                            sx={{
                                position: 'sticky',
                                top: SOURCES_STICKY_TOP,
                                zIndex: 2,
                                backgroundColor: '#fff',
                                borderBottom: '1px solid #e5e7eb',
                            }}
                        >
                            <Stack
                                direction="row"
                                alignItems="center"
                                spacing={2}
                                sx={{
                                    px: 2,
                                    minHeight: SOURCES_STICKY_BAR_HEIGHT,
                                    overflowX: 'auto',
                                    overflowY: 'hidden',
                                    flexWrap: 'nowrap',
                                }}
                            >
                                <Typography variant="h6" sx={{ whiteSpace: 'nowrap' }}>Existing Sources</Typography>
                                <Chip label={`${filteredSources.length}/${sources.length}`} size="small" />
                                {isSourcesLoading && <Chip label="Loading" size="small" color="warning" />}
                                <FormControlLabel
                                    label="Show suggested festivals"
                                    control={
                                        <Checkbox
                                            size="small"
                                            checked={showSuggestedFestivals}
                                            onChange={(e) => setShowSuggestedFestivals(e.target.checked)}
                                        />
                                    }
                                />
                                <Box sx={{ flex: 1, minWidth: 16 }} />
                                <TextField
                                    size="small"
                                    label="Search sources"
                                    value={sourceSearch}
                                    onChange={(e) => setSourceSearch(e.target.value)}
                                    sx={{ minWidth: 240 }}
                                />
                            </Stack>
                        </Box>
                        <Box sx={{ p: 2 }}>
                            <Table
                                size="small"
                                stickyHeader
                                sx={{ '& .MuiTableCell-stickyHeader': { top: SOURCES_TABLE_HEADER_TOP, backgroundColor: '#fff' } }}
                            >
                            <TableHead>
                                <TableRow>
                                    <TableCell>Source</TableCell>
                                    <TableCell>Method</TableCell>
                                    <TableCell>Identifier</TableCell>
                                    <TableCell>Organizer</TableCell>
                                    <TableCell align="center">Messaged</TableCell>
                                    <TableCell align="center">Approved</TableCell>
                                    <TableCell align="center">Rejected</TableCell>
                                    <TableCell align="center">Festival</TableCell>
                                    <TableCell align="center">Excluded</TableCell>
                                    <TableCell>Events</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredSources.map((src: ImportSource, index: number) => {
                                    const associatedEvents = associatedEventsBySourceId.get(String(src.id)) || [];
                                    const isExpanded = !!expandedSources[String(src.id)];
                                    const hasEvents = associatedEvents.length > 0;
                                    const isFetlifeSource = src.source === 'fetlife_handle';
                                    const hasNonNyEvents = isFetlifeSource && associatedEvents.some(ev => !!ev.non_ny);
                                    const statusFlags = getSourceStatusFlags(src);
                                    const { isRejected, isExcluded, isApproved, isFestival: isFestivalSource } = statusFlags;
                                    const shouldHighlight = showSuggestedFestivals && hasNonNyEvents;
                                    const isHandleSource =
                                        (src.identifier_type || '').toLowerCase() === 'handle' ||
                                        src.source === 'fetlife_handle';
                                    const normalizedHandle = isHandleSource ? normalizeHandle(src.identifier) : '';
                                    const fetlifeProfileUrl = normalizedHandle ? `https://fetlife.com/${normalizedHandle}` : '';
                                    const statusKey = getSourcePrimaryStatus(statusFlags);
                                    const currentSection = SOURCE_SECTION_INDEX[statusKey];
                                    const prevSection = index > 0 ? getSourceSection(filteredSources[index - 1]) : currentSection;
                                    const shouldInsertSectionHeader = index === 0 || prevSection !== currentSection;
                                    const rowSx = shouldHighlight
                                        ? {
                                            backgroundColor: SOURCE_ROW_COLORS[statusKey],
                                            backgroundImage: 'linear-gradient(0deg, rgba(255, 246, 216, 0.45), rgba(255, 246, 216, 0.45))',
                                        }
                                        : { backgroundColor: SOURCE_ROW_COLORS[statusKey] };
                                    const statusDots = getSourceStatusDots(statusFlags);
                                    return (
                                        <React.Fragment key={String(src.id)}>
                                            {shouldInsertSectionHeader && (
                                                <TableRow>
                                                    <TableCell colSpan={11} sx={{ p: 0, borderBottom: 'none' }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, px: 1.5, backgroundColor: '#f5f5f5' }}>
                                                            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                                                                {SOURCE_SECTION_LABELS[statusKey]}
                                                            </Typography>
                                                            <Box sx={{ flex: 1, height: 2, backgroundColor: '#c1c7d0' }} />
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            <TableRow sx={rowSx}>
                                                <TableCell>
                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                        <Stack direction="row" alignItems="center" spacing={0.5}>
                                                            {statusDots.map((dot) => (
                                                                <Box
                                                                    key={dot.key}
                                                                    title={dot.title}
                                                                    sx={{
                                                                        width: 10,
                                                                        height: 10,
                                                                        borderRadius: '50%',
                                                                        backgroundColor: dot.color,
                                                                    }}
                                                                />
                                                            ))}
                                                        </Stack>
                                                        <Typography variant="body2">{src.source}</Typography>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>{src.method}</TableCell>
                                                <TableCell>
                                                    {fetlifeProfileUrl ? (
                                                        <Link href={fetlifeProfileUrl} target="_blank" rel="noopener noreferrer" underline="hover">
                                                            {src.identifier || `@${normalizedHandle}`}
                                                        </Link>
                                                    ) : (
                                                        src.identifier
                                                    )}
                                                </TableCell>
                                                <TableCell sx={{ minWidth: 240 }}>
                                                    <Autocomplete<OrganizerOption, false, false, false>
                                                        options={organizerOptions}
                                                        getOptionLabel={(option) => option?.label || ''}
                                                        value={(() => {
                                                            const explicitId = (src.event_defaults as any)?.organizer_id || (src.event_defaults as any)?.organizerId;
                                                            const explicit = explicitId ? organizerOptions.find(o => o.id === String(explicitId)) : null;
                                                            if (explicit) return explicit;
                                                            const isHandle = (src.identifier_type || '').toLowerCase() === 'handle' || src.source === 'fetlife_handle';
                                                            if (isHandle) {
                                                                const norm = normalizeHandle(src.identifier);
                                                                const matchId = norm ? organizerIdByHandle[norm] : undefined;
                                                                if (matchId) return organizerOptions.find(o => o.id === matchId) || null;
                                                            }
                                                            return null;
                                                        })()}
                                                        onChange={(_, val) => handleOrganizerUpdate(src, val?.id || '')}
                                                        renderInput={(params) => (
                                                            <TextField
                                                                {...params}
                                                                size="small"
                                                                label="Organizer"
                                                                placeholder={formatOrganizerFromSources(src) || 'Select organizer'}
                                                            />
                                                        )}
                                                        renderOption={(props, option) => (
                                                            <li {...props} key={option.id}>
                                                                <Stack>
                                                                    <Typography variant="body2">{option.label}</Typography>
                                                                    {option.handles && <Typography variant="caption" color="text.secondary">{option.handles}</Typography>}
                                                                </Stack>
                                                            </li>
                                                        )}
                                                        fullWidth
                                                        disableClearable={false}
                                                        clearOnBlur
                                                        loading={updateSource.isPending}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Checkbox
                                                        size="small"
                                                        checked={!!src.message_sent}
                                                        onChange={(e) => {
                                                            void handleMessagedToggle(src, e.target.checked);
                                                        }}
                                                        disabled={markMessageSent.isPending}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Checkbox
                                                        size="small"
                                                        checked={isApproved}
                                                        onChange={(e) => {
                                                            void handleApprovalToggle(src, e.target.checked);
                                                        }}
                                                        disabled={updateSource.isPending}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Checkbox
                                                        size="small"
                                                        checked={isRejected}
                                                        onChange={(e) => {
                                                            void handleRejectedToggle(src, e.target.checked);
                                                        }}
                                                        disabled={updateSource.isPending}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    {isFetlifeSource ? (
                                                        <Checkbox
                                                            size="small"
                                                            checked={isFestivalSource}
                                                            onChange={(e) => {
                                                                void handleFestivalToggle(src, e.target.checked);
                                                            }}
                                                            disabled={updateSource.isPending}
                                                        />
                                                    ) : (
                                                        <Typography variant="body2" color="text.secondary">—</Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Checkbox
                                                        size="small"
                                                        checked={isExcluded}
                                                        onChange={(e) => {
                                                            void handleExcludedToggle(src, e.target.checked);
                                                        }}
                                                        disabled={updateSource.isPending || isRejected}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => toggleExpandedSource(String(src.id))}
                                                            disabled={!hasEvents}
                                                        >
                                                            {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                                        </IconButton>
                                                        <Typography variant="body2">{associatedEvents.length}</Typography>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color="error"
                                                        onClick={() => handleDeleteSource(src)}
                                                        disabled={deleteSource.isPending}
                                                    >
                                                        Delete
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                            <TableRow sx={rowSx}>
                                                <TableCell colSpan={11} sx={{ py: 0 }}>
                                                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                                        <Box sx={{ py: 1.5, px: 2 }}>
                                                            {hasEvents ? (
                                                                <Stack spacing={1}>
                                                                    {associatedEvents.map((ev) => {
                                                                        const { label: statusLabel, color: statusColor } = getApprovalMeta(ev.approval_status);
                                                                        const ticketHref = ev.ticket_url || ev.event_url || (ev as any)?.source_url || '';
                                                                        const nonNyLabel = ev.non_ny ? ' • Non-NY' : '';
                                                                        return (
                                                                            <Stack
                                                                                key={`${src.id}-event-${ev.id}`}
                                                                                direction="row"
                                                                                alignItems="center"
                                                                                justifyContent="space-between"
                                                                                spacing={1}
                                                                            >
                                                                                <Stack spacing={0.25}>
                                                                                    {ticketHref ? (
                                                                                        <Link href={ticketHref} target="_blank" rel="noopener noreferrer" underline="hover">
                                                                                            <Typography variant="body2" color="primary">
                                                                                                {ev.name || `Event ${ev.id}`}
                                                                                            </Typography>
                                                                                        </Link>
                                                                                    ) : (
                                                                                        <Typography variant="body2">{ev.name || `Event ${ev.id}`}</Typography>
                                                                                    )}
                                                                                    <Typography variant="caption" color="text.secondary">
                                                                                        {formatEventDate(ev)}{ev.location ? ` • ${ev.location}` : ''}{nonNyLabel}
                                                                                    </Typography>
                                                                                </Stack>
                                                                                <Chip label={statusLabel} size="small" color={statusColor} />
                                                                            </Stack>
                                                                        );
                                                                    })}
                                                                </Stack>
                                                            ) : (
                                                                <Typography color="text.secondary">No associated events found.</Typography>
                                                            )}
                                                        </Box>
                                                    </Collapse>
                                                </TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                    );
                                })}
                                {!filteredSources.length && (
                                    <TableRow>
                                        <TableCell colSpan={11} align="center">No sources yet</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                            </Table>
                        </Box>
                    </Paper>
                </>
            )}

            {tab === 'fet' && (
                <Stack spacing={2}>
                    <Paper sx={{ p: 2 }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" rowGap={1}>
                            <Stack spacing={0.5}>
                                <Typography variant="h6">Fet Sources</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Handles pulled from import sources (source=fetlife_handle). Expand to see the events tied to each handle.
                                </Typography>
                            </Stack>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Chip label={`Total ${fetSourceEntries.length}`} size="small" />
                                {(isEventsLoading || isSourcesLoading) && <CircularProgress size={18} />}
                            </Stack>
                        </Stack>
                    </Paper>

                    <Paper sx={{ p: 2 }}>
                        <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                            <Typography variant="subtitle1">Pending Approval</Typography>
                            <Chip label={`${pendingFetSources.length}`} size="small" color="warning" />
                        </Stack>
                        {isEventsLoading ? (
                            <Box display="flex" justifyContent="center" py={2}>
                                <CircularProgress size={22} />
                            </Box>
                        ) : (
                            <Stack spacing={1}>
                                {pendingFetSources.map(entry => renderFetSourceAccordion(entry, true))}
                                {!pendingFetSources.length && (
                                    <Typography color="text.secondary">No pending handles found.</Typography>
                                )}
                            </Stack>
                        )}
                    </Paper>

                    <Paper sx={{ p: 2 }}>
                        <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                            <Typography variant="subtitle1">Approved</Typography>
                            <Chip label={`${approvedFetSources.length}`} size="small" color="success" />
                        </Stack>
                        {isEventsLoading ? (
                            <Box display="flex" justifyContent="center" py={2}>
                                <CircularProgress size={22} />
                            </Box>
                        ) : (
                            <Stack spacing={1}>
                                {approvedFetSources.map(entry => renderFetSourceAccordion(entry, false))}
                                {!approvedFetSources.length && (
                                    <Typography color="text.secondary">No approved handles yet.</Typography>
                                )}
                            </Stack>
                        )}
                    </Paper>
                </Stack>
            )}
        </Box>
    );
}
