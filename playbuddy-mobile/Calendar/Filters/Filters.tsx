import React from 'react';
import { View } from 'react-native';
import { useCalendarContext } from '../CalendarContext';
import OrganizerMultiSelect from './OrganizerMultiSelect';
import dropdownStyles from './styles/dropdownStyles';

export const Filters: React.FC = () => {
    const { organizers, filters, setFilters } = useCalendarContext();

    const onChangeFilteredOrganizers = (selectedOrganizerIds: string[]) => {
        setFilters((prevFilters) => ({
            ...prevFilters,
            organizers: [...selectedOrganizerIds],
        }));
    };

    return (
        <View style={dropdownStyles.container}>
            <OrganizerMultiSelect
                organizers={organizers}
                selectedOrganizers={filters.organizers}
                onChangeFilteredOrganizers={onChangeFilteredOrganizers}
            />
        </View>
    );
};
