import { useState } from 'react';
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
import EventsTable from './EventsTable';

export default function EventsListScreen() {
    const navigate = useNavigate();
    const { data: events = [], isLoading: loadingEvents, error: errorEvents } = useFetchEvents({
        includeFacilitatorOnly: true,
    });
    const { data: organizers = [], isLoading: loadingOrganizers, error: errorOrganizers } = useFetchOrganizers();

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

    if (loadingEvents) return <CircularProgress />;
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

                <Button
                    variant="outlined"
                    onClick={() => navigate('/events/duplicates')}
                >
                    Find Duplicates
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
                    disabled={showAllEvents || loadingOrganizers || Boolean(errorOrganizers)}
                    error={Boolean(errorOrganizers)}
                    helperText={
                        errorOrganizers
                            ? 'Failed to load organizers'
                            : loadingOrganizers
                                ? 'Loading organizers...'
                                : undefined
                    }
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

                {!showAllEvents && !loadingOrganizers && !errorOrganizers && search && !selectedOrganizerId && (
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

                    <EventsTable
                        events={filteredEvents}
                        actionsHeader="Edit"
                        enableTypeEditor
                        enableHorizontalScroll
                        renderActions={(event) => (
                            <IconButton onClick={() => setEditingEvent(event)}>
                                <Edit />
                            </IconButton>
                        )}
                    />
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
