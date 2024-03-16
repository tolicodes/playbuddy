import React from 'react';
import { useLoadKinks } from '../KinkLibrary/useLoadKinks';
import { useExtraCategories } from '../KinkLibrary/useExtraCategories';

import { Typography, Box, Button } from '@mui/material';
import { Header } from '../Header';
import CategoryGrid from './CategoryGrid';
import LevelButtons from './LevelButtons';

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
                <LevelButtons onClickLevel={() => {}}/>
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
