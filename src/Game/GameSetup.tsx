import { Typography, Button } from '@mui/material';
import { Box } from '@mui/system';
import CategoryGrid from './CategoryGrid';
import LevelButtons from './LevelButtons';
import { useState } from 'react';
import { Level } from '../KinkLibrary/types';
import { CategoryWithCount } from '../KinkLibrary/useExtraCategories';

export const GameSetup = ({
  categories,
  onFilterChange,
}: {
  categories: CategoryWithCount[];
  onFilterChange: (filters: any) => void;
}) => {
  // TODO: Refactor with FilterChips
  // Sort options by count (descending) and apply the limit
  const sortedAndLimitedCategories = categories
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 20 || categories.length);

  const [selectedLevel, setSelectedLevel] = useState<Level>();
  const [selectedCategories, setSelectedCategories] = useState<
    CategoryWithCount[]
  >([]);

  const onClickAdventure = () => {
    onFilterChange({
      level: selectedLevel,
      selectedCategories: selectedCategories.map((category) => category.value),
    });
  };

  return (
    <>
      <Box sx={{ p: 2 }}>
        <Typography>
          Pick a level and 3+ categories, then click "Adventure" to begin your
          Adventure!
        </Typography>
      </Box>

      <Box sx={{ p: 2 }}>
        <LevelButtons
          selectedLevel={selectedLevel}
          onClickLevel={setSelectedLevel}
        />
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
        <CategoryGrid
          selectedCategories={selectedCategories}
          setSelectedCategories={setSelectedCategories}
          categories={sortedAndLimitedCategories}
        />
      </Box>

      <Box
        sx={{
          backgroundColor: '#f0f0f0',
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'fixed',
          bottom: 0,
          width: '100%',
        }}
      >
        <Button
          variant="contained"
          size="large"
          sx={{
            backgroundColor: '#4caf50',
            fontWeight: 'bold',
            '&:hover': { backgroundColor: '#388e3c' },
          }}
          onClick={onClickAdventure}
        >
          Adventure!
        </Button>
      </Box>
    </>
  );
};

export default GameSetup;
