import React from 'react';
import { useLoadKinks } from '../KinkLibrary/useLoadKinks';
import { CategoryWithCount, useExtraCategories } from '../KinkLibrary/useExtraCategories';

import { Grid, Typography, Box, Button } from '@mui/material';
import { styled } from '@mui/system';

import { Header } from '../Header';
import CategoryGridItem from './CategoryGridItem';
import LevelButtons from './LevelButtons';

const StyledRoot = styled('div')(({ theme }) => ({
    flexGrow: 1,
    padding: theme.spacing(3), // Use theme spacing for consistency
}));

const CategoryGrid = ({ categories }: { categories: CategoryWithCount[] }) => {
    return (
        <StyledRoot>
            <Grid container spacing={3}>
                {categories.map((category, index) => (
                    <Grid item xs={6} sm={4} md={2} key={index}>
                        <CategoryGridItem category={category} />
                    </Grid>
                ))}
            </Grid>
        </StyledRoot>
    );
};


const GameSetup: React.FC = () => {
    const kinks = useLoadKinks();
    const categories = useExtraCategories(kinks);

    // TODO: Refactor with FilterChips
    // Sort options by count (descending) and apply the limit
    const sortedAndLimitedCategories = categories
        .sort((a, b) => (b.count || 0) - (a.count || 0))
        .slice(0, 20 || categories.length);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 0 }}>
            <Header/>

            <Box sx={{ p: 2 }}>
                <Typography>Pick a level and 3+ categories, then click "Adventure" to begin your Adventure!</Typography>
            </Box>

            <Box sx={{ p: 2 }}>
                <LevelButtons />
            </Box>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
                <CategoryGrid categories={sortedAndLimitedCategories} />
            </Box>

            <Box sx={{ backgroundColor: '#f0f0f0', p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Button variant="contained" size="large" sx={{ backgroundColor: '#4caf50', '&:hover': { backgroundColor: '#388e3c' } }}>
                    Adventure!
                </Button>
            </Box>
        </Box>

    );
}

export default GameSetup;
