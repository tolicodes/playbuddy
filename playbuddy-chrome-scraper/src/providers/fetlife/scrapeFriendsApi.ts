import { closeTab, getRandomDelay, openTab, postStatus } from '../../utils.js';
import type { FriendResult } from './types.js';

const STAGE2_STORAGE_KEY = 'PB_FRIEND_STAGE2_HANDLES';
const BASE_URL = 'https://fetlife.com';
const DEFAULT_ANCHOR = '_peanutbutter';
const DEFAULT_PER_PAGE = 20;
const REQUEST_INTERVAL_MS = 500;
const MAX_PAGES = 50;

type RelationsUser = {
    id?: number;
    nickname?: string;
    url?: string;
    age?: number;
    gender?: string;
    role?: string;
    location?: string;
    supporter_badge?: boolean;
    organization?: boolean;
    avatar_url?: string;
};

type FetchOpts = {
    perPage: number;
    delayMinMs: number;
    delayMaxMs: number;
};

const normalizeHandle = (handle: string) => handle.replace(/^@+/, '').trim();

const buildFriendsUrl = (handle: string) => `${BASE_URL}/${encodeURIComponent(handle)}/friends`;

const waitForTabComplete = (tabId: number, timeoutMs = 30000): Promise<void> => {
    return new Promise((resolve) => {
        chrome.tabs.get(tabId, (tab) => {
            if (tab?.status === 'complete') {
                resolve();
                return;
            }
            const timeout = setTimeout(() => {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
            }, timeoutMs);
            const listener = (updatedTabId: number, info: { status?: string }) => {
                if (updatedTabId === tabId && info.status === 'complete') {
                    clearTimeout(timeout);
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve();
                }
            };
            chrome.tabs.onUpdated.addListener(listener);
        });
    });
};

async function ensureFriendsTab(tab: chrome.tabs.Tab | null, handle: string): Promise<chrome.tabs.Tab> {
    const url = buildFriendsUrl(handle);
    if (!tab) {
        tab = await openTab(url);
    } else {
        await chrome.tabs.update(tab.id!, { url, active: true });
        await waitForTabComplete(tab.id!);
    }
    try { await chrome.tabs.update(tab.id!, { active: true }); } catch { /* best effort */ }
    return tab;
}

const mapUserToFriend = (user: RelationsUser, rootHandle: string): FriendResult | null => {
    const urlValue = user.url || '';
    const handleFromUrl = urlValue
        ? urlValue.replace(/^https?:\/\/(www\.)?fetlife\.com\//i, '').split(/[/?#]/)[0]
        : '';
    const nickname = (user.nickname || handleFromUrl || '').trim();
    if (!nickname) return null;
    const avatarUrl = user.avatar_url || null;
    return {
        root_handle: rootHandle,
        following_of: rootHandle,
        username: nickname,
        nickname: nickname || null,
        profile_pic_url: avatarUrl,
        location: user.location ?? null,
        organization: typeof user.organization === 'boolean' ? user.organization : null,
    };
};

async function fetchRelationsInTab(
    tabId: number,
    handle: string,
    opts: FetchOpts
): Promise<{ users: RelationsUser[]; logs: string[] }> {
    const cleanHandle = normalizeHandle(handle);
    if (!cleanHandle) return { users: [], logs: [] };
    const [{ result }]: any = await chrome.scripting.executeScript({
        target: { tabId },
        args: [cleanHandle, opts.perPage, opts.delayMinMs, opts.delayMaxMs, MAX_PAGES],
        func: async (
            handle: string,
            perPage: number,
            delayMinMs: number,
            delayMaxMs: number,
            maxPages: number
        ) => {
            const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
            const sendLog = (msg: string) => {
                try { chrome.runtime?.sendMessage?.({ action: 'log', text: msg }); } catch { /* ignore */ }
            };
            const getCsrfToken = () =>
                (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content || '';

            const entries: any[] = [];
            const logs: string[] = [];
            const path = window.location.pathname || '';
            if (!path.includes('/friends')) {
                logs.push(`Friends API: ${handle} unexpected path ${path}`);
            }
            let page = 1;
            let noMore = false;

            const nextDelay = () => {
                const min = Math.max(0, Number(delayMinMs) || 0);
                const max = Math.max(min, Number(delayMaxMs) || min);
                if (max <= 0) return 0;
                return Math.floor(Math.random() * (max - min + 1)) + min;
            };

            while (true) {
                if (page > maxPages) break;
                const token = getCsrfToken();
                if (!token) {
                    const msg = `Friends API: ${handle} missing csrf token`;
                    logs.push(msg);
                    sendLog(msg);
                }
                const pathParts = path.split('/').filter(Boolean);
                const basePath = pathParts.length ? `/${pathParts[0]}` : `/${handle}`;
                const url = `https://fetlife.com${basePath}/relations`;
                const body = JSON.stringify({
                    authenticity_token: token,
                    page,
                    tab: 'friends',
                    search_query: '',
                    sort_order: 'newest',
                    per_page: perPage,
                });
                const res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        accept: 'application/json',
                        'content-type': 'application/json',
                        ...(token ? { 'x-csrf-token': token } : {}),
                    },
                    credentials: 'same-origin',
                    body,
                });
                if (!res.ok) throw new Error(`Friends API failed ${handle} page ${page}: ${res.status}`);
                const json: any = await res.json();
                const userCount = Array.isArray(json?.users) ? json.users.length : 0;
                const msg = `Friends API: ${handle} page ${page} -> ${userCount} users (no_more=${!!json?.no_more})`;
                logs.push(msg);
                sendLog(msg);
                if (Array.isArray(json?.users)) entries.push(...json.users);
                noMore = !!json?.no_more;
                if (noMore) break;
                page += 1;
                const waitMs = nextDelay();
                if (waitMs > 0) await sleep(waitMs);
            }

            return { users: entries, logs };
        },
    });

    const users = Array.isArray(result?.users) ? result.users as RelationsUser[] : [];
    const logs = Array.isArray(result?.logs) ? result.logs as string[] : [];
    return { users, logs };
}

async function loadStage2Handles(): Promise<string[]> {
    try {
        const res = await chrome.storage.local.get(STAGE2_STORAGE_KEY);
        const stored = res?.[STAGE2_STORAGE_KEY];
        if (!Array.isArray(stored)) return [];
        const cleaned = stored.map((h) => normalizeHandle(String(h || ''))).filter(Boolean);
        return Array.from(new Set(cleaned));
    } catch {
        return [];
    }
}

export async function scrapeFetlifeFriendsApiStage1(): Promise<FriendResult[]> {
    const rootHandle = DEFAULT_ANCHOR;
    postStatus(`Friends API Stage 1: ${rootHandle}`);

    let tab: chrome.tabs.Tab | null = null;
    try {
        tab = await ensureFriendsTab(null, rootHandle);
        await getRandomDelay(REQUEST_INTERVAL_MS, REQUEST_INTERVAL_MS);
        const { users, logs } = await fetchRelationsInTab(tab.id!, rootHandle, {
            perPage: DEFAULT_PER_PAGE,
            delayMinMs: REQUEST_INTERVAL_MS,
            delayMaxMs: REQUEST_INTERVAL_MS,
        });
        logs.forEach(msg => postStatus(msg));

        const mapped = users
            .map((u) => mapUserToFriend(u, rootHandle))
            .filter(Boolean) as FriendResult[];

        if (!mapped.length) {
            postStatus('Friends API Stage 1: 0 users returned. Check logs for csrf or path warnings.');
        }
        postStatus(`Friends API Stage 1: ${mapped.length} friends collected`);
        return mapped;
    } finally {
        if (tab) await closeTab(tab);
    }
}

export async function scrapeFetlifeFriendsApiStage2FromStorage(): Promise<FriendResult[]> {
    let handles = await loadStage2Handles();
    if (!handles.length) {
        postStatus('No stage 2 handles found in storage. Please upload a Stage 1 JSON first.');
        return [];
    }

    const results: FriendResult[] = [];

    // Include Stage 1 handles as direct friends of the anchor (_peanutbutter)
    const anchor = DEFAULT_ANCHOR;
    const stage1AsFriends = handles.map((h) => ({
        root_handle: anchor,
        following_of: anchor,
        username: h,
        nickname: h,
        profile_pic_url: null,
        location: null,
        organization: null,
    } as FriendResult));
    results.push(...stage1AsFriends);

    postStatus(`Stage 2 Friends API: scraping friends for ${handles.length} handles`);
    let totalScraped = 0;
    let processed = 0;
    const handleSummaries: string[] = [];
    let tab: chrome.tabs.Tab | null = null;

    try {
        for (const handle of handles) {
            processed += 1;
            postStatus(`Friends API: ${handle} (${processed}/${handles.length})`);
            try {
                tab = await ensureFriendsTab(tab, handle);
                await getRandomDelay(REQUEST_INTERVAL_MS, REQUEST_INTERVAL_MS);
                const { users, logs } = await fetchRelationsInTab(tab.id!, handle, {
                    perPage: DEFAULT_PER_PAGE,
                    delayMinMs: REQUEST_INTERVAL_MS,
                    delayMaxMs: REQUEST_INTERVAL_MS,
                });
                logs.forEach(msg => postStatus(msg));

                const mapped = users
                    .map((u) => mapUserToFriend(u, handle))
                    .filter(Boolean) as FriendResult[];

                totalScraped += mapped.length;
                handleSummaries.push(`${handle}: ${mapped.length}`);
                results.push(...mapped);
                postStatus(`Friends API: ${handle} -> ${mapped.length} friends`);
            } catch (err: any) {
                postStatus(`Friends API error for ${handle}: ${err?.message || err}`);
            }

            if (processed < handles.length) {
                await getRandomDelay(REQUEST_INTERVAL_MS, REQUEST_INTERVAL_MS);
            }
        }
    } finally {
        if (tab) await closeTab(tab);
    }

    if (handleSummaries.length) {
        postStatus(`Stage 2 Friends API complete - per-handle: ${handleSummaries.join('; ')}. Total: ${totalScraped}`);
    } else {
        postStatus('Stage 2 Friends API complete - no friends scraped (empty handles list?)');
    }

    return results;
}
