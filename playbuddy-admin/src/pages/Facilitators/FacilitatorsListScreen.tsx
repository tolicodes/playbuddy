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
import { useFetchFacilitators } from '../../common/db-axios/useFacilitators';

export default function FacilitatorsListScreen() {
    const navigate = useNavigate();
    const { data: list, isLoading, error } = useFetchFacilitators();

    if (isLoading) return <CircularProgress />;
    if (error) return <Typography color="error">Failed to load facilitators</Typography>;

    return (
        <Paper sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h4">Facilitators</Typography>
                <Button
                    variant="contained"
                    onClick={() => navigate('/facilitators/new')}
                >
                    Add Facilitator
                </Button>
            </Box>

            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Verified</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Instagram</TableCell>
                        <TableCell>FetLife</TableCell>
                        <TableCell>Created At</TableCell>
                        <TableCell>Edit</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {list?.map((f) => (
                        <TableRow key={f.id}>
                            <TableCell>{f.name}</TableCell>
                            <TableCell>{f.verified ? 'Yes' : 'No'}</TableCell>
                            <TableCell>{f.location || '—'}</TableCell>
                            <TableCell>
                                {f.instagram_handle
                                    ? <a href={f.instagram_handle} target="_blank" rel="noopener">Link</a>
                                    : '—'}
                            </TableCell>
                            <TableCell>
                                {f.fetlife_handle
                                    ? <a href={f.fetlife_handle} target="_blank" rel="noopener">Link</a>
                                    : '—'}
                            </TableCell>
                            <TableCell>{new Date(f.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                                <IconButton onClick={() => navigate(`/facilitators/${f.id}`)}>
                                    <Edit />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Paper>
    );
}
