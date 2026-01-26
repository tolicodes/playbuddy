import { openTab, postStatus, sleep } from '../utils.js';

const REPORT_URL = 'https://www.eventbrite.com/reporting/reports/promotion-codes?reportingTab=preview';
const SELECT_ALL_SELECTOR = '#event-selector-select-all-checkbox';
const EXPORT_BUTTON_SELECTOR = '[data-testid="export-button"]';
const EXPORT_TRIGGER_SELECTOR = '[aria-haspopup="menu"][id^="radix-"], [aria-haspopup="menu"][data-state]';
const CSV_MENU_CLASS_PART = 'exportButton_exportButton__dropDownMenuContent__dropDownMenuItems';
const ORG_SELECT_HINTS = ['select organization', 'choose organization', 'switch organization'];
const ORG_INPUT_HINTS = ['organization', 'organisation'];
const ORG_TARGET = 'Dominus Eros';
export const EVENTBRITE_ORG_TARGET = ORG_TARGET;
const EXPORT_MENU_HINT = 'csv';
const TARGET_PROMO_CODE = 'PLAY20';

const DEFAULT_TIMEOUT_MS = 30000;
const POLL_INTERVAL_MS = 400;

type ClickResult = {
    ok: boolean;
    disabled?: boolean;
    checked?: boolean;
    wasChecked?: boolean;
};

export type EventbritePromoRow = {
    orderDate: string;
    originalPrice: string;
    grossAmount: number | null;
};

export type EventbritePromoReport = {
    code: string;
    totalRows: number;
    rows: EventbritePromoRow[];
};

async function runInTab<T>(tabId: number, func: (...args: any[]) => T, args: any[] = []): Promise<T | null> {
    const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        func,
        args,
    });
    return (result?.result ?? null) as T | null;
}

async function waitForSelector(tabId: number, selector: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const found = await runInTab(tabId, (sel: string) => !!document.querySelector(sel), [selector]);
        if (found) return true;
        await sleep(POLL_INTERVAL_MS);
    }
    return false;
}

async function isOrganizationSelectionVisible(tabId: number): Promise<boolean> {
    const result = await runInTab(tabId, (hints: string[]) => {
        const normalize = (value: string | null | undefined) =>
            (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
        const matchesHint = (value: string | null | undefined) =>
            hints.some((hint) => normalize(value).includes(hint));
        const isVisible = (el: Element | null) => {
            if (!el) return false;
            const rect = (el as HTMLElement).getBoundingClientRect();
            const style = window.getComputedStyle(el as Element);
            return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
        };
        const candidates = Array.from(document.querySelectorAll<HTMLElement>(
            'button, [role="button"], [role="combobox"], [aria-haspopup="listbox"], [aria-haspopup="menu"], [data-testid*="org"], [data-testid*="organization"]'
        ));
        const hit = candidates.find((el) =>
            matchesHint(el.textContent) ||
            matchesHint(el.getAttribute('aria-label')) ||
            matchesHint(el.getAttribute('title'))
        );
        if (hit && isVisible(hit)) return true;
        const pageText = normalize(document.body?.innerText || '');
        return hints.some((hint) => pageText.includes(hint));
    }, [ORG_SELECT_HINTS]);
    return !!result;
}

async function clickOrganizationFromSelectScreen(tabId: number, targetText: string): Promise<boolean> {
    const result = await runInTab(tabId, (target: string) => {
        const normalize = (value: string | null | undefined) =>
            (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
        const root = document.querySelector('[data-spec="select-organization-screen"]');
        if (!root) return { clicked: false };

        const targetNorm = normalize(target);
        const links = Array.from(root.querySelectorAll<HTMLElement>('[data-spec="text-list-item-button"]'));
        const exact = links.find((link) => {
            const label = link.querySelector('p');
            return normalize(label?.textContent || '') === targetNorm;
        });
        const fallback = links.find((link) => {
            const label = link.querySelector('p');
            return normalize(label?.textContent || '').includes(targetNorm);
        });
        const targetLink = exact || fallback;
        if (!targetLink) return { clicked: false };
        targetLink.scrollIntoView({ block: 'center', inline: 'center' });
        targetLink.click();
        return { clicked: true };
    }, [targetText]);

    return !!result?.clicked;
}

async function openOrganizationMenu(tabId: number): Promise<boolean> {
    const result = await runInTab(tabId, (hints: string[]) => {
        const normalize = (value: string | null | undefined) =>
            (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
        const matchesHint = (value: string | null | undefined) =>
            hints.some((hint) => normalize(value).includes(hint));
        const isVisible = (el: Element | null) => {
            if (!el) return false;
            const rect = (el as HTMLElement).getBoundingClientRect();
            const style = window.getComputedStyle(el as Element);
            return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
        };
        const candidates = Array.from(document.querySelectorAll<HTMLElement>(
            'button, [role="button"], [role="combobox"], [aria-haspopup="listbox"], [aria-haspopup="menu"], [data-testid*="org"], [data-testid*="organization"]'
        ));
        let target = candidates.find((el) =>
            matchesHint(el.textContent) ||
            matchesHint(el.getAttribute('aria-label')) ||
            matchesHint(el.getAttribute('title'))
        );
        if (!target) {
            const labels = Array.from(document.querySelectorAll<HTMLElement>('label, div, span'));
            const labelMatch = labels.find((el) => matchesHint(el.textContent));
            if (labelMatch) {
                const button = labelMatch.closest('button, [role="button"], [role="combobox"]') as HTMLElement | null;
                target = button || labelMatch;
            }
        }
        if (!target || !isVisible(target)) return { clicked: false };
        target.scrollIntoView({ block: 'center', inline: 'center' });
        target.focus?.();
        target.click();
        return { clicked: true };
    }, [ORG_SELECT_HINTS]);

    return !!result?.clicked;
}

async function selectOrganizationFromMenu(tabId: number, targetText: string, timeoutMs = 15000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const result = await runInTab(tabId, (target: string, inputHints: string[]) => {
            const normalize = (value: string | null | undefined) =>
                (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
            const targetNorm = normalize(target);
            const isVisible = (el: Element | null) => {
                if (!el) return false;
                const rect = (el as HTMLElement).getBoundingClientRect();
                const style = window.getComputedStyle(el as Element);
                return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
            };
            const matchesHint = (value: string | null | undefined) =>
                inputHints.some((hint) => normalize(value).includes(hint));

            const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input'));
            const searchInput = inputs.find((input) =>
                matchesHint(input.getAttribute('placeholder')) ||
                matchesHint(input.getAttribute('aria-label')) ||
                matchesHint(input.closest('label')?.textContent || '')
            );
            if (searchInput && searchInput.value !== target) {
                searchInput.focus();
                searchInput.value = target;
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                searchInput.dispatchEvent(new Event('change', { bubbles: true }));
                searchInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
            }

            const roots: Element[] = [];
            const listbox = document.querySelector('[role="listbox"]');
            const menu = document.querySelector('[role="menu"]');
            if (listbox) roots.push(listbox);
            if (menu) roots.push(menu);
            const dialog = searchInput?.closest('[role="dialog"]');
            if (dialog) roots.push(dialog);
            if (!roots.length) roots.push(document.body);

            const clickables: HTMLElement[] = [];
            roots.forEach((root) => {
                clickables.push(...Array.from(root.querySelectorAll<HTMLElement>(
                    'button, [role="option"], [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"], a, li, div, span'
                )));
            });

            const candidates = clickables.filter((el) => {
                if (!isVisible(el)) return false;
                const text = normalize(el.textContent || '');
                return text === targetNorm || text.includes(targetNorm);
            });

            const exact = candidates.find((el) => normalize(el.textContent || '') === targetNorm);
            const targetEl = exact || candidates[0];
            if (targetEl) {
                targetEl.scrollIntoView({ block: 'center', inline: 'center' });
                targetEl.click();
                return { clicked: true };
            }

            const scrollContainer = listbox || menu;
            if (scrollContainer && (scrollContainer as HTMLElement).scrollHeight > (scrollContainer as HTMLElement).clientHeight) {
                (scrollContainer as HTMLElement).scrollBy({ top: 240, behavior: 'smooth' });
                return { clicked: false, scrolled: true };
            }

            return { clicked: false };
        }, [targetText, ORG_INPUT_HINTS]);

        if (result?.clicked) return true;
        await sleep(400);
    }
    return false;
}

async function ensureCheckboxChecked(tabId: number, selector: string): Promise<ClickResult> {
    const result = await runInTab(tabId, (sel: string) => {
        const checkbox = document.querySelector(sel) as HTMLInputElement | null;
        if (!checkbox) return { ok: false };
        const wasChecked = checkbox.checked || checkbox.getAttribute('aria-checked') === 'true';
        if (!wasChecked) {
            (checkbox as HTMLElement).click();
        }
        const checked = checkbox.checked || checkbox.getAttribute('aria-checked') === 'true';
        return { ok: true, checked, wasChecked };
    }, [selector]);

    return result || { ok: false };
}

async function clickButtonByText(tabId: number, label: string): Promise<ClickResult> {
    const result = await runInTab(tabId, (targetLabel: string) => {
        const normalize = (value: string | null | undefined) =>
            (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
        const target = Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"]'))
            .find((btn) => normalize(btn.textContent) === normalize(targetLabel));
        if (!target) return { ok: false };
        const disabled =
            (target as HTMLButtonElement).disabled ||
            target.getAttribute('aria-disabled') === 'true';
        if (!disabled) target.click();
        return { ok: true, disabled };
    }, [label]);

    return result || { ok: false };
}

async function clickButtonByTextWhenEnabled(tabId: number, label: string, timeoutMs = 15000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const result = await clickButtonByText(tabId, label);
        if (result.ok && !result.disabled) return true;
        await sleep(500);
    }
    return false;
}

async function clickSelector(tabId: number, selector: string): Promise<boolean> {
    const result = await runInTab(tabId, (sel: string) => {
        const el = document.querySelector(sel) as HTMLElement | null;
        if (!el) return false;
        el.scrollIntoView({ block: 'center', inline: 'center' });
        el.click();
        return true;
    }, [selector]);

    return !!result;
}

async function clickExportTrigger(tabId: number): Promise<boolean> {
    const result = await runInTab(tabId, (buttonSelector: string, triggerSelector: string) => {
        const button = document.querySelector(buttonSelector) as HTMLElement | null;
        const trigger = (button?.closest('[aria-haspopup="menu"]') as HTMLElement | null)
            || (button?.closest('[role="button"]') as HTMLElement | null)
            || (document.querySelector(triggerSelector) as HTMLElement | null)
            || button;
        if (!trigger) return false;
        trigger.scrollIntoView({ block: 'center', inline: 'center' });
        trigger.focus?.();
        const options: EventInit = { bubbles: true, cancelable: true, composed: true };
        trigger.dispatchEvent(new PointerEvent('pointerdown', options));
        trigger.dispatchEvent(new MouseEvent('mousedown', options));
        trigger.dispatchEvent(new PointerEvent('pointerup', options));
        trigger.dispatchEvent(new MouseEvent('mouseup', options));
        trigger.click();
        return true;
    }, [EXPORT_BUTTON_SELECTOR, EXPORT_TRIGGER_SELECTOR]);

    return !!result;
}

async function debugExportButton(tabId: number) {
    const snapshot = await runInTab(tabId, (selector: string) => {
        const el = document.querySelector(selector) as HTMLElement | null;
        if (!el) return { found: false };
        const rect = el.getBoundingClientRect();
        const trigger = (el.closest('[aria-haspopup="menu"]') as HTMLElement | null) || el;
        return {
            found: true,
            text: el.textContent?.trim() || '',
            disabled: (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true',
            ariaExpanded: trigger.getAttribute('aria-expanded') ?? el.getAttribute('aria-expanded'),
            visible: rect.width > 0 && rect.height > 0,
        };
    }, [EXPORT_BUTTON_SELECTOR]);
    return snapshot;
}

async function waitForExportEnabled(tabId: number, timeoutMs = 30000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const state = await runInTab(tabId, (selector: string) => {
            const el = document.querySelector(selector) as HTMLElement | null;
            if (!el) return { ready: false };
            const ariaDisabled = el.getAttribute('aria-disabled');
            const disabled = (el as HTMLButtonElement).disabled || ariaDisabled === 'true';
            return { ready: !disabled };
        }, [EXPORT_BUTTON_SELECTOR]);
        if (state?.ready) return true;
        await sleep(400);
    }
    return false;
}

async function waitForExportMenu(tabId: number, timeoutMs = 15000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const found = await runInTab(tabId, (classPart: string, hint: string) => {
            const normalize = (value: string | null | undefined) =>
                (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
            const nodes = Array.from(document.querySelectorAll<HTMLElement>(`[class*="${classPart}"]`));
            if (nodes.some((node) => normalize(node.textContent).includes(hint))) return true;
            const anyMenu = Array.from(document.querySelectorAll<HTMLElement>('[role="menu"], [role="menuitem"]'))
                .some((node) => normalize(node.textContent).includes(hint));
            return anyMenu;
        }, [CSV_MENU_CLASS_PART, EXPORT_MENU_HINT]);
        if (found) return true;
        await sleep(300);
    }
    return false;
}

async function maybeSelectOrganization(tabId: number): Promise<'not_needed' | 'selected' | 'missing'> {
    const needsSelection = await isOrganizationSelectionVisible(tabId);
    if (!needsSelection) return 'not_needed';

    const clickedSelectScreen = await clickOrganizationFromSelectScreen(tabId, ORG_TARGET);
    if (clickedSelectScreen) return 'selected';

    const opened = await openOrganizationMenu(tabId);
    if (!opened) return 'missing';

    const selected = await selectOrganizationFromMenu(tabId, ORG_TARGET);
    return selected ? 'selected' : 'missing';
}

async function clickCsvOption(tabId: number, timeoutMs = 15000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const clicked = await runInTab(tabId, (classPart: string) => {
            const matchesCsv = (text: string | null | undefined) => /\bcsv\b/i.test(text || '') || /\.csv/i.test(text || '');
            const containers = Array.from(document.querySelectorAll<HTMLElement>(`[class*="${classPart}"]`));
            for (const container of containers) {
                if (matchesCsv(container.textContent)) {
                    const target = container.matches('button, [role="menuitem"], a')
                        ? container
                        : (container.querySelector('button, [role="menuitem"], a') as HTMLElement | null);
                    if (target) {
                        target.click();
                        return true;
                    }
                    container.click();
                    return true;
                }
                const child = Array.from(container.querySelectorAll<HTMLElement>('button, [role="menuitem"], a, span, div'))
                    .find((el) => matchesCsv(el.textContent));
                if (child) {
                    child.click();
                    return true;
                }
            }
            return false;
        }, [CSV_MENU_CLASS_PART]);

        if (clicked) return true;
        await sleep(300);
    }
    return false;
}

function parseCsv(raw: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < raw.length; i++) {
        const ch = raw[i];
        if (inQuotes) {
            if (ch === '"') {
                if (raw[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += ch;
            }
            continue;
        }
        if (ch === '"') {
            inQuotes = true;
            continue;
        }
        if (ch === ',') {
            row.push(field);
            field = '';
            continue;
        }
        if (ch === '\n') {
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
            continue;
        }
        if (ch === '\r') {
            continue;
        }
        field += ch;
    }

    row.push(field);
    rows.push(row);
    return rows.filter((r) => r.some((cell) => (cell || '').trim().length > 0));
}

function normalizeHeader(value: string): string {
    return (value || '')
        .replace(/^\uFEFF/, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function parsePrice(value: string): number | null {
    const cleaned = (value || '').replace(/[^0-9.-]+/g, '');
    const num = Number.parseFloat(cleaned);
    return Number.isFinite(num) ? num : null;
}

async function fetchPromoCodeReport(downloadUrl: string): Promise<EventbritePromoReport | null> {
    try {
        const res = await fetch(downloadUrl, { credentials: 'include' });
        const text = await res.text();
        if (!res.ok) {
            postStatus(`❌ Failed to fetch CSV (${res.status}).`);
            return null;
        }

        const rows = parseCsv(text);
        if (!rows.length) {
            postStatus('❌ CSV export appears empty.');
            return null;
        }

        const headerRow = rows.shift() || [];
        const headers = headerRow.map(normalizeHeader);
        const codeIdx = headers.findIndex((h) => h === 'code' || h === 'promo code');
        const orderDateIdx = headers.findIndex((h) => h.startsWith('order date'));
        const originalPriceIdx = headers.findIndex((h) => h === 'original price');

        const missing: string[] = [];
        if (codeIdx < 0) missing.push('Code');
        if (orderDateIdx < 0) missing.push('Order date');
        if (originalPriceIdx < 0) missing.push('Original price');
        if (missing.length) {
            postStatus(`❌ CSV missing required columns: ${missing.join(', ')}.`);
            return null;
        }

        const target = TARGET_PROMO_CODE.toLowerCase();
        const filtered = rows.filter((row) => (row[codeIdx] || '').trim().toLowerCase() === target);
        const mapped: EventbritePromoRow[] = filtered.map((row) => {
            const orderDate = (row[orderDateIdx] || '').trim();
            const originalPrice = (row[originalPriceIdx] || '').trim();
            const priceNumber = parsePrice(originalPrice);
            return {
                orderDate,
                originalPrice,
                grossAmount: priceNumber,
            };
        });

        postStatus(`✅ Found ${mapped.length} rows where Code=${TARGET_PROMO_CODE}.`);
        return {
            code: TARGET_PROMO_CODE,
            totalRows: rows.length,
            rows: mapped,
        };
    } catch (err: any) {
        postStatus(`❌ Failed to read CSV: ${err?.message || err}`);
        return null;
    }
}

function watchForDownloadStart(timeoutMs = DEFAULT_TIMEOUT_MS) {
    const startMs = Date.now();
    let resolved = false;
    let timeoutId: number | undefined;
    let rejectFn: ((err: Error) => void) | null = null;

    const listener = (item: chrome.downloads.DownloadItem) => {
        const itemStart = item.startTime ? Date.parse(item.startTime) : 0;
        if (itemStart && itemStart + 1000 < startMs) return;
        const filename = (item.filename || '').toLowerCase();
        const url = (item.url || '').toLowerCase();
        const isCsv = filename.endsWith('.csv') || url.includes('.csv') || url.includes('format=csv');
        const isEventbrite = url.includes('eventbrite');
        if (!isCsv && !isEventbrite) return;
        resolved = true;
        if (timeoutId) clearTimeout(timeoutId);
        chrome.downloads.onCreated.removeListener(listener);
        if (resolveFn) resolveFn(item);
    };

    let resolveFn: ((item: chrome.downloads.DownloadItem) => void) | null = null;

    const promise = new Promise<chrome.downloads.DownloadItem>((resolve, reject) => {
        resolveFn = resolve;
        rejectFn = reject;
        timeoutId = setTimeout(() => {
            if (resolved) return;
            resolved = true;
            chrome.downloads.onCreated.removeListener(listener);
            reject(new Error('Download did not start in time.'));
        }, timeoutMs);
    });

    chrome.downloads.onCreated.addListener(listener);

    const cancel = () => {
        if (resolved) return;
        resolved = true;
        if (timeoutId) clearTimeout(timeoutId);
        chrome.downloads.onCreated.removeListener(listener);
        if (rejectFn) rejectFn(new Error('Download wait cancelled.'));
    };

    return { promise, cancel };
}

export async function downloadEventbritePromoCodeUsage(): Promise<EventbritePromoReport | null> {
    postStatus('📊 Opening Eventbrite promo code usage report...');
    const tab = await openTab(REPORT_URL);
    await sleep(1500);

    const orgResult = await maybeSelectOrganization(tab.id!);
    if (orgResult === 'missing') {
        postStatus(`❌ "Select organization" detected, but "${ORG_TARGET}" was not found.`);
        try { await chrome.tabs.update(tab.id!, { active: true }); } catch { /* ignore */ }
        return null;
    }
    if (orgResult === 'selected') {
        postStatus(`✅ Selected organization: ${ORG_TARGET}.`);
        await sleep(1500);
    }

    const hasSelector = await waitForSelector(tab.id!, SELECT_ALL_SELECTOR);
    if (!hasSelector) {
        postStatus('❌ Could not find the event selector. Make sure you are logged into Eventbrite.');
        try { await chrome.tabs.update(tab.id!, { active: true }); } catch { /* ignore */ }
        return null;
    }

    const selectResult = await ensureCheckboxChecked(tab.id!, SELECT_ALL_SELECTOR);
    if (!selectResult.ok) {
        postStatus('❌ Failed to select all events.');
        return null;
    }
    postStatus(selectResult.wasChecked ? '✅ All events already selected.' : '✅ Selected all events.');

    const runResult = await clickButtonByText(tab.id!, 'Run Report');
    if (!runResult.ok) {
        postStatus('❌ "Run Report" button not found.');
        try { await chrome.tabs.update(tab.id!, { active: true }); } catch { /* ignore */ }
        return null;
    }
    if (runResult.disabled) {
        postStatus('⚠️ "Run Report" is disabled. Waiting for it to enable...');
        const clicked = await clickButtonByTextWhenEnabled(tab.id!, 'Run Report');
        if (!clicked) {
            postStatus('❌ "Run Report" stayed disabled. Try again after the page finishes loading.');
            return null;
        }
    }
    postStatus('▶️ Run Report clicked.');

    const exportReady = await waitForSelector(tab.id!, EXPORT_BUTTON_SELECTOR, 45000);
    if (!exportReady) {
        postStatus('❌ Export button did not appear after running report.');
        try { await chrome.tabs.update(tab.id!, { active: true }); } catch { /* ignore */ }
        return null;
    }

    const exportEnabled = await waitForExportEnabled(tab.id!, 45000);
    if (!exportEnabled) {
        postStatus('❌ Export button stayed disabled (aria-disabled=true).');
        return null;
    }

    const exportDebug = await debugExportButton(tab.id!);
    if (!exportDebug?.found) {
        postStatus('❌ Export button not found after wait (debug).');
        return null;
    }
    postStatus(`🧪 Export button: text="${exportDebug.text}" disabled=${exportDebug.disabled} expanded=${exportDebug.ariaExpanded} visible=${exportDebug.visible}`);

    try { await chrome.tabs.update(tab.id!, { active: true }); } catch { /* ignore */ }
    const exportClicked = await clickExportTrigger(tab.id!);
    if (!exportClicked) {
        postStatus('❌ Failed to click the Export button.');
        return null;
    }
    postStatus('📤 Export button clicked. Waiting for menu...');

    const menuReady = await waitForExportMenu(tab.id!, 15000);
    if (!menuReady) {
        postStatus('⚠️ Export menu not detected yet; retrying export click...');
        await sleep(800);
        await clickSelector(tab.id!, EXPORT_BUTTON_SELECTOR);
        const menuReadyRetry = await waitForExportMenu(tab.id!, 15000);
        if (!menuReadyRetry) {
            postStatus('❌ Export menu still not detected after retry.');
            return null;
        }
    }
    postStatus('📤 Export menu opened. Selecting CSV...');

    const downloadWatch = watchForDownloadStart(45000);

    const csvClicked = await clickCsvOption(tab.id!, 20000);
    if (!csvClicked) {
        downloadWatch.cancel();
        postStatus('❌ CSV option not found in export menu.');
        return null;
    }

    postStatus('⬇️ CSV export selected; waiting for download to start...');
    try {
        const item = await downloadWatch.promise;
        const fileLabel = item.filename ? ` (${item.filename})` : '';
        postStatus(`✅ Download started${fileLabel}.`);
        if (item.url) {
            return await fetchPromoCodeReport(item.url);
        }
        postStatus('⚠️ Download URL missing; skipping CSV parsing.');
        return null;
    } catch (err: any) {
        postStatus(`❌ Download did not start: ${err?.message || err}`);
        return null;
    }
}
