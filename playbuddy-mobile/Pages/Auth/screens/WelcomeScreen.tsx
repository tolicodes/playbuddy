import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import HeaderLoginButton from '../Buttons/LoginButton';
import { getAnalyticsPropsDeepLink, logEvent } from '../../../Common/hooks/logger';
import CheckBox from '@rneui/themed/dist/CheckBox';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { usePromoCode } from './usePromoCode';
import { PromoCode, UE } from '../../../commonTypes';
import { formatDiscount } from '../../Calendar/PromoCode';
import { useUserContext } from '../hooks/UserContext';


const features = [
    { id: '1', title: 'My Calendar', description: 'Add events to plan your week', icon: 'heart' },
    { id: '2', title: 'Buddies', description: 'Share your calendar & coordinate plans', icon: 'user-friends' },
    { id: '3', title: 'Communities', description: 'Join groups with private events', icon: 'users' },
    { id: '4', title: 'Swipe Mode', description: 'Swipe through events to plan your week', icon: 'layer-group' },
    { id: '5', title: 'Personalization', description: 'Set your home location and community', icon: 'map-marker-alt' }
];


const PromoBox = ({ promoCode, communityName }: { promoCode: PromoCode, communityName: string }) => {
    return (
        <View style={promoBoxStyles.promoBox}>
            <Text style={promoBoxStyles.promoText}>
                Congrats! You get <Text style={promoBoxStyles.discountText}>{formatDiscount(promoCode)} {communityName}&apos;s</Text> Events! Create an account below
            </Text>
        </View>
    );
};

const promoBoxStyles = StyleSheet.create({
    promoBox: {
        backgroundColor: '#FFD700', // Bright yellow background
        padding: 10, // Increased padding for a more spacious look
        borderRadius: 10, // More rounded corners for a softer appearance
        marginBottom: 10, // Slightly larger margin for better spacing
        elevation: 10, // More pronounced raised effect for Android
        shadowColor: '#000', // Shadow color for iOS
        shadowOffset: { width: 0, height: 4 }, // Larger shadow offset for iOS
        shadowOpacity: 0.3, // Increased shadow opacity for iOS
        shadowRadius: 5, // Larger shadow radius for a more diffused shadow on iOS
    },
    promoText: {
        fontSize: 14, // Larger font size for better readability
        textAlign: 'center',
        color: '#000', // Black text color for better contrast
    },
    discountText: {
        color: '#000', // Black color for the discount text
        fontWeight: 'bold', // Bold text for emphasis on discount
    },
    linkText: {
        fontSize: 18, // Larger font size for consistency
        textAlign: 'center',
        color: '#007AFF',
        fontWeight: 'bold', // Bold link text for emphasis
        textDecorationLine: 'underline', // Underline for link text to indicate interactivity
    }
});

export const WelcomeScreen = ({ onClickRegister, onClickSkip }: { onClickRegister: () => void, onClickSkip: () => void }) => {
    const promoCode = usePromoCode();

    const doOnClickRegister = () => {
        if (promoCode?.deepLink) {
            logEvent(UE.WelcomeScreenRegisterClicked, {
                // May have deep link or not
                ...(promoCode.deepLink ? getAnalyticsPropsDeepLink(promoCode.deepLink) : {}),
            });
        }
        onClickRegister();
    }

    const doOnClickSkip = () => {
        Alert.alert('We can only show you 20% of events if you skip due to App Store guidelines. Please confirm that you understand that an account is required to see most content ');
        onClickSkip();

        logEvent(UE.WelcomeScreenSkipped, {
            // May have deep link or not
            ...(promoCode?.deepLink ? getAnalyticsPropsDeepLink(promoCode.deepLink) : {}),
        });
    }

    return (
        <View style={styles.container}>
            <Text style={styles.welcomeTitle}>Welcome to PlayBuddy!</Text>

            {promoCode?.featuredPromoCode && <PromoBox
                promoCode={promoCode.featuredPromoCode}
                communityName={promoCode.organizer?.name || ''}
            />}

            <FlatList
                data={features}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.featureItem}>
                        <FAIcon name={item.icon as any} size={24} color="#007AFF" style={styles.featureIcon} />
                        <View style={styles.featureTextContainer}>
                            <Text style={styles.featureTitle}>{item.title}</Text>
                            <Text style={styles.featureDescription}>{item.description}</Text>
                        </View>
                    </View>
                )}
            />

            <Text style={styles.whyRegister}>
                To comply with local laws and app store guidelines, please create an account.
            </Text>

            <View style={styles.loginButtonContainer}>
                <HeaderLoginButton size={50} showLoginText={true} register={true} onPressButton={doOnClickRegister} />
            </View>

            <TouchableOpacity style={styles.noThanksButton} onPress={doOnClickSkip}>
                <Text style={styles.noThanksText}>Skip for now</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    welcomeTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        marginBottom: 10
    },
    whyRegister: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20
    },
    highlightedText: {
        fontWeight: 'bold',
        color: '#007AFF'
    },
    loginButtonContainer: {
        marginTop: 10
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0'
    },
    featureIcon: {
        marginRight: 10,
        width: 30,
        textAlign: 'center'
    },
    featureTextContainer: {
        flex: 1
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333'
    },
    featureDescription: {
        fontSize: 14,
        color: '#666'
    },
    noThanksButton: {
        paddingVertical: 10,
        alignItems: 'center',
        color: '#666'
    },
    noThanksText: {
        fontSize: 16,
        color: '#333'
    },
    checkboxContainer: {
        padding: 20
    },
    skipText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center'
    }
});
