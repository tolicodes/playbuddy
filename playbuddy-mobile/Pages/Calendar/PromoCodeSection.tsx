import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import * as Clipboard from 'expo-clipboard';

const PromoCodeSection = ({ promoCode }: { promoCode: string }) => {
    const handleCopy = () => {
        Clipboard.setStringAsync(promoCode);
        Alert.alert('Copied!', 'Promo code copied to clipboard.');
    };

    return (
        <View style={styles.promoContainer}>
            {/* Floating label */}
            <Text style={styles.promoLabel}>Promo Code</Text>
            <View style={styles.promoContent}>
                <Text style={styles.promoText}>{promoCode}</Text>
                <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
                    <MaterialIcons name="content-copy" size={18} color="black" style={styles.copyIcon} />
                    <Text style={styles.copyButtonText}>Copy</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    promoContainer: {
        backgroundColor: '#fdf6e3',       // Light background color (you can change this to your preferred shade)
        borderWidth: 1,
        borderColor: '#e2c200',           // A subtle border color (gold tone)
        borderRadius: 8,
        padding: 16,
        marginVertical: 10,
        position: 'relative',             // Allows the label to overlap
        marginTop: 20
    },
    promoLabel: {
        position: 'absolute',
        top: -10,                         // Adjust this value to control the overlap
        left: 12,
        backgroundColor: '#fdf6e3',         // Same as container so it appears integrated
        paddingHorizontal: 4,
        fontSize: 12,
        fontWeight: 'bold',
        color: '#333',
    },
    promoContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    promoText: {
        color: '#000',                   // Black text for the promo code
        fontSize: 16,
        flex: 1,
    },
    copyButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    copyIcon: {
        marginRight: 6,                  // Space between the icon and the "Copy" text
    },
    copyButtonText: {
        fontSize: 16,
        color: '#000',
        fontWeight: '600',
    },
});


export default PromoCodeSection;

