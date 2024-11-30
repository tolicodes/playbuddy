import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useNavigation } from '@react-navigation/native';
import { NavStack, NavStackProps } from './types';
import URLParse from 'url-parse';
import * as amplitude from '@amplitude/analytics-react-native';
import { useUserContext } from './Pages/Auth/hooks/UserContext';

// Define your path-to-screen mapping with optional parameters
const NAV_MAPPING: { [key: string]: keyof NavStackProps } = {
    '': 'Main Calendar',
    'wishlist': 'My Calendar',
    'communities': 'Communities',
    'moar': 'Moar',
};

const handleNavigate = (
    navigation: any,
    url: string,
) => {
    const parsedUrl = new URLParse(url, true); // true to parse the query as an object


    let path = '';
    if (parsedUrl.protocol === 'playbuddy:') {
        path = parsedUrl.hostname + parsedUrl.pathname;
    } else {
        path = parsedUrl.pathname.slice(1, parsedUrl.pathname.length); // get rid of first slash

    }

    // Handle paths with '--'
    if (path.includes('--/')) {
        path = path.split('--/')[1];
    }

    const queryParams = parsedUrl?.query;

    // Assuming NAV_MAPPING is your path to screen mapping
    const screenName = NAV_MAPPING[path || ''] || ''; // default to Calendar

    amplitude.logEvent('deep_link_navigate', {
        path,
        screenName,
        queryParams
    });

    if (!screenName) {
        console.error(`No screen found for path: ${path}`);
        return;
    }

    navigation.navigate({ name: screenName, params: queryParams });
};

export default function DeepLinkHandler() {
    const navigation = useNavigation<NavStack>();

    useEffect(() => {
        // Handle initial deep link
        Linking.getInitialURL().then((url) => {
            amplitude.logEvent('initial_deep_link', { url });
            if (url) {
                handleNavigate(navigation, url);
            }
        });

        // Listen to deep links
        const urlListener = Linking.addEventListener('url', (event) => {
            amplitude.logEvent('deep_link', { url: event.url });
            handleNavigate(navigation, event.url);
        });

        // Cleanup the listener
        return () => {
            urlListener.remove();
        };
    }, [navigation]);


    return null;
}
