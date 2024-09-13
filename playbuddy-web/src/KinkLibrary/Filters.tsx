import React, { useEffect, useState } from 'react';
import {
  Typography,
  TextField,
  FormControl,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import FilterChips from './FilterChips';
import { Level, Status } from '../Common/types';
import { CategoryWithCount } from './utils/getCategoriesWithCounts';
import * as amplitude from '@amplitude/analytics-browser';

interface FiltersProps {
  categories: CategoryWithCount[];
  onFilterChange: (filters: any) => void; // Adjust typing as needed for your specific filter logic
}

const Filters: React.FC<FiltersProps> = ({ categories, onFilterChange }) => {
  const [searchText, setSearchText] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isRecommended, setIsRecommended] = useState(false);
  const [status, setStatus] = useState('');
  const [needsSupplies, setNeedsSupplies] = useState(false);
  const [level, setLevel] = useState('');
  const [isGroup, setIsGroup] = useState(false);

  // Apply filters
  useEffect(() => {
    amplitude.logEvent('filter_change', {
      searchText,
      selectedCategories,
      isRecommended,
      status,
      needsSupplies,
      level,
      isGroup
    });


    onFilterChange({
      searchText,
      selectedCategories,
      isRecommended,
      status,
      needsSupplies,
      level,
      isGroup,
    });
  }, [
    searchText,
    selectedCategories,
    isRecommended,
    status,
    needsSupplies,
    level,
    isGroup,
    onFilterChange,
  ]);

  const handleSearchTextChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    amplitude.logEvent('search_text_change', {
      searchText: event.target.value,
    });

    setSearchText(event.target.value);
  };

  const handleCategoryChange = (value: string[] | string) => {
    amplitude.logEvent('category_change', {
      selectedCategories: Array.isArray(value) ? value : [value],
    });

    setSelectedCategories(Array.isArray(value) ? value : [value]);
  };

  const handleNeedsSuppliesChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    amplitude.logEvent('needs_supplies_change', {
      needsSupplies: event.target.checked,
    });

    setNeedsSupplies(event.target.checked);
  };

  const handleRecommendedChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    amplitude.logEvent('recommended_change', {
      isRecommended: event.target.checked,
    });
    setIsRecommended(event.target.checked);
  };

  const handleGroupChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    amplitude.logEvent('group_change', {
      isGroup: event.target.checked,
    });
    setIsGroup(event.target.checked);
  };

  const handleStatusChange = (value: string[] | string) => {
    amplitude.logEvent('status_change', {
      status: Array.isArray(value) ? value : [value],
    });

    setStatus(value[0]);
  };

  const handleLevelChange = (value: string[] | string) => {
    amplitude.logEvent('level_change', {
      level: Array.isArray(value) ? value : [value],
    });

    setLevel(value[0]);
  };

  return (
    <div>
      <TextField
        label="Search"
        variant="outlined"
        fullWidth
        margin="normal"
        value={searchText}
        onChange={handleSearchTextChange}
      />

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
        <FormControlLabel
          control={
            <Checkbox
              checked={isRecommended}
              onChange={handleRecommendedChange}
            />
          }
          label="Recommended"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={needsSupplies}
              onChange={handleNeedsSuppliesChange}
            />
          }
          label="Needs Supplies"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={isGroup}
              onChange={handleGroupChange}
            />
          }
          label="Group"
        />
      </FormGroup>

      <Typography>Status</Typography>

      <FilterChips
        options={Object.values(Level)}
        selected={level}
        onSelect={handleLevelChange}
      />

      <Typography>Status</Typography>
      <FilterChips
        options={Object.values(Status)}
        selected={status}
        onSelect={handleStatusChange}
      />
    </div>
  );
};

export default Filters;
