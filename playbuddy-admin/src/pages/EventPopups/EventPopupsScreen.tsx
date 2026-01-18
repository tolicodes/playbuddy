import React, { useMemo, useState } from 'react';
import {
    Paper,
    Box,
    Typography,
    Button,
    TextField,
    Switch,
    FormControlLabel,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Chip,
    CircularProgress,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { useFetchEvents } from '../../common/db-axios/useEvents';
import {
    useCreateEventPopup,
    useFetchEventPopups,
    useResendEventPopup,
    useUpdateEventPopup,
} from '../../common/db-axios/useEventPopups';
import type { Event, EventPopup } from '../../common/types/commonTypes';

const formatDateTime = (value?: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const formatEventLabel = (event: Event) => {
    const date = event.start_date ? new Date(event.start_date) : null;
    const dateLabel = date && !Number.isNaN(date.getTime())
        ? date.toLocaleDateString()
        : '';
    return `${event.name}${dateLabel ? ` • ${dateLabel}` : ''}`;
};

const statusTone: Record<string, 'default' | 'success' | 'warning'> = {
    draft: 'default',
    published: 'success',
    stopped: 'warning',
};

export default function EventPopupsScreen() {
    const { data: events = [], isLoading: loadingEvents } = useFetchEvents({
        includeHidden: true,
        includeHiddenOrganizers: true,
        includeApprovalPending: true,
    });
    const { data: popups = [], isLoading: loadingPopups, error: popupsError } = useFetchEventPopups();

    const createPopup = useCreateEventPopup();
    const resendPopup = useResendEventPopup();
    const updatePopup = useUpdateEventPopup();

    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [title, setTitle] = useState('');
    const [bodyMarkdown, setBodyMarkdown] = useState('');
    const [publishNow, setPublishNow] = useState(true);
    const [publishAt, setPublishAt] = useState('');
    const [expiresAt, setExpiresAt] = useState('');

    const sortedPopups = useMemo(() => {
        return [...popups].sort((a, b) => {
            const left = a.published_at || a.created_at || '';
            const right = b.published_at || b.created_at || '';
            return right.localeCompare(left);
        });
    }, [popups]);

    const isSubmitting = createPopup.isPending;

    const parseDateInput = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return { value: null as string | null, error: false };
        const parsed = new Date(trimmed);
        if (Number.isNaN(parsed.getTime())) return { value: null as string | null, error: true };
        return { value: parsed.toISOString(), error: false };
    };

    const handleCreate = async () => {
        const publishedAtInput = parseDateInput(publishAt);
        const expiresAtInput = parseDateInput(expiresAt);
        if (publishedAtInput.error) {
            alert('Publish at must be a valid date.');
            return;
        }
        if (expiresAtInput.error) {
            alert('Expires at must be a valid date.');
            return;
        }
        await createPopup.mutateAsync({
            event_id: selectedEvent?.id,
            title: title.trim(),
            body_markdown: bodyMarkdown.trim(),
            status: publishNow ? 'published' : 'draft',
            published_at: publishNow ? publishedAtInput.value : undefined,
            expires_at: expiresAtInput.value,
        });
        setTitle('');
        setBodyMarkdown('');
        setSelectedEvent(null);
        setPublishNow(true);
        setPublishAt('');
        setExpiresAt('');
    };

    const handleUpdateStatus = async (popup: EventPopup, status: 'published' | 'stopped' | 'draft') => {
        await updatePopup.mutateAsync({ id: popup.id, status });
    };

    const handleResendPopup = async (popup: EventPopup) => {
        const confirmed = window.confirm('Re-send this popup to all devices?');
        if (!confirmed) return;
        try {
            await resendPopup.mutateAsync({ id: popup.id });
        } catch {
            alert('Unable to resend this popup.');
        }
    };

    const canSubmit = title.trim().length > 0 && bodyMarkdown.trim().length > 0;

    return (
        <Paper sx={{ p: 4, maxWidth: 1100, mx: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="h4">Message Popups</Typography>
            </Box>

            <Box sx={{ mb: 4, display: 'grid', gap: 2 }}>
                <Typography variant="h6">Create a popup</Typography>
                <Autocomplete
                    options={events}
                    getOptionLabel={formatEventLabel}
                    value={selectedEvent}
                    loading={loadingEvents}
                    onChange={(_, value) => setSelectedEvent(value)}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Event (optional)"
                            placeholder="Search events"
                        />
                    )}
                />
                <TextField
                    label="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Popup headline"
                />
                <TextField
                    label="Body (Markdown)"
                    value={bodyMarkdown}
                    onChange={(e) => setBodyMarkdown(e.target.value)}
                    placeholder="Write the message in markdown"
                    multiline
                    minRows={4}
                />
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <TextField
                        label="Publish at (optional)"
                        type="datetime-local"
                        InputLabelProps={{ shrink: true }}
                        value={publishAt}
                        onChange={(e) => setPublishAt(e.target.value)}
                        sx={{ minWidth: 240 }}
                    />
                    <TextField
                        label="Expires at (optional)"
                        type="datetime-local"
                        InputLabelProps={{ shrink: true }}
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                        sx={{ minWidth: 240 }}
                    />
                </Box>
                <FormControlLabel
                    control={(
                        <Switch
                            checked={publishNow}
                            onChange={(e) => setPublishNow(e.target.checked)}
                        />
                    )}
                    label={publishNow ? 'Publish immediately' : 'Save as draft'}
                />
                <Box>
                    <Button
                        variant="contained"
                        onClick={handleCreate}
                        disabled={!canSubmit || isSubmitting}
                    >
                        {isSubmitting ? 'Saving…' : 'Create popup'}
                    </Button>
                </Box>
            </Box>

            <Typography variant="h6" sx={{ mb: 2 }}>Past popups</Typography>
            {loadingPopups ? (
                <CircularProgress />
            ) : popupsError ? (
                <Typography color="error">Failed to load popups.</Typography>
            ) : (
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Status</TableCell>
                        <TableCell>Event</TableCell>
                        <TableCell>Title</TableCell>
                        <TableCell>Published</TableCell>
                        <TableCell>Expires</TableCell>
                        <TableCell>Stopped</TableCell>
                        <TableCell>Actions</TableCell>
                    </TableRow>
                </TableHead>
                    <TableBody>
                        {sortedPopups.map((popup) => (
                            <TableRow key={popup.id}>
                                <TableCell>
                                    <Chip
                                        label={popup.status}
                                        color={statusTone[popup.status] ?? 'default'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>{popup.event?.name ?? (popup.event_id ? `Event #${popup.event_id}` : 'Message only')}</TableCell>
                                <TableCell>{popup.title}</TableCell>
                                <TableCell>{formatDateTime(popup.published_at)}</TableCell>
                                <TableCell>{formatDateTime(popup.expires_at)}</TableCell>
                                <TableCell>{formatDateTime(popup.stopped_at)}</TableCell>
                                <TableCell sx={{ display: 'flex', gap: 1 }}>
                                    {popup.status === 'draft' && (
                                        <Button
                                            size="small"
                                            variant="contained"
                                            onClick={() => handleUpdateStatus(popup, 'published')}
                                            disabled={updatePopup.isPending}
                                        >
                                            Publish
                                        </Button>
                                    )}
                                    {(popup.status === 'published' || popup.status === 'stopped') && (
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => handleResendPopup(popup)}
                                            disabled={resendPopup.isPending}
                                        >
                                            Re-send
                                        </Button>
                                    )}
                                    {popup.status === 'published' && (
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="warning"
                                            onClick={() => handleUpdateStatus(popup, 'stopped')}
                                            disabled={updatePopup.isPending}
                                        >
                                            Stop
                                        </Button>
                                    )}
                                    {popup.status === 'stopped' && (
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => handleUpdateStatus(popup, 'published')}
                                            disabled={updatePopup.isPending}
                                        >
                                            Republish
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </Paper>
    );
}
