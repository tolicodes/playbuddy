/*
────────────────────────────────────────────────────────────────
DeepLinkHandler.tsx

Overview:
  This component is responsible for capturing and processing Branch 
  deep‑links both when the app is launched (cold‑start) and while it's running.
  It waits for the deep links (fetched via Supabase using useFetchDeepLinks) 
  to finish loading before processing any incoming URI. Once a valid deep link 
  is identified, it sets the initial deep link in the UserContext, allowing 
  downstream screens (e.g., PromoScreen) to react to it.

Key Responsibilities:
  1. First Launch Handling:
     - The handleFirstInstall() function checks if the app is being launched 
       for the first time by reading a flag (FIRST_LAUNCH_KEY) from AsyncStorage.
     - If this is the first install, it sets the flag so that future launches
       know the app has been installed previously.

  2. Fetching Deep Links:
     - The component uses useFetchDeepLinks() to retrieve a list of valid 
       deep links from the backend.
     - It defers processing any deep link URIs until this data is fully loaded (isLoading is false).

  3. Subscribing to Branch Deep‑Link Events:
     - A useEffect subscribes to Branch deep link events using branch.subscribe().
     - When a URI is received, it is stored in a ref (queuedUri) and then immediately
       passed to the process() function for handling.

  4. Processing Deep Links:
     - The process(uri) function first checks if deep link data is still loading.
     - It then extracts a slug from the incoming URI (via URLParse in findBySlug) 
       and matches it against the fetched deep link list.
     - If a matching deep link is found, queuedUri is cleared, and setInitialDeepLink(dl)
       is called to store this deep link in the UserContext.
     - Relevant events are logged for analytics (InitialDeepLink and DeepLinkParamsSet).

  5. Cold‑Start Deep Link Handling:
     - On initial app launch, after checking for first install conditions,
       the component retrieves the latest referring parameters from Branch.
     - If a deep link URL is found (from '+url' or '~referring_link'), it is
       stored in queuedUri and processed immediately.

  6. Reprocessing Pending Deep Links:
     - A final useEffect watches for changes in isLoading and deepLinks.
     - If a deep link URI was queued before the data was ready, this effect 
       ensures it gets processed once loading completes.

Result:
  DeepLinkHandler does not render any UI. It orchestrates the logic for:
    - Checking first launch conditions.
    - Capturing and processing incoming Branch deep‑link URIs.
    - Storing a valid deep link in the UserContext for further navigation 
      and behavior changes throughout the app.

────────────────────────────────────────────────────────────────
*/


import { useEffect, useRef } from 'react';
import branch from 'react-native-branch';
import URLParse from 'url-parse';
import { useUserContext } from '../../Pages/Auth/hooks/UserContext';
import { logEvent } from '../hooks/logger';
import { useFetchDeepLinks } from '../hooks/useDeepLinks';
import { DeepLink, UE } from '../../commonTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';

const findBySlug = (uri: string, list: DeepLink[]) => {
    const slug = new URLParse(uri).pathname.split('/').pop();
    return list.find((d) => d.slug === slug);
};

const FIRST_LAUNCH_KEY = 'isFirstLaunch';

export async function handleFirstInstall() {
    try {
        const alreadyLaunched = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
        if (!alreadyLaunched) {
            await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'true');
        }
    } catch (error) {
        console.error('Error checking first install:', error);
    }
}

export default function DeepLinkHandler() {
    const { data: deepLinks = [], isLoading } = useFetchDeepLinks();
    const { setInitialDeepLink } = useUserContext();
    const queuedUri = useRef<string | null>(null);

    const process = (uri: string) => {
        if (isLoading) return;
        const dl = findBySlug(uri, deepLinks);
        if (!dl) return;

        queuedUri.current = null;
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

    // subscribe to branch deep links
    useEffect(() => {
        const unsub = branch.subscribe(async ({ uri }) => {
            if (!uri) return;
            queuedUri.current = uri;
            process(uri);
        });
        return () => unsub();
    }, [deepLinks, isLoading]);

    // handle first install by checking for branch params
    useEffect(() => {
        (async () => {
            await handleFirstInstall();
            const data = await branch.getLatestReferringParams();
            const branchUrl = data?.['+url'] || data?.['~referring_link'];
            if (branchUrl) {
                queuedUri.current = branchUrl;
                process(branchUrl);
            }
        })();
    }, []);

    useEffect(() => {
        if (queuedUri.current) process(queuedUri.current);
    }, [isLoading, deepLinks]);

    return null;
}
