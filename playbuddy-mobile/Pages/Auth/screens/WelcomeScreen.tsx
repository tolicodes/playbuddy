import React, { useEffect } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, Image, Dimensions, Linking } from 'react-native';
import HeaderLoginButton from '../Buttons/LoginButton';
import { getAnalyticsPropsDeepLink, logEvent } from '../../../Common/hooks/logger';
import { usePromoCode } from './usePromoCode';
import { PromoCode, UE } from '../../../commonTypes';
import { formatDiscount } from '../../Calendar/PromoCode';
import { useUserContext } from '../hooks/UserContext';
import { useNavigation } from '@react-navigation/native';
import { NavStack } from '../../../Common/Nav/NavStackType';

const { width } = Dimensions.get('window');

// Promo message for featured community discounts
const PromoBox = ({ promoCode, communityName }: { promoCode: PromoCode; communityName: string }) => (
    <View style={styles.promoBox}>
        <Text style={styles.promoText}>
            🎉 <Text style={styles.promoHighlight}>{formatDiscount(promoCode)}</Text> off <Text style={styles.promoHighlight}>{communityName}</Text>
        </Text>
    </View>
);

// City availability with email fallback
const CityAvailabilityBox = () => {
    const onPressEmail = async () => {
        const url = `mailto:pb@playbuddy.me?subject=I%20want%20to%20become%20a%20PlayBuddy%20City%20Ambassador!&body=Here%20is%20a%20list%20of%20my%20favorite%20organizers%3A`;
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
            Linking.openURL(url);
        } else {
            Alert.alert(
                'Please send your request to pb@playbuddy.me',
                'Subject: I want to become a PlayBuddy City Ambassador!'
            );
        }
    };

    return (
        <View style={styles.cityBox}>
            <Text style={styles.cityHeader}>🗽 NYC Only 🗽</Text>
            <Text style={styles.cityText}>
                Launching city by city to ensure every event is <Text style={styles.boldText}>vetted</Text> and top-quality.
            </Text>
            <TouchableOpacity style={styles.cityButton} onPress={onPressEmail} activeOpacity={0.7}>
                <Text style={styles.cityButtonText}>Become a City Ambassador</Text>
            </TouchableOpacity>
        </View>
    );
};

const WelcomeScreen = () => {
    const promoCode = usePromoCode();
    const { updateSkippingWelcomeScreen, isSkippingWelcomeScreen } = useUserContext();
    const navigation = useNavigation<NavStack>();

    useEffect(() => {
        if (isSkippingWelcomeScreen) navigation.replace('Home');
    }, [isSkippingWelcomeScreen]);

    const handleRegister = () => {
        if (promoCode?.deepLink) logEvent(UE.WelcomeScreenRegisterClicked, getAnalyticsPropsDeepLink(promoCode.deepLink));
        navigation.navigate('Login Form');
    };

    const handleSkip = () => {
        updateSkippingWelcomeScreen(true);
        Alert.alert(
            'Limited Access',
            'You can always log in later from the menu to unlock all events.'
        );
        navigation.replace('Home');
        if (promoCode?.deepLink) logEvent(UE.WelcomeScreenSkipped, getAnalyticsPropsDeepLink(promoCode.deepLink));
    };

    return (
        <ScrollView contentContainerStyle={styles.container} bounces={false}>
            <Image source={require('../../../assets/logo.png')} style={styles.logo} />
            <Text style={styles.title}>Welcome to PlayBuddy</Text>

            {promoCode?.featuredPromoCode && (
                <PromoBox
                    promoCode={promoCode.featuredPromoCode}
                    communityName={promoCode.organizer?.name || ''}
                />
            )}

            <View style={styles.card}>
                <Text style={styles.subtitle}>
                    App Store policy limits
                    {'\n'}🔥 <Text style={styles.spicy}>Spicy Events</Text> 🔥
                    {'\n'}
                    Create an account to unlock all events!
                </Text>
                <HeaderLoginButton size={60} showLoginText register onPressButton={handleRegister} />
                <TouchableOpacity onPress={handleSkip} style={styles.skipButton} activeOpacity={0.7}>
                    <Text style={styles.skipText}>Skip for now</Text>
                </TouchableOpacity>
            </View>

            <CityAvailabilityBox />

        </ScrollView>
    );
};

export default WelcomeScreen;

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#FFF',
    },
    logo: {
        width: 80,
        height: 80,
        marginBottom: 20,
        borderRadius: 12,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        color: '#333',
        marginBottom: 24,
        textAlign: 'center',
    },
    promoBox: {
        backgroundColor: '#D8F3DC',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 16,
        marginBottom: 20,
        width: width * 0.9,
        alignItems: 'center',
    },
    promoText: {
        fontSize: 18,
        color: '#1B4332',
        textAlign: 'center',
    },
    promoHighlight: {
        fontWeight: '700',
        color: '#1B9C85',
    },
    cityBox: {
        backgroundColor: '#EEF5FF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        width: width * 0.9,
        alignItems: 'center',
        marginTop: 20,
    },
    cityHeader: {
        fontSize: 18,
        fontWeight: '600',
        color: '#00509D',
        marginBottom: 6,
    },
    cityText: {
        fontSize: 15,
        color: '#333',
        textAlign: 'center',
        marginBottom: 12,
    },
    cityButton: {
        backgroundColor: '#00509D',
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 24,
    },
    cityButtonText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '600',
    },
    card: {
        backgroundColor: '#FFF',
        padding: 24,
        borderRadius: 20,
        width: width * 0.9,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 6,
        alignItems: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#4C4C4C',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 22,
    },
    spicy: {
        fontWeight: '700',
        color: '#FF4500',
    },
    skipButton: {
        marginTop: 16,
        paddingVertical: 10,
    },
    skipText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '500',
    },
    boldText: {
        fontWeight: 'bold',
    },
});
