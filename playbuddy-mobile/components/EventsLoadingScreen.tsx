import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontFamilies, fontSizes, gradients, radius, shadows, spacing } from './styles';

const logoMark = require('../assets/logo-transparent.png');
const SERIF_CANDIDATES = Platform.select({
    ios: ['Didot', 'Bodoni 72', 'Hoefler Text', 'Palatino', 'Georgia', 'Baskerville'],
    android: ['serif'],
    default: ['serif'],
}) ?? ['serif'];

type EventsLoadingScreenProps = {
    title?: string;
    subtitle?: string;
};

const EventsLoadingScreen = ({
    title = 'PlayBuddy',
    subtitle = 'Curating your calendar...',
}: EventsLoadingScreenProps) => {
    const revealPadding = 4;
    const [lineTwoWidth, setLineTwoWidth] = useState(0);
    const lineOneOpacity = useRef(new Animated.Value(0)).current;
    const lineTwoReveal = useRef(new Animated.Value(0)).current;
    const [serifIndex, setSerifIndex] = useState(0);
    const serifFont = SERIF_CANDIDATES[Math.min(serifIndex, SERIF_CANDIDATES.length - 1)];

    useEffect(() => {
        Animated.timing(lineOneOpacity, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
        }).start();
    }, [lineOneOpacity]);

    useEffect(() => {
        if (!__DEV__ || SERIF_CANDIDATES.length < 2) {
            return;
        }

        const intervalId = setInterval(() => {
            setSerifIndex((prev) => (prev + 1) % SERIF_CANDIDATES.length);
        }, 1800);

        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        if (!lineTwoWidth) {
            return;
        }

        lineTwoReveal.setValue(0);
        const revealAnimation = Animated.loop(
            Animated.sequence([
                Animated.delay(180),
                Animated.timing(lineTwoReveal, {
                    toValue: lineTwoWidth + revealPadding,
                    duration: 1600,
                    useNativeDriver: false,
                }),
                Animated.delay(500),
                Animated.timing(lineTwoReveal, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: false,
                }),
            ])
        );

        revealAnimation.start();
        return () => revealAnimation.stop();
    }, [lineTwoWidth, lineTwoReveal]);

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
                <Text style={styles.brandTitle}>{title}</Text>
                <View style={styles.logoHalo}>
                    <Image source={logoMark} style={styles.logo} resizeMode="contain" />
                </View>
                <View style={styles.taglineGroup}>
                    <Animated.Text
                        style={[styles.taglineText, { opacity: lineOneOpacity, fontFamily: serifFont }]}
                        numberOfLines={1}
                    >
                        Find your people
                    </Animated.Text>
                    <View
                        style={[
                            styles.taglineLineWrap,
                            lineTwoWidth ? { width: lineTwoWidth + revealPadding } : undefined,
                        ]}
                    >
                        <Animated.View style={[styles.taglineReveal, { width: lineTwoReveal }]}>
                            <Text
                                style={[styles.taglineText, styles.taglineTextSpacing, { fontFamily: serifFont }]}
                                numberOfLines={1}
                                ellipsizeMode="clip"
                            >
                                Find your pleasure
                            </Text>
                        </Animated.View>
                        <Text
                            style={[styles.taglineText, styles.taglineTextSpacing, styles.taglineMeasure, { fontFamily: serifFont }]}
                            numberOfLines={1}
                            onLayout={(event) => {
                                const nextWidth = event.nativeEvent.layout.width;
                                if (nextWidth && nextWidth !== lineTwoWidth) {
                                    setLineTwoWidth(nextWidth);
                                }
                            }}
                        >
                            Find your pleasure
                        </Text>
                    </View>
                </View>
                <Text style={styles.subtitle}>{subtitle}</Text>
                <ActivityIndicator size="large" color={colors.white} style={styles.spinner} />
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
        backgroundColor: colors.surfaceGlass,
        borderWidth: 1,
        borderColor: colors.borderOnDark,
        ...shadows.brandCard,
    },
    logoHalo: {
        width: 82,
        height: 82,
        borderRadius: 41,
        backgroundColor: colors.surfaceGlass,
        borderWidth: 1,
        borderColor: colors.borderOnDark,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.mdPlus,
    },
    logo: {
        width: 50,
        height: 50,
    },
    brandTitle: {
        fontSize: fontSizes.display,
        fontWeight: '700',
        color: colors.white,
        fontFamily: fontFamilies.display,
        marginBottom: spacing.sm,
    },
    taglineGroup: {
        alignItems: 'center',
        marginTop: spacing.sm,
        marginBottom: spacing.xsPlus,
    },
    taglineLineWrap: {
        alignItems: 'flex-start',
    },
    taglineReveal: {
        overflow: 'hidden',
        alignItems: 'flex-start',
    },
    taglineText: {
        fontSize: fontSizes.basePlus,
        fontWeight: '600',
        color: colors.textOnDarkMuted,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    taglineTextSpacing: {
        marginTop: spacing.xs,
    },
    taglineMeasure: {
        position: 'absolute',
        opacity: 0,
    },
    subtitle: {
        marginTop: spacing.xs,
        fontSize: fontSizes.base,
        color: colors.textOnDarkMuted,
        fontFamily: fontFamilies.body,
    },
    spinner: {
        marginTop: spacing.lgPlus,
    },
});
