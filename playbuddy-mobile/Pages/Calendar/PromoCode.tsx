import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PromoCode } from '../../commonTypes';

export const FormattedPromoCode = ({ promoCode }: { promoCode: PromoCode }) => (
    <View style={styles.promoCodeContainer}>
        <View style={styles.promoCodeBubble}>
            <Text style={styles.promoCodeText}>
                Promo Code: {promoCode.promo_code}
                <Text style={styles.promoCodeDiscount}>
                    &nbsp;({formatDiscount(promoCode)})
                </Text>
            </Text>
        </View>
    </View>
);

export const formatDiscount = (promoCode: PromoCode) => {
    if (promoCode.discount_type === 'percent') {
        return `${promoCode.discount}% off`;
    }
    return `$${promoCode.discount} off`;
}

const styles = StyleSheet.create({
    promoCodeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
    },
    promoCodeText: {
        fontSize: 14,
        color: 'black',
        fontWeight: 'bold',
    },
    promoCodeBubble: {
        backgroundColor: '#FFD700',
        padding: 8,
        borderRadius: 12,
    },
    promoCodeDiscount: {
        fontSize: 14,
        color: 'black',
        fontWeight: 'bold',
    },
}) 