import React, { useState } from "react";
import Select, { MultiValue, StylesConfig } from "react-select";
import { OptionType } from "../Common/types";

interface GenericFilterProps {
    onFilterChange: (selectedOptions: OptionType[]) => void;
    options: OptionType[];
    entityName: string;
}

const customStyles: StylesConfig<OptionType, true> = {
    control: (styles) => ({ ...styles, backgroundColor: 'white' }),
    option: (styles, { data, isDisabled, isFocused, isSelected }) => {
        return {
            ...styles,
            backgroundColor: isDisabled
                ? 'red'
                : isSelected
                    ? data.color
                    : isFocused
                        ? `${data.color}80`
                        : undefined,
            color: isDisabled
                ? '#ccc'
                : isSelected
                    ? getContrastingColor(data.color)
                    : data.color,
            cursor: isDisabled ? 'not-allowed' : 'default',
            ':active': {
                ...styles[':active'],
                backgroundColor: !isDisabled
                    ? isSelected
                        ? data.color
                        : `${data.color}80`
                    : undefined,
            },
        };
    },
    multiValue: (styles, { data }) => {
        return {
            ...styles,
            backgroundColor: data.color,
        };
    },
    multiValueLabel: (styles, { data }) => ({
        ...styles,
        color: 'white',
    }),
    multiValueRemove: (styles, { data }) => ({
        ...styles,
        color: 'white',
        ':hover': {
            backgroundColor: data.color,
            color: 'white',
        },
    }),
    menu: (styles) => ({ ...styles, zIndex: 9999 }), // Set z-index here
};

function getContrastingColor(color: string): string {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#000000' : '#ffffff';
}

export const EventFilters = ({ onFilterChange, options, entityName }: GenericFilterProps) => {
    const sortedOptions = options
        .map((option) => ({
            ...option,
            label: `${option.label} (${option.count})`,
        }))
        .sort((a, b) => b.count - a.count);

    const [selectedOptions, setSelectedOptions] = useState<OptionType[]>([]);

    const handleChangeFilter = (selected: MultiValue<OptionType>) => {
        const selectedOptionList = selected as OptionType[];
        setSelectedOptions(selectedOptionList);
        onFilterChange(selectedOptionList);
    };

    return (
        <Select
            isMulti
            placeholder={`Filter by ${entityName}`}
            name="generic-filter-tags"
            options={sortedOptions}
            className="basic-multi-select"
            classNamePrefix="select"
            value={selectedOptions}
            onChange={handleChangeFilter}
            styles={customStyles}
        />
    );
};
