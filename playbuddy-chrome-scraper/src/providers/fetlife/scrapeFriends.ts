import { isTestMode } from '../../config.js';
import { closeTab, openTab, postStatus, sleep } from '../../utils.js';
import type { FriendResult } from './types.js';

const STAGE2_STORAGE_KEY = 'PB_FRIEND_STAGE2_HANDLES';

const SCROLL_STEP = 5000;

async function scrapeFriendCards(tabId: number, testMode: boolean) {
    const [{ result }]: any = await chrome.scripting.executeScript({
        target: { tabId },
        args: [testMode, SCROLL_STEP],
        func: async (testModeFlag: boolean, scrollStep: number) => {
            const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
            const scrollContainer = document.scrollingElement || document.documentElement;
            const maxPasses = testModeFlag ? 3 : 100;
            const stagnationLimit = testModeFlag ? 1 : 3;
            let stagnant = 0;
            let prevCount = 0;

            const getCount = () => document.querySelectorAll('div.w-full.cursor-pointer.rounded-sm.bg-gray-900').length;

            async function waitForGrowth(before: number, timeoutMs = 10000, intervalMs = 200) {
                const start = Date.now();
                while (Date.now() - start < timeoutMs) {
                    await sleep(intervalMs);
                    const current = getCount();
                    if (current > before) return true;
                }
                return getCount() > before;
            }

            for (let i = 0; i < maxPasses; i++) {
                const before = getCount();
                scrollContainer.scrollBy(0, scrollStep);
                await waitForGrowth(before, 10000, testModeFlag ? 150 : 250);
                const count = getCount();
                if (count <= prevCount) {
                    stagnant += 1;
                } else {
                    stagnant = 0;
                }
                prevCount = count;
                if (stagnant >= stagnationLimit) break;
            }

            const parseCounts = (text: string | null | undefined) => {
                if (!text) return null;
                const clean = text.trim();
                const match = clean.match(/(\d+[kKmM]?)/);
                if (!match) return null;
                const raw = match[1];
                const suffix = raw.slice(-1).toLowerCase();
                const num = parseFloat(raw.replace(/[kKmM]/i, ''));
                if (Number.isNaN(num)) return null;
                if (suffix === 'k') return Math.round(num * 1_000);
                if (suffix === 'm') return Math.round(num * 1_000_000);
                return Math.round(num);
            };

            const cards = [...document.querySelectorAll('div.w-full.cursor-pointer.rounded-sm.bg-gray-900')];
            return cards.map((card) => {
                const usernameEl = card.querySelector('a.link.text-red-500') as HTMLAnchorElement | null;
                const username = usernameEl?.textContent?.trim() || '';
                const profile_url = usernameEl?.href || '';
                const imageEl = card.querySelector('img.ipp, img.object-cover') as HTMLImageElement | null;
                const image_url = imageEl?.src || null;

                const labelEl = card.querySelector('span.text-sm.font-bold.text-gray-300') as HTMLElement | null;
                const label = labelEl?.textContent?.trim() || null;

                const locationEl = card.querySelector('div.text-sm.font-normal.leading-normal.text-gray-300') as HTMLElement | null;
                const location = locationEl?.textContent?.trim() || null;

                const counts: { pics: number | null; vids: number | null; writings: number | null } = {
                    pics: null,
                    vids: null,
                    writings: null,
                };
                const countLinks = [...card.querySelectorAll('div.text-gray-500 a.link')];
                countLinks.forEach((a) => {
                    const txt = (a.textContent || '').trim().toLowerCase();
                    const val = parseCounts(a.textContent || '');
                    if (txt.includes('pic')) counts.pics = val;
                    if (txt.includes('vid')) counts.vids = val;
                    if (txt.includes('writing')) counts.writings = val;
                });

                return { username, profile_url, image_url, label, location, ...counts };
            }).filter(item => item.username);
        },
    });

    return result as Array<Pick<FriendResult, 'username' | 'profile_url' | 'image_url' | 'label' | 'location' | 'pics' | 'vids' | 'writings'>>;
}

async function scrapeFriendCounts(tabId: number): Promise<Pick<FriendResult, 'all_friends' | 'mutual_friends' | 'following' | 'followers'>> {
    const [{ result }]: any = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
            const parseCount = (text: string | null | undefined) => {
                if (!text) return null;
                const clean = text.trim().replace(/,/g, '');
                const match = clean.match(/([0-9]*\.?[0-9]+)\s*([kKmM]?)/);
                if (!match) return null;
                const num = parseFloat(match[1]);
                if (Number.isNaN(num)) return null;
                const suffix = match[2]?.toLowerCase();
                if (suffix === 'k') return Math.round(num * 1_000);
                if (suffix === 'm') return Math.round(num * 1_000_000);
                return Math.round(num);
            };

            const rows = [...document.querySelectorAll('div.flex.items-end.relative.whitespace-nowrap a.link')];
            const acc: any = { all_friends: null, mutual_friends: null, following: null, followers: null };

            rows.forEach((a) => {
                const label = (a.textContent || '').toLowerCase();
                const spanCount = a.querySelector('span span');
                const count = parseCount(spanCount?.textContent || a.textContent || '');
                if (label.includes('all friends')) acc.all_friends = count;
                if (label.includes('mutual friends')) acc.mutual_friends = count;
                if (label.includes('following')) acc.following = count;
                if (label.includes('followers')) acc.followers = count;
            });

            return acc;
        },
    });

    return result as Pick<FriendResult, 'all_friends' | 'mutual_friends' | 'following' | 'followers'>;
}

export async function scrapeFriendsStage1(handles: string[]): Promise<FriendResult[]> {
    const testMode = await isTestMode();
    const results: FriendResult[] = [];
    const maxTestHandles = 3;

    for (const handle of handles) {
        if (testMode && results.length >= maxTestHandles) {
            postStatus(`⏹️ Test cap reached (${maxTestHandles} handles). Stopping.`);
            break;
        }
        postStatus(`👥 Fetching friend counts for ${handle}`);
        const tab = await openTab(`https://fetlife.com/${handle}/friends`);
        try { await chrome.tabs.update(tab.id!, { active: true }); } catch { /* best effort */ }
        await sleep(1200);

        const counts = await scrapeFriendCounts(tab.id!);
        await closeTab(tab);

        const entry: FriendResult = {
            root_handle: handle,
            username: handle,
            profile_url: `https://fetlife.com/${handle}`,
            image_url: null,
            label: null,
            location: null,
            pics: null,
            vids: null,
            writings: null,
            ...counts,
        };
        entry.score = (entry.all_friends || 0) + (entry.followers || 0);
        results.push(entry);
    }

    return results.sort((a, b) => (b.score || 0) - (a.score || 0));
}

export async function scrapeFriendsStage2FromStorage(): Promise<FriendResult[]> {
    const testMode = await isTestMode();
    const results: FriendResult[] = [];
    let handles: string[] = [];
    try {
        const res = await chrome.storage.local.get(STAGE2_STORAGE_KEY);
        const stored = res?.[STAGE2_STORAGE_KEY];
        if (Array.isArray(stored)) {
            handles = stored.filter((h) => typeof h === 'string' && h.trim()).map((h) => h.trim());
        }
    } catch { }

    if (!handles.length) {
        postStatus('❌ No stage 2 handles found in storage. Please upload a Stage 1 JSON first.');
        return results;
    }

    if (testMode && handles.length > 3) {
        handles = handles.slice(0, 3);
        postStatus('🧪 Test mode: limiting Stage 2 handles to first 3.');
    }

    // Include Stage 1 handles as direct friends of the anchor (_peanutbutter)
    const anchor = '_peanutbutter';
    const stage1AsFriends = handles.map(h => ({
        root_handle: anchor,
        username: h,
        profile_url: `https://fetlife.com/${h}`,
        image_url: null,
        label: null,
        location: null,
        pics: null,
        vids: null,
        writings: null,
        all_friends: null,
        mutual_friends: null,
        following: null,
        followers: null,
        score: null,
    } as FriendResult));
    results.push(...stage1AsFriends);

    postStatus(`▶️ Stage 2: scraping friends for ${handles.length} handles`);
    let totalScraped = 0;
    let processed = 0;
    const handleSummaries: string[] = [];

    for (const handle of handles) {
        processed += 1;
        postStatus(`🔎 Scraping friend list for ${handle} (${processed}/${handles.length})`);
        let tab: chrome.tabs.Tab | null = null;
        try {
            tab = await openTab(`https://fetlife.com/${handle}/friends`);
            try { await chrome.tabs.update(tab.id!, { active: true }); } catch { /* best effort */ }
            await sleep(1200);

            let cards: FriendResult[] = [];
            const domCards = await scrapeFriendCards(tab.id!, testMode);
            cards = domCards.map(card => ({
                root_handle: handle,
                ...card,
                all_friends: null,
                mutual_friends: null,
                following: null,
                followers: null,
                score: null,
            } as FriendResult));

            totalScraped += cards.length;
            postStatus(`📋 Collected ${cards.length} friends for ${handle} (${totalScraped} total so far)`);
            postStatus(`✅ Finished ${handle}: ${cards.length} friends scraped`);
            handleSummaries.push(`${handle}: ${cards.length}`);

            results.push(...cards);
        } catch (err: any) {
            postStatus(`❌ Error scraping ${handle}: ${err?.message || err}`);
        } finally {
            if (tab) {
                try { await closeTab(tab); } catch { }
            }
        }
    }

    if (handleSummaries.length) {
        postStatus(`📦 Stage 2 complete — per-handle: ${handleSummaries.join('; ')}. Total: ${totalScraped}`);
    } else {
        postStatus('📦 Stage 2 complete — no friends scraped (empty handles list?)');
    }

    return results;
}

export async function saveStage2Handles(handles: string[]): Promise<void> {
    await chrome.storage.local.set({ [STAGE2_STORAGE_KEY]: handles });
}
