import React from "react";
import { Text, View, StyleSheet } from "react-native";
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { colors, fontFamilies, fontSizes, spacing } from "../components/styles";

export const MaintainenceScreen = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.header}>Maintainence</Text>
            <FAIcon name="wrench" size={80} color={colors.textSecondary} style={{ marginBottom: spacing.xl }} />


            <Text style={styles.text}>
                PlayBuddy is down for maintainence and will be back in a few hours. Sorry!!
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: spacing.xl,
    },
    header: {
        fontSize: fontSizes.headline,
        marginBottom: spacing.xl,
        color: colors.textPrimary,
        fontFamily: fontFamilies.display,
    },
    text: {
        fontSize: fontSizes.xxl,
        textAlign: "center",
        color: colors.textSecondary,
        fontFamily: fontFamilies.body,
    },
});
