import { Grid } from '@mui/material';
import KinkCard from './KinkCard';
import { Kink } from './types';

const KinkCardGrid = ({
  kinks,
  favoriteKinks,
  onAddFavorite,
  onRemoveFavorite,
}: {
  kinks: Kink[];
  favoriteKinks?: string[];
  onAddFavorite: (id: string) => void;
  onRemoveFavorite: (id: string) => void;
}) => {
  const isFavoriteKink = (kink: Kink) =>
    !favoriteKinks || favoriteKinks.includes(kink.id);

  return (
    <Grid
      container
      spacing={3}
    >
      {kinks.map((kink, index) => (
        <Grid
          item
          xs={12}
          md={6}
          lg={4}
          key={index}
        >
          <KinkCard
            kink={kink}
            isFavoriteKink={isFavoriteKink(kink)}
            onAddFavorite={onAddFavorite}
            onRemoveFavorite={onRemoveFavorite}
          />
        </Grid>
      ))}
    </Grid>
  );
};

export default KinkCardGrid;
