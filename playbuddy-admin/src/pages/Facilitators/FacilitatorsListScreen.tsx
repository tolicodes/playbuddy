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
                        <TableCell>Edit</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {list?.map((f) => (
                        <TableRow key={f.id}>
                            <TableCell>{f.name}</TableCell>

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
