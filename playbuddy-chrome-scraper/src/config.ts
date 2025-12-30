// Runtime-test flag stored in extension storage (set via options page)
export const TEST_MODE_KEY = 'PB_TEST_MODE';
export const MAX_EVENTS_KEY = 'PB_MAX_EVENTS';
export const API_ENV_KEY = 'PB_API_ENV';
export const AUTO_FETLIFE_KEY = 'PB_AUTO_FETLIFE';
export const AUTO_FETLIFE_NEARBY_KEY = 'PB_AUTO_FETLIFE_NEARBY';
export const DEFAULT_API_BASE = 'http://localhost:8080';
export const PROD_API_BASE = 'https://api.playbuddy.me';
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

export async function getApiBase(): Promise<string> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return DEFAULT_API_BASE;
    try {
        const res = await chrome.storage.local.get(API_ENV_KEY);
        const env = res[API_ENV_KEY];
        if (env === 'prod') return PROD_API_BASE;
        if (typeof env === 'string' && env.startsWith('http')) return env;
    } catch { /* ignore */ }
    return DEFAULT_API_BASE;
}
