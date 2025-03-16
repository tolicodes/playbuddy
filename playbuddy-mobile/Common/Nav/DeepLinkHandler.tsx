import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NavStack } from './NavStackType';
import URLParse from 'url-parse';
import { deepLinks } from './deepLinks';
import { DeepLinkParams, useUserContext } from '../../Pages/Auth/hooks/UserContext';
import { logEvent } from '../hooks/logger';

import branch from 'react-native-branch';


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

        branch.subscribe({
            onOpenComplete: async (data) => {
                logEvent('initial_deep_link', { url: data.uri });
                if (data.uri) {
                    handleNavigate({ navigation, url: data.uri, setDeepLinkParams });
                }
            },
        });
    }, [navigation]);


    return null;
}
