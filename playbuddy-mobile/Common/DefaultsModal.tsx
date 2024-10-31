import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { Modal, View, Text, FlatList, TouchableOpacity, StyleSheet, Button } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { getCommunityIcon, getLocationIcon } from './icons';
import { Community, LocationArea, useCommonContext } from './CommonContext';

const SelectionModal = () => {
    const {
        locationAreas,
        communities,
        selectedCommunity,
        setSelectedCommunity,
        selectedLocationArea,
        setSelectedLocationArea,
        showDefaultsModal
    } = useCommonContext();

    const renderCommunityOption = (
        item: { id: string, name: string, icon: ReactNode, item: Community },
        selectedItem: Community | null,
        onSelect: (item: Community) => void
    ) => (
        <TouchableOpacity
            onPress={() => onSelect(item.item)}
            style={[styles.item, item.id === selectedItem?.id && styles.selectedItem]}
        >
            <View style={styles.codeCircle}>
                {item.icon}
            </View>
            <Text style={[styles.itemName, item.id === selectedItem?.id && styles.selectedText]}>{item.name}</Text>
        </TouchableOpacity>
    );

    const renderLocationOption = (
        item: { id: string, name: string, icon: ReactNode, item: LocationArea },
        selectedItem: LocationArea | null,
        onSelect: (item: LocationArea) => void
    ) => (
        <TouchableOpacity
            onPress={() => onSelect(item.item)}
            style={[styles.item, item.id === selectedItem?.id && styles.selectedItem]}
        >
            <View style={styles.codeCircle}>
                {item.icon}
            </View>
            <Text style={[styles.itemName, item.id === selectedItem?.id && styles.selectedText]}>{item.name}</Text>
        </TouchableOpacity>
    );

    const locationListRef = useRef<FlatList>(null);

    const scrollToLocation = () => {
        setTimeout(() => {
            const index = locationAreas.findIndex(area => area.id === selectedLocationArea?.id);
            if (locationListRef.current && index !== -1 && locationAreas.length > 0) {
                locationListRef.current.scrollToIndex({ index, animated: false });
            }
        }, 1000);
    }

    useEffect(() => {
        scrollToLocation();
    }, [locationAreas, selectedLocationArea]);

    const [modalClosed, setModalClosed] = useState(false);

    const onClose = () => {
        setModalClosed(true);
    }

    return (
        <Modal visible={showDefaultsModal && !modalClosed} animationType="slide" transparent>
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Pick your default options</Text>
                    <View style={styles.infoContainer}>
                        <Text style={styles.infoText}>Switch your defaults from the top right bar</Text>
                        <Icon name="arrow-up" size={18} color="#007aff" style={styles.iconArrow} />
                    </View>

                    <Text style={styles.sectionTitle}>Community</Text>
                    <View style={styles.listContainer}>
                        <FlatList
                            data={communities.interestGroups}
                            renderItem={({ item }) => renderCommunityOption({
                                id: item.id,
                                name: item.name,
                                icon: getCommunityIcon(item.code),
                                item: item,
                            }, selectedCommunity, setSelectedCommunity)}
                            keyExtractor={(item) => item.id}
                        />
                    </View>

                    <Text style={styles.sectionTitle}>Location</Text>
                    <View style={styles.listContainer}>
                        <FlatList
                            data={locationAreas}
                            ref={locationListRef}
                            renderItem={({ item }) => renderLocationOption({
                                id: item.id,
                                name: item.name,
                                icon: getLocationIcon(item.code),
                                item: item,
                            }, selectedLocationArea, setSelectedLocationArea)}
                            keyExtractor={(item) => item.id}
                            onScrollToIndexFailed={() => {
                                scrollToLocation()
                            }}
                        />
                    </View>

                    <Button title="Confirm & Close" onPress={onClose} />
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    iconArrow: {
        marginLeft: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#007aff',
        marginVertical: 10,
        alignSelf: 'flex-start',
    },
    listContainer: {
        width: '100%',
        height: 150,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 10,
        marginBottom: 15,
        overflow: 'hidden',
        // paddingHorizontal: 10,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 15,
        // borderRadius: 10,
        marginBottom: 5,
        width: '100%',
    },
    selectedItem: {
        backgroundColor: '#007aff',
        width: '100%',
        // borderRadius: 10,
    },
    icon: {
        width: 30,
        height: 30,
        borderRadius: 10,
        marginRight: 15,
    },
    itemName: {
        fontSize: 16,
    },
    selectedText: {
        fontWeight: '700',
        color: 'white',
    },
    infoText: {
        fontSize: 13,
        textAlign: 'center',
        color: '#666',
    },
    codeCircle: {
        width: 35,
        height: 35,
        borderRadius: 20,
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
});

export default SelectionModal;
