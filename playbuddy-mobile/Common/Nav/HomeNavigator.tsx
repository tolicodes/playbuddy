import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useUserContext } from '../../Pages/Auth/hooks/UserContext';
import { TabNavigator } from './TabNavigator';
import { PromosEntryScreen } from '../../Pages/Entries/PromosEntryScreen';
import { CommunityEvents } from '../../Pages/Communities/CommunityEvents';
import { MunchDetails } from '../../Pages/Munches/MunchDetails';
import EventDetails from '../../Pages/Calendar/EventDetails/EventDetails';
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';
import AuthNav from '../../Pages/Auth/AuthNav';
import { headerOptions } from '../Header/Header';
import FacilitatorProfile from '../../Pages/Facilitators/FacilitatorProfile/FacilitatorProfile';
import EventsLoadingScreen from '../../components/EventsLoadingScreen';
import { navigateToAuth, navigateToHome, navigateToHomeStackScreen } from './navigationHelpers';
import { colors, gradients } from '../../components/styles';

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
    const navigation = useNavigation<NavigationProp<ParamListBase>>();
    const [isPromoScreenViewed, setIsPromoScreenViewed] = useState(false);

    const {
        isLoadingUserProfile,
        authUserId,
        isProfileComplete,
        isLoading,
        isError,
        currentDeepLink,
        hasFetchedSession,
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
                navigateToHomeStackScreen(navigation, 'PromoScreen');
                return;
            }

            // Weekly Picks
            if (currentDeepLink.type === 'weekly_picks') {
                navigateToHomeStackScreen(navigation, 'Weekly Picks');
                return;
            }

            if (currentDeepLink.type === 'facilitator_profile') {
                navigateToHomeStackScreen(navigation, 'Facilitator Profile', { facilitatorId: currentDeepLink.facilitator_id });
                return;
            }
        }

        // If the user has a profile but it's incomplete, navigate to ProfileDetails
        if (authUserId && !isProfileComplete) {
            navigateToAuth(navigation, 'Profile Details');
            return;
        }

        // If the user doesn't have a profile, navigate to Welcome
        if (!authUserId) {
            navigateToAuth(navigation, 'Welcome');
            return;
        }

        // Otherwise, we can go home
        navigateToHome(navigation);
        // important: we do NOT include isPromoScreenViewed in the dependency array
        // because we want to navigate to Home only if it starts out that way
        // not if it's transitioning from promo by an "Event Details" click
    }, [isLoadingUserProfile, authUserId, isProfileComplete, isLoading, isError, currentDeepLink, navigation]);

    const PromoScreenWrap = () => (
        <PromosEntryScreen onPromoScreenViewed={() => setIsPromoScreenViewed(true)} />
    );

    if (!hasFetchedSession || isLoadingUserProfile) {
        const isLoggedIn = !!authUserId;
        return (
            <EventsLoadingScreen
                title={isLoggedIn ? 'Loading events' : 'Loading PlayBuddy'}
                subtitle={isLoggedIn ? 'Curating your calendar' : 'Checking your account'}
            />
        );
    }

    return (
        <HomeStack.Navigator
            initialRouteName={authUserId ? 'Home' : 'AuthNav'}
            screenOptions={{
                headerShown: false,
                animation: 'none',
            }}
        >
            <HomeStack.Screen name="Home"
                component={TabNavigator} />
            <HomeStack.Screen name="AuthNav"
                component={AuthNav} />
            <HomeStack.Screen name="PromoScreen"
                component={PromoScreenWrap}
                options={({ navigation }) => headerOptions({ navigation, title: 'Welcome!', backToWelcome: true })}
            />

            <HomeStack.Screen name="Event Details"
                options={({ navigation }) => ({
                    ...headerOptions({
                        navigation,
                        title: 'Event Details',
                        backgroundColor: gradients.nav[0],
                    }),
                    cardStyle: { backgroundColor: colors.lavenderBackground },
                })}
                component={EventDetails} />

            {/* Detail Screens */}
            <HomeStack.Screen name="Community Events"
                options={({ navigation }) => headerOptions({ navigation, title: 'Events' })}
                component={CommunityEvents} />

            <HomeStack.Screen name="Munch Details"
                options={({ navigation }) => headerOptions({ navigation, title: 'Munch Details' })}
                component={MunchDetails} />


            <HomeStack.Screen name="Facilitator Profile"
                options={({ navigation }) => headerOptions({ navigation, title: 'Facilitator Profile' })}
                component={FacilitatorProfile} />
        </HomeStack.Navigator >
    );
}
