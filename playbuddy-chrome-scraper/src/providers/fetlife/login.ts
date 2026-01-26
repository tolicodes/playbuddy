import { closeTab, openTab, postStatus, sleep } from '../../utils.js';

const LOGIN_URL = 'https://fetlife.com/login';
const SIGNED_IN_TEXT = 'You are already signed in.';
const LOGIN_SELECTORS = {
    username: '[autocomplete="username"]',
    password: '[autocomplete="current-password"]',
    submit: '[type="submit"]',
};
const env = (import.meta as { env?: Record<string, string | undefined> }).env;
const LOGIN_USERNAME = env?.VITE_FETLIFE_USERNAME ?? '';
const LOGIN_PASSWORD = env?.VITE_FETLIFE_PASSWORD ?? '';
const DEBUG_LOGIN = env?.VITE_FETLIFE_LOGIN_DEBUG === '1' || env?.VITE_FETLIFE_LOGIN_DEBUG === 'true';

type LoginCheckResult = { signedIn: boolean };
type LoginSubmitResult = { status: 'submitted' | 'missing_fields' };
type LoginFormCheckResult = { hasUsername: boolean; hasPassword: boolean; hasSubmit: boolean };
type LoginResult = { ok: boolean; reason?: string };
const hasLoginCreds = () => LOGIN_USERNAME.trim().length > 0 && LOGIN_PASSWORD.trim().length > 0;

async function checkSignedIn(tabId: number): Promise<LoginCheckResult> {
    const [{ result }]: any = await chrome.scripting.executeScript({
        target: { tabId },
        args: [SIGNED_IN_TEXT],
        func: (signedInText: string) => {
            const text = document.body?.innerText || '';
            return { signedIn: text.includes(signedInText) };
        },
    });
    return (result as LoginCheckResult) || { signedIn: false };
}

async function submitLogin(tabId: number): Promise<LoginSubmitResult> {
    const [{ result }]: any = await chrome.scripting.executeScript({
        target: { tabId },
        args: [LOGIN_USERNAME, LOGIN_PASSWORD, LOGIN_SELECTORS],
        func: (username: string, password: string, selectors: typeof LOGIN_SELECTORS) => {
            const userInput = document.querySelector(selectors.username) as HTMLInputElement | null;
            const passInput = document.querySelector(selectors.password) as HTMLInputElement | null;
            const submitButton = document.querySelector(selectors.submit) as HTMLButtonElement | HTMLInputElement | null;

            if (!userInput || !passInput || !submitButton) {
                return { status: 'missing_fields' as const };
            }

            userInput.value = username;
            userInput.dispatchEvent(new Event('input', { bubbles: true }));
            passInput.value = password;
            passInput.dispatchEvent(new Event('input', { bubbles: true }));

            (submitButton as HTMLElement).click();
            return { status: 'submitted' as const };
        },
    });
    return (result as LoginSubmitResult) || { status: 'missing_fields' };
}

async function checkLoginForm(tabId: number): Promise<LoginFormCheckResult> {
    const [{ result }]: any = await chrome.scripting.executeScript({
        target: { tabId },
        args: [LOGIN_SELECTORS],
        func: (selectors: typeof LOGIN_SELECTORS) => {
            const hasUsername = !!document.querySelector(selectors.username);
            const hasPassword = !!document.querySelector(selectors.password);
            const hasSubmit = !!document.querySelector(selectors.submit);
            return { hasUsername, hasPassword, hasSubmit };
        },
    });
    return (result as LoginFormCheckResult) || { hasUsername: false, hasPassword: false, hasSubmit: false };
}

async function recheckSignedIn(): Promise<boolean> {
    let checkTab: chrome.tabs.Tab | null = null;
    try {
        checkTab = await openTab(LOGIN_URL);
        const res = await checkSignedIn(checkTab.id!);
        return res.signedIn;
    } finally {
        if (checkTab) await closeTab(checkTab);
    }
}

async function clickContinueIfPresent(tabId: number): Promise<boolean> {
    const [{ result }]: any = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
            const matchText = (el: Element | null) =>
                (el?.textContent || '').trim().toLowerCase() === 'continue';
            const candidates = Array.from(
                document.querySelectorAll('button, input[type="submit"], input[type="button"], a[role="button"], a')
            );
            const target = candidates.find(el => matchText(el)) as HTMLElement | undefined;
            if (!target) return false;
            target.click();
            return true;
        },
    });
    return !!result;
}

async function clickLoginIfPresent(tabId: number): Promise<boolean> {
    const [{ result }]: any = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
            const normalize = (value: string) => value.trim().toLowerCase();
            const matchesLogin = (el: Element | null) => {
                if (!el) return false;
                const text = normalize(el.textContent || '');
                const aria = normalize(el.getAttribute('aria-label') || '');
                const title = normalize(el.getAttribute('title') || '');
                const value = normalize((el as HTMLInputElement).value || '');
                const candidates = [text, aria, title, value];
                return candidates.some(entry => entry === 'log in' || entry === 'login' || entry.includes('log in'));
            };
            const candidates = Array.from(
                document.querySelectorAll('button, input[type="submit"], input[type="button"], a[role="button"], a')
            );
            let target = candidates.find(el => matchesLogin(el)) as HTMLElement | undefined;
            if (!target) {
                target = document.querySelector('form button[type="submit"]') as HTMLElement | null || undefined;
            }
            if (!target) return false;
            target.click();
            return true;
        },
    });
    return !!result;
}

export async function ensureFetlifeLogin(): Promise<LoginResult> {
    let tab: chrome.tabs.Tab | null = null;
    let keepLoginTabOpen = false;
    try {
        postStatus('🔐 Checking FetLife login...');
        tab = await openTab(LOGIN_URL);
        try { await chrome.tabs.update(tab.id!, { active: true }); } catch { /* ignore */ }
        await sleep(400);

        const firstCheck = await checkSignedIn(tab.id!);
        if (firstCheck.signedIn) {
            postStatus('✅ FetLife already signed in.');
            return { ok: true };
        }
        keepLoginTabOpen = true;
        if (DEBUG_LOGIN) {
            const didContinue = await clickContinueIfPresent(tab.id!);
            const didLoginClick = await clickLoginIfPresent(tab.id!);
            const formCheck = await checkLoginForm(tab.id!);
            postStatus(
                `🧪 FetLife login debug: ${didContinue ? 'clicked continue. ' : ''}${didLoginClick ? 'clicked log in. ' : ''}form fields present? user=${formCheck.hasUsername} pass=${formCheck.hasPassword} submit=${formCheck.hasSubmit}. Stopping before entering credentials.`
            );
            return { ok: false, reason: 'debug_mode' };
        }
        if (!hasLoginCreds()) {
            postStatus('⚠️ FetLife credentials not set. Add VITE_FETLIFE_USERNAME and VITE_FETLIFE_PASSWORD.');
            return { ok: false, reason: 'missing_credentials' };
        }

        postStatus('➡️ Submitting FetLife login...');
        const submitResult = await submitLogin(tab.id!);
        if (submitResult.status === 'missing_fields') {
            postStatus('⚠️ FetLife login form not found.');
            return { ok: false, reason: 'login_form_not_found' };
        }

        postStatus('⏳ Waiting for FetLife login response...');
        await sleep(4000);
        postStatus('🔍 Re-checking FetLife login...');
        const secondCheck = await recheckSignedIn();
        if (secondCheck) {
            postStatus('✅ FetLife login confirmed.');
            return { ok: true };
        } else {
            postStatus('⚠️ FetLife login submitted; confirmation not detected. Leaving login page open.');
            return { ok: false, reason: 'login_not_confirmed' };
        }
    } catch (err: any) {
        postStatus(`❌ FetLife login failed: ${err?.message || err}`);
        return { ok: false, reason: err?.message || 'login_failed' };
    } finally {
        if (tab && !keepLoginTabOpen && !DEBUG_LOGIN) await closeTab(tab);
    }
}
