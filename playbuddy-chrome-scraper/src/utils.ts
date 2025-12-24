import { TEST_MODE } from './config.js';

const MAX_EVENTS_PER_HOUR = 1000;
const PROGRESS_KEY = 'PB_PROGRESS_LOGS';

let eventTimestamps: number[] = [];
let activeRunId: string | null = null;

type ProgressRun = {
    runId: string;
    startedAt: number;
    entries: { ts: number; msg: string }[];
};

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
        appendProgress(msg);
    } catch (e) {
        // Fail silently if chrome runtime isn't available (e.g., when testing outside extension)
    }
}

export function setActiveRunId(runId: string | null) {
    activeRunId = runId;
}

async function appendProgress(msg: string) {
    if (!activeRunId) return;
    if (!chrome?.storage?.local) return;
    const entry = { ts: Date.now(), msg };
    try {
        const { [PROGRESS_KEY]: existing = [] } = await chrome.storage.local.get(PROGRESS_KEY);
        const runs: ProgressRun[] = (existing as ProgressRun[]) || [];
        const idx = runs.findIndex(r => r.runId === activeRunId);
        if (idx >= 0) {
            runs[idx].entries = [...runs[idx].entries, entry].slice(-400);
        } else {
            runs.unshift({ runId: activeRunId, startedAt: Date.now(), entries: [entry] });
        }
        const capped = runs.slice(0, 8);
        await chrome.storage.local.set({ [PROGRESS_KEY]: capped });
    } catch (err) {
        console.warn('Failed to persist progress', err);
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
                console.log('tab timeout')
                resolve(tab);
            }, 30000); // 30s timeout

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

export async function closeTab(tab: chrome.tabs.Tab): Promise<void> {
    return new Promise((resolve) => {
        chrome.tabs.remove(tab.id!, () => {
            resolve();
        });
    });
}
