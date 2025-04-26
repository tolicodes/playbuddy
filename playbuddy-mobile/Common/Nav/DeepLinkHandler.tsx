/**
 * DeepLinkHandler:
 *
 * Responsibilities:
 * 1. Fetches valid deep-link definitions from the backend via useFetchDeepLinks().
 * 2. Subscribes to live Branch deep-link events and handles cold-start params.
 * 3. Falls back to clipboard if no Branch link is detected.
 * 4. Queues URLs when deep-links are still loading, then reprocesses once ready.
 * 5. Matches incoming URLs by slug against the fetched deepLinks list.
 * 6. Updates UserContext with the matched deepLink (setCurrentDeepLink).
 * 7. Tracks analytics events for detection (DeepLinkDetected) and attribution (DeepLinkAttributed).
 */

import { useEffect, useRef, useCallback } from 'react';
import branch from 'react-native-branch';
import URLParse from 'url-parse';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFetchDeepLinks, useAddDeepLinkToUser } from '../hooks/useDeepLinks';
import { useUserContext } from '../../Pages/Auth/hooks/UserContext';
import { getAnalyticsPropsDeepLink, logEvent } from '../../Common/hooks/logger';
import { UE } from '../../userEventTypes';
import type { DeepLink } from '../../commonTypes';

const CLIPBOARD_CHECK_KEY = 'hasCheckedDeepLinkClipboard';

export default function DeepLinkHandler() {
    const { data: deepLinks = [], isLoading: loadingLinks } = useFetchDeepLinks();
    const addDeepLink = useAddDeepLinkToUser();
    const { setCurrentDeepLink, authUserId } = useUserContext();
    const queue = useRef<string | null>(null);

    const matchDeepLink = useCallback(
        (url: string): DeepLink | undefined => {
            const slug = new URLParse(url).pathname.split('/').pop();
            return deepLinks.find(d => d.slug === slug);
        },
        [deepLinks],
    );

    const handleUrl = useCallback(
        async (url: string, source: 'branch' | 'clipboard' | 'cold_start') => {
            if (loadingLinks) {
                queue.current = url;
                return;
            }
            const dl = matchDeepLink(url);
            if (!dl) return;

            queue.current = null;
            setCurrentDeepLink(dl);

            logEvent(UE.DeepLinkDetected, {
                auth_user_id: authUserId,
                url,
                source,
                ...getAnalyticsPropsDeepLink(dl),
            });

            if (authUserId) {
                addDeepLink.mutate(dl.id);
                logEvent(UE.DeepLinkAttributed, {
                    auth_user_id: authUserId,
                    ...getAnalyticsPropsDeepLink(dl),
                });
            }
        },
        [loadingLinks, authUserId, matchDeepLink, setCurrentDeepLink, addDeepLink],
    );

    useEffect(() => {
        // Branch subscription & cold-start handling
        const unsub = branch.subscribe(({ uri }) => {
            if (uri) handleUrl(uri, 'branch');
        });
        branch.getLatestReferringParams().then(data => {
            const url = data['+url'] || data['~referring_link'];
            if (url) handleUrl(url, 'cold_start');
        });

        // Clipboard fallback — but only once ever
        (async () => {
            const alreadyChecked = await AsyncStorage.getItem(CLIPBOARD_CHECK_KEY);
            if (!alreadyChecked) {
                const text = await Clipboard.getStringAsync();
                if (text && /(?:l\.playbuddy\.me|bclc8)/.test(text)) {
                    await handleUrl(text, 'clipboard');
                }
                await AsyncStorage.setItem(CLIPBOARD_CHECK_KEY, 'true');
            }
        })();

        return () => unsub();
    }, [handleUrl]);

    useEffect(() => {
        // Re-process any queued URL once links finish loading
        if (!loadingLinks && queue.current) {
            handleUrl(queue.current, 'branch');
        }
    }, [loadingLinks, handleUrl]);

    return null;
}
