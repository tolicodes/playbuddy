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
import { useFetchDeepLinks, useAddDeepLinkToUser } from '../hooks/useDeepLinks';
import { useUserContext } from '../../Pages/Auth/hooks/UserContext';
import { getAnalyticsPropsDeepLink, logEvent } from '../../Common/hooks/logger';
import { UE } from '../../userEventTypes';
import type { DeepLink } from '../../commonTypes'

export default function DeepLinkHandler() {
    // 1) Fetch deep-link definitions
    const { data: deepLinks = [], isLoading: loadingLinks } = useFetchDeepLinks();
    const addDeepLink = useAddDeepLinkToUser();

    // 2) User context for updating current deep link and identifying user
    const { setCurrentDeepLink, authUserId } = useUserContext();
    const queue = useRef<string | null>(null);

    // Utility: match URL slug to a DeepLink object
    const matchDeepLink = useCallback((url: string): DeepLink | undefined => {
        const slug = new URLParse(url).pathname.split('/').pop();
        return deepLinks.find(d => d.slug === slug);
    }, [deepLinks]);

    // Central URL handler: sets context and tracks events
    const handleUrl = useCallback(async (
        url: string,
        source: 'branch' | 'clipboard' | 'cold_start'
    ) => {
        // If deep-links not yet loaded, queue the URL
        if (loadingLinks) {
            queue.current = url;
            return;
        }

        // Attempt to find matching deepLink
        const dl = matchDeepLink(url);
        if (!dl) return;

        // Clear queue and update context
        queue.current = null;
        setCurrentDeepLink(dl);

        // Track deep-link detection event
        logEvent(UE.DeepLinkDetected, {
            auth_user_id: authUserId,
            url,
            source,
            ...getAnalyticsPropsDeepLink(dl),
        });

        // If user is authenticated, attribute deep-link to their profile
        if (authUserId) {
            addDeepLink.mutate(dl.id);
            logEvent(UE.DeepLinkAttributed, {
                auth_user_id: authUserId,
                ...getAnalyticsPropsDeepLink(dl),
            });
        }
    }, [loadingLinks, authUserId, matchDeepLink, setCurrentDeepLink, addDeepLink]);

    useEffect(() => {
        // Subscribe to live Branch deep-link events
        const unsubscribe = branch.subscribe(({ uri }) => {
            if (uri) handleUrl(uri, 'branch');
        });

        // Handle cold-start Branch parameters
        branch.getLatestReferringParams().then(data => {
            const url = data['+url'] || data['~referring_link'];
            if (url) handleUrl(url, 'cold_start');
        });

        // Fallback: read clipboard for potential deep-link URLs
        Clipboard.getStringAsync().then(text => {
            if (text && /(?:l\.playbuddy\.me|bclc8)/.test(text)) {
                handleUrl(text, 'clipboard');
            }
        });

        return () => unsubscribe();
    }, [handleUrl]);

    useEffect(() => {
        // When deepLinks finish loading, reprocess any queued URL
        if (!loadingLinks && queue.current) {
            handleUrl(queue.current, 'branch');
        }
    }, [loadingLinks, handleUrl]);

    return null;
}
