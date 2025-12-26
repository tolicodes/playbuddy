import React, { useMemo, useState } from 'react';
import {
    Box, Stack, Typography, Paper, TextField, Button, MenuItem, Chip, Divider, Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import { useImportSources } from '../../common/db-axios/useImportSources';
import { useCreateImportSource } from '../../common/db-axios/useCreateImportSource';
import { ImportSource } from '../../common/types/commonTypes';

const METHODS = ['chrome_scraper', 'eb_scraper', 'ai_scraper'];
const SOURCES = ['fetlife_handle', 'eb_url', 'url'];
const ID_TYPES = ['handle', 'url'];

export default function ImportSourcesScreen() {
    const { data: sources = [], isLoading } = useImportSources();
    const createSource = useCreateImportSource();
    const [form, setForm] = useState({
        source: '',
        method: METHODS[0],
        identifier: '',
        identifier_type: 'handle',
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
        });
        setForm(f => ({ ...f, identifier: '' }));
    };

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
