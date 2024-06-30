import KinkCardGrid from '../KinkLibrary/KinkCardGrid';
import { useLoadKinks } from '../KinkLibrary/useLoadKinks';
import { useUserFavorites } from '../KinkLibrary/useUserFavorites';

const FavoriteKinks = () => {
  const kinks = useLoadKinks();
  const favoriteKinkIds = useUserFavorites();
  const favoriteKinks = kinks.filter((kink) =>
    favoriteKinkIds.includes(kink.id),
  );

  return (
    <KinkCardGrid
      kinks={favoriteKinks}
      favoriteKinks={favoriteKinkIds}
      onAddFavorite={() => { }}
      onRemoveFavorite={() => { }}
    />
  );
};

export default FavoriteKinks;
