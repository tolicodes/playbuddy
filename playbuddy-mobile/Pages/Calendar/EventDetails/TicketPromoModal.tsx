import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontFamilies, fontSizes, lineHeights, radius, spacing } from '../../../components/styles';

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
                            <Ionicons name="copy-outline" size={20} color={colors.textPrimary} style={styles.copyIcon} />
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
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    modalContainer: {
        backgroundColor: colors.white,
        borderRadius: radius.md,
        padding: spacing.xl,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: fontSizes.xxxl,
        fontWeight: 'bold',
        marginBottom: spacing.md,
        color: colors.textPrimary,
        fontFamily: fontFamilies.display,
    },
    offerText: {
        fontSize: fontSizes.xl,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: spacing.lg,
        lineHeight: lineHeights.lg,
        fontFamily: fontFamilies.body,
    },
    promoCodeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.gold,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.sm,
        marginBottom: spacing.xl,
    },
    promoCodeValue: {
        fontSize: fontSizes.xl,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginRight: spacing.sm,
        fontFamily: fontFamilies.body,
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
        backgroundColor: colors.surfaceSubtle,
        paddingVertical: spacing.smPlus,
        paddingHorizontal: spacing.mdPlus,
        borderRadius: radius.sm,
        flex: 1,
        alignItems: 'center',
        marginHorizontal: spacing.xsPlus,
    },
    actionButtonText: {
        fontSize: fontSizes.xl,
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: fontFamilies.body,
    },
});
