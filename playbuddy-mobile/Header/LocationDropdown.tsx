import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { LocationArea } from '../Common/CommonContext';

interface LocationDropdownProps {
    locationAreas: LocationArea[];
    selectedLocationArea: LocationArea | null;
    onSelectLocationArea: (locationArea: LocationArea) => void;
}

const LocationDropdown: React.FC<LocationDropdownProps> = ({
    locationAreas,
    selectedLocationArea,
    onSelectLocationArea,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleDropdown = () => setIsOpen(!isOpen);

    const handleSelectLocation = (locationArea: LocationArea) => {
        onSelectLocationArea(locationArea);
        setIsOpen(false);
    };

    const renderLocation = ({ item }: { item: LocationArea }) => (
        <TouchableOpacity
            style={styles.locationItem}
            onPress={() => handleSelectLocation(item)}
        >
            <View style={styles.codeCircle}>
                <Text style={styles.codeText}>{item.code}</Text>
            </View>
            <Text style={styles.locationName}>{item.name}</Text>
        </TouchableOpacity>
    );

    return (
        <View>
            <TouchableOpacity onPress={toggleDropdown}>
                <View style={styles.codeCircle}>
                    <Text style={styles.codeText}>
                        {selectedLocationArea ? selectedLocationArea.code : '?'}
                    </Text>
                </View>
            </TouchableOpacity>

            <Modal
                visible={isOpen}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsOpen(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalHeader}>Locations</Text>
                        <FlatList
                            data={locationAreas}
                            renderItem={renderLocation}
                            keyExtractor={(item) => item.id}
                        />
                        <TouchableOpacity style={styles.closeButton} onPress={() => setIsOpen(false)}>
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    codeCircle: {
        width: 35,
        height: 35,
        borderRadius: 20,
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    codeText: {
        fontWeight: 'bold',
        fontSize: 11,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalHeader: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        width: '80%',
        maxHeight: '80%',
    },
    locationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    locationName: {
        marginLeft: 10,
        fontSize: 16,
    },
    closeButton: {
        marginTop: 20,
        padding: 10,
        backgroundColor: '#e0e0e0',
        borderRadius: 5,
        alignItems: 'center',
    },
    closeButtonText: {
        fontWeight: 'bold',
    },
});

export default LocationDropdown;