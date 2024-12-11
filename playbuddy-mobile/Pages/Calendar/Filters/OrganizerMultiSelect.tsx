import React from 'react';
import { View } from 'react-native';
import { MultiSelect } from 'react-native-element-dropdown';
import dropdownStyles from './styles/dropdownStyles'
import DropdownItem from './DropdownItem';
import { OrganizerFilterOption } from '../hooks/calendarUtils';
import SubmitButtons from './SubmitButtons';
import { useNavigation } from '@react-navigation/native';
import { NavStack } from '../../../Common/Nav/NavStackType';
import { logEvent } from '../../../Common/hooks/logger';

interface OrganizerMultiSelectProps {
    organizers: OrganizerFilterOption[];
    onChangeFilteredOrganizers: (selectedOrganizerIds: string[]) => void;
    selectedOrganizers: string[];
}

const OrganizerMultiSelect: React.FC<OrganizerMultiSelectProps> = ({ organizers, onChangeFilteredOrganizers, selectedOrganizers }) => {
    const navigator = useNavigation<NavStack>();

    const resetFilters = () => {
        onChangeFilteredOrganizers([]);
        logEvent('filter_organizers_reset');
        navigator.goBack();
    };

    return (
        <View style={dropdownStyles.container}>
            <MultiSelect
                data={organizers}
                search
                searchField="name"
                labelField="name"
                valueField="id"
                placeholder="Select organizers"
                value={selectedOrganizers}
                onChange={onChangeFilteredOrganizers}
                style={dropdownStyles.dropdown}
                selectedStyle={dropdownStyles.selectedStyle}
                selectedTextStyle={dropdownStyles.selectedTextStyle}
                placeholderStyle={dropdownStyles.placeholderStyle}
                itemContainerStyle={dropdownStyles.itemContainerStyle}
                renderItem={(item) => {
                    const isSelected = selectedOrganizers.includes(item.id);
                    return <DropdownItem item={item} isSelected={isSelected} />;
                }}
            />
            <SubmitButtons resetFilters={resetFilters} />
        </View>
    );
};

export default OrganizerMultiSelect;
