import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';
import { useUserContext } from '../../Pages/Auth/hooks/UserContext';
import { TabNavigator } from './TabNavigator';
import { PromoScreen } from '../../Pages/Auth/screens/Promo/PromoScreen';
import { CommunityEvents } from '../../Pages/Communities/CommunityEvents';
import EventDetail from '../../Pages/Calendar/EventDetail';
import { useNavigation } from '@react-navigation/native';
import { NavStack } from './NavStackType';
import AuthNav from '../../Pages/Auth/screens/AuthNav';
import { headerOptions } from '../Header/Header';

const HomeStack = createStackNavigator();
/**
 * HomeStackNavigator is the main navigator for the app.
 * It handles routing based on the user's authentication state,
 * profile completion status, and deeplinks.
 * 
 * Flow:
 * 1. Shows loading indicator while profile is loading
 * 2. Handles deeplinks (promo codes, weekly picks)
 * 3. Routes to profile completion if needed
 * 4. Routes to welcome screen for new users
 * 5. Routes to home for authenticated users
 * 
 * Screens:
 * - Home: Main tab navigator
 * - AuthNav: Authentication flow
 * - PromoScreen: Promotional content
 * - Weekly Picks: Featured events
 * - Event Details: Single event view
 * - Community Events: Events for a specific community
 * - Buddy Events: Events for a buddy's wishlist
 */
export function HomeStackNavigator() {
    const navigation = useNavigation<NavStack>();
    const [isPromoScreenViewed, setIsPromoScreenViewed] = useState(false);

    const {
        isLoadingUserProfile,
        authUserId,
        isProfileComplete,
        isLoading,
        isError,
        isSkippingWelcomeScreen,
        currentDeepLink,
    } = useUserContext();

    useEffect(() => {
        if (isLoading || isError || isLoadingUserProfile) {
            return;
        }

        // First we look for deeplinks
        // If we find one, and they haven't seen it yet
        if (currentDeepLink && !isPromoScreenViewed) {
            // Regular promo codes
            if (
                currentDeepLink.type === 'organizer_promo_code' ||
                currentDeepLink.type === 'event_promo_code'
            ) {
                navigation.navigate('PromoScreen');
                return;
            }

            // Weekly Picks
            if (currentDeepLink.type === 'weekly_picks') {
                navigation.navigate('Weekly Picks');
                return;
            }
        }

        // If the user has a profile but it's incomplete, navigate to ProfileDetails
        if (authUserId && !isProfileComplete) {
            navigation.navigate('AuthNav', { screen: 'Profile Details' });
            return;
        }

        // Whether or not they have a profile, if they skipped the welcome screen, navigate to Home
        if (isSkippingWelcomeScreen) {
            navigation.navigate('Home');
            return;
        }

        // If the user doesn't have a profile, navigate to Welcome
        if (!authUserId) {
            navigation.navigate('AuthNav', { screen: 'Welcome' });
            return;
        }

        // Otherwise, we can go home
        navigation.navigate('Home');
        // important: we do NOT include isPromoScreenViewed in the dependency array
        // because we want to navigate to Home only if it starts out that way
        // not if it's transitioning from promo by an "Event Details" click
    }, [isLoadingUserProfile, authUserId, isProfileComplete, isLoading, isError, isSkippingWelcomeScreen, currentDeepLink, navigation]);

    const PromoScreenWrap = () => (
        <PromoScreen onPromoScreenViewed={() => setIsPromoScreenViewed(true)} />
    );

    if (isLoadingUserProfile) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator />
            </View>
        );
    }

    return (
        <HomeStack.Navigator screenOptions={{ headerShown: false }}>
            <HomeStack.Screen name="Home"
                component={TabNavigator} />
            <HomeStack.Screen name="AuthNav"
                component={AuthNav} />
            <HomeStack.Screen name="PromoScreen"
                component={PromoScreenWrap}
                options={headerOptions({ navigation, title: 'Welcome!', backToWelcome: true })}
            />

            <HomeStack.Screen name="Event Details"
                options={headerOptions({ navigation, title: 'Event Details' })}
                component={EventDetail} />

            {/* Detail Screens */}
            <HomeStack.Screen name="Community Events"
                options={headerOptions({ navigation, title: 'Events' })}
                component={CommunityEvents} />
        </HomeStack.Navigator >
    );
}
