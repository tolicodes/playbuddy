import React from 'react';
import { View } from 'react-native';
import { useCalendarContext } from '../hooks/CalendarContext';
import OrganizerMultiSelect from './OrganizerMultiSelect';
import dropdownStyles from './styles/dropdownStyles';
import { logEvent } from '../../../Common/hooks/logger';

export const Filters: React.FC = () => {
    const { organizers, filters, setFilters } = useCalendarContext();

    const onChangeFilteredOrganizers = (selectedOrganizerIds: string[]) => {
        setFilters((prevFilters) => ({
            ...prevFilters,
            organizers: [...selectedOrganizerIds],
        }));
        logEvent('filter_organizers', { selectedOrganizerIds });
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
