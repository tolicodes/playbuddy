import { useGetKinks } from '../../Common/hooks/useGetKinks';
import KinkCardGrid from '../../KinkLibrary/KinkCardGrid';
import { useAddFavoriteKink, useRemoveFavoriteKink } from './favoriteKinkMutations';
import { useGetFavoriteKinks } from './useGetFavoriteKinks';

const FavoriteKinks = () => {
  const { kinks = [], isLoading } = useGetKinks();
  const { favoriteKinkIds = [] } = useGetFavoriteKinks();

  const favoriteKinks = kinks.filter((kink) =>
    favoriteKinkIds.includes(kink.id),
  );

  const { mutate: addFavoriteKink, } = useAddFavoriteKink();
  const { mutate: removeFavoriteKink, } = useRemoveFavoriteKink();

  if (isLoading) {
    return <div>Loading Favorites...</div>;
  }

  return (
    <KinkCardGrid
      kinks={favoriteKinks}
      favoriteKinkIds={favoriteKinkIds}
      onAddFavorite={addFavoriteKink}
      onRemoveFavorite={removeFavoriteKink}
    />
  );
};

export default FavoriteKinks;
