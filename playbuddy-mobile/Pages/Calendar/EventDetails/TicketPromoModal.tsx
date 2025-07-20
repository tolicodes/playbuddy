import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';

interface TicketPromoModalProps {
    visible: boolean;
    promoCode: string;
    discount: string;
    organizerName: string; // Organizer name to be displayed in the offer text
    onClose: () => void;
    onBuyTicket: () => void;
    onCopy: () => void;
}

export const TicketPromoModal: React.FC<TicketPromoModalProps> = ({
    visible,
    promoCode,
    discount,
    organizerName,
    onClose,
    onBuyTicket,
    onCopy,
}) => {
    const handleCopyCode = async () => {
        await Clipboard.setStringAsync(promoCode);
        Alert.alert("Promo Code Copied", "The promo code has been copied to your clipboard.");

        onCopy();
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>Ticket Offer</Text>
                    <Text style={styles.offerText}>
                        {organizerName} is offering a {discount} discount for this event!
                    </Text>
                    <TouchableOpacity onPress={handleCopyCode}>
                        <View style={styles.promoCodeContainer}>
                            <Text style={styles.promoCodeValue}>{promoCode}</Text>
                            <Ionicons name="copy-outline" size={20} color="#333" style={styles.copyIcon} />
                        </View>
                    </TouchableOpacity>

                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.actionButton} onPress={onBuyTicket}>
                            <Text style={styles.actionButtonText}>Buy Ticket</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={onClose}>
                            <Text style={styles.actionButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333',
    },
    offerText: {
        fontSize: 16,
        color: '#555',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 22,
    },
    promoCodeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFD700',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 20,
    },
    promoCodeValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginRight: 8,
    },
    copyIcon: {
        // Additional styling if needed
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        width: '100%',
    },
    actionButton: {
        backgroundColor: '#EEE',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
});
