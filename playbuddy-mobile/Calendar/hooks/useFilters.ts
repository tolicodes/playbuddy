import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type FilterState = {
    organizers: string[];
    search: string;
};

// Save filters to AsyncStorage
const saveFiltersToLocalStorage = async (filters: FilterState) => {
    try {
        const jsonValue = JSON.stringify(filters);
        await AsyncStorage.setItem('@filters', jsonValue);
    } catch (e) {
        throw new Error('Failed to save filters', e?.message);
    }
};

// Load filters from AsyncStorage
const loadFiltersFromLocalStorage = async (): Promise<FilterState | null> => {
    try {
        const jsonValue = await AsyncStorage.getItem('@filters');
        return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
        throw new Error('Failed to load filters', e?.message);
        return null;
    }
};

// Custom Hook to manage filters
export const useFilters = () => {
    const [filters, setFilters] = useState<FilterState>({ organizers: [], search: '' });
    const [filtersLoadedFromLocalStorage, setFiltersLoadedFromLocalStorage] = useState(false);

    useEffect(() => {
        // Load filters from local storage on initial render
        loadFiltersFromLocalStorage().then((loadedFilters) => {
            if (loadedFilters) {
                setFilters(loadedFilters);
                setFiltersLoadedFromLocalStorage(true);
            }
        });
    }, []);

    useEffect(() => {
        // Save filters when they change
        if (filtersLoadedFromLocalStorage) {
            saveFiltersToLocalStorage(filters);
        }
    }, [filters, filtersLoadedFromLocalStorage]);

    return { filters, setFilters };
};
