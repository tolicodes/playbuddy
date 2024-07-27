import { Grid } from '@mui/material';
import KinkCard from './KinkCard';
import { Kink } from '../Common/types';

const KinkCardGrid = ({
  kinks,
  favoriteKinkIds: favoriteKinks,
  onAddFavorite,
  onRemoveFavorite,
}: {
  kinks: Kink[];
  favoriteKinkIds?: string[];
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
