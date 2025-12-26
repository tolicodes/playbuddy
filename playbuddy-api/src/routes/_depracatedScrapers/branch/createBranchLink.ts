// branch_create_quicklink.ts
// Usage: BRANCH_EMAIL=... BRANCH_PASSWORD=... npx ts-node branch_create_quicklink.ts

import puppeteer, { Browser, Page, HTTPResponse } from "puppeteer";

const BRANCH_EMAIL = process.env.BRANCH_EMAIL ?? "";
const BRANCH_PASSWORD = process.env.BRANCH_PASSWORD ?? "";

if (!BRANCH_EMAIL || !BRANCH_PASSWORD) {
    throw new Error("Missing BRANCH_EMAIL or BRANCH_PASSWORD in environment.");
}

const DASH_ROOT = "https://dashboard.branch.io/";
const QL_URL =
    "https://dashboard.branch.io/quick-links/qlc/define?v=latest&step=general";

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// 🔇 keep calls but silence output
function logStep(_msg: string) {
    /* no-op */
}

async function safeClick(page: Page, selector: string): Promise<void> {
    logStep(`waitForSelector + click: ${selector}`);
    const el = await page.waitForSelector(selector, {
        visible: true,
        timeout: 30_000,
    });
    if (!el) throw new Error(`safeClick: not found -> ${selector}`);
    await el.click();
}

async function safeType(page: Page, selector: string, text: string): Promise<void> {
    logStep(`waitForSelector + type: ${selector} -> "${text}"`);
    const el = await page.waitForSelector(selector, {
        visible: true,
        timeout: 30_000,
    });
    if (!el) throw new Error(`safeType: not found -> ${selector}`);
    // Select-all with 3 clicks; modern Puppeteer uses { count } (not clickCount)
    await el.click({ count: 3 });
    await page.type(selector, text, { delay: 0 });
}

async function waitForUrlIncludes(
    page: Page,
    sub: string,
    timeoutMs = 30_000
): Promise<void> {
    logStep(`waitForUrlIncludes("${sub}")`);
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (page.url().includes(sub)) return;
        await delay(150);
    }
    throw new Error(
        `Timeout waiting for URL to include "${sub}". Last URL: ${page.url()}`
    );
}

async function gotoLight(
    page: Page,
    url: string,
    until: "domcontentloaded" | "commit" = "domcontentloaded"
): Promise<HTTPResponse | null> {
    logStep(`GOTO => ${url}`);
    // @ts-ignore
    const resp = await page.goto(url, { waitUntil: until, timeout: 45_000 });
    logStep(
        `  -> status: ${resp ? resp.status() : "null"} | final url: ${page.url()}`
    );
    return resp;
}

export async function createBranchLink({
    title,
    socialTitle,
    socialDescription,
}: {
    title: string;
    socialTitle: string;
    socialDescription: string;
}): Promise<string> {
    const browser: Browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1280, height: 900 },
    });
    const page: Page = await browser.newPage();

    // Be generous with timeouts on a heavy SPA
    page.setDefaultTimeout(60_000);
    page.setDefaultNavigationTimeout(60_000);

    // Debug listeners (kept, but silent via logStep)
    page.on("framenavigated", (f) => logStep(`NAV -> ${f.url()}`));
    page.on("requestfailed", (req) =>
        logStep(`REQUEST FAILED: ${req.method()} ${req.url()} :: ${req.failure()?.errorText}`)
    );
    page.on("console", (msg) => logStep(`PAGE LOG: ${msg.type()} :: ${msg.text()}`));

    // (Optional) Block noisy analytics that keep the page from idling
    await page.setRequestInterception(true);
    page.on("request", (req) => {
        const u = req.url();
        if (
            u.includes("google-analytics.com") ||
            u.includes("amplitude.com") ||
            u.includes("segment.com")
        ) {
            void req.abort();
            return;
        }
        void req.continue();
    });

    // 1) Sign in
    await gotoLight(page, "https://app.branch.io/signin", "domcontentloaded");

    // 2) Email
    await safeType(page, 'input[name="email"]', BRANCH_EMAIL);

    // 3) Submit email (do NOT await navigation; poll URL instead)
    await page.click('button[type="submit"], [type="submit"]');
    await waitForUrlIncludes(page, "dashboard.branch.io/login");

    // 4) Password
    await safeType(page, 'input[name="password"]', BRANCH_PASSWORD);

    // 5) Submit password (poll URL rather than waitForNavigation)
    await page.click('[data-testid="btn-sign-in"], button[type="submit"], [type="submit"]');

    // Wait until we’re actually on dashboard
    await waitForUrlIncludes(page, "dashboard.branch.io");
    // Let SPA hydrate just enough to have top nav
    await page
        .waitForSelector('.top-nav__header, [data-testid="top-nav"]', { timeout: 30_000 })
        .catch(() => { });

    // 6) Hop to dashboard root (short wait; avoid networkidle on SPA)
    await gotoLight(page, DASH_ROOT, "domcontentloaded");
    await waitForUrlIncludes(page, "dashboard.branch.io/");

    // tiny buffer for org select / SPA boot
    await delay(800);

    // 7) Deep link via location.assign (more reliable in SPAs than goto)
    await page.evaluate((u: string) => {
        window.location.assign(u);
    }, QL_URL);

    // Wait for URL AND the specific input you need
    await waitForUrlIncludes(page, "/quick-links/qlc/define");

    const titleSelector = "#FormInput__link-title-input__input";
    try {
        await page.waitForSelector(titleSelector, { visible: true, timeout: 45_000 });
    } catch {
        await page.evaluate((u: string) => {
            window.location.assign(u);
        }, QL_URL);
        await waitForUrlIncludes(page, "/quick-links/qlc/define");
        await page.waitForSelector(titleSelector, { visible: true, timeout: 45_000 });
    }

    // 8) Fill link title
    await safeType(page, titleSelector, title);

    // 9) Social media step
    await safeClick(page, "#social-media-step");

    // 10) Social title
    await safeType(page, '#FormInput__title-input__input', socialTitle);

    // 11) Social description
    await safeType(page, '#FormInput__description-input__input', socialDescription);

    // 12) Save (don’t wait for idle; wait for a post-save cue if available)
    await page.click("#wizard-save-btn");

    // 13) Read out #link-text (still printed as functional output)
    let linkText = "";
    try {
        // @ts-ignore
        await page.waitForSelector("#link-text", { visible: true, timeout: 30_000 });
        // @ts-ignore
        linkText = await page.$eval<string>("#link-text", (el) => el.textContent?.trim() || "");
    } catch {
        console.error("#link-text not found. Current URL:", page.url());
    }

    await browser.close();
    return linkText;
}
