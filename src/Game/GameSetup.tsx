import React from 'react';
import { useLoadKinks } from '../KinkLibrary/useLoadKinks';
import { CategoryWithCount, useExtraCategories } from '../KinkLibrary/useExtraCategories';

import { Grid, Card, CardContent, Typography, Box, Button } from '@mui/material';
import { styled } from '@mui/system';

import CategoryIcon, { categoryIcons } from './CategoryIcon';


const StyledCard = styled(Card)({
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
});

const IconContainer = styled('div')({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '16px',
});

const LabelContainer = styled('div')({
    textAlign: 'center', // Center the text for longer labels
});


const CategoryGridItem = ({ category }: { category: CategoryWithCount }) => {
    return (
        <StyledCard>
            <CardContent>
                <IconContainer>
                    <CategoryIcon category={category.value as keyof typeof categoryIcons} />
                </IconContainer>
                <LabelContainer>
                    <Typography variant="h6">{category.value}</Typography>
                </LabelContainer>
            </CardContent>
        </StyledCard>
    );
};

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

const LevelButtons = () => {
    return (
        <Box sx={{ p: 1 }}>
            <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                    <Button fullWidth variant="contained" sx={{ backgroundColor: '#4caf50', '&:hover': { backgroundColor: '#388e3c' } }}>Easy</Button>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Button fullWidth variant="contained" sx={{ backgroundColor: '#2196f3', '&:hover': { backgroundColor: '#1976d2' } }}>Moderate</Button>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Button fullWidth variant="contained" sx={{ backgroundColor: '#f44336', '&:hover': { backgroundColor: '#d32f2f' } }}>Advanced</Button>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Button fullWidth variant="contained" sx={{ backgroundColor: '#000000', '&:hover': { backgroundColor: '#303030' } }}>Xtreme</Button>
                </Grid>
            </Grid>
        </Box>
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
            <Box sx={{ backgroundColor: '#f0f0f0', p: 2 }}>
                <Typography variant="h4">KinkBuddy</Typography>
            </Box>

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
