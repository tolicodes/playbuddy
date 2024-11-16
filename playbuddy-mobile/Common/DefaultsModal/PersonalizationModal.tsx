import React, { useState } from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { PreferencesScreen } from './PreferencesScreen';
import { WelcomeScreen } from './WelcomeScreen';
import { useUserContext } from '../../contexts/UserContext';

import { useCommonContext } from '../CommonContext';

const PersonalizationModal = () => {
    const [isModalVisible, setIsModalVisible] = useState(true);
    const { authUserId } = useUserContext();
    const { showDefaultsModal } = useCommonContext();

    const handleClose = () => {
        setIsModalVisible(false);
    };

    return (
        <Modal visible={isModalVisible && showDefaultsModal} animationType="slide" transparent>
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    {authUserId ? (
                        <PreferencesScreen onClose={handleClose} />
                    ) : (
                        <WelcomeScreen onClose={handleClose} />
                    )}
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
        height: '85%',
    },
});

export default PersonalizationModal;
