import { useEffect, useState } from "react";
import { Kinks } from "./types";

export type CategoryWithCount = {
    value: string;
    count: number;
};


const useExtraCategories = (allKinks: Kinks) => {
    const extractCategories = (kinks: Kinks): CategoryWithCount[] => {
        const categoryCounts = new Map<string, number>();

        kinks.forEach(kink => {
            kink.categories.forEach(category => {
                const currentCount = categoryCounts.get(category) || 0;
                categoryCounts.set(category, currentCount + 1);
            });
        });

        // Convert the map to an array of objects with name and count
        const categoriesWithCounts: CategoryWithCount[] = Array.from(categoryCounts).map(([value, count]) => ({
            value,
            count,
        }));

        // Optionally, sort categories by count or name
        categoriesWithCounts.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

        return categoriesWithCounts;
    };


    const [categories, setCategories] = useState<CategoryWithCount[]>([]);

    useEffect(() => {
        const categoriesWithCounts = extractCategories(allKinks);
        setCategories(categoriesWithCounts);
    }, [allKinks])

    return categories;
}

export { useExtraCategories};