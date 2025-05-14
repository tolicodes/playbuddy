import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image, Dimensions } from 'react-native';
import HeaderLoginButton from '../Buttons/LoginButton';
import { getAnalyticsPropsDeepLink, logEvent } from '../../../Common/hooks/logger';
import { usePromoCode } from './usePromoCode';
import { PromoCode, UE } from '../../../commonTypes';
import { formatDiscount } from '../../Calendar/PromoCode';
import { useUserContext } from '../hooks/UserContext';
import { useNavigation } from '@react-navigation/native';
import { NavStack } from '../../../Common/Nav/NavStackType';

const { width } = Dimensions.get('window');

const PromoBox = ({ promoCode, communityName }: { promoCode: PromoCode, communityName: string }) => (
    <View style={styles.promoBox}>
        <Text style={styles.promoText}>
            🎉 Enjoy <Text style={styles.promoHighlight}>{formatDiscount(promoCode)}</Text> off <Text style={styles.promoHighlight}>{communityName}</Text> events!
        </Text>
    </View>
);

const WelcomeScreen = () => {
    const promoCode = usePromoCode();
    const { updateSkippingWelcomeScreen } = useUserContext();
    const navigation = useNavigation<NavStack>();

    const { isSkippingWelcomeScreen } = useUserContext();

    useEffect(() => {
        if (isSkippingWelcomeScreen) {
            navigation.navigate('Home');
        }
    }, [isSkippingWelcomeScreen]);

    const handleRegister = () => {
        if (promoCode?.deepLink) {
            logEvent(UE.WelcomeScreenRegisterClicked, getAnalyticsPropsDeepLink(promoCode.deepLink));
        }
        navigation.navigate('Login Form');
    };

    const handleSkip = () => {
        Alert.alert(
            'Limited Access',
            'You can always go back to "Login" in the Left menu to create an account'
        );
        updateSkippingWelcomeScreen(true);
        navigation.navigate('Home');

        if (promoCode?.deepLink) {
            logEvent(UE.WelcomeScreenSkipped, getAnalyticsPropsDeepLink(promoCode.deepLink));
        }
    };

    return (
        <View style={styles.container}>
            <Image source={require('../../../assets/logo.png')} style={styles.logo} />

            <Text style={styles.title}>Welcome to PlayBuddy</Text>

            {promoCode?.featuredPromoCode && (
                <PromoBox promoCode={promoCode.featuredPromoCode} communityName={promoCode.organizer?.name || ''} />
            )}

            <View style={styles.card}>
                <Text style={styles.subtitle}>
                    App Store policy limits{'\n'}
                    🔥 <Text style={styles.spicyHighlight}>Spicy Events</Text> 🔥{'\n'}
                    Create an account to unlock all!
                </Text>

                <HeaderLoginButton size={60} showLoginText register onPressButton={handleRegister} />

                <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                    <Text style={styles.skipText}>Skip for now</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default WelcomeScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        backgroundColor: 'white',
    },
    logo: {
        width: 80,
        height: 80,
        marginBottom: 15,
        borderRadius: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#333',
        marginBottom: 15,
        textAlign: 'center',
    },
    promoBox: {
        backgroundColor: '#D8F3DC',
        padding: 20,
        borderRadius: 18,
        marginBottom: 25,
        width: width * 0.9,
        borderLeftWidth: 7,
        borderLeftColor: '#1B9C85',
        shadowColor: '#1B9C85',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    promoText: {
        textAlign: 'center',
        fontSize: 17,
        color: '#1B4332',
        lineHeight: 24,
    },
    promoHighlight: {
        fontWeight: 'bold',
        color: '#1B9C85',
    },
    card: {
        backgroundColor: '#fff',
        padding: 26,
        borderRadius: 22,
        width: width * 0.9,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 9,
        elevation: 7,
        alignItems: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 25,
        lineHeight: 24,
    },
    policyHighlight: {
        fontWeight: '700',
        color: '#D72638',
    },
    spicyHighlight: {
        fontWeight: '700',
        color: '#FF4500',
    },
    skipButton: {
        marginTop: 22,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
        backgroundColor: '#f4f4f4',
    },
    skipText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '500',
    },
    subtitle: {
        fontSize: 17,
        color: '#4C4C4C',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 26,
    },
});