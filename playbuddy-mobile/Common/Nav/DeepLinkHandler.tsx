/* ────────────────────────────────────────────────────────────────
   DeepLinkHandler.tsx
   ---------------------------------------------------------------
   • Captures Branch deep‑links on cold‑start *and* while app runs
   • Waits for Supabase deep_links query to finish
   • Sets initialDeepLink in UserContext, then navigates to PromoScreen
────────────────────────────────────────────────────────────────── */

import { useEffect, useRef } from 'react';
import branch from 'react-native-branch';
import URLParse from 'url-parse';
import { useNavigation } from '@react-navigation/native';

import { NavStack } from './NavStackType';
import { useUserContext } from '../../Pages/Auth/hooks/UserContext';
import { logEvent } from '../hooks/logger';
import { useFetchDeepLinks } from '../hooks/useDeepLinks';
import { DeepLink, UE } from '../../commonTypes';

/* ───────── helper: slug‑match ───────── */
const findBySlug = (uri: string, list: DeepLink[]) => {
    const slug = new URLParse(uri).pathname.split('/').pop();
    return list.find((d) => d.slug === slug);
};

/* ───────── custom hook handles queueing & processing ───────── */
function useBranchDeepLinkQueue(deepLinks: DeepLink[], isLoading: boolean) {
    const { setInitialDeepLink } = useUserContext();
    const queuedUri = useRef<string | null>(null);

    /* process helper */
    const process = (uri: string) => {
        if (isLoading) return;
        const dl = findBySlug(uri, deepLinks);
        if (!dl) return;

        queuedUri.current = null;          // consumed
        setInitialDeepLink(dl);

        logEvent(UE.InitialDeepLink, { url: uri });
        logEvent(UE.DeepLinkParamsSet, {
            slug: dl.slug,
            id: dl.id,
            type: dl.type,
            organizer_id: dl.organizer?.id,
            community_id: dl.community?.id
        });
    };

    /* 1️⃣  subscribe immediately for live opens */
    useEffect(() => {
        const unsub = branch.subscribe(({ uri }) => {
            if (!uri) return;
            queuedUri.current = uri;
            process(uri);                    // may run immediately if ready
        });
        return () =>
            typeof unsub === 'function' ? unsub() : unsub?.remove?.();
    }, [deepLinks, isLoading]);

    /* 2️⃣  cold‑start / first install */
    useEffect(() => {
        (async () => {
            const data = await branch.getLatestReferringParams(); // cached params
            if (data?.uri) {
                queuedUri.current = data.uri;
                process(data.uri);
            }
        })();
    }, []); // run once

    /* 3️⃣  whenever loading flips to false, try queued uri */
    useEffect(() => {
        if (queuedUri.current) process(queuedUri.current);
    }, [isLoading, deepLinks]);
}

/* ───────── component exported to app ───────── */
export default function DeepLinkHandler() {
    const navigation = useNavigation<NavStack>();
    const { initialDeepLink } = useUserContext();
    const { data: deepLinks = [], isLoading } = useFetchDeepLinks();

    /* queue logic */
    useBranchDeepLinkQueue(deepLinks, isLoading);

    /* navigate after deep‑link resolved */
    useEffect(() => {
        if (initialDeepLink) {
            navigation.navigate('Details', { screen: 'PromoScreen' });
        }
    }, [initialDeepLink, navigation]);

    return null; // renders nothing
}
