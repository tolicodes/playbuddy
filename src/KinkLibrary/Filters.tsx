import React, { useEffect, useState, useCallback } from 'react';
import { Typography, TextField, FormControl, FormGroup, FormControlLabel, Checkbox } from '@mui/material';
import FilterChips from './FilterChips';
import { CategoryWithCount } from './useFilterKinks';

interface FiltersProps {
    categories: CategoryWithCount[];
    onFilterChange: (filters: any) => void; // Adjust typing as needed for your specific filter logic
}

const Filters: React.FC<FiltersProps> = ({ categories, onFilterChange }) => {
    const [searchText, setSearchText] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [isFavorite, setIsFavorite] = useState(false);
    const [status, setStatus] = useState('');
    const [needsSupplies, setNeedsSupplies] = useState(false);
    const [level, setLevel] = useState('');
    const [isGroup, setIsGroup] = useState(false);

    const applyFilters = useCallback(() => {
        console.log('Applying filters', {
            searchText,
            selectedCategories,
            isFavorite,
            status,
            needsSupplies,
            level,
            isGroup,

        })
        onFilterChange({
            searchText,
            selectedCategories,
            isFavorite,
            status,
            needsSupplies,
            level,
            isGroup,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchText, selectedCategories, isFavorite, status, needsSupplies, level, isGroup]);

    useEffect(() => {
        applyFilters();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },  [searchText, selectedCategories, isFavorite, status, needsSupplies, level, isGroup])

    const handleSearchTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchText(event.target.value);
    };

    const handleCategoryChange = (value: string[] | string) => {
        // Type assertion to string[] is needed if the value could be a single string or string[] depending on the context
        setSelectedCategories(Array.isArray(value) ? value : [value]);
    };

    const handleFavoriteChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setIsFavorite(event.target.checked);
    };

    const handleStatusChange = (value: string[] | string) => {
        setStatus(value[0]);
    };

    const handleNeedsSuppliesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setNeedsSupplies(event.target.checked);
    };

    const handleLevelChange = (value: string[] | string) => {
        setLevel(value[0]);
    };

    const handleGroupChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setIsGroup(event.target.checked);
    };

    

    return (
        <div>
            <TextField label="Search" variant="outlined" fullWidth margin="normal" value={searchText} onChange={handleSearchTextChange} />

            <FormControl fullWidth>
                <Typography>Categories</Typography>
                <FilterChips
                    options={categories}
                    selected={selectedCategories}
                    onSelect={handleCategoryChange}
                    mode="multiple"
                    top={20}
                />
            </FormControl>

            <FormGroup row>
                <FormControlLabel control={<Checkbox checked={isFavorite} onChange={handleFavoriteChange} />} label="Favorite" />
                <FormControlLabel control={<Checkbox checked={needsSupplies} onChange={handleNeedsSuppliesChange} />} label="Needs Supplies" />
                <FormControlLabel control={<Checkbox checked={isGroup} onChange={handleGroupChange} />} label="Group" />
            </FormGroup>

            <Typography>Status</Typography>


            <FilterChips
                options={['easy', 'medium', 'advanced', 'xtreme']}
                selected={level}
                onSelect={handleLevelChange}
            />

            <Typography>Status</Typography>
            <FilterChips
                options={['todo', 'done']}
                selected={status}
                onSelect={handleStatusChange}
            />

            {/* 
            <TextField select label="Level" value={level} onChange={handleLevelChange} fullWidth margin="normal">
                <MenuItem value="easy">Easy</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="advanced">Advanced</MenuItem>
                <MenuItem value="xtreme">Xtreme</MenuItem>
            </TextField> */}
        </div>
    );
};

export default Filters;
