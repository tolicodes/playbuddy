import React, { useCallback, useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useUserContext } from '../../Pages/Auth/hooks/UserContext';
import { useCalendarContext } from '../../Pages/Calendar/hooks/CalendarContext';
import { TabNavigator } from './TabNavigator';
import { PromosEntryScreen } from '../../Pages/Entries/PromosEntryScreen';
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';
import AuthNav from '../../Pages/Auth/AuthNav';
import { headerOptions } from '../Header/Header';
import EventsLoadingScreen from '../../components/EventsLoadingScreen';
import { navigateToAuth, navigateToHome, navigateToHomeStackScreen } from './navigationHelpers';
import { navigationRef } from './navigationRef';

const HomeStack = createStackNavigator();
/**
 * HomeStackNavigator is the main navigator for the app.
 * It handles routing based on the user's authentication state,
 * profile completion status, and deeplinks.
 * 
 * Flow:
 * 1. Shows loading indicator while profile or events are loading
 * 2. Handles deeplinks (promo codes, weekly picks)
 * 3. Routes to profile completion if needed
 * 4. Routes to welcome screen for new users
 * 5. Routes to home for authenticated users
 * 
 * Screens:
 * - Home: Main tab navigator (nested stacks host detail screens)
 * - AuthNav: Authentication flow (Welcome/Login)
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
    const { isLoadingEvents } = useCalendarContext();

    const getActiveRouteChain = (state?: { index?: number; routes?: Array<{ name: string; state?: any }> }) => {
        const chain: string[] = [];
        let currentState = state;

        while (currentState?.routes?.length) {
            const routeIndex = typeof currentState.index === 'number' ? currentState.index : 0;
            const route = currentState.routes[routeIndex];
            if (!route) break;
            chain.push(route.name);
            currentState = route.state;
        }

        return chain;
    };

    useEffect(() => {
        if (isLoading || isError || isLoadingUserProfile || (authUserId && isLoadingEvents)) {
            return;
        }

        const rootState = (navigation as any).getRootState?.() ?? navigation.getState?.();
        const activeRouteChain = getActiveRouteChain(rootState);
        const lastAuthIndex = activeRouteChain.lastIndexOf('AuthNav');
        const authRouteNames = new Set(['AuthNav', 'Welcome', 'Login Form']);
        const currentRouteName = navigationRef.getCurrentRoute?.()?.name ?? null;
        const isAuthRouteActive = currentRouteName ? authRouteNames.has(currentRouteName) : false;
        const isAuthRouteInChain = activeRouteChain.some((name) => authRouteNames.has(name));
        const isAuthFlowActive = lastAuthIndex >= 0 || isAuthRouteActive || isAuthRouteInChain;

        // First we look for deeplinks
        // If we find one, and they haven't seen it yet
        if (currentDeepLink && !isPromoScreenViewed && currentDeepLink.type !== 'generic') {
            console.log('HomeNavigator: handling deep link', {
                id: currentDeepLink.id,
                type: currentDeepLink.type,
            });
            // Regular promo codes
            if (
                currentDeepLink.type === 'organizer_promo_code' ||
                currentDeepLink.type === 'event_promo_code'
            ) {
                console.log('HomeNavigator: routing to PromoScreen');
                navigateToHomeStackScreen(navigation, 'PromoScreen');
                return;
            }

            // Weekly Picks
            if (currentDeepLink.type === 'weekly_picks') {
                console.log('HomeNavigator: routing to Weekly Picks');
                navigateToHomeStackScreen(navigation, 'Weekly Picks');
                return;
            }

            if (currentDeepLink.type === 'facilitator_profile') {
                console.log('HomeNavigator: routing to Facilitator Profile', {
                    facilitatorId: currentDeepLink.facilitator_id,
                });
                navigateToHomeStackScreen(navigation, 'Facilitator Profile', { facilitatorId: currentDeepLink.facilitator_id });
                return;
            }
            console.log('HomeNavigator: deep link type has no route, falling through', currentDeepLink.type);
        } else if (currentDeepLink?.type === 'generic') {
            console.log('HomeNavigator: generic deep link, no routing');
        }

        // If the user has a profile but it's incomplete, navigate to ProfileDetails
        if (authUserId && !isProfileComplete) {
            console.log('HomeNavigator: routing to Profile Details');
            navigateToHomeStackScreen(navigation, 'Profile Details');
            return;
        }

        // If the user doesn't have a profile, navigate to Welcome
        if (!authUserId) {
            if (isAuthFlowActive) {
                return;
            }
            console.log('HomeNavigator: routing to Welcome');
            navigateToAuth(navigation, 'Welcome');
            return;
        }

        // Otherwise, we can go home
        console.log('HomeNavigator: routing to Home');
        navigateToHome(navigation);
        // important: we do NOT include isPromoScreenViewed in the dependency array
        // because we want to navigate to Home only if it starts out that way
        // not if it's transitioning from promo by an "Event Details" click
    }, [
        isLoadingUserProfile,
        authUserId,
        isProfileComplete,
        isLoading,
        isError,
        currentDeepLink,
        navigation,
        isLoadingEvents,
    ]);

    const PromoScreenWrap = useCallback(
        () => (
            <PromosEntryScreen onPromoScreenViewed={() => setIsPromoScreenViewed(true)} />
        ),
        [setIsPromoScreenViewed]
    );

    const shouldShowEventsLoading = !!authUserId && isLoadingEvents;

    if (!hasFetchedSession || isLoadingUserProfile || shouldShowEventsLoading) {
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
            <HomeStack.Screen name="Home" component={TabNavigator} />
            <HomeStack.Screen name="AuthNav"
                component={AuthNav} />
            <HomeStack.Screen name="PromoScreen"
                component={PromoScreenWrap}
                options={({ navigation }) => headerOptions({ navigation, title: 'Welcome!', backToWelcome: true })}
            />
        </HomeStack.Navigator >
    );
}
