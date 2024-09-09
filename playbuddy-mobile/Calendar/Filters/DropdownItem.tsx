import React from 'react';
import { View, Text } from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import dropdownStyles from './styles/dropdownStyles';
import { OrganizerFilterOption } from '../calendarUtils';

interface DropdownItemProps {
    item: OrganizerFilterOption;
    isSelected: boolean;
}

const DropdownItem: React.FC<DropdownItemProps> = ({ item, isSelected }) => {
    return (
        <View style={[dropdownStyles.dropdownItem, { backgroundColor: isSelected ? 'green' : 'white' }]}>
            <View style={isSelected ? dropdownStyles.checkmarkContainerFull : dropdownStyles.checkmarkContainerBlank}>
                <FAIcon name="check" size={14} color="white" />
            </View>
            <View style={[dropdownStyles.colorDot, { backgroundColor: item.color }]} />
            <Text style={[dropdownStyles.itemText, { color: isSelected ? 'white' : 'black' }]}>{item.name}</Text>
        </View>
    );
};

export default DropdownItem;
