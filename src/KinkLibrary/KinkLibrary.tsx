import { Container } from '@mui/material';

import Filters from './Filters';
import { useLoadKinks } from './useLoadKinks';
import { useFilterKinks } from './useFilterKinks';
import { Header } from '../Common/Header';
import KinkCardGrid from './KinkCardGrid';
import { useUserFavorites } from './useUserFavorites';

const KinkList = () => {
  const allKinks = useLoadKinks();
  const favoriteKinks = useUserFavorites();

  const { filteredKinks, onFilterChange, categories } =
    useFilterKinks(allKinks);

  return (
    <>
      <Header />

      <Container>
        <Filters
          categories={categories}
          onFilterChange={onFilterChange}
        />

        <KinkCardGrid
          kinks={filteredKinks}
          favoriteKinks={favoriteKinks}
          onAddFavorite={() => { }}
          onRemoveFavorite={() => { }}
        />
      </Container>
    </>
  );
};

export default KinkList;
