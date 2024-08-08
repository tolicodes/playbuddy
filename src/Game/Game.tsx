import React, { useMemo, useState } from 'react';
import { Typography, Box, Button } from '@mui/material';

// Custom hooks for fetching kinks and favorite kinks
import { useGetKinks } from '../Common/hooks/useGetKinks';
import { useGetFavoriteKinks } from '../User/FavoriteKinks/hooks/useGetFavoriteKinks';

// Types
import { Kink } from '../Common/types';

// Components
import { Header } from '../Common/Header';
import KinkCardGrid from '../KinkLibrary/KinkCardGrid';
import GameSetup from './GameSetup';

// Utility functions
import { filterKinksAndCategories } from '../KinkLibrary/utils/filterKinksAndCategories';
import { useAddFavoriteKink, useRemoveFavoriteKink } from '../User/FavoriteKinks/hooks/favoriteKinkMutations';

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

  // Memoized calculation of filtered kinks, random kinks, and categories
  const { filteredKinks, categories } = useMemo(() => {
    const { kinks: filteredKinks, categories } = filterKinksAndCategories(kinks, filters);
    return {
      filteredKinks,
      categories,
    };
  }, [kinks, filters]);

  const [randomSeed, setRandomSeed] = useState(0);

  // Function to shuffle kinks and select the top 3
  const shuffleKinks = (kinks: Kink[], randomSeed: number) => {
    return kinks.sort(() => 0.5 - randomSeed).slice(0, 3);
  };


  const randomKinks = useMemo(() => {
    return shuffleKinks(filteredKinks, randomSeed);
  }, [randomSeed, filteredKinks])

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
              onClick={() => setRandomSeed(Math.random())}
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
