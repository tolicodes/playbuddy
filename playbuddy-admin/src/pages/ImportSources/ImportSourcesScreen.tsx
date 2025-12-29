import React, { useMemo, useState } from 'react';
import {
    Autocomplete,
    Box, Stack, Typography, Paper, TextField, Button, MenuItem, Chip, Divider, Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import { useImportSources } from '../../common/db-axios/useImportSources';
import { useCreateImportSource } from '../../common/db-axios/useCreateImportSource';
import { ImportSource } from '../../common/types/commonTypes';
import { useFetchOrganizers } from '../../common/db-axios/useOrganizers';

const METHODS = ['chrome_scraper', 'eb_scraper', 'ai_scraper'];
const SOURCES = ['fetlife_handle', 'eb_url', 'url'];
const ID_TYPES = ['handle', 'url'];

const normalizeHandle = (val?: string | null) => (val || '').replace(/^@/, '').toLowerCase().trim();

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
    const { data: sources = [], isLoading } = useImportSources();
    const { data: organizers = [] } = useFetchOrganizers({ includeHidden: true });
    const createSource = useCreateImportSource();
    const [form, setForm] = useState({
        source: '',
        method: METHODS[0],
        identifier: '',
        identifier_type: 'handle',
        organizerId: '',
    });

    const handleChange = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.source || !form.identifier) return;
        await createSource.mutateAsync({
            source: form.source,
            method: form.method,
            identifier: form.identifier,
            identifier_type: form.identifier_type,
            event_defaults: form.organizerId ? { organizer_id: form.organizerId } : undefined,
        });
        setForm(f => ({ ...f, identifier: '' }));
    };

    const organizerByHandle = useMemo(() => {
        const map: Record<string, string> = {};
        organizers.forEach((org: any) => {
            if (!org?.name) return;
            [org.fetlife_handle, org.instagram_handle].forEach((h: string | null | undefined) => {
                const norm = normalizeHandle(h);
                if (norm && !map[norm]) map[norm] = org.name;
            });
        });
        return map;
    }, [organizers]);

    const organizerById = useMemo(() => {
        const map: Record<string, string> = {};
        organizers.forEach((org: any) => {
            if (!org?.id) return;
            map[String(org.id)] = org.name || org.fetlife_handle || org.instagram_handle || `Organizer ${org.id}`;
        });
        return map;
    }, [organizers]);

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

    const organizerOptions = useMemo(() => {
        return organizers.map((org: any) => ({
            id: String(org.id),
            label: org.name || org.fetlife_handle || org.instagram_handle || `Organizer ${org.id}`,
            handles: [org.fetlife_handle, org.instagram_handle].filter(Boolean).join(' • '),
        }));
    }, [organizers]);

    const sorted = useMemo(() => [...sources].sort((a, b) =>
        (b.created_at || '').localeCompare(a.created_at || '')
    ), [sources]);

    return (
        <Box p={4} sx={{ background: '#f8fafc', minHeight: '100vh' }}>
            <Typography variant="h4" gutterBottom>Import Sources</Typography>
            <Typography color="text.secondary" gutterBottom>
                Add or view sources used by scrapers (FetLife handles, Eventbrite URLs, etc.).
            </Typography>

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
                    {isLoading && <Chip label="Loading" size="small" color="warning" />}
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
                                <TableCell>{formatOrganizerFromSources(src) || '—'}</TableCell>
                                <TableCell>{src.created_at ? new Date(src.created_at).toLocaleString() : '—'}</TableCell>
                            </TableRow>
                        ))}
                        {!sorted.length && (
                            <TableRow>
                                <TableCell colSpan={5} align="center">No sources yet</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Paper>
        </Box>
    );
}
