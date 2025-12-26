// fullBranchStatsWithSession.playwright.ts
// Usage:
//   npm i -D typescript ts-node @types/node playwright
//   npx ts-node fullBranchStatsWithSession.playwright.ts
//   npx ts-node fullBranchStatsWithSession.playwright.ts --fresh
//   npx ts-node fullBranchStatsWithSession.playwright.ts --paginate --page-size=100

import { chromium, Browser, BrowserContext, Page, Locator } from "playwright";
import * as fs from "fs";
import * as path from "path";

/* ============== config / flags ============== */
const BRANCH_EMAIL = "toli@toli.me";
const BRANCH_PASSWORD = "ejx7VZW7cny9ezg@fcz";
const MANAGER_URL = "https://dashboard.branch.io/quick-links/manager?v=latest";
const STATE_PATH = path.resolve(process.cwd(), "branch.playwright.state.json");
const OUTFILE = path.resolve(process.cwd(), "branch_stats.csv");

const FORCE_FRESH = process.argv.includes("--fresh");
const PAGINATE = process.argv.includes("--paginate");
const PAGE_SIZE = (() => {
    const arg = process.argv.find(a => a.startsWith("--page-size="));
    const n = arg ? Number(arg.split("=")[1]) : 100;
    return Number.isFinite(n) && n > 0 ? n : 100;
})();

/* ============== types ============== */
type ClickFlowStats = {
    overallClicks: number | null;
    desktop?: {
        linkClicks?: number | null;
        textsSent?: number | null;
        iosSms?: { install?: number | null; reopen?: number | null };
        androidSms?: { install?: number | null; reopen?: number | null };
    };
    android?: { linkClicks?: number | null; install?: number | null; reopen?: number | null };
    ios?: { linkClicks?: number | null; install?: number | null; reopen?: number | null };
};

type RowResult = {
    name: string | null;   // from the same link_title cell
    url: string | null;    // from the same link_title cell
    stats: ClickFlowStats;
};

/* ============== small utils ============== */
const num = (t?: string | null) => {
    if (!t) return null;
    const m = t.replace(/[, ]/g, "").match(/-?\d+(\.\d+)?/);
    return m ? Number(m[0]) : null;
};

function csvEscape(v: any): string {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
async function writeCsv(filepath: string, rows: RowResult[]) {
    const headers = [
        "name", "url",
        "overallClicks",
        "desktop_linkClicks", "desktop_textsSent",
        "desktop_iosSms_install", "desktop_iosSms_reopen",
        "desktop_androidSms_install", "desktop_androidSms_reopen",
        "android_linkClicks", "android_install", "android_reopen",
        "ios_linkClicks", "ios_install", "ios_reopen",
    ];
    const lines = [headers.join(",")];
    for (const r of rows) {
        const s = r.stats || {};
        const d = s.desktop || {};
        const a = s.android || {};
        const i = s.ios || {};
        lines.push([
            r.name ?? "",
            r.url ?? "",
            s.overallClicks ?? "",
            d.linkClicks ?? "",
            d.textsSent ?? "",
            d.iosSms?.install ?? "",
            d.iosSms?.reopen ?? "",
            d.androidSms?.install ?? "",
            d.androidSms?.reopen ?? "",
            a.linkClicks ?? "",
            a.install ?? "",
            a.reopen ?? "",
            i.linkClicks ?? "",
            i.install ?? "",
            i.reopen ?? "",
        ].map(csvEscape).join(","));
    }
    await fs.promises.writeFile(filepath, lines.join("\n") + "\n", "utf8");
}

/* ============== auth / session ============== */
async function waitForDashboardReady(page: Page) {
    await page.waitForLoadState("domcontentloaded");
    await page.locator('[data-testid="top-nav"], .top-nav__header').first()
        .waitFor({ state: "visible", timeout: 60_000 }).catch(() => { });
    await page.waitForFunction(() => {
        const busy = document.querySelector('.MuiBackdrop-root,[role="progressbar"],.MuiSkeleton-root');
        return !busy;
    }, { timeout: 30_000 }).catch(() => { });
}

async function login(page: Page) {
    await page.goto("https://app.branch.io/signin");
    await page.locator('input[name="email"]').fill(BRANCH_EMAIL);
    await page.locator('button[type="submit"], [type="submit"]').first().click();
    await page.waitForURL(/dashboard\.branch\.io\/login/);

    await page.locator('input[name="password"]').fill(BRANCH_PASSWORD);
    await page.locator('[data-testid="btn-sign-in"], button[type="submit"], [type="submit"]').first().click();
    await page.waitForURL(/dashboard\.branch\.io/);

    await waitForDashboardReady(page);
}

async function getAuthedContext(browser: Browser): Promise<{ ctx: BrowserContext; page: Page; refreshed: boolean }> {
    const hasState = fs.existsSync(STATE_PATH);
    const ctx = await browser.newContext(!FORCE_FRESH && hasState ? { storageState: STATE_PATH } : {});
    const page = await ctx.newPage();

    await page.goto(MANAGER_URL);
    const redirectedToLogin = /dashboard\.branch\.io\/login/.test(page.url());
    const passwordVisible = await page.locator('input[name="password"]').first().isVisible().catch(() => false);
    const needLogin = FORCE_FRESH || !hasState || redirectedToLogin || passwordVisible;

    if (needLogin) {
        await login(page);
        await ctx.storageState({ path: STATE_PATH });
        await page.goto(MANAGER_URL);
        await waitForDashboardReady(page);
        return { ctx, page, refreshed: true };
    }

    await waitForDashboardReady(page);
    return { ctx, page, refreshed: false };
}

/* ============== page readiness & pagination ============== */
async function waitForManagerReady(page: Page) {
    await page.waitForURL(/quick-links\/manager/).catch(() => { });
    await page.locator('.MuiDataGrid-root').first().waitFor({ state: "visible", timeout: 60_000 });
    await page.waitForFunction(() => {
        const hasRow = !!document.querySelector('.MuiDataGrid-row');
        const overlay = document.querySelector('.MuiDataGrid-overlay,[role="progressbar"],.MuiCircularProgress-root');
        return hasRow && !overlay;
    }, { timeout: 60_000 });
}

async function waitForStatsReady(p: Page) {
    await p.waitForLoadState("domcontentloaded");
    await p.locator('.chart-title').first().waitFor({ state: "visible", timeout: 45_000 });
}

async function setRowsPerPage(page: Page, size: number) {
    const paginator = page.locator('.MuiTablePagination-root');
    await paginator.waitFor({ state: "visible", timeout: 30_000 });

    const sizeButton = paginator.locator('[role="button"][aria-haspopup="listbox"]').first();
    const current = (await sizeButton.textContent())?.trim();
    if (current === String(size)) return; // already set

    await sizeButton.click();

    // Pick the option matching size
    const option = page.getByRole("option", { name: String(size) });
    if (await option.count()) {
        await option.click();
    } else {
        await page.locator('[role="option"], li[role="option"]').filter({ hasText: String(size) }).first().click();
    }

    // wait for the button text to update
    await page.waitForFunction(
        // @ts-expect-error
        (el, s) => el?.textContent?.trim() === String(s),
        sizeButton,
        size,
        // @ts-expect-error
        { timeout: 10_000 }
    ).catch(() => { });
    await waitForManagerReady(page);
}

async function getDisplayedRowsText(page: Page): Promise<string> {
    return (await page.locator('.MuiTablePagination-displayedRows').first().textContent())?.trim() ?? "";
}

async function goToNextPageIfPossible(page: Page): Promise<boolean> {
    const paginator = page.locator('.MuiTablePagination-root');
    const nextBtn = paginator.getByRole('button', { name: /go to next page/i }).first();

    const disabled = await nextBtn.isDisabled().catch(() => true);
    if (disabled) return false;

    const before = await getDisplayedRowsText(page);
    await nextBtn.click();

    await page.waitForFunction(
        (prev) => {
            const t = document.querySelector('.MuiTablePagination-displayedRows')?.textContent?.trim() || "";
            return t && t !== prev;
        },
        before,
        { timeout: 15_000 }
    ).catch(() => { });
    await waitForManagerReady(page);
    return true;
}

/* ============== scraping helpers ============== */
async function textByXPath(container: Locator, xpath: string): Promise<string | null> {
    const handle = container.locator(`xpath=${xpath}`).first();
    if (!(await handle.count())) return null;
    return (await handle.textContent())?.trim() ?? null;
}
async function textsByXPath(container: Locator, xpath: string): Promise<string[]> {
    const els = container.locator(`xpath=${xpath}`);
    const n = await els.count();
    const arr: string[] = [];
    for (let i = 0; i < n; i++) arr.push((await els.nth(i).textContent())?.trim() ?? "");
    return arr;
}

async function extractStats(page: Page): Promise<ClickFlowStats> {
    await waitForStatsReady(page);

    const overallClicks = num(await page.locator('.chart-title .click-highlight').first().textContent());

    const desktop = page.locator('#desktop-click-flow');
    const android = page.locator('#android-click-flow');
    const ios = page.locator('#ios-click-flow');

    let desktopStats: ClickFlowStats["desktop"] | undefined;
    if (await desktop.count()) {
        const linkClicksText = await textByXPath(
            desktop,
            `.//tr[.//div[contains(@class,"click-flow__content") and normalize-space()="Link Clicks"]]/following-sibling::tr[1]//div[contains(@class,"click-flow__content")]`
        );
        const textsSentText = await textByXPath(
            desktop,
            `.//tr[.//div[contains(@class,"click-flow__content") and normalize-space()="Texts sent"]]/following-sibling::tr[1]//div[contains(@class,"click-flow__content")]`
        );
        const last4Vals = await textsByXPath(
            desktop,
            `(//tr[count(.//div[contains(@class,"click-flow__content-no-overflow")])=4])[last()]//div[contains(@class,"click-flow__content-no-overflow")]`
        );
        const [iosInstall, iosReopen, andInstall, andReopen] = [
            num(last4Vals[0]), num(last4Vals[1]), num(last4Vals[2]), num(last4Vals[3])
        ];
        desktopStats = {
            linkClicks: num(linkClicksText),
            textsSent: num(textsSentText),
            iosSms: { install: iosInstall ?? null, reopen: iosReopen ?? null },
            androidSms: { install: andInstall ?? null, reopen: andReopen ?? null },
        };
    }

    let androidStats: ClickFlowStats["android"] | undefined;
    if (await android.count()) {
        const linkClicksText = await textByXPath(
            android,
            `.//tr[.//div[contains(@class,"click-flow__content") and normalize-space()="Link Clicks"]]/following-sibling::tr[1]//div[contains(@class,"click-flow__content")]`
        );
        const last2Vals = await textsByXPath(
            android,
            `(//tr[count(.//div[contains(@class,"click-flow__content-no-overflow")])=2])[last()]//div[contains(@class,"click-flow__content-no-overflow")]`
        );
        const [install, reopen] = [num(last2Vals[0]), num(last2Vals[1])];
        androidStats = { linkClicks: num(linkClicksText), install: install ?? null, reopen: reopen ?? null };
    }

    let iosStats: ClickFlowStats["ios"] | undefined;
    if (await ios.count()) {
        const linkClicksText = await textByXPath(
            ios,
            `.//tr[.//div[contains(@class,"click-flow__content") and normalize-space()="Link Clicks"]]/following-sibling::tr[1]//div[contains(@class,"click-flow__content")]`
        );
        const last2Vals = await textsByXPath(
            ios,
            `(//tr[count(.//div[contains(@class,"click-flow__content-no-overflow")])=2])[last()]//div[contains(@class,"click-flow__content-no-overflow")]`
        );
        const [install, reopen] = [num(last2Vals[0]), num(last2Vals[1])];
        iosStats = { linkClicks: num(linkClicksText), install: install ?? null, reopen: reopen ?? null };
    }

    return { overallClicks, desktop: desktopStats, android: androidStats, ios: iosStats };
}

/** From a Manager row, read both Title + URL from the same cell: data-field="link_title" */
async function extractManagerRowTitleAndLink(row: Locator): Promise<{ name: string | null; url: string | null }> {
    const cell = row.locator('.MuiDataGrid-cell[data-field="link_title"]').first();

    let name: string | null = null;
    if (await cell.count()) {
        name = (await cell.locator('p.MuiTypography-body2').first().textContent())?.trim() ?? null;
    }

    let url: string | null = null;
    const linkCandidates: Locator[] = [
        cell.locator('a#link-url').first(),
        cell.locator('a[href^="https://l."]').first(),
        cell.locator('a[href^="http"]').first(),
    ];
    for (const cand of linkCandidates) {
        if (await cand.count()) {
            url = (await cand.getAttribute("href")) ?? null;
            if (!url) {
                const t = (await cand.textContent())?.trim();
                if (t && /^https?:\/\//i.test(t)) url = t;
            }
            if (url) break;
        }
    }

    // Fallbacks
    if (!name) name = (await row.locator('p.MuiTypography-body2').first().textContent())?.trim() ?? null;
    if (!url) {
        const any = row.locator('a[href^="http"]').first();
        if (await any.count()) url = await any.getAttribute('href');
    }

    return { name, url };
}

/** Open the kebab → View Stats; returns whether it opened a popup or same tab */
async function clickViewStatsForRow(page: Page, rowIndex: number): Promise<"same-tab" | "popup"> {
    const rows = page.locator(".MuiDataGrid-row");
    const row = rows.nth(rowIndex);
    await row.scrollIntoViewIfNeeded();

    const kebabBtn = row.locator('[data-testid="MoreVertIcon"]').locator('xpath=ancestor::button[1]');
    await kebabBtn.click();

    const popupPromise = page.context().waitForEvent("page").catch(() => null);
    try {
        await page.getByRole("menuitem", { name: /view stats/i }).click({ timeout: 5000 });
    } catch {
        await page.locator('.MuiDataGrid-menu [role="menu"] li[id$="-stats-btn"]').click();
    }

    const maybePopup = await Promise.race([
        popupPromise,
        page.waitForLoadState("domcontentloaded").then(() => null),
    ]);
    return maybePopup ? "popup" : "same-tab";
}

/* ============== main ============== */
async function run() {
    const browser = await chromium.launch({ headless: false });
    const { ctx, page } = await getAuthedContext(browser);

    await waitForManagerReady(page);
    if (PAGINATE) {
        await setRowsPerPage(page, PAGE_SIZE);
    }

    const results: RowResult[] = [];
    const seen = new Set<string>(); // key: `${url}|${name}`

    // Process all pages (or just the current page if --paginate not set)
    do {
        // iterate rows; recompute count each loop in case the grid re-renders after returning
        for (let i = 0; ; i++) {
            const rows = page.locator(".MuiDataGrid-row");
            const count = await rows.count();
            if (i >= count) break;

            const row = rows.nth(i);

            // title + url from same cell
            const { name, url } = await extractManagerRowTitleAndLink(row);
            const key = `${url ?? ""}|${name ?? ""}`;
            if (seen.has(key)) continue;
            seen.add(key);

            // open stats, scrape, return
            const navKind = await clickViewStatsForRow(page, i);
            let stats: ClickFlowStats;

            if (navKind === "popup") {
                const popup = (await page.context().pages()).slice(-1)[0];
                await waitForStatsReady(popup);
                stats = await extractStats(popup);
                await popup.close();
                await waitForManagerReady(page);
                if (PAGINATE) await setRowsPerPage(page, PAGE_SIZE); // ← re-apply every time we land back
            } else {
                await waitForStatsReady(page);
                stats = await extractStats(page);
                await page.goBack();                 // returns to grid
                await waitForManagerReady(page);
                if (PAGINATE) await setRowsPerPage(page, PAGE_SIZE); // ← re-apply every time we land back
            }

            results.push({ name, url, stats });
        }

        if (!PAGINATE) break;
    } while (await goToNextPageIfPossible(page));

    console.log(JSON.stringify(results, null, 2));
    await writeCsv(OUTFILE, results);
    console.log(`Saved CSV: ${OUTFILE}`);
    console.log(`Session file: ${STATE_PATH}`);
    if (PAGINATE) console.log(`Pagination complete with page size ${PAGE_SIZE}.`);

    await ctx.close();
    await browser.close();
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
