import React, { useDeferredValue, useMemo, useState } from 'react';
import {
    Box,
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
    Pagination,
    Switch,
    Autocomplete,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import { useFetchOrganizers } from '../../common/db-axios/useOrganizers';
import { useMergeOrganizer } from '../../common/db-axios/useMergeOrganizer';
import { useUpdateOrganizer } from '../../common/db-axios/useUpdateOrganizer';
import { Organizer } from '../../common/types/commonTypes';

type OrganizerDraft = Partial<Organizer> & { fetlife_handles?: string | string[] | null };
type OrganizerOption = { id: number; label: string; handles?: string };

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
const formatFetlifeHandlesValue = (draftValue: OrganizerDraft['fetlife_handles'], org: Organizer) => {
    if (draftValue === undefined) {
        return collectFetlifeHandles(org).join(', ');
    }
    if (typeof draftValue === 'string') return draftValue;
    return (draftValue || []).join(', ');
};
const parseFetlifeHandlesValue = (draftValue: OrganizerDraft['fetlife_handles'], org: Organizer) => {
    if (draftValue === undefined) return collectFetlifeHandles(org);
    if (typeof draftValue === 'string') {
        return draftValue
            .split(/[,\n]/)
            .map((handle) => normalizeHandle(handle))
            .filter(Boolean);
    }
    return (draftValue || []).map((handle) => normalizeHandle(handle)).filter(Boolean);
};

export default function OrganizerManager() {
    const { data: organizers = [] } = useFetchOrganizers({ includeHidden: true });
    const updateOrganizer = useUpdateOrganizer();
    const mergeOrganizer = useMergeOrganizer();
    const [drafts, setDrafts] = useState<Record<number, OrganizerDraft>>({});
    const [search, setSearch] = useState('');
    const deferredSearch = useDeferredValue(search);
    const [page, setPage] = useState(1);
    const [hideNoEvents, setHideNoEvents] = useState(true);
    const [showOnlyHidden, setShowOnlyHidden] = useState(false);
    const [mergeSource, setMergeSource] = useState<Organizer | null>(null);
    const [mergeTarget, setMergeTarget] = useState<OrganizerOption | null>(null);
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

    const setDraft = (id: number, key: keyof OrganizerDraft, val: any) => {
        setDrafts(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [key]: val } }));
    };

    const toggleHidden = async (org: Organizer, nextHidden: boolean) => {
        const prevHidden = (drafts[org.id]?.hidden ?? org.hidden) ?? false;
        setDraft(org.id, 'hidden', nextHidden);
        try {
            await updateOrganizer.mutateAsync({ id: org.id, hidden: nextHidden });
        } catch {
            setDraft(org.id, 'hidden', prevHidden);
        }
    };

    const save = async (org: Organizer) => {
        const draft = drafts[org.id] || {};
        await updateOrganizer.mutateAsync({
            id: org.id,
            name: draft.name ?? org.name,
            url: draft.url ?? org.url,
            aliases: typeof draft.aliases === 'string'
                ? (draft.aliases as any).split(',').map((s: string) => s.trim()).filter(Boolean)
                : draft.aliases ?? org.aliases,
            fetlife_handles: parseFetlifeHandlesValue(draft.fetlife_handles, org),
            instagram_handle: draft.instagram_handle ?? org.instagram_handle,
            hidden: draft.hidden ?? org.hidden,
        });
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
                            <TableCell>URL</TableCell>
                            <TableCell>FetLife handles (comma separated)</TableCell>
                            <TableCell>Instagram</TableCell>
                            <TableCell>Aliases (comma separated)</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paged.map((org) => {
                            const draft = drafts[org.id] || {};
                            const aliasString = draft.aliases !== undefined
                                ? (typeof draft.aliases === 'string' ? draft.aliases : (draft.aliases || []).join(', '))
                                : (org.aliases || []).join(', ');
                            const isHidden = (draft.hidden ?? org.hidden) ?? false;
                            return (
                                <TableRow key={org.id} hover>
                                    <TableCell sx={{ minWidth: 180 }}>
                                        <TextField
                                            value={draft.name ?? org.name ?? ''}
                                            onChange={e => setDraft(org.id, 'name', e.target.value)}
                                            size="small"
                                            fullWidth
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={(org as any)._futureCount ?? 0}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={isHidden}
                                            onChange={(e) => toggleHidden(org, e.target.checked)}
                                            color="warning"
                                            inputProps={{ 'aria-label': 'Toggle hidden organizer' }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ minWidth: 200 }}>
                                        <TextField
                                            value={draft.url ?? org.url ?? ''}
                                            onChange={e => setDraft(org.id, 'url', e.target.value)}
                                            size="small"
                                            fullWidth
                                        />
                                    </TableCell>
                                    <TableCell sx={{ minWidth: 140 }}>
                                        <TextField
                                            value={formatFetlifeHandlesValue(draft.fetlife_handles, org)}
                                            onChange={e => setDraft(org.id, 'fetlife_handles', e.target.value)}
                                            size="small"
                                            fullWidth
                                            placeholder="@handle1, @handle2"
                                        />
                                    </TableCell>
                                    <TableCell sx={{ minWidth: 140 }}>
                                        <TextField
                                            value={draft.instagram_handle ?? org.instagram_handle ?? ''}
                                            onChange={e => setDraft(org.id, 'instagram_handle', e.target.value)}
                                            size="small"
                                            fullWidth
                                        />
                                    </TableCell>
                                    <TableCell sx={{ minWidth: 220 }}>
                                        <TextField
                                            value={aliasString}
                                            onChange={e => setDraft(org.id, 'aliases', e.target.value)}
                                            size="small"
                                            fullWidth
                                            placeholder="alias1, alias2"
                                        />
                                    </TableCell>
                                    <TableCell width={180}>
                                        <Stack direction="row" spacing={1}>
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={() => save(org)}
                                                disabled={updateOrganizer.isPending}
                                            >
                                                Save
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
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {!filtered.length && (
                            <TableRow><TableCell colSpan={6} align="center">No organizers</TableCell></TableRow>
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
        </Box>
    );
}
