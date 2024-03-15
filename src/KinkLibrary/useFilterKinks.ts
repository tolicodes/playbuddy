import { useState, useEffect, useCallback } from 'react';
import { Kinks } from './types';
import { useExtraCategories } from './useExtraCategories';

interface Filters {
  searchText: string;
  selectedCategories: string[];
  isFavorite: boolean;
  status: 'done' | 'todo' | ''; // Assuming status can be 'done', 'todo', or any string. Adjust as necessary.
  needsSupplies: boolean;
  level: string; // Assuming level is a string that matches certain criteria. Adjust as necessary.
  isGroup: boolean;
}

export const useFilterKinks = (allKinks: Kinks) => {
  const [filteredKinks, setFilteredKinks] = useState<Kinks>([]);

  useEffect(() => {
    setFilteredKinks(allKinks); // Initially, display all kinks
  }, [allKinks]);

  const categories = useExtraCategories(allKinks);


  const onFilterChange = useCallback((filters: Filters) => {
    const filtered = allKinks.filter((kink) => {
      const matchesSearchText = filters.searchText === '' || kink.idea_title.toLowerCase().includes(filters.searchText.toLowerCase()) || kink.idea_description.toLowerCase().includes(filters.searchText.toLowerCase());

      const matchesCategories = filters.selectedCategories.length === 0 || kink.categories.some(category => filters.selectedCategories.includes(category));

      const matchesFavorite = !filters.isFavorite || kink.favorite;

      const matchesStatus = filters.status === '' || kink.status === filters.status;

      const matchesLevel = filters.level === '' || kink.level === filters.level;

      return matchesSearchText && matchesCategories && matchesFavorite && matchesStatus && matchesLevel;
    });

    // After filtering, sort so favorites always come first
    const sortedFiltered = filtered.sort((a, b) => {
      if (a.favorite === b.favorite) return 0;
      if (a.favorite && !b.favorite) return -1;
      return 1;
    });


    setFilteredKinks(sortedFiltered);
  }, [allKinks]);

  // Return both the filtered list of kinks and the function to change the filters
  return { filteredKinks, onFilterChange, categories };
};
