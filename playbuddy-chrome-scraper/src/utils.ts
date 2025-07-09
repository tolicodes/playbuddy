import { TEST_MODE } from './config.js';

const MAX_EVENTS_PER_HOUR = 25;

let eventTimestamps: number[] = [];

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getRandomDelay(min: number = TEST_MODE ? 100 : 500, max: number = TEST_MODE ? 500 : 2000): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await sleep(delay);
}

export async function throttleHourly(): Promise<void> {
    const now = Date.now();

    // Remove old timestamps
    eventTimestamps = eventTimestamps.filter(t => now - t < 60 * 60 * 1000);

    if (eventTimestamps.length >= MAX_EVENTS_PER_HOUR) {
        const waitTime = 60 * 1000; // Wait 1 minute
        console.warn(`Throttling: too many requests. Waiting ${waitTime / 1000}s...`);
        await sleep(waitTime);
    }

    eventTimestamps.push(now);
}

export function postStatus(msg: string): void {
    console.log(`🟣 ${msg}`);
    try {
        chrome.runtime?.sendMessage?.({ action: 'log', text: msg }, () => { });
    } catch (e) {
        // Fail silently if chrome runtime isn't available (e.g., when testing outside extension)
    }
}
export async function openTab(url: string): Promise<chrome.tabs.Tab> {
    return new Promise((resolve, reject) => {
        chrome.tabs.create({ url, active: false }, (tab) => {
            if (!tab?.id) {
                return reject(new Error('Failed to create tab'));
            }

            const timeout = setTimeout(() => {
                chrome.tabs.onUpdated.removeListener(listener);
                reject(new Error('Tab load timed out'));
            }, 15000); // 15s timeout

            function listener(tabId: number, info: any) {
                if (tabId === tab.id && info.status === 'complete') {
                    clearTimeout(timeout);
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve(tab);
                }
            }

            chrome.tabs.onUpdated.addListener(listener);
        });
    });
}
