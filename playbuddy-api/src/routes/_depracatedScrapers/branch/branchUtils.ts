// branchUtil.ts
import { Page, HTTPResponse } from "puppeteer";

export async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function waitForUrlIncludes(page: Page, sub: string, timeoutMs = 30_000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (page.url().includes(sub)) return;
        await delay(150);
    }
    throw new Error(`Timeout waiting for URL to include "${sub}". Last URL: ${page.url()}`);
}

export async function safeClick(page: Page, selector: string) {
    await page.waitForSelector(selector, { visible: true, timeout: 30_000 });
    await page.click(selector);
}

export async function safeType(page: Page, selector: string, text: string) {
    const el = await page.waitForSelector(selector, { visible: true, timeout: 30_000 });
    if (!el) throw new Error(`safeType: not found -> ${selector}`);
    await el.click({ clickCount: 3 });
    await page.type(selector, text, { delay: 0 });
}

export async function gotoLight(
    page: Page,
    url: string,
    until: "domcontentloaded" | "commit" = "domcontentloaded"
): Promise<HTTPResponse | null> {
    // @ts-ignore
    return page.goto(url, { waitUntil: until, timeout: 45_000 });
}

/** Safe nav that tolerates SPA races (net::ERR_ABORTED) */
export async function gotoSafe(page: Page, url: string, until: "domcontentloaded" | "commit" = "domcontentloaded") {
    try {
        return await gotoLight(page, url, until);
    } catch (e: any) {
        if (String(e.message || "").includes("net::ERR_ABORTED")) {
            // ignore and continue; SPA likely redirected concurrently
            return null;
        }
        throw e;
    }
}

/**
 * Branch login using SPA-safe flow.
 * Leaves you on dashboard without forcing a root goto (to avoid ERR_ABORTED).
 */
export async function loginBranch(page: Page, email: string, password: string) {
    // 1) Classic app sign-in (hands off to dashboard)
    await gotoLight(page, "https://app.branch.io/signin", "domcontentloaded");

    // 2) Email
    await safeType(page, 'input[name="email"]', email);

    // 3) Submit email → dashboard login
    await page.click('button[type="submit"], [type="submit"]');
    await waitForUrlIncludes(page, "dashboard.branch.io/login");

    // 4) Password
    await safeType(page, 'input[name="password"]', password);

    // 5) Submit password → dashboard
    await page.click('[data-testid="btn-sign-in"], button[type="submit"], [type="submit"]');
    await waitForUrlIncludes(page, "dashboard.branch.io");

    // 6) Let SPA hydrate a bit and try to detect top nav
    await delay(600);
    const hasTopNav = await page.$('.top-nav__header, [data-testid="top-nav"]');

    if (!hasTopNav) {
        // If we didn't land on a hydrated view, nudge via location.assign (not goto)
        await page.evaluate(() => { window.location.assign("https://dashboard.branch.io/"); });
        await waitForUrlIncludes(page, "dashboard.branch.io/");
    }

    // Final small settle
    await delay(400);
}
