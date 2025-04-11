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


import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FIRST_LAUNCH_KEY = 'isFirstLaunch';

export async function handleFirstInstall() {
    try {
        const alreadyLaunched = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
        if (!alreadyLaunched) {
            // Mark as launched
            await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'true');

            await Clipboard.getStringAsync();
        }
    } catch (error) {
        console.error('Error checking first install:', error);
    }
}

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
        const unsub = branch.subscribe(async ({ uri }) => {
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
            await handleFirstInstall();
            const data = await branch.getLatestReferringParams(); // cached params

            const branchUrl = data?.['+url'] || data?.['~referring_link'];

            if (branchUrl) {
                queuedUri.current = branchUrl
                process(branchUrl);
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
