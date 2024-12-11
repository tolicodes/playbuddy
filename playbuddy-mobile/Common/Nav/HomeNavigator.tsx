import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { useUserContext } from '../../Pages/Auth/hooks/UserContext';
import { View } from "react-native";
import { ActivityIndicator } from "react-native";
import { TabNavigator } from "./TabNavigator";
import { DetailStackNavigator } from "./DetailsPageNavigator";
import AuthMainScreen from '../../Pages/Auth/screens/AuthMainScreen';
import { PromoScreen } from "../../Pages/Auth/screens/PromoScreen";

const HomeStack = createStackNavigator();

export function HomeStackNavigator() {
    const { isSkippingWelcomeScreen, isDefaultsComplete, isLoadingUserProfile, deepLinkParams: deepLinkParams } = useUserContext();

    if (isLoadingUserProfile) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#007aff" />
            </View>
        );
    }

    let HomeScreen;
    if (deepLinkParams && !isDefaultsComplete) {
        if (deepLinkParams.type === 'organizer_promo_code') {
            HomeScreen = PromoScreen;
        } else {
            throw new Error(`Unknown deep link type: ${deepLinkParams.type}`);
        }
    } else if (isDefaultsComplete || isSkippingWelcomeScreen) {
        HomeScreen = TabNavigator;
    } else {
        HomeScreen = AuthMainScreen;
    }

    return (
        <HomeStack.Navigator screenOptions={{ headerShown: false }}>
            <HomeStack.Screen name="HomeScreen" component={HomeScreen} />
            {/* Screens link Event Details  and Community Events */}
            <HomeStack.Screen name="Details" component={DetailStackNavigator} />
        </HomeStack.Navigator>
    );
}