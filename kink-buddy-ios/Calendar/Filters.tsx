import React, { useState } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { MultiSelect } from 'react-native-element-dropdown';
import { useCalendarContext } from './CalendarContext';
import { useNavigation } from '@react-navigation/native';
import { CalendarStack } from './types';
import FAIcon from 'react-native-vector-icons/FontAwesome';


interface Organizer {
    id: string;
    name: string;
}

interface OrganizerMultiSelectProps {
    organizers: Organizer[];
    onChangeFilteredOrganizers: (selectedOrganizerIds: string[]) => void;
    selectedOrganizers: string[];
}

const DropdownItem = ({ item, isSelected }) => {
    return (<View
        style={{
            ...styles.dropdown,
            flexDirection: 'row', // Add this line to place items side by side
            backgroundColor: isSelected ? '#e0e0e0' : 'white',
            alignItems: 'center', // Ensure items are centered vertically
            padding: 10, // Add padding if needed
        }}
    >
        <View style={isSelected ? styles.checkmarkContainerFull : styles.checkmarkContainerBlank}>
            <FAIcon name="check" size={14} color="white" />
        </View>

        <Text style={{ flex: 1, marginLeft: 10 }}>{item.name}</Text>
    </View>)
}

export const OrganizerMultiSelect: React.FC<OrganizerMultiSelectProps> = ({ organizers, onChangeFilteredOrganizers, selectedOrganizers }) => {
    const handleSelect = (items: string[]) => {
        onChangeFilteredOrganizers(items);
    };

    const navigation = useNavigation<CalendarStack>();

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
                        <DropdownItem item={item} isSelected={isSelected} />
                    );
                }}
            />

            <Button onPress={() => navigation.navigate('Event List')} title="Done" />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#f8f8f8',
        borderRadius: 8,
    },
    dropdown: {
        backgroundColor: '#fff',
        padding: 12,
        // borderWidth: 1,
        // borderColor: '#ddd',
    },

    itemContainerStyle: {
        backgroundColor: 'green',
        borderColor: '#ddd',
    },

    // Pills
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
    checkmarkContainerFull: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'green',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmarkContainerBlank: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export const Filters: React.FC = () => {
    const { organizers, filters, setFilters } = useCalendarContext();

    const onChangeFilteredOrganizers = (selectedOrganizerIds: string[]) => {
        // Handle change in selected organizers
        setFilters((prevFilters) => ({
            ...prevFilters,
            organizers: selectedOrganizerIds,
        }));
    };

    return (
        <View style={styles.container}>
            <OrganizerMultiSelect
                // id, name, count
                organizers={organizers}
                selectedOrganizers={filters.organizers}
                onChangeFilteredOrganizers={onChangeFilteredOrganizers}
            />
        </View>
    );
}
