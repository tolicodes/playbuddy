import React from 'react';
import { Chip } from '@mui/material';
import * as amplitude from '@amplitude/analytics-browser';

interface Option {
  value: string;
  label?: string;
  color?: string;
  count?: number;
}

// Extending Option type to include strings for simplified usage
type OptionInput = Option | string;

interface FilterChipsProps {
  options: OptionInput[];
  selected: string | string[];
  onSelect: (value: string | string[]) => void;
  mode?: 'single' | 'multiple';
  top?: number;
}

const FilterChips: React.FC<FilterChipsProps> = ({
  options,
  selected,
  onSelect,
  mode = 'multiple',
  top,
}) => {
  // Normalize options to always work with Option objects
  const normalizedOptions: Option[] = options.map((option) => {
    option =
      typeof option === 'string' ? { value: option, label: option } : option;
    if (!option.label) {
      option.label = option.value;
    }
    return option;
  });

  // Sort options by count (descending) and apply the limit
  const sortedAndLimitedOptions = normalizedOptions
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, top || normalizedOptions.length); // Use 'top' if specified, otherwise include all options

  const handleSelect = (optionValue: string) => {
    amplitude.logEvent('filter_chip_selected', {
      optionValue,
      selected: !selected.includes(optionValue),
    });

    if (mode === 'multiple') {
      if (Array.isArray(selected)) {
        if (selected.includes(optionValue)) {
          onSelect(selected.filter((value) => value !== optionValue));
        } else {
          onSelect([...selected, optionValue]);
        }
      } else {
        onSelect([optionValue]);
      }
    } else {
      onSelect(optionValue);
    }
  };

  return (
    <div>
      {sortedAndLimitedOptions.map((option) => (
        <Chip
          // icon={<CategoryIcon category={option.value} size={'small'} />}
          key={option.value}
          label={`${option.label} ${option.count ? `(${option.count})` : ''}`}
          onClick={() => handleSelect(option.value)}
          color={selected.includes(option.value) ? 'primary' : 'default'}
          style={{
            backgroundColor: option.color ? option.color : undefined,
            margin: '5px',
          }}
          variant={selected.includes(option.value) ? 'filled' : 'outlined'}
        />
      ))}
    </div>
  );
};

export default FilterChips;
