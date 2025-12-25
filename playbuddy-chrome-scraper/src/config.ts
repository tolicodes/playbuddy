// Runtime-test flag stored in extension storage (set via options page)
export const TEST_MODE_KEY = 'PB_TEST_MODE';
export const MAX_EVENTS_KEY = 'PB_MAX_EVENTS';
export const TEST_MODE = false; // legacy constant; use isTestMode() for runtime checks
export async function isTestMode(): Promise<boolean> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return false;
    try {
        const res = await chrome.storage.local.get(TEST_MODE_KEY);
        return !!res[TEST_MODE_KEY];
    } catch {
        return false;
    }
}
