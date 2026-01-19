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
import { useFetchDeepLinks, useAddDeepLinkToUser } from '../db-axios/useDeepLinks';
import { useUserContext } from '../../Pages/Auth/hooks/UserContext';
import { logEvent } from '../../Common/hooks/logger';
import { UE } from '../../userEventTypes';
import type { DeepLink } from '../../commonTypes';
const CLIPBOARD_CHECK_KEY = 'hasCheckedDeepLinkClipboard';

export default function DeepLinkHandler() {
    const { data: deepLinks = [], isLoading: loadingLinks } = useFetchDeepLinks();
    const addDeepLink = useAddDeepLinkToUser();
    const { setCurrentDeepLink, currentDeepLink, authUserId } = useUserContext();
    const queue = useRef<{
        url: string;
        source: 'branch' | 'clipboard' | 'cold_start';
    } | null>(null);
    const handledUrls = useRef<Set<string>>(new Set());
    const handledDeepLinks = useRef<Set<string>>(new Set());
    const attributedDeepLinks = useRef<Set<string>>(new Set());
    const attributedAnonymousSession = useRef(false);
    const detectedThisSession = useRef(false);

    const matchDeepLink = useCallback(
        (url: string): DeepLink | undefined => {
            const parsed = new URLParse(url)
            const urlPath = parsed.pathname;
            const searchParams = parsed.query;
            const slug = urlPath.split('/').pop();
            return deepLinks.find(d => d.slug === slug);
        },
        [deepLinks],
    );

    const handleUrl = useCallback(
        async (url: string, source: 'branch' | 'clipboard' | 'cold_start') => {
            const normalizedUrl = url.trim();
            if (!normalizedUrl) {
                return;
            }
            console.log('DeepLinkHandler: received url', { source, normalizedUrl });
            if (loadingLinks) {
                console.log('DeepLinkHandler: links still loading, queueing url');
                queue.current = { url: normalizedUrl, source };
                return;
            }
            const dl = matchDeepLink(normalizedUrl);

            if (!dl?.id?.trim() || !dl.slug?.trim()) {
                console.log('DeepLinkHandler: no matching deep link for url', { normalizedUrl });
                return;
            }

            console.log(`DeepLinkHandler: ${normalizedUrl} -> ${dl.slug}`);
            console.log('DeepLinkHandler: matched deep link', {
                id: dl.id,
                slug: dl.slug,
                type: dl.type,
            });

            queue.current = null;

            if (dl.id !== currentDeepLink?.id) {
                console.log('DeepLinkHandler: setting current deep link', { id: dl.id });
                setCurrentDeepLink({ ...dl });
            }

            const seenUrl = handledUrls.current.has(normalizedUrl);
            const seenDeepLink = handledDeepLinks.current.has(dl.id);
            if (seenUrl || seenDeepLink) {
                console.log('DeepLinkHandler: deep link already handled', {
                    seenUrl,
                    seenDeepLink,
                });
                return;
            }

            handledUrls.current.add(normalizedUrl);
            handledDeepLinks.current.add(dl.id);

            const deepLinkAnalyticsProps = {
                auth_user_id: authUserId || null,
                deep_link_id: dl.id,
                promo_code_id: dl.featured_promo_code?.id ?? null,
            };

            if (!detectedThisSession.current) {
                logEvent(UE.DeepLinkDetected, {
                    ...deepLinkAnalyticsProps,
                    url: normalizedUrl,
                    source,
                });
                detectedThisSession.current = true;
                console.log('DeepLinkHandler: DeepLinkDetected logged', deepLinkAnalyticsProps);
            }

            const shouldAttribute = authUserId
                ? !attributedDeepLinks.current.has(dl.id)
                : !attributedAnonymousSession.current;

            if (shouldAttribute) {
                if (authUserId) {
                    attributedDeepLinks.current.add(dl.id);
                    addDeepLink.mutate(dl.id);
                } else {
                    attributedAnonymousSession.current = true;
                }
                logEvent(UE.DeepLinkAttributed, deepLinkAnalyticsProps);
                console.log('DeepLinkHandler: DeepLinkAttributed logged', deepLinkAnalyticsProps);
            }
        },
        [loadingLinks, authUserId, matchDeepLink, setCurrentDeepLink, addDeepLink],
    );

    useEffect(() => {
        // Branch subscription & cold-start handling
        const unsub = branch.subscribe(({ uri }) => {
            console.log('DeepLinkHandler: branch.subscribe uri', uri);
            if (uri) handleUrl(uri, 'branch');
        });
        branch.getLatestReferringParams().then(data => {
            const url = data?.['+url'] || data?.['~referring_link'];
            const clicked = data?.['+clicked_branch_link'];
            const wasClicked = clicked === true || clicked === 'true';
            console.log('DeepLinkHandler: latest referring params', { url, wasClicked });
            if (wasClicked && url) handleUrl(url, 'cold_start');
        });

        // Clipboard fallback — but only once ever
        (async () => {
            const alreadyChecked = await AsyncStorage.getItem(CLIPBOARD_CHECK_KEY);
            if (!alreadyChecked) {
                const text = await Clipboard.getStringAsync();
                if (text && /(?:l\.playbuddy\.me|bclc8)/.test(text)) {
                    console.log('DeepLinkHandler: clipboard deep link candidate', text);
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
            handleUrl(queue.current.url, queue.current.source);
        }
    }, [loadingLinks, handleUrl]);

    return null;
}
