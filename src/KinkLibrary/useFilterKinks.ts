import { useState, useEffect, useCallback } from 'react';
import { Kinks, Level, Status } from './types';
import { useExtraCategories } from './useExtraCategories';

interface Filters {
  searchText?: string;
  selectedCategories?: string[];
  isRecommended?: boolean;
  status?: Status; // Assuming status can be 'done', 'todo', or any string. Adjust as necessary.
  needsSupplies?: boolean;
  level?: Level; // Assuming level is a string that matches certain criteria. Adjust as necessary.
  isGroup?: boolean;
}

export const useFilterKinks = (allKinks: Kinks) => {
  const sortKinks = useCallback((kinks: Kinks) => {
    // After filtering, sort so recommendeds always come first
    return kinks.sort((a, b) => {
      // If both or neither are recommended, they remain in their original order
      if (a.recommended === b.recommended) return 0;
      // If 'a' is recommended but 'b' is not, 'a' should come first
      if (a.recommended && !b.recommended) return -1;
      // If 'b' is recommended but 'a' is not, 'b' should come first
      return 1;
    });
  }, []);

  const onFilterChange = useCallback(
    (filters: Filters) => {
      const filtered = allKinks.filter((kink) => {
        const matchesSearchText =
          !filters.searchText ||
          kink.idea_title
            .toLowerCase()
            .includes(filters.searchText.toLowerCase()) ||
          kink.idea_description
            .toLowerCase()
            .includes(filters.searchText.toLowerCase());

        const matchesCategories =
          !filters.selectedCategories ||
          filters.selectedCategories.length === 0 ||
          kink.categories.some((category) =>
            filters.selectedCategories?.includes(category),
          );

        const matchesRecommended = !filters.isRecommended || kink.recommended;

        const matchesStatus = !filters.status || kink.status === filters.status;

        const matchesLevel = !filters.level || kink.level === filters.level;

        return (
          matchesSearchText &&
          matchesCategories &&
          matchesRecommended &&
          matchesStatus &&
          matchesLevel
        );
      });

      const sortedFiltered = sortKinks(filtered);

      setFilteredKinks(sortedFiltered);
    },
    [allKinks, sortKinks],
  );

  const [filteredKinks, setFilteredKinks] = useState<Kinks>([]);

  useEffect(() => {
    const sortedKinks = sortKinks(allKinks);
    setFilteredKinks(sortedKinks);
  }, [allKinks, sortKinks]);

  const categories = useExtraCategories(allKinks);

  // Return both the filtered list of kinks and the function to change the filters
  return { filteredKinks, onFilterChange, categories };
};
