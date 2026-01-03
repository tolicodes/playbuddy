import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontFamilies, fontSizes, gradients, radius, spacing } from './styles';

const logoMark = require('../assets/logo-transparent.png');

type EventsLoadingScreenProps = {
    title?: string;
    subtitle?: string;
};

const EventsLoadingScreen = ({
    title = 'Loading events',
    subtitle = 'Curating your calendar',
}: EventsLoadingScreenProps) => {
    return (
        <LinearGradient
            colors={gradients.welcome}
            locations={[0, 0.45, 0.78, 1]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.container}
        >
            <View pointerEvents="none" style={styles.glowOne} />
            <View pointerEvents="none" style={styles.glowTwo} />
            <View style={styles.card}>
                <View style={styles.logoHalo}>
                    <Image source={logoMark} style={styles.logo} resizeMode="contain" />
                </View>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
                <ActivityIndicator size="large" color="#FFFFFF" style={styles.spinner} />
            </View>
        </LinearGradient>
    );
};

export default EventsLoadingScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    glowOne: {
        position: 'absolute',
        top: -80,
        right: -90,
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: colors.brandGlowTop,
    },
    glowTwo: {
        position: 'absolute',
        bottom: -90,
        left: -90,
        width: 280,
        height: 280,
        borderRadius: 140,
        backgroundColor: colors.brandGlowWarm,
    },
    card: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
        paddingHorizontal: spacing.xxxl,
        borderRadius: radius.hero,
        backgroundColor: 'rgba(255,255,255,0.16)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.35)',
        shadowColor: '#220b3d',
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 12 },
        shadowRadius: 20,
        elevation: 6,
    },
    logoHalo: {
        width: 82,
        height: 82,
        borderRadius: 41,
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.mdPlus,
    },
    logo: {
        width: 50,
        height: 50,
    },
    title: {
        fontSize: fontSizes.title,
        fontWeight: '700',
        color: '#FFFFFF',
        fontFamily: fontFamilies.display,
    },
    subtitle: {
        marginTop: spacing.sm,
        fontSize: fontSizes.base,
        color: 'rgba(255,255,255,0.85)',
        fontFamily: fontFamilies.body,
    },
    spinner: {
        marginTop: spacing.lgPlus,
    },
});
