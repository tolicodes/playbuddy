import type { NavigationProp, ParamListBase } from '@react-navigation/native';

export type AuthScreenName = 'Welcome' | 'Login Form' | 'Profile Details' | 'Profile';
export type HomeTabName = 'Calendar' | 'My Calendar' | 'Organizers' | 'More';
const HOME_TABS: HomeTabName[] = ['Calendar', 'My Calendar', 'Organizers', 'More'];
const TAB_ROOT_SCREENS: Record<HomeTabName, string> = {
    'Calendar': 'Calendar Home',
    'My Calendar': 'My Calendar Home',
    'Organizers': 'Organizers Home',
    'More': 'More Home',
};

const buildTabParams = (tabName: HomeTabName, params?: Record<string, unknown>) => {
    if (!params) return undefined;
    if ('screen' in params) {
        return params;
    }
    return { screen: TAB_ROOT_SCREENS[tabName], params };
};

const getActiveTabName = (state?: { index?: number; routes?: Array<{ name: string }> }): HomeTabName | null => {
    if (!state?.routes?.length) return null;
    const routeIndex = typeof state.index === 'number' ? state.index : 0;
    const routeName = state.routes[routeIndex]?.name;
    return HOME_TABS.includes(routeName as HomeTabName) ? (routeName as HomeTabName) : null;
};

const ROOT_ONLY_SCREENS: Array<'PromoScreen' | 'AuthNav'> = ['PromoScreen', 'AuthNav'];

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
    if (screen === 'Profile Details' || screen === 'Profile') {
        navigateToHomeStackScreen(navigation, screen);
        return;
    }

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
    | 'Profile Details'
    | 'Profile'
    | 'Consent'
    | 'Notifications'
    | 'Debug'
    | 'Weekly Picks'
    | 'Event Details'
    | 'Community Events'
    | 'Munch Details'
    | 'Facilitator Profile'
    | 'Facilitators'
    | 'Promos'
    | 'Popular Events'
    | 'Retreats'
    | 'Munches'
    | 'Play Parties'
    | 'Moar'
    | 'Submit Event'
    | 'Admin'
    | 'Import URLs'
    | 'Weekly Picks Admin'
    | 'Organizer Admin'
    | 'Event Admin'
    | 'Promo Codes Admin'
    | 'Event Popups Admin'
    | 'Push Notifications Admin'
    | 'Discover Game';

const tryNavigateHomeStack = (
    navigation: NavigationProp<ParamListBase>,
    screen: HomeStackScreenName,
    params?: Record<string, unknown>
): boolean => {
    const state = navigation.getState?.();
    const routeNames = state?.routeNames ?? [];
    const navType = (state as { type?: string } | undefined)?.type;
    const isDrawer = navType === 'drawer';
    const activeTab = getActiveTabName(state);

    if (ROOT_ONLY_SCREENS.includes(screen as 'PromoScreen' | 'AuthNav')) {
        if (!isDrawer && routeNames.includes(screen)) {
            navigation.navigate(screen as never, params as never);
            return true;
        }

        if (routeNames.includes('HomeDrawer')) {
            navigation.navigate('HomeDrawer' as never, { screen, params } as never);
            return true;
        }

        return false;
    }

    if (screen === 'Home') {
        if (routeNames.includes('Home')) {
            navigation.navigate('Home' as never);
            return true;
        }

        if (activeTab) {
            navigation.navigate(activeTab as never);
            return true;
        }

        if (routeNames.includes('HomeDrawer')) {
            navigation.navigate('HomeDrawer' as never, { screen: 'Home' } as never);
            return true;
        }
    }

    if (!isDrawer && routeNames.includes(screen)) {
        navigation.navigate(screen as never, params as never);
        return true;
    }

    if (activeTab) {
        navigation.navigate(activeTab as never, { screen, params } as never);
        return true;
    }

    if (routeNames.includes('Home')) {
        const tabName = activeTab ?? 'Calendar';
        navigation.navigate(
            'Home' as never,
            { screen: tabName, params: { screen, params } } as never
        );
        return true;
    }

    if (routeNames.includes('HomeDrawer')) {
        const tabName = activeTab ?? 'Calendar';
        navigation.navigate(
            'HomeDrawer' as never,
            { screen: 'Home', params: { screen: tabName, params: { screen, params } } } as never
        );
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
    const tabParams = buildTabParams(tabName, params);

    if (routeNames.includes(tabName)) {
        navigation.navigate(tabName as never, tabParams as never);
        return;
    }

    if (routeNames.includes('Home')) {
        navigation.navigate('Home' as never, { screen: tabName, params: tabParams } as never);
        return;
    }

    if (routeNames.includes('HomeDrawer')) {
        navigation.navigate('HomeDrawer' as never, {
            screen: 'Home',
            params: { screen: tabName, params: tabParams },
        } as never);
        return;
    }

    const parent = navigation.getParent?.();
    if (parent) {
        navigateToTab(parent, tabName, params);
        return;
    }

    console.warn(`navigateToTab: unable to locate ${tabName} in navigation state.`);
};
