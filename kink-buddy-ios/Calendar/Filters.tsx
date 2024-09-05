import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { MultiSelect } from 'react-native-element-dropdown';
import { useCalendarContext } from './CalendarContext';
import { useNavigation } from '@react-navigation/native';
import { NavStack } from './types';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { OrganizerFilterOption } from './calendarUtils';

interface OrganizerMultiSelectProps {
    organizers: OrganizerFilterOption[];
    onChangeFilteredOrganizers: (selectedOrganizerIds: string[]) => void;
    selectedOrganizers: string[];
}

// Dropdown item component to render each organizer option with checkmark (selected) and color dot
const DropdownItem: React.FC<{ item: OrganizerFilterOption, isSelected: boolean, dotColor: string }> = ({ item, isSelected, dotColor }) => {
    return (
        <View style={[styles.dropdownItem, { backgroundColor: isSelected ? 'green' : 'white' }]}>
            <View style={isSelected ? styles.checkmarkContainerFull : styles.checkmarkContainerBlank}>
                <FAIcon name="check" size={14} color="white" />
            </View>

            {/* Organizer color dot */}
            <View style={[styles.colorDot, { backgroundColor: item.color }]} />
            <Text style={[styles.itemText, { color: isSelected ? 'white' : 'black' }]}>{item.name}</Text>
        </View>
    );
};

// Multi-select dropdown component for selecting organizers
export const OrganizerMultiSelect: React.FC<OrganizerMultiSelectProps> = ({ organizers, onChangeFilteredOrganizers, selectedOrganizers }) => {
    const navigation = useNavigation<NavStack>();

    const handleSelect = (items: string[]) => {
        onChangeFilteredOrganizers(items);
    };

    return (
        <View style={styles.container}>
            <MultiSelect
                data={organizers}
                search
                searchField="name"
                labelField="name"
                valueField="id"
                placeholder="Select organizers"
                value={selectedOrganizers}
                onChange={handleSelect}
                style={styles.dropdown}
                selectedStyle={styles.selectedStyle}
                selectedTextStyle={styles.selectedTextStyle}
                placeholderStyle={styles.placeholderStyle}
                itemContainerStyle={styles.itemContainerStyle}
                renderItem={(item) => {
                    const isSelected = selectedOrganizers.includes(item.id);
                    return (
                        <DropdownItem item={item} isSelected={isSelected} dotColor={item.color} />
                    );
                }}
            />
            <Button onPress={() => navigation.navigate('Event List')} title="Done" />
        </View>
    );
};

// Styles for the component
const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#f8f8f8',
        borderRadius: 8,
    },
    dropdown: {
        backgroundColor: '#fff',
        padding: 12,
    },
    itemContainerStyle: {
        backgroundColor: 'green',
        borderColor: '#ddd',
    },
    selectedStyle: {
        backgroundColor: 'green',
        color: 'white',
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 8,
    },
    selectedTextStyle: {
        color: 'white',
        fontSize: 16,
    },
    placeholderStyle: {
        color: '#888',
    },
    dropdownItem: {
        flexDirection: 'row',
        backgroundColor: 'white',
        alignItems: 'center',
        padding: 10,
    },
    checkmarkContainerFull: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'green',
        justifyContent: 'center',
        borderColor: 'white',
        borderWidth: 2,
        alignItems: 'center',
    },
    checkmarkContainerBlank: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
    },
    colorDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginLeft: 10,
    },
    itemText: {
        flex: 1,
        marginLeft: 10,
    },
});

// Filters component that uses the OrganizerMultiSelect
export const Filters: React.FC = () => {
    const { organizers, filters, setFilters } = useCalendarContext();

    const onChangeFilteredOrganizers = (selectedOrganizerIds: string[]) => {
        // sets filter back in context
        setFilters((prevFilters) => ({
            ...prevFilters,
            organizers: selectedOrganizerIds,
        }));
    };

    return (
        <View style={styles.container}>
            <OrganizerMultiSelect
                organizers={organizers}
                selectedOrganizers={filters.organizers}
                onChangeFilteredOrganizers={onChangeFilteredOrganizers}
            />
        </View>
    );
};
