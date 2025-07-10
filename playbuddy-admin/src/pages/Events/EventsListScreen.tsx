// src/pages/EventsListScreen.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    CircularProgress,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { Edit } from '@mui/icons-material';
import { useFetchEvents } from '../../common/db-axios/useEvents';
import { useFetchOrganizers } from '../../common/db-axios/useOrganizers';

export default function EventsListScreen() {
    const navigate = useNavigate();
    const { data: events = [], isLoading: loadingEvents, error: errorEvents } = useFetchEvents({
        includeFacilitatorOnly: true,
    });
    const { data: organizers = [], isLoading: loadingOrganizers } = useFetchOrganizers();

    const [search, setSearch] = useState('');
    const [selectedOrganizerId, setSelectedOrganizerId] = useState<string | null>(null);
    const filteredOrganizers = organizers?.filter((org) =>
        org.name.toLowerCase().includes(search.toLowerCase())
    );

    const filteredEvents = selectedOrganizerId
        ? events.filter((e) => e.organizer?.id + '' === selectedOrganizerId)
        : [];

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

                <TextField
                    fullWidth
                    label="Search Organizer"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setSelectedOrganizerId(null);
                    }}
                    sx={{ mt: 2 }}
                />



                {search && !selectedOrganizerId && (
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

            {selectedOrganizerId && (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6">Showing events for: {search}</Typography>
                        <Button variant="contained" onClick={() => navigate('/events/new')}>
                            Add Event
                        </Button>
                    </Box>

                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell>Edit</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredEvents.map((event) => (
                                <TableRow key={event.id}>
                                    <TableCell>{event.name}</TableCell>
                                    <TableCell>{new Date(event.start_date).toLocaleString()} -
                                        {new Date(event.end_date).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <IconButton onClick={() => navigate(`/events/${event.id}`)}>
                                            <Edit />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </>
            )}
        </Paper>
    );
}
