import { Kinks } from '../../Common/types';

export type CategoryWithCount = {
  value: string;
  count: number;
};

export const getCategoriesWithCounts = (kinks: Kinks): CategoryWithCount[] => {
  const categoryCounts = new Map<string, number>();

  kinks.forEach((kink) => {
    kink.categories.forEach((category) => {
      const currentCount = categoryCounts.get(category) || 0;
      categoryCounts.set(category, currentCount + 1);
    });
  });

  // Convert the map to an array of objects with name and count
  const categoriesWithCounts: CategoryWithCount[] = Array.from(
    categoryCounts,
  ).map(([value, count]) => ({
    value,
    count,
  }));

  // Optionally, sort categories by count or name
  categoriesWithCounts.sort((a, b) => b.count - a.count);

  return categoriesWithCounts;
};

export const getCategoryStrings = (kinks: Kinks): string[] => {
  const categories = getCategoriesWithCounts(kinks);
  return categories.map((category) => category.value);
}