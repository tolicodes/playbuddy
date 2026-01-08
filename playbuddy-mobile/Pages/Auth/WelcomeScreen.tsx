import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    Image,
    Pressable,
    StyleSheet,
    Platform,
    ScrollView,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { logEvent } from '../../Common/hooks/logger';
import { UE } from '../../userEventTypes';
import { useUserContext } from './hooks/UserContext';
import { NavStack } from '../../Common/Nav/NavStackType';
import { useEventAnalyticsProps } from '../../Common/hooks/useAnalytics';
import { navigateToAuth, navigateToHome } from '../../Common/Nav/navigationHelpers';
import { colors, fontFamilies, fontSizes, gradients, lineHeights, radius, shadows, spacing } from '../../components/styles';

const googleLogo = require('../../assets/auth/google-logo.png');
const appleLogo = require('../../assets/auth/apple-logo.png');
const logoMark = require('../../assets/logo-transparent.png');

const WelcomeScreen = () => {
    const navigation = useNavigation<NavStack>();
    const { authenticateWithGoogle, authenticateWithApple } = useUserContext();
    const analyticsProps = useEventAnalyticsProps();
    const heroAnim = useRef(new Animated.Value(0)).current;
    const cardAnim = useRef(new Animated.Value(0)).current;
    const footerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.stagger(120, [
            Animated.timing(heroAnim, {
                toValue: 1,
                duration: 420,
                useNativeDriver: true,
            }),
            Animated.timing(cardAnim, {
                toValue: 1,
                duration: 420,
                useNativeDriver: true,
            }),
            Animated.timing(footerAnim, {
                toValue: 1,
                duration: 360,
                useNativeDriver: true,
            }),
        ]).start();
    }, [heroAnim, cardAnim, footerAnim]);

    const heroTranslate = heroAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [18, 0],
    });
    const cardTranslate = cardAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [22, 0],
    });
    const footerTranslate = footerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [12, 0],
    });

    const handleGoogle = () => {
        logEvent(UE.LoginFormPressLoginWithGoogle, analyticsProps);
        authenticateWithGoogle();
    };

    const handleApple = () => {
        logEvent(UE.LoginFormPressLoginWithApple, analyticsProps);
        authenticateWithApple();
    };

    const handleEmail = () => {
        logEvent(UE.WelcomeScreenRegisterClicked, analyticsProps);
        navigateToAuth(navigation, 'Login Form');
    };

    const handleSkip = () => {
        logEvent(UE.WelcomeScreenSkipped, analyticsProps);
        navigateToHome(navigation);
    };

    return (
        <LinearGradient
            colors={gradients.welcome}
            locations={[0, 0.45, 0.78, 1]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.gradient}
        >
            <View pointerEvents="none" style={styles.glowTop} />
            <View pointerEvents="none" style={styles.glowMid} />
            <View pointerEvents="none" style={styles.glowBottom} />
            <SafeAreaView style={styles.safe}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <Animated.View
                        style={[
                            styles.hero,
                            { opacity: heroAnim, transform: [{ translateY: heroTranslate }] },
                        ]}
                    >
                        <View style={styles.logoHalo}>
                            <Image source={logoMark} style={styles.logo} resizeMode="contain" />
                        </View>
                        <Text style={styles.kicker}>Find your people</Text>
                        <Text style={styles.title}>Welcome to PlayBuddy</Text>
                        <Text style={styles.subtitle}>
                            Sign up to <Text style={styles.subtitleEmphasis}>favorite</Text> events and unlock{' '}
                            <Text style={styles.subtitleEmphasis}>play parties</Text> and 17+ events.
                        </Text>
                    </Animated.View>

                    <Animated.View
                        style={[
                            styles.cardWrap,
                            { opacity: cardAnim, transform: [{ translateY: cardTranslate }] },
                        ]}
                    >
                        <LinearGradient
                            colors={[colors.white, colors.surfaceLavenderLight]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.card}
                        >
                            <Pressable
                                onPress={handleGoogle}
                                style={({ pressed }) => [
                                    styles.socialButton,
                                    styles.googleButton,
                                    pressed && styles.buttonPressed,
                                ]}
                                android_ripple={{ color: colors.shadowSoft }}
                                hitSlop={8}
                            >
                                <Image source={googleLogo} style={styles.googleLogo} resizeMode="contain" />
                                <Text style={styles.socialText}>Sign in with Google</Text>
                            </Pressable>
                            {Platform.OS === 'ios' && (
                                <Pressable
                                    onPress={handleApple}
                                    style={({ pressed }) => [
                                        styles.socialButton,
                                        styles.appleButton,
                                        pressed && styles.buttonPressed,
                                    ]}
                                    android_ripple={{ color: colors.shadowSoft }}
                                    hitSlop={8}
                                >
                                    <Image source={appleLogo} style={styles.appleLogo} resizeMode="contain" />
                                    <Text style={styles.appleText}>Sign in with Apple</Text>
                                </Pressable>
                            )}
                            <Pressable
                                onPress={handleEmail}
                                style={({ pressed }) => [
                                    styles.emailButton,
                                    pressed && styles.buttonPressed,
                                ]}
                                android_ripple={{ color: colors.shadowSoft }}
                                hitSlop={8}
                            >
                                <LinearGradient
                                    colors={gradients.primaryButton}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.emailButtonGradient}
                                >
                                    <Text style={styles.emailText}>Sign up with email/phone</Text>
                                </LinearGradient>
                            </Pressable>
                        </LinearGradient>
                    </Animated.View>

                    <Animated.View
                        style={[
                            styles.skipWrap,
                            { opacity: footerAnim, transform: [{ translateY: footerTranslate }] },
                        ]}
                    >
                        <Pressable
                            onPress={handleSkip}
                            style={({ pressed }) => [
                                styles.skipButton,
                                pressed && styles.buttonPressed,
                            ]}
                            hitSlop={8}
                        >
                            <Text style={styles.skipText}>Skip for now</Text>
                        </Pressable>
                    </Animated.View>
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
};

export default WelcomeScreen;

const BUTTON_HEIGHT = 54;
const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
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
    safe: {
        flex: 1,
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: spacing.xxl,
        paddingTop: spacing.xxxl,
        paddingBottom: spacing.xxxl,
        justifyContent: 'center',
        alignItems: 'center',
    },
    hero: {
        alignItems: 'center',
        marginBottom: spacing.xl,
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
    kicker: {
        fontSize: fontSizes.sm,
        letterSpacing: 1.6,
        textTransform: 'uppercase',
        color: colors.textOnDarkMuted,
        marginBottom: spacing.sm,
        fontFamily: fontFamilies.body,
    },
    title: {
        fontSize: fontSizes.display,
        fontWeight: '700',
        color: colors.white,
        textAlign: 'center',
        marginBottom: spacing.sm,
        fontFamily: fontFamilies.display,
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: fontSizes.lg,
        fontWeight: '600',
        color: colors.white,
        textAlign: 'center',
        fontFamily: fontFamilies.body,
        maxWidth: 300,
        lineHeight: lineHeights.lg,
        marginTop: spacing.sm,
    },
    subtitleEmphasis: {
        fontWeight: '700',
    },
    cardWrap: {
        width: '100%',
        alignItems: 'center',
    },
    card: {
        width: '100%',
        maxWidth: 360,
        borderRadius: radius.hero,
        padding: spacing.lgPlus,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderOnDarkStrong,
        ...shadows.brandCard,
        elevation: 8,
    },
    socialButton: {
        width: '100%',
        alignSelf: 'center',
        height: BUTTON_HEIGHT,
        borderRadius: radius.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.white,
        borderColor: colors.borderSubtle,
        borderWidth: 1,
        marginBottom: spacing.smPlus,
    },
    googleLogo: {
        width: 18,
        height: 18,
        marginRight: spacing.smPlus,
    },
    googleButton: {
        backgroundColor: colors.white,
        borderColor: colors.borderSubtle,
    },
    appleButton: {
        backgroundColor: colors.black,
        borderColor: colors.black,
    },
    appleLogo: {
        width: 18,
        height: 18,
        tintColor: colors.white,
        marginRight: spacing.smPlus,
    },
    socialText: {
        fontSize: fontSizes.lg,
        fontWeight: '600',
        color: colors.heroDark,
        fontFamily: fontFamilies.body,
    },
    appleText: {
        fontSize: fontSizes.lg,
        fontWeight: '600',
        color: colors.white,
        fontFamily: fontFamilies.body,
    },
    emailButton: {
        width: '100%',
        alignSelf: 'center',
        height: 48,
        borderRadius: radius.md,
        overflow: 'hidden',
        marginTop: spacing.sm,
        borderWidth: 1,
        borderColor: colors.brandBright,
    },
    emailButtonGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: radius.md,
    },
    emailText: {
        fontSize: fontSizes.base,
        fontWeight: '600',
        color: colors.white,
        fontFamily: fontFamilies.body,
        letterSpacing: 0.2,
    },
    skipWrap: {
        marginTop: spacing.lgPlus,
        alignItems: 'center',
    },
    skipButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.lg,
        backgroundColor: colors.surfaceGlass,
        borderWidth: 1,
        borderColor: colors.borderOnDark,
    },
    skipText: {
        color: colors.white,
        fontSize: fontSizes.base,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    buttonPressed: {
        opacity: 0.85,
    },
});
