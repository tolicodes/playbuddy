import React, { useMemo, useState } from 'react';
import {
    Autocomplete,
    Box, Stack, Typography, Paper, TextField, Button, MenuItem, Chip, Divider, Table, TableHead, TableRow, TableCell, TableBody, Tab, Tabs, Accordion, AccordionSummary, AccordionDetails, Checkbox, FormControlLabel, CircularProgress, Link,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useImportSources } from '../../common/db-axios/useImportSources';
import { useCreateImportSource } from '../../common/db-axios/useCreateImportSource';
import { useUpdateImportSource } from '../../common/db-axios/useUpdateImportSource';
import { useUpdateOrganizer } from '../../common/db-axios/useUpdateOrganizer';
import { useApproveImportSource } from '../../common/db-axios/useApproveImportSource';
import { useMarkImportSourceMessageSent } from '../../common/db-axios/useMarkImportSourceMessageSent';
import { Event, ImportSource } from '../../common/types/commonTypes';
import { useFetchOrganizers } from '../../common/db-axios/useOrganizers';
import { useFetchEvents } from '../../common/db-axios/useEvents';

const METHODS = ['chrome_scraper', 'eb_scraper', 'ai_scraper'];
const SOURCES = ['fetlife_handle', 'eb_url', 'url'];
const ID_TYPES = ['handle', 'url'];

const normalizeHandle = (val?: string | null) => (val || '').replace(/^@/, '').toLowerCase().trim();
const getOrganizerFetlifeHandles = (org: any) => {
    const handles = [
        ...(org?.fetlife_handles || []),
        org?.fetlife_handle,
    ];
    const normalized = handles.map((handle) => normalizeHandle(handle)).filter(Boolean);
    return Array.from(new Set(normalized));
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
        includeApprovalPending: true,
        includeHiddenOrganizers: true,
        includeHidden: true,
        includeFacilitatorOnly: true,
    });
    const createSource = useCreateImportSource();
    const updateSource = useUpdateImportSource();
    const updateOrganizer = useUpdateOrganizer();
    const approveSource = useApproveImportSource();
    const markMessageSent = useMarkImportSourceMessageSent();
    const [tab, setTab] = useState<'sources' | 'fet'>('sources');
    const [form, setForm] = useState({
        source: '',
        method: METHODS[0],
        identifier: '',
        identifier_type: 'handle',
        organizerId: '',
    });

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

    const formatOrganizerFromSources = (src: ImportSource): string => {
        const organizerId = (src.event_defaults as any)?.organizer_id || (src.event_defaults as any)?.organizerId || (src.metadata as any)?.organizer_id || (src.metadata as any)?.organizerId;
        if (organizerId && organizerById[organizerId]) return organizerById[organizerId];

        const isHandle = (src.identifier_type || '').toLowerCase() === 'handle' || src.source === 'fetlife_handle';
        if (isHandle) {
            const norm = normalizeHandle(src.identifier);
            if (norm && organizerByHandle[norm]) return organizerByHandle[norm];
        }
        return formatOrganizer(src);
    };

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
        await markMessageSent.mutateAsync({ id: String(src.id), message_sent: checked });
    };

    const renderFetSourceAccordion = (entry: FetSourceEntry, showMessaged: boolean) => {
        const isApproved = (entry.approval_status || 'pending') === 'approved';
        const approvalColor: 'success' | 'warning' | 'default' = isApproved ? 'success' : 'warning';
        const approvalLabel = isApproved ? 'Approved' : 'Pending approval';
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
                                const statusLabel = (!ev.approval_status || ev.approval_status === 'approved') ? 'Approved' : (ev.approval_status || 'Pending');
                                const statusColor: 'default' | 'success' | 'warning' = (!ev.approval_status || ev.approval_status === 'approved') ? 'success' : 'warning';
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

    const sorted = useMemo(() => [...sources].sort((a, b) =>
        (b.created_at || '').localeCompare(a.created_at || '')
    ), [sources]);

    const formatEventDate = (ev: Event) => {
        const dateStr = ev.start_date || ev.end_date;
        if (!dateStr) return 'Date TBD';
        const date = new Date(dateStr);
        if (Number.isNaN(date.getTime())) return dateStr;
        return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    };

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
        (entry.approval_status || 'pending') === 'approved' || entry.hasApprovedEvents
    ), [fetSourceEntries]);

    const pendingFetSources = useMemo(() => fetSourceEntries.filter(entry =>
        !((entry.approval_status || 'pending') === 'approved' || entry.hasApprovedEvents)
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

                    <Paper sx={{ p: 2 }}>
                        <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                            <Typography variant="h6">Existing Sources</Typography>
                            <Chip label={`${sources.length}`} size="small" />
                            {isSourcesLoading && <Chip label="Loading" size="small" color="warning" />}
                        </Stack>
                        <Divider sx={{ mb: 2 }} />
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Source</TableCell>
                                    <TableCell>Method</TableCell>
                                    <TableCell>Identifier</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Organizer</TableCell>
                                    <TableCell>Created</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sorted.map((src: ImportSource) => (
                                    <TableRow key={`${src.source}-${src.method}-${src.identifier}`}>
                                        <TableCell>{src.source}</TableCell>
                                        <TableCell>{src.method}</TableCell>
                                        <TableCell>{src.identifier}</TableCell>
                                        <TableCell>{src.identifier_type || '—'}</TableCell>
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
                                        <TableCell>{src.created_at ? new Date(src.created_at).toLocaleString() : '—'}</TableCell>
                                    </TableRow>
                                ))}
                                {!sorted.length && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">No sources yet</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
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
