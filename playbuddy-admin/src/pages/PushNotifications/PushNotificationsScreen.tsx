import React, { useMemo, useState } from 'react';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import moment from 'moment-timezone';
import type { Event, PushNotification, PushNotificationStatus } from '../../common/types/commonTypes';
import { useFetchEvents } from '../../common/db-axios/useEvents';
import {
    useCreatePushNotification,
    useFetchPushNotifications,
    useFlushPushNotifications,
    useSendPushNotification,
    useUpdatePushNotification,
} from '../../common/db-axios/usePushNotifications';

type SendMode = 'now' | 'scheduled' | 'draft';

const statusTone: Record<PushNotificationStatus, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
    draft: 'default',
    scheduled: 'info',
    sending: 'info',
    sent: 'success',
    failed: 'error',
    canceled: 'warning',
};

const formatDateTime = (value?: string | null) => {
    if (!value) return '--';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const formatInputDateTime = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (input: number) => String(input).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const parseInputDateTime = (value: string) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const NOTIFICATION_TZ = 'America/New_York';

const getPromoLabel = (event: Event) => {
    const promoCode =
        event.promo_codes?.find((code) => code.scope === 'event') ||
        event.organizer?.promo_codes?.find((code) => code.scope === 'organizer') ||
        event.promo_codes?.[0] ||
        event.organizer?.promo_codes?.[0];
    if (!promoCode) return null;
    if (promoCode.discount_type === 'percent') {
        return `${promoCode.discount}% off`;
    }
    return `$${promoCode.discount} off`;
};

const buildPushPreview = (event: Event) => {
    const start = moment(event.start_date).tz(NOTIFICATION_TZ);
    const dateLabel = start.isValid() ? start.format('ddd M/D') : 'Upcoming';
    const organizerName = event.organizer?.name?.trim() || 'Organizer';
    const promoLabel = getPromoLabel(event);
    const title = promoLabel
        ? `${dateLabel} ${organizerName} - ${promoLabel}`
        : `${dateLabel} ${organizerName}`;
    return {
        title,
        body: event.name,
        imageUrl: event.image_url?.trim() || null,
    };
};

const formatEventLabel = (event: Event) => {
    const dateLabel = event.start_date
        ? new Date(event.start_date).toLocaleDateString()
        : '';
    const organizerName = event.organizer?.name?.trim() || '';
    const meta = [organizerName, dateLabel].filter(Boolean).join(' · ');
    return `${event.name}${meta ? ` — ${meta}` : ''}`;
};

const formatBodyPreview = (value: string, maxLength = 60) => {
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength)}...`;
};

export default function PushNotificationsScreen() {
    const { data: notifications = [], isLoading, error } = useFetchPushNotifications();
    const { data: events = [], isLoading: loadingEvents } = useFetchEvents({
        includeHidden: true,
        includeHiddenOrganizers: true,
        includeApprovalPending: true,
    });
    const createNotification = useCreatePushNotification();
    const updateNotification = useUpdatePushNotification();
    const sendNotification = useSendPushNotification();
    const flushScheduled = useFlushPushNotifications();

    const [editing, setEditing] = useState<PushNotification | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [sendMode, setSendMode] = useState<SendMode>('now');
    const [sendAt, setSendAt] = useState('');

    const eventMap = useMemo(() => {
        return new Map(events.map((event) => [event.id, event]));
    }, [events]);

    const selectedEventValue = selectedEvent ?? (selectedEventId ? eventMap.get(selectedEventId) ?? null : null);

    const sortedNotifications = useMemo(() => {
        return [...notifications].sort((a, b) => {
            const left = a.send_at || a.created_at || '';
            const right = b.send_at || b.created_at || '';
            return right.localeCompare(left);
        });
    }, [notifications]);

    const resetForm = () => {
        setEditing(null);
        setSelectedEvent(null);
        setSelectedEventId(null);
        setTitle('');
        setBody('');
        setImageUrl('');
        setSendMode('now');
        setSendAt('');
    };

    const handleEdit = (notification: PushNotification) => {
        const matchedEvent = notification.event_id ? eventMap.get(notification.event_id) ?? null : null;
        setEditing(notification);
        setSelectedEvent(matchedEvent);
        setSelectedEventId(notification.event_id ?? null);
        setTitle(notification.title);
        setBody(notification.body);
        setImageUrl(notification.image_url ?? '');
        if (notification.status === 'draft') {
            setSendMode('draft');
        } else if (notification.status === 'scheduled') {
            setSendMode('scheduled');
        } else {
            setSendMode('now');
        }
        setSendAt(formatInputDateTime(notification.send_at));
    };

    const handleSelectEvent = (event: Event | null) => {
        setSelectedEvent(event);
        setSelectedEventId(event?.id ?? null);
        if (event) {
            const preview = buildPushPreview(event);
            setTitle(preview.title);
            setBody(preview.body);
            setImageUrl(preview.imageUrl ?? '');
        }
    };

    const handleSubmit = async () => {
        const trimmedTitle = title.trim();
        const trimmedBody = body.trim();
        const trimmedImage = imageUrl.trim();
        if (!trimmedTitle || !trimmedBody) return;

        const payload = {
            title: trimmedTitle,
            body: trimmedBody,
            image_url: trimmedImage ? trimmedImage : null,
            event_id: selectedEventId,
        };

        if (editing) {
            const updates: Record<string, any> = { ...payload };
            if (sendMode === 'draft') {
                updates.status = 'draft';
                updates.send_at = null;
            } else if (sendMode === 'scheduled') {
                const sendAtIso = parseInputDateTime(sendAt);
                if (!sendAtIso) return;
                updates.status = 'scheduled';
                updates.send_at = sendAtIso;
            }
            const updated = await updateNotification.mutateAsync({ id: editing.id, ...updates });
            if (sendMode === 'now') {
                await sendNotification.mutateAsync({ id: updated.id });
            }
            resetForm();
            return;
        }

        if (sendMode === 'now') {
            const created = await createNotification.mutateAsync({
                ...payload,
                status: 'scheduled',
                send_at: new Date().toISOString(),
            });
            await sendNotification.mutateAsync({ id: created.id });
            resetForm();
            return;
        }

        if (sendMode === 'scheduled') {
            const sendAtIso = parseInputDateTime(sendAt);
            if (!sendAtIso) return;
            await createNotification.mutateAsync({
                ...payload,
                status: 'scheduled',
                send_at: sendAtIso,
            });
            resetForm();
            return;
        }

        await createNotification.mutateAsync({
            ...payload,
            status: 'draft',
        });
        resetForm();
    };

    const handleSendNow = async (notification: PushNotification) => {
        await sendNotification.mutateAsync({ id: notification.id });
    };

    const handleCancel = async (notification: PushNotification) => {
        await updateNotification.mutateAsync({ id: notification.id, status: 'canceled' });
    };

    const handleFlush = async () => {
        await flushScheduled.mutateAsync();
    };

    const canSubmit = (() => {
        if (!title.trim() || !body.trim()) return false;
        if (sendMode === 'scheduled') {
            return !!parseInputDateTime(sendAt);
        }
        return true;
    })();

    const isSubmitting =
        createNotification.isPending || updateNotification.isPending || sendNotification.isPending;

    return (
        <Paper sx={{ p: 4, maxWidth: 1100, mx: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="h4">Push Notifications</Typography>
                <Button
                    variant="outlined"
                    onClick={handleFlush}
                    disabled={flushScheduled.isPending}
                >
                    {flushScheduled.isPending ? 'Flushing...' : 'Flush scheduled'}
                </Button>
            </Box>

            <Box sx={{ mb: 4, display: 'grid', gap: 2 }}>
                <Typography variant="h6">
                    {editing ? 'Edit notification' : 'Create notification'}
                </Typography>
                <Autocomplete
                    options={events}
                    loading={loadingEvents}
                    value={selectedEventValue}
                    onChange={(_event, value) => handleSelectEvent(value)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    getOptionLabel={(option) => formatEventLabel(option)}
                    renderOption={(props, option) => (
                        <Box component="li" {...props} key={option.id}>
                            <Typography variant="body2">{formatEventLabel(option)}</Typography>
                        </Box>
                    )}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Attach event (optional)"
                            placeholder="Search events"
                            helperText="Selecting an event auto-fills the title, body, and image."
                            InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                    <>
                                        {loadingEvents ? (
                                            <CircularProgress color="inherit" size={18} />
                                        ) : null}
                                        {params.InputProps.endAdornment}
                                    </>
                                ),
                            }}
                        />
                    )}
                />
                <TextField
                    label="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title"
                />
                <TextField
                    label="Body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Description"
                    multiline
                    minRows={3}
                />
                <TextField
                    label="Image URL"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                />
                <FormControl>
                    <InputLabel id="push-send-mode">Send mode</InputLabel>
                    <Select
                        labelId="push-send-mode"
                        label="Send mode"
                        value={sendMode}
                        onChange={(e) => setSendMode(e.target.value as SendMode)}
                    >
                        <MenuItem value="now">Send now</MenuItem>
                        <MenuItem value="scheduled">Schedule</MenuItem>
                        <MenuItem value="draft">Draft</MenuItem>
                    </Select>
                </FormControl>
                {sendMode === 'scheduled' && (
                    <TextField
                        label="Send at"
                        type="datetime-local"
                        value={sendAt}
                        onChange={(e) => setSendAt(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                    />
                )}
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={!canSubmit || isSubmitting}
                    >
                        {isSubmitting ? 'Saving...' : editing ? 'Save notification' : 'Create notification'}
                    </Button>
                    {editing && (
                        <Button variant="outlined" onClick={resetForm} disabled={isSubmitting}>
                            Cancel edit
                        </Button>
                    )}
                </Box>
            </Box>

            <Typography variant="h6" sx={{ mb: 2 }}>Recent notifications</Typography>
            {isLoading ? (
                <CircularProgress />
            ) : error ? (
                <Typography color="error">Failed to load notifications.</Typography>
            ) : (
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Status</TableCell>
                            <TableCell>Title</TableCell>
                            <TableCell>Body</TableCell>
                            <TableCell>Event</TableCell>
                            <TableCell>Send at</TableCell>
                            <TableCell>Sent at</TableCell>
                            <TableCell>Sent / Failed</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedNotifications.map((notification) => {
                            const linkedEvent = notification.event_id
                                ? eventMap.get(notification.event_id) ?? null
                                : null;
                            return (
                                <TableRow key={notification.id}>
                                    <TableCell>
                                        <Chip
                                            label={notification.status}
                                            color={statusTone[notification.status] ?? 'default'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>{notification.title}</TableCell>
                                    <TableCell>{formatBodyPreview(notification.body)}</TableCell>
                                    <TableCell>
                                        {notification.event_id
                                            ? linkedEvent
                                                ? formatEventLabel(linkedEvent)
                                                : `#${notification.event_id}`
                                            : '--'}
                                    </TableCell>
                                    <TableCell>{formatDateTime(notification.send_at)}</TableCell>
                                    <TableCell>{formatDateTime(notification.sent_at)}</TableCell>
                                    <TableCell>
                                        {(notification.sent_count ?? 0)} / {(notification.failed_count ?? 0)}
                                    </TableCell>
                                    <TableCell sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        {(notification.status === 'draft' ||
                                            notification.status === 'scheduled' ||
                                            notification.status === 'failed') && (
                                            <Button
                                                size="small"
                                                variant="contained"
                                                onClick={() => handleSendNow(notification)}
                                                disabled={sendNotification.isPending}
                                            >
                                                Send now
                                            </Button>
                                        )}
                                        {(notification.status === 'scheduled' ||
                                            notification.status === 'draft' ||
                                            notification.status === 'failed') && (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={() => handleEdit(notification)}
                                                disabled={isSubmitting}
                                            >
                                                Edit
                                            </Button>
                                        )}
                                        {notification.status === 'scheduled' && (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="warning"
                                                onClick={() => handleCancel(notification)}
                                                disabled={updateNotification.isPending}
                                            >
                                                Cancel
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            )}
        </Paper>
    );
}
