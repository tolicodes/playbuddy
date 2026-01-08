import { Fragment, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
    FormControlLabel,
    Switch,
} from '@mui/material';
import { Edit } from '@mui/icons-material';
import { useFetchEvents } from '../../common/db-axios/useEvents';
import { useFetchOrganizers } from '../../common/db-axios/useOrganizers';
import EventEditorForm from './EventEditorForm';
import type { Event } from '../../common/types/commonTypes';

export default function EventsListScreen() {
    const navigate = useNavigate();
    const { data: events = [], isLoading: loadingEvents, error: errorEvents } = useFetchEvents({
        includeFacilitatorOnly: true,
    });
    const { data: organizers = [], isLoading: loadingOrganizers } = useFetchOrganizers();

    const [search, setSearch] = useState('');
    const [selectedOrganizerId, setSelectedOrganizerId] = useState<string | null>(null);
    const [showAllEvents, setShowAllEvents] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const filteredOrganizers = organizers?.filter((org) =>
        org.name.toLowerCase().includes(search.toLowerCase())
    );

    const filteredEvents = showAllEvents
        ? events
        : selectedOrganizerId
            ? events.filter((e) => e.organizer?.id + '' === selectedOrganizerId)
            : [];

    const formatEventDate = (start: string, end: string) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) return '';
        const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
        const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
        const sameDay = startDate.toDateString() === endDate.toDateString();

        if (sameDay) {
            return `${startDate.toLocaleDateString(undefined, dateOptions)} ${startDate.toLocaleTimeString(undefined, timeOptions)}–${endDate.toLocaleTimeString(undefined, timeOptions)}`;
        }

        const startStr = startDate.toLocaleString(undefined, { ...dateOptions, ...timeOptions });
        const endStr = endDate.toLocaleString(undefined, { ...dateOptions, ...timeOptions });
        return `${startStr} – ${endStr}`;
    };

    const formatGroupDate = (value: string) => {
        const date = new Date(value);
        if (!Number.isFinite(date.getTime())) return 'Unknown date';
        return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    };

    const toTimestamp = (value: string) => {
        const time = new Date(value).getTime();
        return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
    };

    const groupedEvents = filteredEvents
        .slice()
        .sort((a, b) => toTimestamp(a.start_date) - toTimestamp(b.start_date))
        .reduce((groups, event) => {
            const date = new Date(event.start_date);
            const key = Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : 'unknown';
            const label = formatGroupDate(event.start_date);
            const lastGroup = groups[groups.length - 1];
            if (!lastGroup || lastGroup.key !== key) {
                groups.push({ key, label, events: [event] });
            } else {
                lastGroup.events.push(event);
            }
            return groups;
        }, [] as { key: string; label: string; events: Event[] }[]);

    if (loadingEvents || loadingOrganizers) return <CircularProgress />;
    if (errorEvents) return <Typography color="error">Failed to load events</Typography>;

    return (
        <Paper sx={{ p: 4, maxWidth: 1000, mx: 'auto' }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4">Events</Typography>

                <Button
                    variant="contained"
                    onClick={() => navigate('/events/new')}
                >
                    Add Event
                </Button>

                <Button
                    variant="contained"
                    onClick={() => navigate('/events/import-csv')}
                >
                    Import from CSV
                </Button>

                <Button
                    variant="contained"
                    onClick={() => navigate('/events/import-urls')}
                >
                    Import from URLs
                </Button>

                <TextField
                    fullWidth
                    label="Search Organizer"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setSelectedOrganizerId(null);
                    }}
                    sx={{ mt: 2 }}
                    disabled={showAllEvents}
                />

                <FormControlLabel
                    sx={{ mt: 2 }}
                    control={
                        <Switch
                            checked={showAllEvents}
                            onChange={(e) => {
                                setShowAllEvents(e.target.checked);
                                if (e.target.checked) setSelectedOrganizerId(null);
                            }}
                        />
                    }
                    label="Show all events"
                />

                {!showAllEvents && search && !selectedOrganizerId && (
                    <Box sx={{ mt: 1, border: '1px solid #ccc', borderRadius: 2, maxHeight: 200, overflowY: 'auto' }}>
                        {filteredOrganizers.map((org) => (
                            <Box
                                key={org.id}
                                sx={{
                                    p: 1,
                                    cursor: 'pointer',
                                    '&:hover': { backgroundColor: '#f0f0f0' },
                                }}
                                onClick={() => {
                                    setSelectedOrganizerId(org.id + '');
                                    setSearch(org.name);
                                }}
                            >
                                {org.name}
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>

            {(showAllEvents || selectedOrganizerId) && (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6">
                            {showAllEvents ? 'Showing all events' : `Showing events for: ${search}`}
                        </Typography>
                        <Button variant="contained" onClick={() => navigate('/events/new')}>
                            Add Event
                        </Button>
                    </Box>

                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Image</TableCell>
                                <TableCell>Title</TableCell>
                                <TableCell>Organizer</TableCell>
                                <TableCell>Edit</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {groupedEvents.map((group) => (
                                <Fragment key={group.key}>
                                    <TableRow>
                                        <TableCell
                                            colSpan={5}
                                            sx={{
                                                backgroundColor: '#f8fafc',
                                                fontWeight: 600,
                                                borderBottom: '1px solid #e5e7eb',
                                            }}
                                        >
                                            {group.label}
                                        </TableCell>
                                    </TableRow>
                                    {group.events.map((event) => (
                                        <TableRow key={event.id}>
                                            <TableCell>{formatEventDate(event.start_date, event.end_date)}</TableCell>
                                            <TableCell>
                                                {event.image_url ? (
                                                    <Box
                                                        component="img"
                                                        src={event.image_url}
                                                        alt={event.name}
                                                        sx={{
                                                            width: 56,
                                                            height: 56,
                                                            borderRadius: 1,
                                                            objectFit: 'cover',
                                                            border: '1px solid #e5e7eb',
                                                        }}
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <Box
                                                        sx={{
                                                            width: 56,
                                                            height: 56,
                                                            borderRadius: 1,
                                                            border: '1px solid #e5e7eb',
                                                            backgroundColor: '#f8fafc',
                                                        }}
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell>{event.name}</TableCell>
                                            <TableCell>{event.organizer?.name || '—'}</TableCell>
                                            <TableCell>
                                                <IconButton onClick={() => setEditingEvent(event)}>
                                                    <Edit />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </>
            )}

            <Dialog
                open={!!editingEvent}
                onClose={() => setEditingEvent(null)}
                fullWidth
                maxWidth="md"
            >
                <DialogTitle>Edit Event</DialogTitle>
                <DialogContent dividers>
                    {editingEvent && (
                        <EventEditorForm
                            event={editingEvent}
                            mode="edit"
                            submitLabel="Save changes"
                            showCancel
                            onCancel={() => setEditingEvent(null)}
                            onSaved={() => setEditingEvent(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </Paper>
    );
}
