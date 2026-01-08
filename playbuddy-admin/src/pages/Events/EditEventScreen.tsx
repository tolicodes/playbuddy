import React, { useEffect, useState } from 'react';
import { CircularProgress, Paper, Typography } from '@mui/material';
import { useFetchEvents } from '../../common/db-axios/useEvents';
import EventEditorForm from './EventEditorForm';

export default function EditEventPage() {
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        const pathSegments = window.location.pathname.split('/');
        const lastSegment = pathSegments[pathSegments.length - 1];

        if (lastSegment && lastSegment !== 'new' && /^[a-zA-Z0-9\-]+$/.test(lastSegment)) {
            setEditingId(lastSegment);
        } else {
            setEditingId(null);
        }
    }, []);

    const { data: events = [], isLoading: loadingEvents } = useFetchEvents();
    const eventToEdit = events.find((e: any) => e.id + '' === editingId);
    const mode = editingId ? 'edit' : 'create';

    return (
        <Paper sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
            <Typography variant="h5" mb={2}>
                {mode === 'edit' ? 'Edit Event' : 'Add New Event'}
            </Typography>
            {mode === 'edit' && loadingEvents ? (
                <CircularProgress size={24} />
            ) : (
                <EventEditorForm event={eventToEdit} mode={mode} />
            )}
        </Paper>
    );
}
