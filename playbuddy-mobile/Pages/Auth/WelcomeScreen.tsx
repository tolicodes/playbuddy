import React from 'react';
import {
    SafeAreaView,
    View,
    Text,
    Image,
    Pressable,
    StyleSheet,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { logEvent } from '../../Common/hooks/logger';
import { UE } from '../../userEventTypes';
import { useUserContext } from './hooks/UserContext';
import { NavStack } from '../../Common/Nav/NavStackType';
import { useEventAnalyticsProps } from '../../Common/hooks/useAnalytics';

const googleLogo = require('../../assets/auth/google-logo.png');
const appleLogo = require('../../assets/auth/apple-logo.png');

const WelcomeScreen = () => {
    const navigation = useNavigation<NavStack>();
    const { authenticateWithGoogle, authenticateWithApple } = useUserContext();
    const analyticsProps = useEventAnalyticsProps();

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
        navigation.navigate('AuthNav', { screen: 'Login Form' });
    };

    const handleSkip = () => {
        logEvent(UE.WelcomeScreenSkipped, analyticsProps);
        navigation.replace('Home');
    };

    return (
        <LinearGradient
            colors={['#5B1FB8', '#8E2ACB', '#C04FD4']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.gradient}
        >
            <View pointerEvents="none" style={styles.glowTop} />
            <View pointerEvents="none" style={styles.glowBottom} />
            <SafeAreaView style={styles.safe}>
                <View style={styles.content}>
                    <Text style={styles.title}>Welcome to PlayBuddy</Text>
                    <Text style={styles.subtitle}>
                        Sign up to unlock play parties and favorite events
                    </Text>
                    <Pressable
                        onPress={handleGoogle}
                        style={({ pressed }) => [
                            styles.googleButton,
                            pressed && styles.buttonPressed,
                        ]}
                        android_ripple={{ color: '#00000010' }}
                        hitSlop={8}
                    >
                        <Image source={googleLogo} style={styles.googleLogo} resizeMode="contain" />
                        <Text style={styles.googleText}>Sign in with Google</Text>
                    </Pressable>
                    {Platform.OS === 'ios' && (
                        <Pressable
                            onPress={handleApple}
                            style={({ pressed }) => [
                                styles.appleButton,
                                pressed && styles.buttonPressed,
                            ]}
                            android_ripple={{ color: '#00000010' }}
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
                        hitSlop={8}
                    >
                        <Text style={styles.emailText}>Sign up with email/phone</Text>
                    </Pressable>
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
                </View>
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
        top: -60,
        right: -70,
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: 'rgba(255,255,255,0.18)',
    },
    glowBottom: {
        position: 'absolute',
        bottom: -40,
        left: -80,
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: 'rgba(255,186,214,0.2)',
    },
    safe: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.85)',
        textAlign: 'center',
        marginBottom: 24,
    },
    googleButton: {
        width: '90%',
        maxWidth: 320,
        height: 48,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#FFFFFF',
        borderColor: 'rgba(0,0,0,0.08)',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
        elevation: 4,
        marginBottom: 10,
    },
    googleLogo: {
        width: 18,
        height: 18,
    },
    googleText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F1A2E',
    },
    appleButton: {
        width: '90%',
        maxWidth: 320,
        height: 48,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#111111',
        borderColor: '#111111',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
        elevation: 4,
    },
    appleLogo: {
        width: 18,
        height: 18,
        tintColor: '#FFFFFF',
    },
    appleText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    emailButton: {
        width: '90%',
        maxWidth: 320,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.6)',
        marginTop: 12,
    },
    emailText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    skipButton: {
        marginTop: 14,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    skipText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 16,
        textDecorationLine: 'underline',
    },
    buttonPressed: {
        opacity: 0.88,
    },
});
