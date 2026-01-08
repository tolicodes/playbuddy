import React, { useDeferredValue, useMemo, useState } from 'react';
import {
    Box, Stack, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
    TextField, Button, Chip, Divider, Pagination, Switch
} from '@mui/material';
import { useFetchOrganizers } from '../../common/db-axios/useOrganizers';
import { useUpdateOrganizer } from '../../common/db-axios/useUpdateOrganizer';
import { Organizer } from '../../common/types/commonTypes';

export default function OrganizerManager() {
    const { data: organizers = [] } = useFetchOrganizers({ includeHidden: true });
    const updateOrganizer = useUpdateOrganizer();
    const [drafts, setDrafts] = useState<Record<number, Partial<Organizer>>>({});
    const [search, setSearch] = useState('');
    const deferredSearch = useDeferredValue(search);
    const [page, setPage] = useState(1);
    const [hideNoEvents, setHideNoEvents] = useState(true);
    const [showOnlyHidden, setShowOnlyHidden] = useState(false);
    const pageSize = 50;

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
                    fet: (org.fetlife_handle || '').toLowerCase(),
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
                    n.fet.includes(needle) ||
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

    const setDraft = (id: number, key: keyof Organizer, val: any) => {
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
            fetlife_handle: draft.fetlife_handle ?? org.fetlife_handle,
            instagram_handle: draft.instagram_handle ?? org.instagram_handle,
            hidden: draft.hidden ?? org.hidden,
        });
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
                            <TableCell>FetLife</TableCell>
                            <TableCell>Instagram</TableCell>
                            <TableCell>Aliases (comma separated)</TableCell>
                            <TableCell />
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
                                            value={draft.fetlife_handle ?? org.fetlife_handle ?? ''}
                                            onChange={e => setDraft(org.id, 'fetlife_handle', e.target.value)}
                                            size="small"
                                            fullWidth
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
                                    <TableCell width={120}>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => save(org)}
                                            disabled={updateOrganizer.isPending}
                                        >
                                            Save
                                        </Button>
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
        </Box>
    );
}
