import React, { useEffect, useMemo, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';
import { useUserContext } from '../../Pages/Auth/hooks/UserContext';
import { TabNavigator } from './TabNavigator';
import AuthMainScreen from '../../Pages/Auth/screens/AuthMainScreen';
import { PromoScreen } from '../../Pages/Auth/screens/PromoScreen';
import { CommunityEvents } from '../../Pages/Communities/CommunityEvents';
import EventDetail from '../../Pages/Calendar/EventDetail';
import BuddyEvents from '../../Pages/Buddies/screens/BuddyEventsScreen';
import { useNavigation } from '@react-navigation/native';
import { NavStack } from './NavStackType';

const HomeStack = createStackNavigator();

export function HomeStackNavigator() {
    const [isPromoScreenViewed, setIsPromoScreenViewed] = useState(false);
    const navigation = useNavigation<NavStack>();
    const {
        isSkippingWelcomeScreen,
        isDefaultsComplete,
        isLoadingUserProfile,
        currentDeepLink,
    } = useUserContext();


    const initialHomeScreen = useMemo(() => {
        if (currentDeepLink && !isPromoScreenViewed) {
            if (
                currentDeepLink.type === 'organizer_promo_code' ||
                currentDeepLink.type === 'event_promo_code'
            ) {
                return 'PromoScreen';
            }
        }
        if (isDefaultsComplete || isSkippingWelcomeScreen) {
            return 'Home';
        }
        return 'Auth';
    }, [currentDeepLink, isPromoScreenViewed, isDefaultsComplete, isSkippingWelcomeScreen]);

    useEffect(() => {
        if (initialHomeScreen === 'PromoScreen') {
            console.log('initialHomeScreen', initialHomeScreen);
            navigation.navigate(initialHomeScreen as any);
        }
    }, [initialHomeScreen, navigation]);

    if (isLoadingUserProfile) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator />
            </View>
        );
    }

    const PromoScreenWrap = () => (
        <PromoScreen onPromoScreenViewed={() => setIsPromoScreenViewed(true)} />
    );

    return (
        <HomeStack.Navigator initialRouteName={initialHomeScreen} screenOptions={{ headerShown: false, }}>
            <HomeStack.Screen name="Home" component={TabNavigator} />
            <HomeStack.Screen name="Auth" component={AuthMainScreen} />
            <HomeStack.Screen name="PromoScreen" component={PromoScreenWrap} />

            <HomeStack.Screen name="Event Details" component={EventDetail} />
            <HomeStack.Screen name="Community Events" component={CommunityEvents} />
            <HomeStack.Screen name="Buddy Events" component={BuddyEvents} />
        </HomeStack.Navigator>
    );
}
