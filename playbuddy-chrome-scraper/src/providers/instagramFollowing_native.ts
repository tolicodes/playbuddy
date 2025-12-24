// instagramFromFile.ts
// Visits up to 5 usernames from a JSON array (or string) and extracts ints-only counts.
// - Counts parsed via old reliable: header section[1] → fallback to whole header
// - Also returns mutuals_count (integer only, no mutual text)

import { sleep, getRandomDelay, openTab, postStatus, throttleHourly } from '../utils.js';

export type InputUser = {
    username: string;
    followed_by?: string; // e.g. "kinkypeanutbutter"
};

export type InstagramCountsRow = {
    source_handle: string;   // followed_by if present, else 'root'
    handle: string;          // username
    posts_count: number;     // ints only
    follower_count: number;  // ints only
    following_count: number; // ints only
    mutuals_count: number;   // ints only
};

type Options = {
    baseDelayMs?: number;
    jitterBetweenMsMin?: number;
    jitterBetweenMsMax?: number;
    longPauseEvery?: number;
    longPauseMsMin?: number;
    longPauseMsMax?: number;
    testMode?: boolean;
    debug?: boolean;
    limit?: number; // optional override (defaults to 5)
};

export async function scrapeInstagramFollowing(
    users: InputUser[] | string,
    opts: Options = {}
): Promise<InstagramCountsRow[]> {
    const {
        baseDelayMs = 500,
        jitterBetweenMsMin = 250,
        jitterBetweenMsMax = 1200,
        longPauseEvery = 60,
        longPauseMsMin = 2 * 60_000,
        longPauseMsMax = 6 * 60_000,
        testMode = false,
        debug = false,
        limit = 1000, // default: only process first 5
    } = opts;

    // Normalize input and limit
    const fullList: InputUser[] = Array.isArray(users) ? users : JSON.parse(users);
    const list = fullList.slice(0, Math.max(0, limit | 0) || 1000);

    const out: InstagramCountsRow[] = [];
    const errors: Array<{ user: string; error: string }> = [];

    const maybeThrottle = async () => {
        if (!testMode) {
            await throttleHourly?.();
            await getRandomDelay?.();
        }
    };

    // Reuse a single tab
    const seedUsername = list[0]?.username || 'instagram';
    const tab = await openTab(`https://www.instagram.com/${encodeURIComponent(seedUsername)}/`);
    await sleep(testMode ? 400 : 1800);

    let processed = 0;

    for (const item of list) {
        const username = item.username?.trim();
        if (!username) continue;

        try {
            processed++;
            if (!testMode) {
                const jitter = Math.floor(Math.random() * (jitterBetweenMsMax - jitterBetweenMsMin + 1)) + jitterBetweenMsMin;
                await sleep(baseDelayMs + jitter);
                await maybeThrottle();

                if (processed % longPauseEvery === 0) {
                    const longMs = Math.floor(Math.random() * (longPauseMsMax - longPauseMsMin + 1)) + longPauseMsMin;
                    postStatus?.(`⏸️ Cooling down for ~${Math.round(longMs / 60000)}m…`);
                    await sleep(longMs);
                }
            }

            // Navigate to profile
            // @ts-ignore
            await chrome.tabs.update(tab.id!, { url: `https://www.instagram.com/${encodeURIComponent(username)}/` });
            await sleep(testMode ? 500 : 2200 + Math.floor(Math.random() * 1200));

            // Parse counts using old section[1] method with header fallback, plus mutuals_count (no text)
            // @ts-ignore
            const [{ result: counts } = { result: null }]: Array<{
                result:
                | { posts: number; followers: number; following: number; mutuals_count: number }
                | null;
            }> = await chrome.scripting.executeScript({
                target: { tabId: tab.id! },
                args: [debug, testMode],
                func: (debug: boolean, testMode: boolean) => {
                    const dlog = (...a: any[]) => { if (debug) console.log('[PB IG]', ...a); };
                    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
                    const toInt = (s: string): number => {
                        const n = parseInt(s.replace(/,/g, ''), 10);
                        return Number.isFinite(n) ? n : 0;
                    };
                    const normalize = (s: string) =>
                        s.replace(/\s+\n/g, '\n').replace(/\n\s+/g, '\n').trim();

                    const parseCountsFromSection2 = ():
                        | { posts: number; followers: number; following: number }
                        | null => {
                        const sec = document.querySelectorAll('header section')[1] as HTMLElement | null;
                        if (!sec) return null;

                        const text = normalize(sec.innerText || sec.textContent || '');
                        if (!text) return null;

                        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
                        const postsLine = lines.find(l => /posts?/i.test(l)) || '';
                        const followersLine = lines.find(l => /followers?/i.test(l)) || '';
                        const followingLine = lines.find(l => /\bfollowing\b/i.test(l)) || '';

                        const posts = toInt((postsLine.match(/([\d,]+)\s*posts?/i)?.[1] || '0'));
                        const followers = toInt((followersLine.match(/([\d,]+)\s*followers?/i)?.[1] || '0'));
                        const following = toInt((followingLine.match(/([\d,]+)\s*following\b/i)?.[1] || '0'));

                        if (!posts && !followers && !following) return null;
                        return { posts, followers, following };
                    };

                    const parseCountsFromHeader = (): { posts: number; followers: number; following: number } => {
                        const headerText = normalize(document.querySelector('header')?.textContent || '');
                        const posts = toInt((headerText.match(/([\d,]+)\s*posts?/i)?.[1] || '0'));
                        const followers = toInt((headerText.match(/([\d,]+)\s*followers?/i)?.[1] || '0'));
                        const following = toInt((headerText.match(/([\d,]+)\s*following\b/i)?.[1] || '0'));
                        return { posts, followers, following };
                    };

                    const parseMutualsCount = (): number => {
                        const s1 = document.querySelector('header > section:first-of-type') as HTMLElement | null;
                        const s1Text = normalize(s1?.innerText || s1?.textContent || '');
                        const lastLine = s1Text.split('\n').slice(-1)[0] || '';
                        const fromLast =
                            lastLine.match(/(\d+)\s+more\b/i) || lastLine.match(/(?:\+|and)\s*(\d+)\s+more\b/i);
                        if (fromLast?.[1]) return parseInt(fromLast[1], 10);

                        const headerText = normalize(document.querySelector('header')?.textContent || '');
                        const fromHeader =
                            headerText.match(/Followed by[\s\S]*?(\d+)\s+more\b/i) ||
                            headerText.match(/(?:\+|and)\s*(\d+)\s+more\b/i);
                        return fromHeader?.[1] ? parseInt(fromHeader[1], 10) : 0;
                    };

                    return new Promise(async resolve => {
                        for (let i = 0; i < (testMode ? 4 : 30); i++) await sleep(testMode ? 50 : 140);

                        const sec2 = parseCountsFromSection2();
                        const { posts, followers, following } = sec2 ?? parseCountsFromHeader();
                        const mutuals_count = parseMutualsCount();

                        dlog('counts:', { posts, followers, following, mutuals_count });
                        resolve({ posts, followers, following, mutuals_count });
                    });
                },
            });

            if (!counts) continue;

            out.push({
                source_handle: item.followed_by || 'root',
                handle: username,
                posts_count: counts.posts,
                follower_count: counts.followers,
                following_count: counts.following,
                mutuals_count: counts.mutuals_count,
            });

            if (!testMode && processed % 25 === 0) {
                postStatus?.(`…${processed}/${list.length} profiles processed`);
            }
        } catch (err: any) {
            errors.push({ user: username, error: err?.message || String(err) });
            postStatus?.(`❌ Error for @${username}: ${err?.message || err}`);
        }
    }

    if (errors.length) {
        console.warn('scrapeInstagramFollowing errors', errors);
        postStatus?.(`⚠️ Completed with ${errors.length} error(s).`);
    }

    try { console.table(out); } catch { }
    try { console.log(JSON.stringify(out, null, 2)); } catch { }

    return out;
}
