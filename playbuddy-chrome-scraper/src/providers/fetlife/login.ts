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

type LoginCheckResult = { signedIn: boolean };
type LoginSubmitResult = { status: 'submitted' | 'missing_fields' };
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

export async function ensureFetlifeLogin(): Promise<void> {
    let tab: chrome.tabs.Tab | null = null;
    try {
        postStatus('🔐 Checking FetLife login...');
        tab = await openTab(LOGIN_URL);
        try { await chrome.tabs.update(tab.id!, { active: true }); } catch { /* ignore */ }
        await sleep(400);

        const firstCheck = await checkSignedIn(tab.id!);
        if (firstCheck.signedIn) {
            postStatus('✅ FetLife already signed in.');
            return;
        }
        if (!hasLoginCreds()) {
            postStatus('⚠️ FetLife credentials not set. Add VITE_FETLIFE_USERNAME and VITE_FETLIFE_PASSWORD.');
            return;
        }

        const submitResult = await submitLogin(tab.id!);
        if (submitResult.status === 'missing_fields') {
            postStatus('⚠️ FetLife login form not found.');
            return;
        }

        await sleep(4000);
        const secondCheck = await checkSignedIn(tab.id!);
        if (secondCheck.signedIn) {
            postStatus('✅ FetLife login confirmed.');
        } else {
            postStatus('⚠️ FetLife login submitted; confirmation not detected.');
        }
    } catch (err: any) {
        postStatus(`❌ FetLife login failed: ${err?.message || err}`);
    } finally {
        if (tab) await closeTab(tab);
    }
}
