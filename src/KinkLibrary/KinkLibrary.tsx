import React from 'react';
import { Container, Grid, Card, CardContent, Typography, Chip } from '@mui/material';
import Filters from './Filters';
import { useLoadKinks } from './useLoadKinks';
import { useFilterKinks } from './useFilterKinks';
import { Header } from '../Header';

const levelColors = {
    easy: '#b7e4c7', // Muted green
    medium: '#a2d2ff', // Muted blue
    advanced: '#e5989b', // Muted red
    xxxtreme: '#343a40', // Muted black (dark gray)
};


const KinkList = () => {
    const allKinks = useLoadKinks();

    const { filteredKinks, onFilterChange, categories } = useFilterKinks(allKinks);

    return (
        <>
            <Header />

            <Container>
                <Filters categories={categories} onFilterChange={onFilterChange} />

                <Grid container spacing={3}>
                    {filteredKinks.map((kink, index) => (
                        <Grid item xs={12} md={6} lg={4} key={index}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h5" component="h2">{kink.idea_title}</Typography>

                                    {kink.favorite && <Chip label="Favorite" color="warning" style={{ marginRight: '4px' }} />}

                                    <Chip label={kink.status || 'todo'} color={kink.status === 'done' ? 'success' : 'primary'} style={{ marginRight: '4px' }} />

                                    {
                                        kink.level && (
                                            <Chip
                                                label={kink.level.charAt(0).toUpperCase() + kink.level.slice(1)} // Capitalize the first letter for display
                                                style={{
                                                    margin: '2px',
                                                    backgroundColor: levelColors[kink.level],
                                                    color: kink.level === 'xxxtreme' ? '#ffffff' : '#000000', // Ensure text is readable on black background
                                                }}
                                                variant="outlined"
                                            />
                                        )}
                                    {kink.is_group && <Chip label="Group" color="default" variant="outlined" style={{ margin: '2px' }} />}

                                    <div>
                                        {kink.categories.map((category, catIndex) => (
                                            <Chip label={category} color="secondary" variant="outlined" key={catIndex} style={{ margin: '2px' }} />
                                        ))}

                                    </div>
                                    <Typography variant="body2">{kink.idea_description}</Typography>
                                    {kink.needs_supplies && <Typography variant="body2">{kink.needs_supplies}</Typography>}
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </>
    );
};

export default KinkList;
