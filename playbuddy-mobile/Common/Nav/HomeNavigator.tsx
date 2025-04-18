import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';
import { useUserContext } from '../../Pages/Auth/hooks/UserContext';
import { TabNavigator } from './TabNavigator';
import { DetailStackNavigator } from './DetailsPageNavigator';
import AuthMainScreen from '../../Pages/Auth/screens/AuthMainScreen';
import { PromoScreen } from '../../Pages/Auth/screens/PromoScreen';

const HomeStack = createStackNavigator();

export function HomeStackNavigator() {
    const {
        isSkippingWelcomeScreen,
        isDefaultsComplete,
        isLoadingUserProfile,
        currentDeepLink,
    } = useUserContext();
    const [isPromoScreenViewed, setIsPromoScreenViewed] = useState(false);

    if (isLoadingUserProfile) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator />
            </View>
        );
    }

    // Instead of trying to swap the home screen component on the fly,
    // decide the initial home screen based on the current state.
    // When the user finishes with the promo screen, perform a navigation reset.
    const determineHomeScreen = () => {
        if (currentDeepLink && !isPromoScreenViewed) {
            if (
                currentDeepLink.type === 'organizer_promo_code' ||
                currentDeepLink.type === 'event_promo_code'
            ) {
                return 'PromoScreen';
            }
        }
        if (isDefaultsComplete || isSkippingWelcomeScreen) {
            return 'TabNavigator';
        }
        return 'AuthMainScreen';
    };

    const initialScreen = determineHomeScreen();

    const PromoScreenWrap = () => (
        <PromoScreen onPromoScreenViewed={() => setIsPromoScreenViewed(true)} />
    );

    return (
        <HomeStack.Navigator screenOptions={{ headerShown: false }}>
            {initialScreen === 'PromoScreen' ? (
                <HomeStack.Screen name="HomeScreen" component={PromoScreenWrap} />
            ) : initialScreen === 'TabNavigator' ? (
                <HomeStack.Screen name="HomeScreen" component={TabNavigator} />
            ) : (
                <HomeStack.Screen name="HomeScreen" component={AuthMainScreen} />
            )}
            <HomeStack.Screen name="Details" component={DetailStackNavigator} />
        </HomeStack.Navigator>
    );
}
