import React, { useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { formatDiscount } from "../../Calendar/PromoCode";
import { useNavigation } from "@react-navigation/native";
import { NavStack } from "../../../Common/Nav/NavStackType";
import { usePromoCode } from "./usePromoCode";

export const PromoScreen = ({ setIsSkippingWelcomeDueToPromo }: { setIsSkippingWelcomeDueToPromo: (value: boolean) => void }) => {
    const navigation = useNavigation<NavStack>();

    const promoCodeData = usePromoCode();

    if (!promoCodeData) {
        throw Error('Error parsing promo code deep link: promo code data not found. How did you get to PromoScreen?');
    }

    const { promoCode, communityId, organizer } = promoCodeData;

    const onPressExplore = useCallback(() => {
        // when they click home, it will skip the welcome screen, but 
        // when they enter app again, it will not skip the welcome screen
        setIsSkippingWelcomeDueToPromo(true);

        navigation.navigate('Details', { screen: 'Community Events', params: { communityId: communityId || '' } });
    }, [navigation]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>🎉 Welcome to PlayBuddy!</Text>
            <Text style={styles.subtitle}>As a token of appreciation,</Text>
            <Text style={styles.organizerName}>{organizer?.name}</Text>
            <Text style={styles.subtitle}>is offering:</Text>
            <Text style={styles.discountText}>{formatDiscount(promoCode)}</Text>
            <View style={styles.promoCodeContainer}>
                <Text style={styles.promoCodeLabel}>Promo Code:</Text>
                <Text style={styles.promoCode}>{promoCode?.promo_code || "N/A"}</Text>
            </View>
            <TouchableOpacity style={styles.button} onPress={onPressExplore}>
                <Text style={styles.buttonText}>Explore Events</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 40,
        paddingHorizontal: 30,
        backgroundColor: "#ffffff", // Clean white background
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#333",
        textAlign: "center",
        marginBottom: 12,
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 18,
        color: "#555",
        textAlign: "center",
        marginBottom: 16,
    },
    organizerName: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#0077bd",
        marginBottom: 8,
        textAlign: "center",
    },
    discountText: {
        fontSize: 36,
        fontWeight: "bold",
        color: "#ff9800",
        marginBottom: 24,
        textShadowColor: "rgba(0,0,0,0.2)",
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    promoCodeContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 24,
    },
    promoCodeLabel: {
        fontSize: 18,
        color: "#333",
        fontWeight: "500",
        marginRight: 8,
    },
    promoCode: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#ff5722",
        backgroundColor: "#fbe9e7",
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        overflow: "hidden",
    },
    button: {
        backgroundColor: "#0077bd",
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 10,
        shadowColor: "rgba(0,0,0,0.2)",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 5, // Android shadow
    },
    buttonText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#ffffff",
        textAlign: "center",
        letterSpacing: 1,
    },
});
