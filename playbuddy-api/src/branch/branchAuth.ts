import fs from "fs";
import type { Browser, BrowserContext, Page, Locator, Frame } from "playwright";

export type BranchAuthLogger = (message: string, data?: Record<string, unknown>) => void;

export type BranchAuthContextOptions = {
    storageStatePath?: string;
    forceFresh?: boolean;
    initialUrl?: string;
    logger?: BranchAuthLogger;
};

const DEFAULT_INITIAL_URL = "https://dashboard.branch.io/quick-links/manager?v=latest";

const log = (logger: BranchAuthLogger | undefined, message: string, data?: Record<string, unknown>) => {
    if (logger) logger(message, data);
};

export const getBranchCredentials = (logger?: BranchAuthLogger) => {
    const email = process.env.BRANCH_EMAIL ?? "";
    const password = process.env.BRANCH_PASSWORD ?? "";
    if (!email || !password) {
        log(logger, "missing Branch credentials", {
            hasBranchEmail: !!email,
            hasBranchPassword: !!password,
        });
        throw new Error("Missing BRANCH_EMAIL or BRANCH_PASSWORD in environment.");
    }
    return { email, password };
};

const AUTH_BUTTON_SELECTORS = [
    'button:has-text("Authenticate")',
    '[role="button"]:has-text("Authenticate")',
    'a:has-text("Authenticate")',
    'input[type="submit" i][value*="Authenticate" i]',
    'input[type="button" i][value*="Authenticate" i]',
].join(", ");

const EMAIL_INPUT_SELECTORS = [
    'input[name="email"]',
    'input[type="email" i]',
    'input[name="email" i]',
    'input[autocomplete="email" i]',
].join(", ");

const PASSWORD_INPUT_SELECTORS = [
    'input[type="password" i]',
    'input[name="password" i]',
].join(", ");

const CONTINUE_BUTTON_SELECTORS = [
    'button:has-text("Continue")',
    '[role="button"]:has-text("Continue")',
    'button:has-text("Next")',
    '[role="button"]:has-text("Next")',
    'button[type="submit" i]',
    'input[type="submit" i]',
].join(", ");

const SIGNIN_BUTTON_SELECTORS = [
    '[data-testid="btn-sign-in"]',
    'button:has-text("Sign in")',
    '[role="button"]:has-text("Sign in")',
    'button:has-text("Log in")',
    '[role="button"]:has-text("Log in")',
    'button[type="submit" i]',
    'input[type="submit" i]',
].join(", ");

type VisibleLocator = { locator: Locator; frameUrl: string | null };

const findVisibleInScope = async (scope: Page | Frame, selectors: string): Promise<Locator | null> => {
    const candidates = scope.locator(selectors);
    const count = await candidates.count().catch(() => 0);
    for (let i = 0; i < count; i++) {
        const candidate = candidates.nth(i);
        if (await candidate.isVisible().catch(() => false)) {
            return candidate;
        }
    }
    return null;
};

const findVisibleInFrames = async (page: Page, selectors: string): Promise<VisibleLocator | null> => {
    const main = await findVisibleInScope(page, selectors);
    if (main) return { locator: main, frameUrl: null };
    for (const frame of page.frames()) {
        if (frame === page.mainFrame()) continue;
        const inFrame = await findVisibleInScope(frame, selectors);
        if (inFrame) return { locator: inFrame, frameUrl: frame.url() };
    }
    return null;
};

const fillVisibleInput = async (
    page: Page,
    selectors: string,
    value: string,
    label: string,
    logger?: BranchAuthLogger
): Promise<boolean> => {
    const found = await findVisibleInFrames(page, selectors);
    if (!found) return false;
    await found.locator.fill(value);
    log(logger, `${label} input filled`, found.frameUrl ? { frameUrl: found.frameUrl } : undefined);
    return true;
};

const clickVisibleButton = async (
    page: Page,
    selectors: string,
    label: string,
    logger?: BranchAuthLogger
): Promise<boolean> => {
    const found = await findVisibleInFrames(page, selectors);
    if (!found) return false;
    if (found.frameUrl) log(logger, `${label} button found in iframe`, { frameUrl: found.frameUrl });
    else log(logger, `${label} button found in main frame`);
    await found.locator.click();
    return true;
};

const isPasswordVisible = async (page: Page): Promise<boolean> => {
    const found = await findVisibleInFrames(page, PASSWORD_INPUT_SELECTORS);
    return !!found;
};

const waitForEmailAndContinue = async (
    page: Page,
    email: string,
    timeoutMs: number,
    logger?: BranchAuthLogger
): Promise<void> => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const filled = await fillVisibleInput(page, EMAIL_INPUT_SELECTORS, email, "login email", logger);
        const clicked = await clickVisibleButton(page, CONTINUE_BUTTON_SELECTORS, "continue", logger);
        if (filled && clicked) return;
        await page.waitForTimeout(500);
    }
    throw new Error("Email input or continue button not found during login.");
};

const handleAuthenticateStep = async (
    page: Page,
    email: string,
    timeoutMs: number,
    logger?: BranchAuthLogger
): Promise<boolean> => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (await isPasswordVisible(page)) return false;
        await fillVisibleInput(page, EMAIL_INPUT_SELECTORS, email, "authenticate email", logger);
        const clicked = await clickVisibleButton(page, AUTH_BUTTON_SELECTORS, "authenticate", logger);
        if (clicked) return true;
        await page.waitForTimeout(500);
    }
    return false;
};

const waitForPasswordAndSignIn = async (
    page: Page,
    password: string,
    timeoutMs: number,
    logger?: BranchAuthLogger
): Promise<void> => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const found = await findVisibleInFrames(page, PASSWORD_INPUT_SELECTORS);
        if (found) {
            await found.locator.fill(password);
            log(logger, "password input filled", found.frameUrl ? { frameUrl: found.frameUrl } : undefined);
            await clickVisibleButton(page, SIGNIN_BUTTON_SELECTORS, "sign in", logger);
            return;
        }
        await page.waitForTimeout(500);
    }
    throw new Error("Password input not found during login.");
};

const clickAuthenticateIfPresent = async (page: Page, logger?: BranchAuthLogger): Promise<boolean> => {
    return clickVisibleButton(page, AUTH_BUTTON_SELECTORS, "authenticate", logger);
};

export async function waitForDashboardReady(page: Page, logger?: BranchAuthLogger) {
    await page.waitForLoadState("domcontentloaded").catch(() => { });
    await page.locator('[data-testid="top-nav"], .top-nav__header').first()
        .waitFor({ state: "visible", timeout: 60_000 }).catch(() => { });
    await page.waitForFunction(() => {
        const busy = document.querySelector('.MuiBackdrop-root,[role="progressbar"],.MuiSkeleton-root');
        return !busy;
    }, { timeout: 30_000 }).catch(() => { });
    log(logger, "dashboard ready");
}

export async function login(page: Page, logger?: BranchAuthLogger) {
    const { email, password } = getBranchCredentials(logger);
    await page.goto("https://app.branch.io/signin");
    await waitForEmailAndContinue(page, email, 30_000, logger);
    await page.waitForURL(/dashboard\.branch\.io\/login/).catch(() => { });

    await handleAuthenticateStep(page, email, 30_000, logger);
    await waitForPasswordAndSignIn(page, password, 60_000, logger);

    const reachedDashboard = await page.waitForURL(/dashboard\.branch\.io/, { timeout: 30_000 })
        .then(() => true)
        .catch(() => false);
    if (!reachedDashboard) {
        await clickAuthenticateIfPresent(page, logger);
        await page.waitForURL(/dashboard\.branch\.io/, { timeout: 60_000 });
    }

    await waitForDashboardReady(page, logger);
}

export async function getAuthedContext(
    browser: Browser,
    options: BranchAuthContextOptions = {}
): Promise<{ ctx: BrowserContext; page: Page; refreshed: boolean }> {
    const {
        storageStatePath,
        forceFresh = false,
        initialUrl = DEFAULT_INITIAL_URL,
        logger,
    } = options;

    const hasState = storageStatePath ? fs.existsSync(storageStatePath) : false;
    const ctx = await browser.newContext(!forceFresh && hasState ? { storageState: storageStatePath } : {});
    const page = await ctx.newPage();

    await page.goto(initialUrl, { waitUntil: "domcontentloaded" });
    const redirectedToLogin = /dashboard\.branch\.io\/login/.test(page.url());
    const passwordVisible = await page.locator('input[name="password"]').first().isVisible().catch(() => false);
    const needLogin = forceFresh || !hasState || redirectedToLogin || passwordVisible;

    if (needLogin) {
        log(logger, "auth: login required", {
            forceFresh,
            hasState,
            redirectedToLogin,
            passwordVisible,
        });
        await login(page, logger);
        if (storageStatePath) {
            await ctx.storageState({ path: storageStatePath });
            log(logger, "auth: storage state saved", { storageStatePath });
        }
        await page.goto(initialUrl, { waitUntil: "domcontentloaded" });
        await waitForDashboardReady(page, logger);
        return { ctx, page, refreshed: true };
    }

    await waitForDashboardReady(page, logger);
    return { ctx, page, refreshed: false };
}
