import React from 'react';
import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react';

import CategoryGrid from './CategoryGrid';
import { CategoryWithCount } from '../KinkLibrary/utils/getCategoriesWithCounts';

const mockCategories: CategoryWithCount[] = [
    { value: 'Bondage', count: 5 },
    { value: 'Blindfold', count: 3 },
    { value: 'Sensory Deprivation', count: 2 },
];

describe('CategoryGrid', () => {
    it('should render categories correctly', () => {
        render(
            <CategoryGrid
                categories={mockCategories}
                selectedCategories={[]}
                setSelectedCategories={() => { }}
            />
        );

        expect(screen.getByText('Bondage')).toBeInTheDocument()
        expect(screen.getByText('Blindfold')).toBeInTheDocument();
        expect(screen.getByText('Sensory Deprivation')).toBeInTheDocument();
    });

    it('should call setSelectedCategories when a category is clicked', () => {
        const setSelectedCategories = jest.fn();
        render(
            <CategoryGrid
                categories={mockCategories}
                selectedCategories={[]}
                setSelectedCategories={setSelectedCategories}
            />
        );

        fireEvent.click(screen.getByText('Bondage'));
        expect(setSelectedCategories).toHaveBeenCalledWith([
            { value: 'Bondage', count: 5 },
        ]);
    });

    it('should deselect a category when it is already selected', () => {
        const setSelectedCategories = jest.fn();
        render(
            <CategoryGrid
                categories={mockCategories}
                selectedCategories={[{ value: 'Bondage', count: 5 }]}
                setSelectedCategories={setSelectedCategories}
            />
        );

        fireEvent.click(screen.getByText('Bondage'));
        expect(setSelectedCategories).toHaveBeenCalledWith([]);
    });

    it('should maintain selected state for multiple categories', () => {
        const setSelectedCategories = jest.fn();
        render(
            <CategoryGrid
                categories={mockCategories}
                selectedCategories={[
                    { value: 'Bondage', count: 5 },
                    { value: 'Blindfold', count: 3 },
                ]}
                setSelectedCategories={setSelectedCategories}
            />
        );

        fireEvent.click(screen.getByText('Sensory Deprivation'));
        expect(setSelectedCategories).toHaveBeenCalledWith([
            { value: 'Bondage', count: 5 },
            { value: 'Blindfold', count: 3 },
            { value: 'Sensory Deprivation', count: 2 },
        ]);
    });
});
