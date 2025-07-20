import React, { useMemo, useState } from 'react';
import {
    Box,
    Button,
    TextField,
    IconButton,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Autocomplete,
    Stack,
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import CheckIcon from '@mui/icons-material/Check';
import { useFetchFacilitators, useAddFacilitatorEvent, useRemoveFacilitatorEvent } from '../../common/db-axios/useFacilitators';
import { Event, Facilitator as Fac } from '../../common/types/commonTypes';
import { createFilterOptions } from '@mui/material/Autocomplete';


interface EventsManagerProps {
    facilitatorId: string;
    facilitatorName: string;
    events: Event[] | undefined;
    organizers: { id: number; name: string }[] | undefined;
    refetch: () => void;
}

export function EventsManager({ facilitatorId, facilitatorName, events, organizers, refetch }: EventsManagerProps) {
    const addFacEvent = useAddFacilitatorEvent();
    const deleteFacEvent = useRemoveFacilitatorEvent();
    const { data: list } = useFetchFacilitators();

    // find current facilitator and its events
    const fac = list?.find((f) => f.id === facilitatorId) as Fac | undefined;
    const facilitatorEvents: Event[] =
        fac?.event_ids
            .map((id) => events?.find((e) => e.id === id))
            .filter((e): e is Event => !!e) || [];

    // local state
    const [selectedOrganizer, setSelectedOrganizer] = useState(organizers?.[0] ?? null);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

    // filter events by organizer
    const availableEvents = useMemo(() => events?.filter(
        (e) => !selectedOrganizer || String(e.organizer.id) === String(selectedOrganizer.id)
    ), [events, selectedOrganizer]);

    // handlers
    const handleAdd = async () => {
        if (!facilitatorId || !selectedEvent) return;
        await addFacEvent.mutateAsync({ facilitatorId, eventId: selectedEvent.id.toString() });
        refetch();
        setSelectedEvent(null);
    };

    const handleDelete = async (evtId: number) => {
        if (!facilitatorId) return;
        await deleteFacEvent.mutateAsync({ facilitatorId, eventId: evtId.toString() });
        refetch();
    };

    const filterEvents = createFilterOptions<Event>({
        matchFrom: 'any', // or 'start' if you want only prefix matches
        stringify: (option) => option.name,
        trim: true,
    });

    return (
        <Box>
            <Autocomplete
                options={organizers || []}
                getOptionLabel={(o) => o.name}
                value={selectedOrganizer}
                onChange={(_, val) => { setSelectedOrganizer(val); setSelectedEvent(null); }}
                renderInput={(params) => <TextField {...params} label="Organizer" />} />

            <Autocomplete
                options={availableEvents || []}

                getOptionLabel={(e) => e.name}
                value={selectedEvent}
                onChange={(_, val) => setSelectedEvent(val)}
                disabled={!selectedOrganizer}
                // disable and check already-added events
                getOptionDisabled={(option) => facilitatorEvents.some(ev => ev.id === option.id)}
                renderOption={(props, option) => {
                    const isAdded = facilitatorEvents.some(ev => ev.id === option.id);
                    const containsFacilitator = option.hosts?.includes(facilitatorName);
                    return (
                        <li {...props} style={{
                            backgroundColor: (
                                isAdded ? '#f0f0f0' : (
                                    containsFacilitator ? 'red' : 'transparent'
                                )
                            ),
                            color: isAdded ? '#666' : 'inherit',
                        }}>
                            {isAdded && <CheckIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />}

                            {option.start_date && <span style={{ marginRight: 8 }}>{new Date(option.start_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}</span>}

                            {option.name} [{option.hosts?.join(', ')}]
                        </li>
                    );
                }}
                filterOptions={filterEvents}
                renderInput={(params) => <TextField {...params} label="Event" />} />

            <Button variant="outlined" onClick={handleAdd} disabled={!selectedEvent}>
                Add
            </Button>

            <Box sx={{ overflowX: 'auto' }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Event Name</TableCell>
                            <TableCell>Remove</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {facilitatorEvents.map((ev) => (
                            <TableRow key={ev.id}>
                                <TableCell>
                                    {ev.start_date && <span style={{ marginRight: 8 }}>{new Date(ev.start_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}</span>}

                                    {ev.name} [{ev.hosts?.join(', ')}]
                                </TableCell>
                                <TableCell>
                                    <IconButton onClick={() => handleDelete(ev.id)}>
                                        <Delete color="error" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Box>
        </Box>
    );
}
