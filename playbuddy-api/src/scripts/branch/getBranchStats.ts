// @ts-nocheck
// fullBranchStatsWithSession.playwright.ts
// Usage:
//   npm i -D typescript ts-node @types/node playwright
//   BRANCH_EMAIL=... BRANCH_PASSWORD=... npx tsx src/scripts/branch/getBranchStats.ts --days=14
//   BRANCH_EMAIL=... BRANCH_PASSWORD=... npx tsx src/scripts/branch/getBranchStats.ts --fresh
//   BRANCH_EMAIL=... BRANCH_PASSWORD=... npx tsx src/scripts/branch/getBranchStats.ts --paginate --page-size=100
//   BRANCH_EMAIL=... BRANCH_PASSWORD=... npx tsx src/scripts/branch/getBranchStats.ts --headless --quiet --out-dir=./data/branch
//   BRANCH_EMAIL=... BRANCH_PASSWORD=... npx tsx src/scripts/branch/getBranchStats.ts --devtools

import { chromium, Page, Locator } from "playwright";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { pgQuery } from "../../connections/postgres.js";
import { getAuthedContext } from "../../branch/branchAuth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

/* ============== config / flags ============== */
const MANAGER_URL = "https://dashboard.branch.io/quick-links/manager?v=latest";

const FORCE_FRESH = process.argv.includes("--fresh");
const CLEAR_CACHE = FORCE_FRESH
    || !/^(0|false|no)$/i.test(process.env.BRANCH_STATS_CLEAR_CACHE || "1");
const PAGINATE = process.argv.includes("--paginate");
const HEADLESS = (() => {
    if (process.argv.includes("--headless")) return true;
    if (process.argv.includes("--headed")) return false;
    const env = process.env.BRANCH_STATS_HEADLESS;
    if (env && env.trim() !== "") {
        return !/^(0|false|no)$/i.test(env);
    }
    return true;
})();
const QUIET = process.argv.includes("--quiet");
const DEVTOOLS = process.argv.includes("--devtools");
const PAGE_SIZE = (() => {
    const arg = process.argv.find(a => a.startsWith("--page-size="));
    const n = arg ? Number(arg.split("=")[1]) : 100;
    return Number.isFinite(n) && n > 0 ? n : 100;
})();

const getArgValue = (key: string): string | undefined => {
    const eq = process.argv.find(a => a.startsWith(`--${key}=`));
    if (eq) return eq.split("=").slice(1).join("=");
    const idx = process.argv.findIndex(a => a === `--${key}`);
    if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
    return undefined;
};

const CHROME_PATH = getArgValue("chrome-path");
const USE_CHROME = (() => {
    if (process.argv.includes("--no-chrome")) return false;
    if (process.argv.includes("--use-chrome") || process.argv.includes("--chrome") || !!CHROME_PATH) return true;
    return /^(1|true|yes)$/i.test(process.env.BRANCH_STATS_USE_CHROME || "");
})();

const RANGE_DAYS = (() => {
    const raw = getArgValue("days");
    const n = raw ? Number(raw) : 14;
    return Number.isFinite(n) && n > 0 ? n : 14;
})();

const parseDateOnly = (raw?: string | null): Date | null => {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
    const d = new Date(`${trimmed}T00:00:00`);
    return Number.isFinite(d.getTime()) ? d : null;
};

const formatDateOnly = (d: Date) => d.toISOString().slice(0, 10);

const rangeEnd = parseDateOnly(getArgValue("end")) ?? new Date();
const rangeStart =
    parseDateOnly(getArgValue("start")) ??
    new Date(rangeEnd.getTime() - (RANGE_DAYS - 1) * 24 * 60 * 60 * 1000);

const DESIRED_RANGE_LABELS = [
    getArgValue("range-label"),
    RANGE_DAYS === 14 ? "Last 2 weeks" : undefined,
    `Last ${RANGE_DAYS} days`,
].filter(Boolean) as string[];

const PROGRESS_PREFIX = "__BRANCH_STATS_PROGRESS__";

const OUT_DIR = (() => {
    const fromArg = getArgValue("out-dir");
    if (fromArg) return path.resolve(fromArg);
    const cwd = process.cwd();
    if (fs.existsSync(path.resolve(cwd, "src")) || fs.existsSync(path.resolve(cwd, "package.json"))) {
        return path.resolve(cwd, "data/branch");
    }
    return path.resolve(__dirname, "../../../data/branch");
})();

const STATE_PATH = path.resolve(OUT_DIR, "branch.playwright.state.json");
const OUTFILE = path.resolve(OUT_DIR, "branch_stats.csv");
const OUTFILE_JSON = path.resolve(OUT_DIR, "branch_stats.json");
const DEBUG_ENABLED = !/^(0|false|no)$/i.test(process.env.BRANCH_STATS_DEBUG || "");
const NO_DB = process.argv.includes("--no-db");
const PERSIST_DB =
    !NO_DB && !/^(0|false|no)$/i.test(process.env.BRANCH_STATS_PERSIST_DB || "1");

const debugLog = (message: string, data?: Record<string, unknown>) => {
    if (!DEBUG_ENABLED) return;
    const suffix = data ? ` ${JSON.stringify(data)}` : "";
    console.log(`[branch-stats] ${message}${suffix}`);
};

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
        "ios_linkClicks", "ios_install", "ios_reopen",
        "android_linkClicks", "android_install", "android_reopen",
        "desktop_linkClicks", "desktop_textsSent",
        "desktop_iosSms_install", "desktop_iosSms_reopen",
        "desktop_androidSms_install", "desktop_androidSms_reopen",
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
            i.linkClicks ?? "",
            i.install ?? "",
            i.reopen ?? "",
            a.linkClicks ?? "",
            a.install ?? "",
            a.reopen ?? "",
            d.linkClicks ?? "",
            d.textsSent ?? "",
            d.iosSms?.install ?? "",
            d.iosSms?.reopen ?? "",
            d.androidSms?.install ?? "",
            d.androidSms?.reopen ?? "",
        ].map(csvEscape).join(","));
    }
    await fs.promises.writeFile(filepath, lines.join("\n") + "\n", "utf8");
}

const normalizeSlug = (value: string) => value.trim().toLowerCase();

const safeParseUrl = (value: string): URL | null => {
    try {
        return new URL(value);
    } catch {
        try {
            return new URL(`https://${value}`);
        } catch {
            return null;
        }
    }
};

const extractSlugCandidatesFromUrl = (raw?: string | null): string[] => {
    if (!raw) return [];
    const urls: URL[] = [];
    const direct = safeParseUrl(raw);
    if (direct) urls.push(direct);
    if (direct) {
        const paramKeys = [
            "link",
            "~referring_link",
            "referring_link",
            "referrer",
            "referrer_link",
            "redirect",
        ];
        for (const key of paramKeys) {
            const value = direct.searchParams.get(key);
            if (!value) continue;
            const nested = safeParseUrl(value);
            if (nested) urls.push(nested);
        }
    }
    const slugs = new Set<string>();
    for (const url of urls) {
        const parts = url.pathname
            .split("/")
            .map(part => decodeURIComponent(part))
            .map(part => part.trim())
            .filter(Boolean);
        for (const part of parts) {
            const normalized = normalizeSlug(part);
            if (normalized) slugs.add(normalized);
        }
    }
    return Array.from(slugs);
};

const persistBranchStatsToDatabase = async (rows: RowResult[], meta: any) => {
    if (!PERSIST_DB) {
        debugLog("db persist disabled");
        return;
    }
    const rangeStart = meta?.range?.startDate ?? null;
    const rangeEnd = meta?.range?.endDate ?? null;
    if (!rangeStart || !rangeEnd) {
        debugLog("missing range dates; skipping db persist", { rangeStart, rangeEnd });
        return;
    }

    let deepLinks: Array<{ id: string; slug: string }> = [];
    try {
        const result = await pgQuery(
            "select id, slug from public.deep_links where slug is not null"
        );
        deepLinks = result.rows;
    } catch (err: any) {
        debugLog("failed to fetch deep links for branch stats", {
            error: err?.message || String(err),
        });
        return;
    }

    const slugMap = new Map<string, string>();
    for (const row of deepLinks) {
        if (!row.slug) continue;
        slugMap.set(normalizeSlug(row.slug), String(row.id));
    }

    const inserts: Array<Record<string, any>> = [];
    let unmatched = 0;
    for (const row of rows) {
        const candidates = extractSlugCandidatesFromUrl(row.url);
        let deepLinkId: string | null = null;
        for (const candidate of candidates) {
            const match = slugMap.get(candidate);
            if (match) {
                deepLinkId = match;
                break;
            }
        }
        if (!deepLinkId) {
            unmatched += 1;
            continue;
        }
        inserts.push({
            deep_link_id: deepLinkId,
            range_start_date: rangeStart,
            range_end_date: rangeEnd,
            range_label: meta?.range?.label ?? null,
            range_days: meta?.range?.days ?? null,
            generated_at: meta?.generatedAt ?? new Date().toISOString(),
            overall_clicks: row.stats?.overallClicks ?? null,
            ios_link_clicks: row.stats?.ios?.linkClicks ?? null,
            ios_install: row.stats?.ios?.install ?? null,
            ios_reopen: row.stats?.ios?.reopen ?? null,
            android_link_clicks: row.stats?.android?.linkClicks ?? null,
            android_install: row.stats?.android?.install ?? null,
            android_reopen: row.stats?.android?.reopen ?? null,
            desktop_link_clicks: row.stats?.desktop?.linkClicks ?? null,
            desktop_texts_sent: row.stats?.desktop?.textsSent ?? null,
            desktop_ios_install: row.stats?.desktop?.iosSms?.install ?? null,
            desktop_ios_reopen: row.stats?.desktop?.iosSms?.reopen ?? null,
            desktop_android_install: row.stats?.desktop?.androidSms?.install ?? null,
            desktop_android_reopen: row.stats?.desktop?.androidSms?.reopen ?? null,
            source_url: row.url ?? null,
            source_name: row.name ?? null,
        });
    }

    if (!inserts.length) {
        debugLog("no branch stats matched deep link slugs", { unmatched });
        return;
    }

    const columns = [
        "deep_link_id",
        "range_start_date",
        "range_end_date",
        "range_label",
        "range_days",
        "generated_at",
        "overall_clicks",
        "ios_link_clicks",
        "ios_install",
        "ios_reopen",
        "android_link_clicks",
        "android_install",
        "android_reopen",
        "desktop_link_clicks",
        "desktop_texts_sent",
        "desktop_ios_install",
        "desktop_ios_reopen",
        "desktop_android_install",
        "desktop_android_reopen",
        "source_url",
        "source_name",
    ];

    const values: Array<any> = [];
    const placeholders: string[] = [];
    inserts.forEach((row, rowIndex) => {
        const base = rowIndex * columns.length;
        const rowPlaceholders = columns.map((_, colIndex) => `$${base + colIndex + 1}`);
        placeholders.push(`(${rowPlaceholders.join(", ")})`);
        for (const column of columns) {
            values.push(row[column]);
        }
    });

    const query = `
        INSERT INTO public.deep_link_branch_stats (${columns.join(", ")})
        VALUES ${placeholders.join(", ")}
        ON CONFLICT (deep_link_id, range_start_date, range_end_date)
        DO UPDATE SET
            range_label = EXCLUDED.range_label,
            range_days = EXCLUDED.range_days,
            generated_at = EXCLUDED.generated_at,
            overall_clicks = EXCLUDED.overall_clicks,
            ios_link_clicks = EXCLUDED.ios_link_clicks,
            ios_install = EXCLUDED.ios_install,
            ios_reopen = EXCLUDED.ios_reopen,
            android_link_clicks = EXCLUDED.android_link_clicks,
            android_install = EXCLUDED.android_install,
            android_reopen = EXCLUDED.android_reopen,
            desktop_link_clicks = EXCLUDED.desktop_link_clicks,
            desktop_texts_sent = EXCLUDED.desktop_texts_sent,
            desktop_ios_install = EXCLUDED.desktop_ios_install,
            desktop_ios_reopen = EXCLUDED.desktop_ios_reopen,
            desktop_android_install = EXCLUDED.desktop_android_install,
            desktop_android_reopen = EXCLUDED.desktop_android_reopen,
            source_url = EXCLUDED.source_url,
            source_name = EXCLUDED.source_name,
            updated_at = now()
    `;

    try {
        await pgQuery(query, values);
        debugLog("persisted branch stats to db", { rows: inserts.length, unmatched });
    } catch (err: any) {
        debugLog("failed to persist branch stats to db", {
            error: err?.message || String(err),
        });
    }
};

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

async function readDateRangeLabel(p: Page): Promise<string | null> {
    const candidates = [
        p.locator('[data-testid*="date"]').first(),
        p.locator('[aria-label*="Date"]').first(),
        p.locator('button:has-text("Last")').first(),
        p.locator('[role="button"]:has-text("Last")').first(),
    ];
    for (const cand of candidates) {
        if (await cand.count()) {
            const text = (await cand.textContent())?.trim();
            if (text) return text;
        }
    }
    return null;
}

async function applyDateRangeIfPossible(p: Page): Promise<string | null> {
    if (!DESIRED_RANGE_LABELS.length) return null;
    try {
        const triggers = [
            p.locator('[data-testid*="date"]').first(),
            p.locator('[aria-label*="Date"]').first(),
            p.locator('button:has-text("Last")').first(),
            p.locator('[role="button"]:has-text("Last")').first(),
            p.locator('button:has-text("Custom")').first(),
        ];

        let clicked = false;
        for (const t of triggers) {
            if (await t.count()) {
                await t.click({ timeout: 3000 }).catch(() => { });
                clicked = true;
                break;
            }
        }
        if (!clicked) return null;

        for (const label of DESIRED_RANGE_LABELS) {
            const re = new RegExp(label, "i");
            const option = p.getByRole('menuitem', { name: re });
            if (await option.count()) {
                await option.first().click({ timeout: 3000 }).catch(() => { });
                return label;
            }
            const opt2 = p.getByRole('option', { name: re });
            if (await opt2.count()) {
                await opt2.first().click({ timeout: 3000 }).catch(() => { });
                return label;
            }
        }

        const custom = p.getByRole('menuitem', { name: /custom/i });
        if (await custom.count()) {
            await custom.first().click({ timeout: 3000 }).catch(() => { });

            const start = p.locator('input[placeholder*="Start"], input[aria-label*="Start"], input[placeholder*="From"], input[aria-label*="From"]').first();
            const end = p.locator('input[placeholder*="End"], input[aria-label*="End"], input[placeholder*="To"], input[aria-label*="To"]').first();
            if (await start.count()) {
                await start.fill(formatDateOnly(rangeStart)).catch(() => { });
            }
            if (await end.count()) {
                await end.fill(formatDateOnly(rangeEnd)).catch(() => { });
            }
            const applyBtn = p.getByRole('button', { name: /apply|ok|done/i });
            if (await applyBtn.count()) {
                await applyBtn.first().click({ timeout: 3000 }).catch(() => { });
            }
            return `${formatDateOnly(rangeStart)} to ${formatDateOnly(rangeEnd)}`;
        }
    } catch {
        return null;
    }
    return null;
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

function parseDisplayedRowsTotal(text: string): number | null {
    // Examples: "1–100 of 523", "1-100 of more than 1000"
    const match = text.match(/of\s+(\d+)/i);
    if (!match) return null;
    const n = Number(match[1]);
    return Number.isFinite(n) ? n : null;
}

function emitProgress(payload: { processed: number; total?: number | null }) {
    console.log(`${PROGRESS_PREFIX} ${JSON.stringify(payload)}`);
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
    await fs.promises.mkdir(OUT_DIR, { recursive: true });
    if (CLEAR_CACHE && fs.existsSync(STATE_PATH)) {
        await fs.promises.unlink(STATE_PATH);
        debugLog("cleared storage state", { statePath: STATE_PATH });
    }
    debugLog("start", {
        cwd: process.cwd(),
        outDir: OUT_DIR,
        statePath: STATE_PATH,
        headless: HEADLESS,
        useChrome: USE_CHROME,
        chromePath: CHROME_PATH || null,
        devtools: DEVTOOLS,
        persistDb: PERSIST_DB,
        paginate: PAGINATE,
        pageSize: PAGE_SIZE,
        rangeDays: RANGE_DAYS,
        rangeStart: formatDateOnly(rangeStart),
        rangeEnd: formatDateOnly(rangeEnd),
    });
    const launchOptions: Parameters<typeof chromium.launch>[0] = {
        headless: HEADLESS,
        devtools: DEVTOOLS,
    };
    if (USE_CHROME) {
        if (CHROME_PATH) launchOptions.executablePath = CHROME_PATH;
        else launchOptions.channel = "chrome";
    }
    const browser = await chromium.launch(launchOptions);
    const { ctx, page } = await getAuthedContext(browser, {
        storageStatePath: STATE_PATH,
        forceFresh: FORCE_FRESH,
        initialUrl: MANAGER_URL,
        logger: (message, data) => debugLog(message, data),
    });

    await waitForManagerReady(page);
    if (PAGINATE) {
        await setRowsPerPage(page, PAGE_SIZE);
    }

    const results: RowResult[] = [];
    let rangeLabel: string | null = null;
    let totalRows: number | null = null;
    const seen = new Set<string>(); // key: `${url}|${name}`

    // Process all pages (or just the current page if --paginate not set)
    do {
        if (totalRows === null) {
            const displayed = await getDisplayedRowsText(page);
            totalRows = parseDisplayedRowsTotal(displayed);
        }
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
                if (!rangeLabel) {
                    const applied = await applyDateRangeIfPossible(popup);
                    rangeLabel = (await readDateRangeLabel(popup)) ?? applied;
                }
                stats = await extractStats(popup);
                await popup.close();
                await waitForManagerReady(page);
                if (PAGINATE) await setRowsPerPage(page, PAGE_SIZE); // ← re-apply every time we land back
            } else {
                await waitForStatsReady(page);
                if (!rangeLabel) {
                    const applied = await applyDateRangeIfPossible(page);
                    rangeLabel = (await readDateRangeLabel(page)) ?? applied;
                }
                stats = await extractStats(page);
                await page.goBack();                 // returns to grid
                await waitForManagerReady(page);
                if (PAGINATE) await setRowsPerPage(page, PAGE_SIZE); // ← re-apply every time we land back
            }

            results.push({ name, url, stats });
            if (results.length % 5 === 0 || results.length === 1) {
                emitProgress({ processed: results.length, total: totalRows });
            }
        }

        if (!PAGINATE) break;
    } while (await goToNextPageIfPossible(page));

    emitProgress({ processed: results.length, total: totalRows });

    const meta = {
        generatedAt: new Date().toISOString(),
        range: {
            startDate: formatDateOnly(rangeStart),
            endDate: formatDateOnly(rangeEnd),
            days: RANGE_DAYS,
            label: rangeLabel,
        },
        pageSize: PAGINATE ? PAGE_SIZE : null,
    };
    await fs.promises.writeFile(OUTFILE_JSON, JSON.stringify({ meta, rows: results }, null, 2), "utf8");
    if (!QUIET) {
        console.log(JSON.stringify({ meta, rows: results }, null, 2));
    }
    await writeCsv(OUTFILE, results);
    await persistBranchStatsToDatabase(results, meta);
    console.log(`Saved JSON: ${OUTFILE_JSON}`);
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
