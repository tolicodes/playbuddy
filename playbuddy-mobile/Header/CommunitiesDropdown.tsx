import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { Community } from '../Common/CommonContext';

interface CommunityDropdownProps {
    communities: Community[];
    selectedCommunity: Community | null;
    onSelectCommunity: (community: Community | null) => void;
}

const CommunityDropdown: React.FC<CommunityDropdownProps> = ({
    communities,
    selectedCommunity,
    onSelectCommunity,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleDropdown = () => setIsOpen(!isOpen);

    const handleSelectCommunity = (community: Community) => {
        onSelectCommunity(community);

        setIsOpen(false);
    };

    const renderCommunity = ({ item }: { item: Community }) => (
        <TouchableOpacity
            style={styles.communityItem}
            onPress={() => handleSelectCommunity(item)}
        >
            <View style={styles.codeCircle}>
                <Text style={styles.codeText}>{item.code}</Text>
            </View>
            <Text style={styles.communityName}>{item.name}</Text>
        </TouchableOpacity>
    );

    const communitiesWithAll = [
        {
            id: 'all',
            name: 'All',
            code: 'ALL',
        },
        ...communities,
    ];

    return (
        <View>
            <TouchableOpacity onPress={toggleDropdown}>
                <View style={styles.codeCircle}>
                    <Text style={styles.codeText}>
                        {selectedCommunity ? selectedCommunity.code : '?'}
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
                        <Text style={styles.modalHeader}>Communities</Text>
                        <FlatList
                            data={communitiesWithAll}
                            renderItem={renderCommunity}
                            keyExtractor={(item) => item.id || ''}
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
        fontSize: 12,
    },
    modalHeader: {
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 10,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        width: '80%',
        maxHeight: '80%',
    },
    communityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    communityName: {
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

export default CommunityDropdown;