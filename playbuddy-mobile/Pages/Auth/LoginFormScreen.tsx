import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    View,
    StyleSheet,
    Text,
    SafeAreaView,
    Pressable,
    Image,
    Platform,
    StyleProp,
    ViewStyle,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserContext } from './hooks/UserContext';
import { EmailLogin } from './EmailLogin';
import { PhoneLogin } from './PhoneLogin';
import { useAnalyticsProps } from '../../Common/hooks/useAnalytics';
import { logEvent } from '../../Common/hooks/logger';
import { UE } from '../../userEventTypes';
import { colors, fontFamilies, fontSizes, gradients, radius, spacing } from '../../components/styles';

const googleLogo = require('../../assets/auth/google-logo.png');
const appleLogo = require('../../assets/auth/apple-logo.png');
const logoMark = require('../../assets/logo-transparent.png');

const SocialButton = ({
    label,
    onPress,
    variant,
    style,
}: {
    label: string;
    onPress: () => void;
    variant: 'google' | 'apple';
    style?: StyleProp<ViewStyle>;
}) => {
    const isApple = variant === 'apple';
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.socialButton,
                isApple ? styles.appleButton : styles.googleButton,
                style,
                pressed && styles.socialButtonPressed,
            ]}
        >
            <Image
                source={isApple ? appleLogo : googleLogo}
                style={[styles.socialIcon, isApple && styles.appleIcon]}
                resizeMode="contain"
            />
            <Text style={[styles.socialText, isApple && styles.appleText]}>{label}</Text>
        </Pressable>
    );
};

const GoogleLogin: React.FC = () => {
    const { authenticateWithGoogle } = useUserContext();
    const analyticsProps = useAnalyticsProps();
    const handleGoogleLogin = () => {
        logEvent(UE.LoginFormPressLoginWithGoogle, analyticsProps);
        authenticateWithGoogle();
    }
    return (
        <SocialButton
            label="Sign in with Google"
            onPress={handleGoogleLogin}
            variant="google"
            style={styles.socialButtonSpacing}
        />
    );
};

const AppleLogin: React.FC = () => {
    const { authenticateWithApple } = useUserContext();
    const analyticsProps = useAnalyticsProps();
    const handleAppleLogin = () => {
        logEvent(UE.LoginFormPressLoginWithApple, analyticsProps);
        authenticateWithApple();
    }
    return (
        <SocialButton
            label="Sign in with Apple"
            onPress={handleAppleLogin}
            variant="apple"
        />
    );
};

const LoginFormScreen: React.FC = () => {
    const [showEmailLogin, setShowEmailLogin] = useState<boolean>(true);
    const heroAnim = useRef(new Animated.Value(0)).current;
    const ssoAnim = useRef(new Animated.Value(0)).current;
    const formAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const buildTiming = (anim: Animated.Value) => Animated.timing(anim, {
            toValue: 1,
            duration: 520,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        });

        Animated.stagger(120, [buildTiming(heroAnim), buildTiming(ssoAnim), buildTiming(formAnim)]).start();
    }, [formAnim, heroAnim, ssoAnim]);

    const buildEnterStyle = (anim: Animated.Value, offset = 16) => ({
        opacity: anim,
        transform: [
            {
                translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [offset, 0],
                }),
            },
        ],
    });

    return (
        <LinearGradient
            colors={gradients.auth}
            start={{ x: 0.1, y: 0.05 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.gradient}
        >
            <View pointerEvents="none" style={styles.glowTop} />
            <View pointerEvents="none" style={styles.glowBottom} />
            <SafeAreaView style={styles.safe}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <Animated.View style={[styles.hero, buildEnterStyle(heroAnim, 18)]}>
                        <View style={styles.logoHalo}>
                            <Image source={logoMark} style={styles.logo} resizeMode="contain" />
                        </View>
                    </Animated.View>
                    <Animated.View style={[styles.ssoGroup, buildEnterStyle(ssoAnim, 16)]}>
                        <View style={styles.ssoCard}>
                            <View style={styles.ssoHeader}>
                                <Text style={styles.ssoTitle}>Continue with</Text>
                                <View style={styles.ssoBadge}>
                                    <Text style={styles.ssoBadgeText}>Secure</Text>
                                </View>
                            </View>
                            <GoogleLogin />
                            {Platform.OS === 'ios' && <AppleLogin />}
                        </View>
                        <View style={styles.orContainer}>
                            <View style={styles.orLine} />
                            <Text style={styles.orText}>or</Text>
                            <View style={styles.orLine} />
                        </View>
                    </Animated.View>
                    <Animated.View style={[styles.authContainer, buildEnterStyle(formAnim, 14)]}>
                        {showEmailLogin
                            ? <EmailLogin onSwitchToPhone={() => setShowEmailLogin(false)} />
                            : <PhoneLogin onSwitchToEmail={() => setShowEmailLogin(true)} />
                        }
                    </Animated.View>
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    glowTop: {
        position: 'absolute',
        top: -140,
        right: -120,
        width: 320,
        height: 320,
        borderRadius: 160,
        backgroundColor: 'rgba(255,255,255,0.16)',
    },
    glowBottom: {
        position: 'absolute',
        bottom: -150,
        left: -130,
        width: 340,
        height: 340,
        borderRadius: 170,
        backgroundColor: 'rgba(255,186,214,0.22)',
    },
    safe: {
        flex: 1,
    },
    content: {
        paddingHorizontal: spacing.lgPlus,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xxxl,
        alignItems: 'center',
    },
    hero: {
        alignItems: 'center',
        marginBottom: spacing.mdPlus,
        maxWidth: 320,
    },
    logoHalo: {
        width: 74,
        height: 74,
        borderRadius: 37,
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 0,
    },
    logo: {
        width: 48,
        height: 48,
    },
    ssoGroup: {
        width: '100%',
        maxWidth: 360,
    },
    ssoCard: {
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderRadius: radius.xxl,
        padding: spacing.lgPlus,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.7)',
        shadowColor: '#1E0B3D',
        shadowOpacity: 0.18,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 16,
        elevation: 6,
        width: '100%',
    },
    ssoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    ssoTitle: {
        fontSize: fontSizes.base,
        fontWeight: '600',
        color: '#2C1A4A',
        fontFamily: fontFamilies.body,
        letterSpacing: 0.2,
    },
    ssoBadge: {
        paddingHorizontal: spacing.smPlus,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: 'rgba(91,31,184,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(91,31,184,0.22)',
    },
    ssoBadgeText: {
        fontSize: fontSizes.xs,
        fontWeight: '600',
        color: '#5B1FB8',
        fontFamily: fontFamilies.body,
        letterSpacing: 0.4,
    },
    orContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.lgPlus,
        marginBottom: spacing.lgPlus,
        width: '100%',
    },
    orLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.45)',
    },
    orText: {
        marginHorizontal: spacing.smPlus,
        fontSize: fontSizes.sm,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.78)',
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontFamily: fontFamilies.body,
    },
    authContainer: {
        marginBottom: 12,
        width: '100%',
        maxWidth: 360,
    },
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        borderRadius: radius.lg,
        paddingVertical: spacing.mdPlus,
        paddingHorizontal: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLavender,
    },
    socialButtonPressed: {
        opacity: 0.88,
        transform: [{ scale: 0.99 }],
    },
    socialButtonSpacing: {
        marginBottom: spacing.md,
    },
    googleButton: {
        backgroundColor: '#FFFFFF',
        borderColor: colors.borderLavender,
    },
    appleButton: {
        backgroundColor: '#111111',
        borderColor: '#111111',
    },
    socialIcon: {
        width: 18,
        height: 18,
        marginRight: spacing.smPlus,
    },
    appleIcon: {
        tintColor: '#FFFFFF',
    },
    socialText: {
        fontSize: fontSizes.basePlus,
        fontWeight: '600',
        color: '#1F1A2E',
        fontFamily: fontFamilies.body,
    },
    appleText: {
        color: '#FFFFFF',
    },
});

export default LoginFormScreen;
