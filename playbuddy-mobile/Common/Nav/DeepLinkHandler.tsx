import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useNavigation } from '@react-navigation/native';
import { NavStack } from './NavStackType';
import URLParse from 'url-parse';
import { deepLinks } from './deepLinks';
import { DeepLinkParams, useUserContext } from '../../Pages/Auth/hooks/UserContext';
import { logEvent } from '../hooks/logger';

const handleNavigate = ({
    navigation,
    url,
    setDeepLinkParams,
}: {
    navigation: NavStack,
    url: string,
    setDeepLinkParams: (params: DeepLinkParams) => void,
}) => {
    const parsedUrl = new URLParse(url, true); // true to parse the query as an object

    const lastSlashIndex = parsedUrl.pathname.lastIndexOf('/');
    const stringAfterLastSlash = parsedUrl.pathname.substring(lastSlashIndex + 1);

    const deepLinkFromMap = deepLinks.find((link) => link.slug === stringAfterLastSlash);

    if (!deepLinkFromMap) {
        return;
    }

    setDeepLinkParams(deepLinkFromMap);

    navigation.navigate('Details', { screen: 'PromoScreen' });
    logEvent('deep_link_params_set', {
        slug: stringAfterLastSlash,
        type: deepLinkFromMap?.type,
        params: deepLinkFromMap?.params,
    });
};

export default function DeepLinkHandler() {
    const navigation = useNavigation<NavStack>();
    const { setDeepLinkParams: setDeepLinkParams } = useUserContext();

    useEffect(() => {
        // Handle initial deep link
        Linking.getInitialURL().then((url) => {
            logEvent('initial_deep_link', { url });
            if (url) {
                handleNavigate({ navigation, url, setDeepLinkParams });
            }
        });

        // Listen to deep links
        const urlListener = Linking.addEventListener('url', (event) => {
            logEvent('deep_link', { url: event.url });
            handleNavigate({ navigation, url: event.url, setDeepLinkParams });
        });

        // Cleanup the listener
        return () => {
            urlListener.remove();
        };
    }, [navigation]);


    return null;
}
