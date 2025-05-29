import React, { useEffect } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    Image,
    Pressable,
    StyleSheet,
    Dimensions,
    Alert,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { getAnalyticsPropsDeepLink, logEvent } from '../../../Common/hooks/logger';
import { usePromoCode } from './usePromoCode';
import { UE } from '../../../commonTypes';
import { useUserContext } from '../hooks/UserContext';
import { NavStack } from '../../../Common/Nav/NavStackType';

const { width } = Dimensions.get('window');

const WelcomeScreenModern = () => {
    const navigation = useNavigation<NavStack>();
    const promoCode = usePromoCode();
    const { updateSkippingWelcomeScreen, isSkippingWelcomeScreen } = useUserContext();

    useEffect(() => {
        if (isSkippingWelcomeScreen) {
            navigation.replace('Home');
        }
    }, [isSkippingWelcomeScreen]);

    const handleRegister = () => {
        if (promoCode?.deepLink) {
            logEvent(UE.WelcomeScreenRegisterClicked, getAnalyticsPropsDeepLink(promoCode.deepLink));
        }
        navigation.navigate('AuthNav', { screen: 'Login Form' });
    };

    const handleSkip = () => {
        updateSkippingWelcomeScreen(true);
        Alert.alert(
            'Limited Access',
            'Click top right person icon to log in later.'
        );
        navigation.replace('Home');
        if (promoCode?.deepLink) {
            logEvent(UE.WelcomeScreenSkipped, getAnalyticsPropsDeepLink(promoCode.deepLink));
        }
    };

    return (
        <LinearGradient
            colors={['#AB47BC', '#8E24AA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
        >
            <SafeAreaView style={styles.safe}>
                <View style={styles.content}>
                    <Image
                        source={require('../../../assets/logo.png')}
                        style={styles.logo}
                    />
                    <Text style={styles.title}>Welcome to PlayBuddy</Text>

                    <Text style={styles.subtitle}>
                        Register to unlock {'\n'}
                        <Text style={styles.flame}>🔥</Text>
                        <Text style={styles.highlight}>17+ events</Text>
                        <Text style={styles.flame}>🔥</Text>{'\n'}
                        and save favorites
                    </Text>
                    <Text style={styles.note}>* as per App Store rules</Text>

                    <Pressable
                        onPress={handleRegister}
                        style={({ pressed }) => [
                            styles.primaryButton,
                            pressed && styles.primaryButtonPressed,
                        ]}
                        android_ripple={{ color: '#00000020' }}
                        hitSlop={8}
                    >
                        <Text style={styles.primaryText}>Get started</Text>
                    </Pressable>

                    <Pressable
                        onPress={handleSkip}
                        style={({ pressed }) => [
                            styles.skipWrap,
                            pressed && styles.skipPressed,
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

export default WelcomeScreenModern;

const BUTTON_HEIGHT = 54;
const styles = StyleSheet.create({
    gradient: {
        flex: 1,
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
    logo: {
        width: 80,
        height: 80,
        marginBottom: 24,
        borderRadius: 16,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 18,
        color: '#F3E5F5',
        textAlign: 'center',
        lineHeight: 26,
        marginBottom: 8,
    },
    flame: {
        fontSize: 20,
    },
    highlight: {
        fontWeight: '700',
        color: '#FFF',
    },
    note: {
        fontSize: 12,
        color: '#E1BEE7',
        marginBottom: 32,
    },
    primaryButton: {
        width: width * 0.9,
        height: BUTTON_HEIGHT,
        borderRadius: BUTTON_HEIGHT / 2,
        backgroundColor: '#6A1B9A',
        justifyContent: 'center',
        alignItems: 'center',
        // subtle shadow
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOpacity: 0.2,
                shadowOffset: { width: 0, height: 4 },
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
        marginBottom: 16,
    },
    primaryButtonPressed: {
        opacity: 0.85,
    },
    primaryText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
    skipWrap: {
        paddingVertical: 8,
    },
    skipText: {
        color: '#E1BEE7',
        fontSize: 16,
        textDecorationLine: 'underline',
    },
    skipPressed: {
        opacity: 0.6,
    },
});
