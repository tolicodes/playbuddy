import type { NavigationProp, ParamListBase } from '@react-navigation/native';

export type AuthScreenName = 'Welcome' | 'Login Form' | 'Profile Details' | 'Profile';
export type HomeTabName = 'Calendar' | 'My Calendar' | 'Organizers' | 'More';

const tryNavigateAuth = (navigation: NavigationProp<ParamListBase>, screen: AuthScreenName): boolean => {
    const state = navigation.getState?.();
    const routeNames = state?.routeNames ?? [];

    if (routeNames.includes(screen)) {
        navigation.navigate(screen as never);
        return true;
    }

    if (routeNames.includes('AuthNav')) {
        navigation.navigate('AuthNav' as never, { screen } as never);
        return true;
    }

    if (routeNames.includes('HomeDrawer')) {
        navigation.navigate('HomeDrawer' as never, {
            screen: 'AuthNav',
            params: { screen },
        } as never);
        return true;
    }

    return false;
};

export const navigateToAuth = (navigation: NavigationProp<ParamListBase>, screen: AuthScreenName) => {
    if (tryNavigateAuth(navigation, screen)) {
        return;
    }

    const parent = navigation.getParent?.();
    if (parent) {
        navigateToAuth(parent, screen);
        return;
    }

    // Fall back to avoid throwing when navigation tree is unexpected.
    console.warn('navigateToAuth: unable to locate AuthNav or HomeDrawer in navigation state.');
};

type HomeStackScreenName =
    | 'Home'
    | 'AuthNav'
    | 'PromoScreen'
    | 'Weekly Picks'
    | 'Event Details'
    | 'Community Events'
    | 'Munch Details'
    | 'Facilitator Profile';

const tryNavigateHomeStack = (
    navigation: NavigationProp<ParamListBase>,
    screen: HomeStackScreenName,
    params?: Record<string, unknown>
): boolean => {
    const state = navigation.getState?.();
    const routeNames = state?.routeNames ?? [];

    if (routeNames.includes(screen)) {
        navigation.navigate(screen as never, params as never);
        return true;
    }

    if (routeNames.includes('HomeDrawer')) {
        navigation.navigate('HomeDrawer' as never, { screen, params } as never);
        return true;
    }

    return false;
};

export const navigateToHomeStackScreen = (
    navigation: NavigationProp<ParamListBase>,
    screen: HomeStackScreenName,
    params?: Record<string, unknown>
) => {
    if (tryNavigateHomeStack(navigation, screen, params)) {
        return;
    }

    const parent = navigation.getParent?.();
    if (parent) {
        navigateToHomeStackScreen(parent, screen, params);
        return;
    }

    console.warn(`navigateToHomeStackScreen: unable to locate ${screen} in navigation state.`);
};

export const navigateToHome = (navigation: NavigationProp<ParamListBase>) => {
    navigateToHomeStackScreen(navigation, 'Home');
};

export const navigateToTab = (
    navigation: NavigationProp<ParamListBase>,
    tabName: HomeTabName,
    params?: Record<string, unknown>
) => {
    const state = navigation.getState?.();
    const routeNames = state?.routeNames ?? [];

    if (routeNames.includes(tabName)) {
        navigation.navigate(tabName as never, params as never);
        return;
    }

    if (routeNames.includes('Home')) {
        navigation.navigate('Home' as never, { screen: tabName, params } as never);
        return;
    }

    if (routeNames.includes('HomeDrawer')) {
        navigation.navigate('HomeDrawer' as never, { screen: 'Home', params: { screen: tabName, params } } as never);
        return;
    }

    const parent = navigation.getParent?.();
    if (parent) {
        navigateToTab(parent, tabName);
        return;
    }

    console.warn(`navigateToTab: unable to locate ${tabName} in navigation state.`);
};
