import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, eventListThemes } from "./styles";

type EventListBackgroundProps = {
    style?: StyleProp<ViewStyle>;
};

export const EventListBackground = ({ style }: EventListBackgroundProps) => (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
        <LinearGradient
            colors={eventListThemes.welcome.colors}
            locations={eventListThemes.welcome.locations}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
        />
        <View style={styles.glowTop} />
        <View style={styles.glowMid} />
        <View style={styles.glowBottom} />
    </View>
);

const styles = StyleSheet.create({
    glowTop: {
        position: 'absolute',
        top: -70,
        right: -80,
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: colors.brandGlowTop,
    },
    glowMid: {
        position: 'absolute',
        top: 140,
        left: -120,
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: colors.brandGlowMid,
    },
    glowBottom: {
        position: 'absolute',
        bottom: -70,
        left: -90,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: colors.brandGlowWarm,
    },
});
