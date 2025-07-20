// src/pages/FacilitatorsListPage.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';          // or next/router
import {
    Paper,
    Box,
    Typography,
    Button,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    IconButton,
    CircularProgress,
} from '@mui/material';
import { Edit } from '@mui/icons-material';
import { useFetchDeepLinks } from '../../common/db-axios/useDeepLinks';
import { useFetchFacilitators } from '../../common/db-axios/useFacilitators';
import { useState } from 'react';
import { TextField, MenuItem } from '@mui/material';

export default function DeepLinksListScreen() {
    const navigate = useNavigate();
    const { data: list, isLoading, error } = useFetchDeepLinks();
    const { data: facilitators } = useFetchFacilitators();

    const [typeFilter, setTypeFilter] = useState('');
    const [organizerFilter, setOrganizerFilter] = useState('');
    const [facilitatorFilter, setFacilitatorFilter] = useState('');

    const uniqueTypes = Array.from(new Set(list?.map(f => f.type).filter(Boolean)));
    const uniqueOrganizers = Array.from(new Set(list?.map(f => f.organizer?.name).filter(Boolean)));
    const uniqueFacilitators = Array.from(new Set(
        list?.map(f => facilitators?.find(fac => Number(fac.id) === Number(f.facilitatorId))?.name).filter(Boolean)
    ));



    if (isLoading) return <CircularProgress />;
    if (error) return <Typography color="error">Failed to load deep links</Typography>;

    const filteredList = list?.filter(f => {
        const facilitatorName = facilitators?.find(fac => Number(fac.id) === Number(f.facilitatorId))?.name || '';
        return (
            (!typeFilter || f.type?.toLowerCase().includes(typeFilter.toLowerCase())) &&
            (!organizerFilter || f.organizer?.name?.toLowerCase().includes(organizerFilter.toLowerCase())) &&
            (!facilitatorFilter || facilitatorName.toLowerCase().includes(facilitatorFilter.toLowerCase()))
        );
    }).sort((a, b) => b?.created_at?.localeCompare(a?.created_at));


    return (
        <Paper sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h4">Deep Links</Typography>
                <Button
                    variant="contained"
                    onClick={() => navigate('/deep-links/new')}
                >
                    Add Deep Link
                </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                    label="Type"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    select
                    size="small"
                    sx={{ minWidth: 150 }}
                >
                    <MenuItem value="">All</MenuItem>
                    {uniqueTypes.map(type => (
                        <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                </TextField>

                <TextField
                    label="Organizer"
                    value={organizerFilter}
                    onChange={(e) => setOrganizerFilter(e.target.value)}
                    select
                    size="small"
                    sx={{ minWidth: 150 }}
                >
                    <MenuItem value="">All</MenuItem>
                    {uniqueOrganizers.map(org => (
                        <MenuItem key={org} value={org}>{org}</MenuItem>
                    ))}
                </TextField>

                <TextField
                    label="Facilitator"
                    value={facilitatorFilter}
                    onChange={(e) => setFacilitatorFilter(e.target.value)}
                    select
                    size="small"
                    sx={{ minWidth: 150 }}
                >
                    <MenuItem value="">All</MenuItem>
                    {uniqueFacilitators.map(fac => (
                        <MenuItem key={fac} value={fac}>{fac}</MenuItem>
                    ))}
                </TextField>
            </Box>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Edit</TableCell>

                        <TableCell>Name</TableCell>
                        <TableCell>Slug</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Organizer</TableCell>
                        <TableCell>Featured Event</TableCell>
                        <TableCell>Facilitator</TableCell>
                        <TableCell>Featured Promo Code</TableCell>
                        <TableCell>Deep Link Events</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {filteredList?.map((f) => {
                        const facilitator = facilitators?.find((facilitator) => Number(facilitator.id) === Number(f.facilitatorId));
                        // const featured_event = events?.find((event) => event.id === f.featured_eventId);
                        // const featured_promo_code = promo_codes?.find((promo_code) => promo_code.id === f.featured_promo_codeId);
                        return (
                            <TableRow key={f.id}>
                                <TableCell>
                                    <IconButton onClick={() => navigate(`/deep-links/${f.id}`)}>
                                        <Edit />
                                    </IconButton>
                                </TableCell>
                                <TableCell>{f.name || f.campaign}</TableCell>
                                <TableCell>
                                    <a
                                        href={`https://l.playbuddy.me/${f.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {f.slug}
                                    </a>
                                </TableCell>
                                <TableCell>{f.type}</TableCell>
                                <TableCell>{f.organizer?.name}</TableCell>
                                <TableCell>{f.featured_event?.name}</TableCell>
                                <TableCell>{facilitator?.name}</TableCell>
                                <TableCell>{f.featured_promo_code?.promo_code}</TableCell>
                                <TableCell>{f.deep_link_events?.map(event => event.event.name).join(', ')}</TableCell>


                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </Paper>
    );
}
