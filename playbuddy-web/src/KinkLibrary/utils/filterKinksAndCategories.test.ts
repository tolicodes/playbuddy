import { Kink, Level, Status } from '../../Common/types';
import { filterKinksAndCategories } from './filterKinksAndCategories';

// Mock data for kinks
const mockKinks: Kink[] = [
    {
        id: '1',
        idea_title: 'Bondage',
        idea_description: 'Tie up your partner',
        categories: ['Bondage', 'Rope'],
        recommended: true,
        status: Status.Done,
        level: 'intermediate' as Level,
        is_group: false,
        needs_supplies: 'rope',
    },
    {
        id: '2',
        idea_title: 'Blindfold',
        idea_description: 'Blindfold your partner',
        categories: ['Blindfold', 'Sensory Deprivation'],
        recommended: false,
        status: Status.Todo,
        level: 'beginner' as Level,
        is_group: false,
        needs_supplies: 'blindfold',
    },
    {
        id: '3',
        idea_title: 'Group Play',
        idea_description: 'Play with multiple partners',
        categories: ['Group', 'Play'],
        recommended: true,
        status: Status.Todo,
        level: 'advanced' as Level,
        is_group: true,
        needs_supplies: '',
    },
];

describe('filterKinksAndCategories', () => {
    it('should filter kinks by searchText', () => {
        const filters = { searchText: 'bondage' };
        const { kinks, categories } = filterKinksAndCategories(mockKinks, filters);
        expect(kinks.length).toBe(1);
        expect(kinks[0].id).toBe('1');
    });

    it('should filter kinks by selectedCategories', () => {
        const filters = { selectedCategories: ['Group'] };
        const { kinks, categories } = filterKinksAndCategories(mockKinks, filters);
        expect(kinks.length).toBe(1);
        expect(kinks[0].id).toBe('3');
    });

    it('should filter kinks by multiple selectedCategories', () => {
        const filters = { selectedCategories: ['Bondage', 'Sensory Deprivation'] };
        const { kinks, categories } = filterKinksAndCategories(mockKinks, filters);
        expect(kinks.length).toBe(2);
        expect(kinks[0].id).toBe('1');
        expect(kinks[1].id).toBe('2');
    });

    it('should filter kinks by isRecommended', () => {
        const filters = { isRecommended: true };
        const { kinks, categories } = filterKinksAndCategories(mockKinks, filters);
        expect(kinks.length).toBe(2);
        expect(kinks[0].recommended).toBe(true);
        expect(kinks[1].recommended).toBe(true);
    });

    it('should filter kinks by status', () => {
        const filters = { status: 'done' as Status };
        const { kinks, categories } = filterKinksAndCategories(mockKinks, filters);
        expect(kinks.length).toBe(1);
        expect(kinks[0].id).toBe('1');
    });

    it('should filter kinks by level', () => {
        const filters = { level: 'beginner' as Level };
        const { kinks, categories } = filterKinksAndCategories(mockKinks, filters);
        expect(kinks.length).toBe(1);
        expect(kinks[0].id).toBe('2');
    });

    it('should sort recommended kinks first', () => {
        const filters = {};
        const { kinks, categories } = filterKinksAndCategories(mockKinks, filters);
        expect(kinks.length).toBe(3);
        expect(kinks[0].recommended).toBe(true);
        expect(kinks[1].recommended).toBe(true);
        expect(kinks[2].recommended).toBe(false);
    });

    it('should return categories with counts', () => {
        const filters = {};
        const { kinks, categories } = filterKinksAndCategories(mockKinks, filters);
        expect(categories).toEqual([{ "count": 1, "value": "Bondage" }, { "count": 1, "value": "Rope" }, { "count": 1, "value": "Group" }, { "count": 1, "value": "Play" }, { "count": 1, "value": "Blindfold" }, { "count": 1, "value": "Sensory Deprivation" }]);
    });
});
