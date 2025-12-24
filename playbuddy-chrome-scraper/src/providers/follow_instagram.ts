// scripts/followInstagram.ts
import { getRandomDelay, openTab, postStatus, sleep, throttleHourly } from '../utils.js';

export type FollowStatus =
    | 'followed'
    | 'already_following'
    | 'requested'
    | 'button_not_found'
    | 'not_found'
    | 'too_popular'
    | 'rate_limited'
    | 'error';

export interface FollowResult {
    instagram_handle: string;
    status: FollowStatus;
    followers?: number;
    message?: string;
}

export async function followInstagram(
    usernames: string[],
    options?: { closeTab?: boolean }
): Promise<FollowResult[]> {
    const results: FollowResult[] = [];
    const closeTab = options?.closeTab ?? false;

    for (const username of usernames) {
        const url = `https://www.instagram.com/${username}/`;
        postStatus(`👣 Following attempt: @${username}`);

        try {
            await throttleHourly();
            await getRandomDelay();

            const tab = await openTab(url);
            await sleep(3000);

            // @ts-ignore
            const [injectionResult]: { result: FollowResult }[] = await chrome.scripting.executeScript({
                target: { tabId: tab.id! },
                args: [username],
                func: (handle: string) => {
                    // ---- runs inside page ----
                    function wait(ms: number) { return new Promise(r => setTimeout(r, ms)); }

                    function parseFollowersCount(text: string | null | undefined): number | null {
                        if (!text) return null;
                        text = text.replace(/,/g, '').trim().toLowerCase();

                        const mK = text.match(/^([\d.]+)k/);
                        if (mK) return Math.round(parseFloat(mK[1]) * 1000);

                        const mM = text.match(/^([\d.]+)m/);
                        if (mM) return Math.round(parseFloat(mM[1]) * 1_000_000);

                        const num = parseInt(text, 10);
                        return isNaN(num) ? null : num;
                    }

                    function getFollowersCount(): number | null {
                        // Followers are usually in <li> with "followers"
                        const candidates = Array.from(document.querySelectorAll('ul li a, ul li span'))
                            .map(el => el.textContent?.toLowerCase() || '');

                        const followerCandidate = candidates.find(t => t.includes('followers'));
                        if (!followerCandidate) return null;

                        // Extract digits/k/m
                        const match = followerCandidate.match(/[\d.,]+[km]?/i);
                        if (!match) return null;

                        return parseFollowersCount(match[0]);
                    }

                    function findFollowButton(): HTMLElement | null {
                        const candidates = Array.from(document.querySelectorAll<HTMLElement>('button, div[role="button"]'));
                        for (const el of candidates) {
                            const t = (el.textContent || '').trim().toLowerCase();
                            if (['follow', 'follow back'].includes(t)) return el;
                        }
                        return null;
                    }

                    async function clickFollowAndConfirm(): Promise<FollowStatus> {
                        const btn = findFollowButton();
                        if (!btn) return 'button_not_found';
                        btn.click();
                        await wait(1000);
                        const after = (btn.textContent || '').trim().toLowerCase();
                        if (after.includes('following')) return 'already_following';
                        if (after.includes('requested')) return 'requested';
                        return 'followed';
                    }

                    return new Promise<FollowResult>(async (resolve) => {
                        await wait(2000);

                        const followers = getFollowersCount();
                        if (followers !== null && followers >= 30000) {
                            return resolve({
                                instagram_handle: handle,
                                status: 'too_popular',
                                followers,
                                message: `Skipped (followers=${followers})`
                            });
                        }

                        const btn = findFollowButton();
                        if (!btn) {
                            return resolve({ instagram_handle: handle, status: 'button_not_found', followers: undefined });
                        }

                        const status = await clickFollowAndConfirm();
                        resolve({ instagram_handle: handle, status, followers: undefined });
                    });
                    // ---- end page context ----
                },
            });

            const followResult = injectionResult?.result as FollowResult | undefined;
            if (!followResult) {
                results.push({ instagram_handle: username, status: 'error', message: 'No result', followers: undefined });
            } else {
                results.push(followResult);
                const emoji =
                    followResult.status === 'followed' ? '✅' :
                        followResult.status === 'already_following' ? '☑️' :
                            followResult.status === 'requested' ? '🕗' :
                                followResult.status === 'too_popular' ? '🚀' :
                                    followResult.status === 'button_not_found' ? '🔎' :
                                        followResult.status === 'not_found' ? '🚫' : '⚠️';
                postStatus(`   ${emoji} @${username} → ${followResult.status} (followers=${followResult.followers ?? '?'})`);
            }

            if (closeTab) {
                try { await chrome.tabs.remove(tab.id!); } catch { }
            }
        } catch (err: any) {
            postStatus(`   ❌ Failed to follow @${username}: ${err?.message || String(err)}`);
            results.push({ instagram_handle: username, status: 'error', message: err?.message || String(err) });
        }
    }

    return results;
}
