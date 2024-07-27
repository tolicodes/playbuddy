import React, { useMemo, useState } from 'react';
import { Typography, Box, Button } from '@mui/material';

// Custom hooks for fetching kinks and favorite kinks
import { useGetKinks } from '../Common/hooks/useGetKinks';
import { useGetFavoriteKinks } from '../User/FavoriteKinks/useGetFavoriteKinks';

// Types
import { Kink } from '../Common/types';

// Components
import { Header } from '../Common/Header';
import KinkCardGrid from '../KinkLibrary/KinkCardGrid';
import GameSetup from './GameSetup';

// Utility functions
import { filterKinksAndCategories } from '../KinkLibrary/utils/filterKinksAndCategories';
import { useAddFavoriteKink, useRemoveFavoriteKink } from '../User/FavoriteKinks/favoriteKinkMutations';

// Enum for game modes
enum Mode {
  setup,
  adventure,
}

const Game: React.FC = () => {
  // Fetching kinks and favorite kink IDs using custom hooks
  const { kinks = [], isLoading } = useGetKinks();
  const { favoriteKinkIds } = useGetFavoriteKinks();

  // State for filters and game mode
  // Filter are used to filter kinks by category and level
  const [filters, setFilters] = useState<any>({});
  const [mode, setMode] = useState<Mode>(Mode.setup);

  // Mutations for adding and removing favorite kinks
  const { mutate: addFavoriteKink } = useAddFavoriteKink();
  const { mutate: removeFavoriteKink } = useRemoveFavoriteKink();

  // Function to shuffle kinks and select the top 3
  const shuffleKinks = (kinks: Kink[]) => {
    return kinks.sort(() => 0.5 - Math.random()).slice(0, 3);
  };

  // Memoized calculation of filtered kinks, random kinks, and categories
  const { randomKinks, filteredKinks, categories } = useMemo(() => {
    const { kinks: filteredKinks, categories } = filterKinksAndCategories(kinks, filters);
    return {
      filteredKinks,
      randomKinks: shuffleKinks(filteredKinks),
      categories,
    };
  }, [kinks, filters]);

  // Display loading state while kinks are being fetched
  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        padding: 0,
      }}
    >
      <Header />

      {/* Adventure mode shows the kinks */}
      {mode === Mode.adventure && (
        <>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">Your Adventure</Typography>
            <Button
              variant="contained"
              onClick={() => setMode(Mode.setup)}
            >
              Change Adventure
            </Button>
            <Button
              variant="contained"
              onClick={() => shuffleKinks(filteredKinks)}
            >
              Shuffle
            </Button>
            <KinkCardGrid
              kinks={randomKinks}
              favoriteKinkIds={favoriteKinkIds}
              onAddFavorite={addFavoriteKink}
              onRemoveFavorite={removeFavoriteKink}
            />
          </Box>
        </>
      )}

      {/* Setup mode allows the user to select categories and level */}
      {mode === Mode.setup && (
        <GameSetup
          categories={categories}
          onFilterChange={(filters: any) => {
            setFilters(filters);
            setMode(Mode.adventure);
          }}
        />
      )}
    </Box>
  );
};

export default Game;
