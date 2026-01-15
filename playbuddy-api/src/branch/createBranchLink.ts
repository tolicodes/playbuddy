// branch_create_quicklink.ts
// Usage:
//   BRANCH_EMAIL=... BRANCH_PASSWORD=... npx tsx src/branch/createBranchLink.ts \
//     --title "My Campaign" --social-title "My Campaign" --social-description "Description"
//   BRANCH_EMAIL=... BRANCH_PASSWORD=... npx tsx src/branch/createBranchLink.ts \
//     --weekly-picks --week-offset=1
//   Optional: --headless

import { chromium, type Page } from "playwright";
import moment from "moment-timezone";
import { getAuthedContext, type BranchAuthLogger } from "./branchAuth.js";

const DASH_ROOT = "https://dashboard.branch.io/";
const QL_URL =
    "https://dashboard.branch.io/quick-links/qlc/define?v=latest&step=general";
const BRANCH_TZ = "America/New_York";
const DEFAULT_WEEK_OFFSET = 1;

type BranchLogSink = (line: string) => void;

const formatLogLine = (msg: string, data?: Record<string, unknown>) => {
    if (!data) return `[branch] ${msg}`;
    const payload = JSON.stringify(data);
    return payload === "{}" ? `[branch] ${msg}` : `[branch] ${msg} ${payload}`;
};

const createLogger = (sink?: BranchLogSink): BranchAuthLogger => {
    return (message, data) => {
        const line = formatLogLine(message, data);
        console.log(line);
        if (sink) sink(line);
    };
};

async function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForUrlIncludes(
    page: Page,
    sub: string,
    timeoutMs = 30_000
): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (page.url().includes(sub)) return;
        await delay(150);
    }
    throw new Error(
        `Timeout waiting for URL to include "${sub}". Last URL: ${page.url()}`
    );
}

async function waitForVisible(page: Page, selector: string, timeout = 45_000) {
    const locator = page.locator(selector).first();
    await locator.waitFor({ state: "visible", timeout });
    return locator;
}

async function safeClick(page: Page, selector: string, logger: BranchAuthLogger): Promise<void> {
    logger(`waitForSelector + click: ${selector}`);
    const el = await waitForVisible(page, selector);
    await el.click();
}

async function safeType(page: Page, selector: string, text: string, logger: BranchAuthLogger): Promise<void> {
    logger(`waitForSelector + type: ${selector} -> "${text}"`);
    const el = await waitForVisible(page, selector);
    await el.click({ clickCount: 3 });
    await el.fill(text);
}

type CreateBranchLinkInput = {
    title: string;
    socialTitle: string;
    socialDescription: string;
    headless?: boolean;
    logSink?: BranchLogSink;
};

export type WeeklyPicksFields = {
    title: string;
    socialTitle: string;
    socialDescription: string;
    weekLabel: string;
};

const buildWeekRangeLabel = (start: moment.Moment) => {
    const end = start.clone().add(6, "days");
    return `${start.format("MMM D")} - ${end.format("MMM D")}`;
};

export const buildWeeklyPicksFields = (weekOffset: number): WeeklyPicksFields => {
    const offset = Number.isFinite(weekOffset) ? Math.round(weekOffset) : DEFAULT_WEEK_OFFSET;
    const start = moment.tz(BRANCH_TZ).startOf("isoWeek").add(offset, "weeks");
    const weekLabel = buildWeekRangeLabel(start);
    const title = `Weekly Picks (${weekLabel})`;
    return {
        title,
        socialTitle: title,
        socialDescription: `Weekly Picks for ${weekLabel} on Playbuddy.`,
        weekLabel,
    };
};

export async function createBranchLink({
    title,
    socialTitle,
    socialDescription,
    headless,
    logSink,
}: CreateBranchLinkInput): Promise<string> {
    const logger = createLogger(logSink);
    const resolvedHeadless = headless ?? true;
    logger(`Starting Branch quick link creation (headless=${resolvedHeadless})`);
    const browser = await chromium.launch({
        headless: resolvedHeadless,
    });
    const { ctx, page } = await getAuthedContext(browser, {
        initialUrl: DASH_ROOT,
        logger,
    });

    page.setDefaultTimeout(60_000);
    page.setDefaultNavigationTimeout(60_000);

    await page.route("**/*", (route) => {
        const u = route.request().url();
        if (
            u.includes("google-analytics.com") ||
            u.includes("amplitude.com") ||
            u.includes("segment.com")
        ) {
            void route.abort();
            return;
        }
        void route.continue();
    });

    logger("Step 1/5: Open quick link builder");
    await page.evaluate((u: string) => {
        window.location.assign(u);
    }, QL_URL);
    await waitForUrlIncludes(page, "/quick-links/qlc/define");

    const titleSelector = "#FormInput__link-title-input__input";
    try {
        await waitForVisible(page, titleSelector, 45_000);
    } catch {
        logger("Quick link builder not ready, retrying navigation");
        await page.evaluate((u: string) => {
            window.location.assign(u);
        }, QL_URL);
        await waitForUrlIncludes(page, "/quick-links/qlc/define");
        await waitForVisible(page, titleSelector, 45_000);
    }

    logger("Step 2/5: Fill link title");
    await safeType(page, titleSelector, title, logger);

    logger("Step 3/5: Open social media step");
    await safeClick(page, "#social-media-step", logger);

    logger("Step 4/5: Fill social title");
    await safeType(page, '#FormInput__title-input__input', socialTitle, logger);

    logger("Step 5/5: Fill social description");
    await safeType(page, '#FormInput__description-input__input', socialDescription, logger);

    logger("Saving quick link");
    await page.locator("#wizard-save-btn").click();

    logger("Reading generated link");
    let linkText = "";
    try {
        await waitForVisible(page, "#link-text", 30_000);
        linkText = (await page.locator("#link-text").textContent())?.trim() || "";
    } catch {
        logger("#link-text not found", { url: page.url() });
    }

    await ctx.close();
    await browser.close();
    logger(`Branch quick link created: ${linkText || "missing link text"}`);
    return linkText;
}

const getArgValue = (key: string) => {
    const eq = process.argv.find((arg) => arg.startsWith(`--${key}=`));
    if (eq) return eq.split("=").slice(1).join("=");
    const idx = process.argv.findIndex((arg) => arg === `--${key}`);
    if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
    return undefined;
};

const hasFlag = (key: string) => process.argv.includes(`--${key}`);

const resolveCliFields = () => {
    const isWeeklyPicks = hasFlag("weekly-picks");
    const weekOffsetRaw = getArgValue("week-offset");
    const weekOffsetParsed = weekOffsetRaw ? Number(weekOffsetRaw) : DEFAULT_WEEK_OFFSET;
    const weekOffset = Number.isFinite(weekOffsetParsed) ? weekOffsetParsed : DEFAULT_WEEK_OFFSET;

    const titleArg = getArgValue("title");
    const socialTitleArg = getArgValue("social-title");
    const socialDescriptionArg = getArgValue("social-description");

    if (isWeeklyPicks) {
        const fields = buildWeeklyPicksFields(weekOffset);
        return {
            title: titleArg ?? fields.title,
            socialTitle: socialTitleArg ?? fields.socialTitle,
            socialDescription: socialDescriptionArg ?? fields.socialDescription,
            weekLabel: fields.weekLabel,
        };
    }

    if (!titleArg || !socialTitleArg || !socialDescriptionArg) {
        throw new Error("Missing required args: --title, --social-title, --social-description");
    }

    return {
        title: titleArg,
        socialTitle: socialTitleArg,
        socialDescription: socialDescriptionArg,
        weekLabel: null,
    };
};

const runFromCli = async () => {
    const { title, socialTitle, socialDescription, weekLabel } = resolveCliFields();
    const headless = hasFlag("headless");
    const logger = createLogger();
    logger("Creating quick link", {
        title,
        socialTitle,
        socialDescription,
        weekLabel,
        headless,
    });
    const linkText = await createBranchLink({ title, socialTitle, socialDescription, headless });
    if (linkText) {
        logger(`Link created: ${linkText}`);
    } else {
        logger("Link created, but no link text found.");
    }
};

const isDirectRun = process.argv.some((arg) => arg.includes("createBranchLink"));
if (isDirectRun) {
    runFromCli().catch((error) => {
        console.error("[branch] Failed to create link", error);
        process.exit(1);
    });
}
