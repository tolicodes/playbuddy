import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useNavigation } from '@react-navigation/native';
import { NavStack } from './types';

// Define your path-to-screen mapping with optional parameters
const NAV_MAPPING: { [key: string]: keyof NavStack } = {
    '': 'Calendar',
    'wishlist': 'Wishlist',
    'communities': 'Communities',
    'moar': 'Moar',
};

const handleNavigate = (
    navigation: any,
    url: string,
) => {
    const { path, queryParams } = Linking.parse(url);
    const screenName = NAV_MAPPING[path || '']; // default to Calendar

    navigation.navigate(screenName, queryParams);
};

export default function DeepLinkHandler() {
    const navigation = useNavigation<NavStack>();

    useEffect(() => {
        // Handle initial deep link
        Linking.getInitialURL().then((url) => {
            if (url) {
                handleNavigate(navigation, url);
            }
        });

        // Listen to deep links
        const urlListener = Linking.addEventListener('url', (event) => {
            handleNavigate(navigation, event.url);
        });

        // Cleanup the listener
        return () => {
            urlListener.remove();
        };
    }, [navigation]);


    return null;
}
