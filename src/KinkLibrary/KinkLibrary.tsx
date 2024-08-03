import { useCallback, useState } from 'react';

import { Container } from '@mui/material';

import { useGetKinks } from '../Common/hooks/useGetKinks';
import { filterKinksAndCategories } from './utils/filterKinksAndCategories';
import { useGetFavoriteKinks } from '../User/FavoriteKinks/hooks/useGetFavoriteKinks';
import { useAddFavoriteKink, useRemoveFavoriteKink } from '../User/FavoriteKinks/hooks/favoriteKinkMutations';

import Filters from './Filters';
import { Header } from '../Common/Header';
import KinkCardGrid from './KinkCardGrid';
import { CategoryWithCount } from './utils/getCategoriesWithCounts';

const KinkList = () => {
  const { kinks = [], isLoading } = useGetKinks();
  const { favoriteKinkIds } = useGetFavoriteKinks();
  const [filteredKinks, setFilteredKinks] = useState(kinks);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);

  const onFilterChange = useCallback((filters: any) => {
    const { kinks: filterKinks, categories } = filterKinksAndCategories(kinks, filters);
    setFilteredKinks(filterKinks);
    setCategories(categories);
  }, [kinks]);

  const { mutate: addFavoriteKink, } = useAddFavoriteKink();
  const { mutate: removeFavoriteKink, } = useRemoveFavoriteKink();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Header />

      <Container>
        <Filters
          categories={categories}
          onFilterChange={(filters) => onFilterChange(filters)}
        />

        <KinkCardGrid
          kinks={filteredKinks}
          favoriteKinkIds={favoriteKinkIds}
          onAddFavorite={addFavoriteKink}
          onRemoveFavorite={removeFavoriteKink}
        />
      </Container>
    </>
  );
};

export default KinkList;
