import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import * as Clipboard from 'expo-clipboard';
import { PromoCode } from '../../../commonTypes';
import { colors, fontFamilies, fontSizes, radius, spacing } from '../../../components/styles';

// Analytics handled in EventDetail
const PromoCodeSection = ({ promoCode, onCopy }: { promoCode: PromoCode, onCopy: () => void }) => {
    const handleCopy = () => {
        onCopy();
        Clipboard.setStringAsync(promoCode.promo_code);
        Alert.alert('Copied!', 'Promo code copied to clipboard.');
    };

    return (
        <TouchableOpacity onPress={handleCopy} style={styles.promoContainer}>
            <View style={styles.promoContent}>
                <Text style={styles.promoText}>{promoCode.promo_code}</Text>
                <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
                    <MaterialIcons name="content-copy" size={18} color={colors.textPrimary} style={styles.copyIcon} />
                    <Text style={styles.copyButtonText}>Copy</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    promoContainer: {
        backgroundColor: colors.promoSurface,
        borderWidth: 1,
        borderColor: colors.promoBorder,
        borderRadius: radius.sm,
        padding: spacing.lg,
        marginVertical: spacing.smPlus,

    },
    promoContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    promoText: {
        color: colors.textPrimary,
        fontSize: fontSizes.xl,
        flex: 1,
        fontFamily: fontFamilies.body,
    },
    copyButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    copyIcon: {
        marginRight: spacing.xsPlus,
    },
    copyButtonText: {
        fontSize: fontSizes.xl,
        color: colors.textPrimary,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
});


export default PromoCodeSection;
