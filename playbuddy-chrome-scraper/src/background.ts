import type { EventTypes, NormalizedEventInput } from './common/types/types/commonTypes';
import * as fetlife from './providers/fetlife';
import { downloadEventbritePromoCodeUsage, type EventbritePromoReport, type EventbritePromoRow } from './providers/eventbrite-promo-codes';
import { scrapeBySource, type ScrapeSource } from './scrapeRouter';
import type { EventResult } from './types';
import { postStatus, setActiveRunId, resetLiveLog, sleep } from './utils';
import { getApiBase, AUTO_FETLIFE_KEY, AUTO_FETLIFE_NEARBY_KEY } from './config.js';
import { fetchImportSources } from './data.js';
import { createPartifulInvite, type PartifulInvitePayload, type PartifulInviteResult, type PartifulLogLevel } from './partiful';

type BackgroundAction = 'scrapeSingleSource' | 'setStage2Handles' | 'branchStatsScrape' | 'eventbritePromoCodes' | 'partifulCreateInvite';
type DoScrapeOpts = {
    scrapeFn?: () => Promise<EventResult[]>;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    forceSkipExisting?: boolean;
    approveExisting?: boolean;
    filenamePrefix?: string;
};

interface BackgroundMessage {
    action: BackgroundAction;
    source?: string;
    handles?: string[];
    requestId?: string;
    payload?: PartifulInvitePayload;
}

interface BackgroundResponse {
    ok: boolean;
    result?: PartifulInviteResult;
    error?: string;
}

// Minimal browser JS: map your FetLife JSON array -> /events/bulk (no batching)

const RUN_LOG_KEY = 'PB_SCRAPE_LOGS';
const FETLIFE_HISTORY_KEY = 'PB_FETLIFE_HISTORY';
const SKIP_OVERWRITE_KEY = 'PB_SKIP_OVERWRITE';
const TABLE_LOG_KEY = 'PB_TABLE_HTML';
const TABLE_LOGS_KEY = 'PB_TABLE_LOGS';

type RunLogEntry = {
    id: string;
    source: ScrapeSource;
    startedAt: number;
    endedAt: number;
    durationMs: number;
    eventCount: number;
    skippedCount?: number;
    skippedByReason?: Record<string, number>;
    status: 'success' | 'error';
    error?: string;
    uploaded?: boolean;
    filename?: string;
};

type TableSource = ScrapeSource | 'eventbritePromoCodes';

type RunTableEntry = {
    runId: string;
    source: TableSource;
    html: string;
    updatedAt: number;
};

type BranchStatsScrapeDebug = {
    apiRoot?: string;
    dataDir?: string;
    scriptPath?: string;
    scriptRunner?: string;
    scriptExists?: boolean;
    cwd?: string;
    nodeVersion?: string;
    hasBranchEmail?: boolean;
    hasBranchPassword?: boolean;
};

type BranchStatsScrapeStatus = {
    status: 'idle' | 'running' | 'completed' | 'failed';
    startedAt?: string | null;
    finishedAt?: string | null;
    progress?: { processed: number; total?: number | null } | null;
    lastLog?: string | null;
    error?: string | null;
    debug?: BranchStatsScrapeDebug | null;
};

const BRANCH_STATS_POLL_MS = 2000;
const BRANCH_STATS_MAX_POLLS = 1800;
let branchStatsRunning = false;
let eventbritePromoRunning = false;

type FetlifeRun = RunLogEntry & {
    events: Array<Pick<EventResult,
        'name' | 'start_date' | 'end_date' | 'location' | 'ticket_url' | 'fetlife_handle' | 'rsvp_count' | 'category'
    >>;
};

const getApiKey = () => {
    return chrome.storage.local.get('PLAYBUDDY_API_KEY').then((result) => {
        return result['PLAYBUDDY_API_KEY'];
    });
}

const getSkipOverwrite = async () => {
    const res = await chrome.storage.local.get(SKIP_OVERWRITE_KEY);
    return !!res[SKIP_OVERWRITE_KEY];
};

const normalizeHandle = (val?: string | null) => (val || '').replace(/^@/, '').trim().toLowerCase();
const shouldEnsureFetlifeLogin = (source: ScrapeSource) => source.startsWith('fetlife');

async function fetchImportSourceHandles(): Promise<Set<string>> {
    const out = new Set<string>();
    try {
        const imports = await fetchImportSources();
        imports.forEach(src => {
            if ((src?.identifier_type || '').toLowerCase() === 'handle' || src?.source === 'fetlife_handle') {
                const norm = normalizeHandle(src?.identifier);
                if (norm) out.add(norm);
            }
        });
    } catch (err: any) {
        postStatus(`⚠️ Failed to fetch import_sources handles: ${err?.message || err}`);
    }
    return out;
}

const EVENT_TYPES: EventTypes[] = ['event', 'play_party', 'munch', 'retreat', 'festival', 'conference', 'workshop', 'performance', 'discussion'];
const coerceEventType = (val?: string | null): EventTypes => {
    if (val && EVENT_TYPES.includes(val as EventTypes)) return val as EventTypes;
    return 'event';
};

function mapEvent(e: EventResult, approval_status?: 'pending' | 'approved' | 'rejected'): NormalizedEventInput {
    const categoryTag = (e.category || '').trim();
    return {
        organizer: {
            name: e.fetlife_handle || e.instagram_handle || 'Unknown',
            url: e.organizer_href || '',
            instagram_handle: e.instagram_handle || '',
            fetlife_handle: e.fetlife_handle || '',
        },
        name: e.name || '',
        description: e.description || "",
        location: e.location || "",
        start_date: e.start_date || '',   // expected ISO
        end_date: e.end_date || '',       // expected ISO
        ticket_url: e.ticket_url || '',
        event_url: e.ticket_url || '',
        image_url: e.image_url || '',
        type: coerceEventType(e.type),
        tags: categoryTag ? [categoryTag] : undefined,
        approval_status,
    };
}

async function uploadEvents(
    jsonArray: EventResult[],
    approval_status?: 'pending' | 'approved' | 'rejected',
    opts: { forceSkipExisting?: boolean; approveExisting?: boolean } = {},
) {
    const events = jsonArray.map(e => mapEvent(e, approval_status));
    const skipExisting = opts.forceSkipExisting || await getSkipOverwrite();
    const targetUrl = new URL(`${await getApiBase()}/events/bulk`);
    if (skipExisting) targetUrl.searchParams.set('skipExisting', 'true');
    if (opts.approveExisting) targetUrl.searchParams.set('approveExisting', 'true');
    let text = '';
    const startedAt = Date.now();
    try {
        const res = await fetch(targetUrl.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${await getApiKey()}`
            },
            body: JSON.stringify(events)
        });
        text = await res.text();
        if (!res.ok) {
            postStatus(`❌ Upload failed (${res.status}): ${text.slice(0, 200)}`);
            throw new Error(`Upload failed ${res.status}`);
        }
        const flags = [
            skipExisting ? 'skipExisting' : null,
            opts.approveExisting ? 'approveExisting' : null,
        ].filter(Boolean);
        const flagLabel = flags.length ? ` • ${flags.join(' + ')}` : '';
        postStatus(`⬆️ Uploaded ${events.length} events (status ${approval_status || 'approved'})${flagLabel}`);
        postStatus(`✅ Upload finished in ${Math.round((Date.now() - startedAt) / 1000)}s`);
        try { console.log(JSON.parse(text)); } catch { console.log(text); }
    } catch (err: any) {
        postStatus(`❌ Upload error: ${err?.message || err}`);
        console.error('Upload error', err, text);
        throw err;
    }
}

async function appendRunLog(entry: RunLogEntry) {
    const { [RUN_LOG_KEY]: existing = [] } = await chrome.storage.local.get(RUN_LOG_KEY);
    const next = [entry, ...(existing as RunLogEntry[])].slice(0, 50);
    await chrome.storage.local.set({ [RUN_LOG_KEY]: next });
}

async function saveFetlifeHistory(entry: RunLogEntry, events: EventResult[]) {
    if (!entry.source.startsWith('fetlife') || entry.source.startsWith('fetlifeFriends')) return;
    const slimEvents = events.map(e => ({
        name: e.name,
        start_date: e.start_date,
        end_date: e.end_date,
        location: e.location,
        ticket_url: e.ticket_url,
        fetlife_handle: e.fetlife_handle,
        rsvp_count: e.rsvp_count,
        category: (e as any).category,
    }));
    const { [FETLIFE_HISTORY_KEY]: existing = [] } = await chrome.storage.local.get(FETLIFE_HISTORY_KEY);
    const next: FetlifeRun[] = [
        { ...entry, events: slimEvents },
        ...(existing as FetlifeRun[]),
    ].slice(0, 20); // keep last 20 runs
    await chrome.storage.local.set({ [FETLIFE_HISTORY_KEY]: next });
}

async function setTableLog(html: string) {
    try {
        await chrome.storage.local.set({ [TABLE_LOG_KEY]: html });
    } catch (err) {
        console.warn('Failed to persist table log', err);
    }
}

async function saveRunTable(runId: string, source: TableSource, html: string) {
    try {
        const { [TABLE_LOGS_KEY]: existing = [] } = await chrome.storage.local.get(TABLE_LOGS_KEY);
        const next = [
            { runId, source, html, updatedAt: Date.now() },
            ...(existing as RunTableEntry[]).filter(entry => entry?.runId !== runId),
        ].slice(0, 25);
        await chrome.storage.local.set({ [TABLE_LOGS_KEY]: next });
    } catch (err) {
        console.warn('Failed to persist run table', err);
    }
}

async function readJsonSafe(res: Response): Promise<{ json: any | null; text: string }> {
    const text = await res.text();
    try {
        return { json: JSON.parse(text), text };
    } catch {
        return { json: null, text };
    }
}

async function fetchBranchStatsStatus(apiBase: string, apiKey: string): Promise<BranchStatsScrapeStatus | null> {
    try {
        const res = await fetch(`${apiBase}/branch_stats/scrape/status`, {
            headers: { Authorization: `Bearer ${apiKey}` },
        });
        const { json, text } = await readJsonSafe(res);
        if (!res.ok) {
            postStatus(`❌ Branch status error (${res.status}): ${text.slice(0, 200)}`);
            return null;
        }
        return json as BranchStatsScrapeStatus;
    } catch (err: any) {
        postStatus(`❌ Branch status fetch failed: ${err?.message || err}`);
        return null;
    }
}

async function runBranchStatsScrape() {
    if (branchStatsRunning) {
        postStatus('⚠️ Branch stats scrape already running.');
        return;
    }
    branchStatsRunning = true;
    const runId = `branch-stats-${Date.now()}`;
    setActiveRunId(runId);
    await resetLiveLog();
    postStatus(`🚀 Starting branch stats scrape (${runId})`);

    try {
        const apiBase = await getApiBase();
        postStatus(`DEBUG Branch API base: ${apiBase}`);
        const apiKey = await getApiKey();
        if (!apiKey) {
            postStatus('❌ Missing API key. Save it in the extension options.');
            return;
        }

        const startRes = await fetch(`${apiBase}/branch_stats/scrape`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
        });
        const { json: startJson, text: startText } = await readJsonSafe(startRes);

        if (!startRes.ok && startRes.status !== 409) {
            postStatus(`❌ Branch scrape start failed (${startRes.status}): ${startText.slice(0, 200)}`);
            return;
        }

        if (startRes.status === 409) {
            postStatus('⚠️ Branch stats scrape already running. Watching progress...');
        } else {
            postStatus('✅ Branch stats scrape started.');
        }

        let lastProcessed = -1;
        let lastLog = '';
        let lastDebug = '';
        const reportStatus = (status: BranchStatsScrapeStatus | null) => {
            if (!status) return;
            const progress = status.progress;
            if (progress && progress.processed !== lastProcessed) {
                const total = progress.total ? `/${progress.total}` : '';
                postStatus(`📊 Branch progress: ${progress.processed}${total}`);
                lastProcessed = progress.processed;
            }
            if (status.lastLog && status.lastLog !== lastLog) {
                postStatus(`🧾 ${status.lastLog}`);
                lastLog = status.lastLog;
            }
            if (status.debug) {
                const d = status.debug;
                const nextDebug = [
                    `DEBUG apiRoot=${d.apiRoot ?? ''}`,
                    `dataDir=${d.dataDir ?? ''}`,
                    `scriptPath=${d.scriptPath ?? ''}`,
                    `scriptRunner=${d.scriptRunner ?? ''}`,
                    `scriptExists=${d.scriptExists ?? ''}`,
                    `node=${d.nodeVersion ?? ''}`,
                    `hasBranchEmail=${d.hasBranchEmail ?? false}`,
                    `hasBranchPassword=${d.hasBranchPassword ?? false}`,
                ].join(' ');
                if (nextDebug.trim() && nextDebug !== lastDebug) {
                    postStatus(nextDebug);
                    lastDebug = nextDebug;
                }
            }
        };

        if (startJson) reportStatus(startJson as BranchStatsScrapeStatus);

        for (let i = 0; i < BRANCH_STATS_MAX_POLLS; i++) {
            const status = await fetchBranchStatsStatus(apiBase, apiKey);
            if (!status) return;
            reportStatus(status);
            if (status.status !== 'running') {
                if (status.status === 'completed') {
                    postStatus('✅ Branch stats scrape completed.');
                } else if (status.status === 'failed') {
                    postStatus(`❌ Branch stats scrape failed: ${status.error || 'Unknown error'}`);
                }
                return;
            }
            await sleep(BRANCH_STATS_POLL_MS);
        }
        postStatus('⚠️ Branch stats scrape polling timed out.');
    } catch (err: any) {
        postStatus(`❌ Branch stats scrape error: ${err?.message || err}`);
    } finally {
        branchStatsRunning = false;
        setActiveRunId(null);
    }
}

async function runEventbritePromoCodes() {
    if (eventbritePromoRunning) {
        postStatus('⚠️ Eventbrite promo code export already running.');
        return;
    }
    eventbritePromoRunning = true;
    const runId = `eventbritePromoCodes-${Date.now()}`;
    setActiveRunId(runId);
    await resetLiveLog();
    postStatus(`🚀 Starting Eventbrite promo code export (${runId})`);

    try {
        const report = await downloadEventbritePromoCodeUsage();
        if (!report) {
            postStatus('⚠️ No promo code report data available.');
            return;
        }
        const tableHtml = buildPromoCodeTable(report);
        await saveRunTable(runId, 'eventbritePromoCodes', tableHtml);
        await setTableLog(tableHtml);
        try { chrome.runtime.sendMessage({ action: 'table', html: tableHtml, runId }); } catch {}
    } catch (err: any) {
        postStatus(`❌ Eventbrite promo code export failed: ${err?.message || err}`);
    } finally {
        eventbritePromoRunning = false;
        setActiveRunId(null);
        postStatus(`⏹️ Finished Eventbrite promo code export (${runId})`);
    }
}

function buildPromoCodeTable(report: EventbritePromoReport): string {
    const safe = (value: string) => (value || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (!report.rows.length) {
        return `<div><em>No rows found for Code=${safe(report.code)}.</em></div>`;
    }
    const rowsHtml = report.rows.map((row: EventbritePromoRow) => (
        `<tr><td>${safe(row.orderDate)}</td><td>${safe(row.originalPrice)}</td><td>${safe(row.commission)}</td></tr>`
    )).join('');
    return `<table class="status-table"><thead><tr><th>Order date</th><th>Original price</th><th>Commission (10%)</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
}

type TableRowStatus = 'pending' | 'scraped' | 'skipped';
type TableRow = {
    organizer?: string | null;
    name?: string | null;
    url?: string | null;
    status?: TableRowStatus;
    reason?: string | null;
    type?: string | null;
    date?: string | null;
    location?: string | null;
    uploadStatus?: 'pending' | 'approved' | 'rejected' | string | null;
};

function buildStatusTable(
    events: EventResult[],
    skipped?: Array<{ reason: string; name?: string; url?: string; organizer?: string }>,
    rows?: TableRow[],
): string {
    const safe = (v: string | null | undefined) => (v || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const statusLabel = (status?: TableRowStatus) => {
        if (status === 'pending') return 'Pending';
        if (status === 'skipped') return 'Skipped';
        return 'Scraped';
    };

    const tableRows: TableRow[] = (rows && rows.length)
        ? rows
        : [
            ...events.map(ev => ({
                organizer: ev.fetlife_handle || ev.instagram_handle || 'Unknown',
                name: ev.name || '(no title)',
                url: ev.ticket_url || (ev as any).event_url || '',
                type: (ev as any).category || '',
                date: ev.start_date || '',
                location: (ev as any).location || '',
                uploadStatus: (ev as any).uploadStatus || '',
                status: 'scraped' as TableRowStatus,
            })),
            ...(skipped || []).map(s => ({
                organizer: s.organizer || '',
                name: s.name || '',
                url: s.url || '',
                status: 'skipped' as TableRowStatus,
                reason: s.reason || '',
                date: '',
                location: '',
                uploadStatus: '',
            })),
        ];

    if (!tableRows.length) return '<div><em>No events</em></div>';

    const rowsHtml = tableRows.map(r => {
        const organizer = safe(r.organizer || '');
        const name = safe(r.name || '(no title)');
        const reason = safe(r.reason || '');
        const type = safe(r.type || '');
        const date = safe(r.date || '');
        const link = r.url ? `<a href="${r.url}" target="_blank" rel="noreferrer" class="status-table-link">${name}</a>` : name;
        const location = safe((r as any).location || '');
        const uploadStatus = safe((r as any).uploadStatus || '');
        return `<tr><td>${date}</td><td>${organizer}</td><td>${link}</td><td>${type}</td><td>${location}</td><td>${uploadStatus}</td><td>${statusLabel(r.status)}</td><td>${reason}</td></tr>`;
    }).join('');
    return `<table class="status-table"><thead><tr><th>Date</th><th>Organizer</th><th>Event</th><th>Type</th><th>Location</th><th>Upload</th><th>Status</th><th>Reason</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
}

function computeSkipStats(skipped?: Array<{ reason?: string | null }>) {
    const byReason: Record<string, number> = {};
    const items = Array.isArray(skipped) ? skipped : [];
    items.forEach(entry => {
        const raw = (entry?.reason || '').trim();
        const reason = raw || 'unspecified';
        byReason[reason] = (byReason[reason] || 0) + 1;
    });
    return { skippedCount: items.length, skippedByReason: byReason };
}

const doScrape = (source: ScrapeSource, opts: DoScrapeOpts = {}) => {
    const startedAt = Date.now();
    const runId = `${source}-${startedAt}-${Math.random().toString(36).slice(2, 8)}`;
    resetLiveLog();
    setActiveRunId(runId);
    // Keep prior table; do not clear between runs
    postStatus(`▶️ Started ${source} (${runId})`);
    const scrapeFn = opts.scrapeFn || (() => scrapeBySource(source));
    const runScrape = async () => {
        if (shouldEnsureFetlifeLogin(source)) {
            const loginResult = await fetlife.ensureFetlifeLogin();
            if (!loginResult.ok) {
                const reason = loginResult.reason ? ` (${loginResult.reason})` : '';
                postStatus(`⛔ FetLife login not confirmed${reason}. Aborting scrape before API requests.`);
                throw new Error(`FetLife login not confirmed${reason}`);
            }
        }
        return scrapeFn();
    };
    return runScrape()
        .then(async (events: EventResult[]) => {
            try {
                console.log('events', events)
                const json = JSON.stringify(events, null, 2);
                const blobUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
                const isFriendSource = source.startsWith('fetlifeFriends');
                let skipStats = { skippedCount: 0, skippedByReason: {} as Record<string, number> };
                const filenameBase = opts.filenamePrefix || source;
                const filename = isFriendSource ? `${filenameBase}-friends.json` : `${filenameBase}-events.json`;
                chrome.downloads.download({ url: blobUrl, filename });

                if (!isFriendSource) {
                    const isNearby = source.startsWith('fetlifeNearby');
                    const isFestivalSource = source === 'fetlifeFestivals';
                    const approval_status = opts.approvalStatus ?? ((isNearby || isFestivalSource) ? 'pending' : undefined);
                    const forceSkipExisting = opts.forceSkipExisting ?? (isNearby ? true : (source === 'fetlife' || source === 'fetlifeFestivals'));
                    const approveExisting = opts.approveExisting ?? (source === 'fetlife' && !isNearby);

                    const skipped = (events as any)?.skippedLog || [];
                    skipStats = computeSkipStats(skipped);
                    const tableRows = (events as any)?.tableRows as TableRow[] | undefined;

                    const shouldSplit = isNearby;
                    if (shouldSplit) {
                        const handles = await fetchImportSourceHandles();
                        const approvedEvents = events.filter(ev => {
                            const h = normalizeHandle((ev as any).fetlife_handle);
                            return h && handles.has(h);
                        });
                        const pendingEvents = events.filter(ev => !approvedEvents.includes(ev));

                        const uploadStatusByUrl = new Map<string, string>();
                        pendingEvents.forEach(ev => {
                            if (ev.ticket_url) uploadStatusByUrl.set(ev.ticket_url, 'pending');
                        });
                        approvedEvents.forEach(ev => {
                            if (ev.ticket_url) uploadStatusByUrl.set(ev.ticket_url, 'approved');
                        });

                        const tableRowsWithUpload = tableRows?.map(row => {
                            const status = uploadStatusByUrl.get(row.url || '') || row.uploadStatus || '';
                            return { ...row, uploadStatus: status };
                        });
                        events.forEach(ev => {
                            const status = uploadStatusByUrl.get((ev as any).ticket_url || '') || (ev as any).uploadStatus || '';
                            (ev as any).uploadStatus = status;
                        });

                        const tableHtml = buildStatusTable(events, skipped, tableRowsWithUpload);
                        await saveRunTable(runId, source, tableHtml);
                        await setTableLog(tableHtml);
                        try { chrome.runtime.sendMessage({ action: 'table', html: tableHtml, runId }); } catch {}

                        if (pendingEvents.length) {
                            await uploadEvents(pendingEvents, 'pending', { forceSkipExisting: true, approveExisting: false });
                        }
                        if (approvedEvents.length) {
                            const msg = `Nearby upload: approving ${approvedEvents.length} events (import_sources match)`;
                            console.log(msg);
                            postStatus(msg);
                            await uploadEvents(approvedEvents, 'approved', { forceSkipExisting: true, approveExisting: true });
                        }
                        postStatus(`✅ Done! Uploaded ${pendingEvents.length} pending and ${approvedEvents.length} approved nearby events.`);
                    } else {
                        const tableHtml = buildStatusTable(events, skipped, tableRows);
                        await saveRunTable(runId, source, tableHtml);
                        await setTableLog(tableHtml);
                        try { chrome.runtime.sendMessage({ action: 'table', html: tableHtml, runId }); } catch {}
                        // Skipped summary intentionally omitted to reduce noise

                        await uploadEvents(events, approval_status, { forceSkipExisting, approveExisting });
                        postStatus(`✅ Done! Downloaded/uploaded ${events.length} events.`);
                    }
                } else {
                    postStatus(`✅ Done! Downloaded ${events.length} friends.`);
                }

                const endedAt = Date.now();
                await appendRunLog({
                    id: runId,
                    source,
                    startedAt,
                    endedAt,
                    durationMs: endedAt - startedAt,
                    eventCount: events.length,
                    skippedCount: skipStats.skippedCount,
                    skippedByReason: skipStats.skippedByReason,
                    status: 'success',
                    uploaded: !isFriendSource,
                    filename,
                });

                await saveFetlifeHistory({
                    id: runId,
                    source,
                    startedAt,
                    endedAt,
                    durationMs: endedAt - startedAt,
                    eventCount: events.length,
                    status: 'success',
                    uploaded: !isFriendSource,
                    filename,
                }, events);
            } catch (err: any) {
                postStatus(`❌ Error during upload: ${err?.message || err}`);
                throw err;
            }
        })
        .catch(async err => {
            console.error('❌ Error in scrapeBySource:', err);
            chrome.runtime.sendMessage({ action: 'log', text: `❌ Error: ${err.message}` });
            const endedAt = Date.now();
            const baseEntry: RunLogEntry = {
                id: runId,
                source,
                startedAt,
                endedAt,
                durationMs: endedAt - startedAt,
                eventCount: 0,
                skippedCount: 0,
                skippedByReason: {},
                status: 'error',
                error: err?.message || String(err),
                uploaded: source !== 'fetlifeNearby',
            };
            await appendRunLog(baseEntry);
            await saveFetlifeHistory(baseEntry, []);
        })
        .finally(() => {
            postStatus(`⏹️ Finished ${source} (${runId})`);
            setActiveRunId(null);
        });
}

chrome.runtime.onMessage.addListener((
    msg: BackgroundMessage,
    sender,
    sendResponse: (response: BackgroundResponse) => void
) => {
    console.log('🔔 [SW] got message:', msg);

    (async () => {
        if (msg.action === 'partifulCreateInvite') {
            const requestId = msg.requestId || `partiful-${Date.now()}`;
            const tabId = sender?.tab?.id;
            const relayLog = (level: PartifulLogLevel, message: string, data?: Record<string, unknown>) => {
                if (typeof tabId !== 'number') {
                    console.log(`[partiful:${level}] ${message}`, data || {});
                    return;
                }
                try {
                    chrome.tabs.sendMessage(tabId, {
                        action: 'partifulLog',
                        requestId,
                        level,
                        message,
                        data,
                    });
                } catch (err) {
                    console.warn('Failed to relay Partiful log', err);
                }
            };

            const payload = msg.payload;
            if (!payload || typeof payload !== 'object' || !('event' in payload)) {
                relayLog('error', 'Missing Partiful invite payload.');
                sendResponse({ ok: false, error: 'Missing Partiful invite payload.' });
                return;
            }

            try {
                relayLog('info', 'Starting Partiful invite flow.');
                const result = await createPartifulInvite(payload, relayLog);
                sendResponse({ ok: true, result });
            } catch (err: any) {
                const errorMessage = err?.message || String(err);
                relayLog('error', 'Partiful invite failed.', { error: errorMessage });
                sendResponse({ ok: false, error: errorMessage });
            }
            return;
        }

        if (msg.action === 'scrapeSingleSource') {
            const { source } = msg;
            if (!source) {
                sendResponse({ ok: false });
                return;
            }
            if (source === 'fetlife') {
                postStatus('Deprecated: FetLife events is disabled. Use FetLife Nearby or Festivals.');
                sendResponse({ ok: false });
                return;
            }
            if (source === 'fetlifeSingle') {
                const handles = Array.isArray(msg.handles) ? msg.handles.map(h => (h || '').trim()).filter(Boolean) : [];
                if (!handles.length) {
                    sendResponse({ ok: false });
                    return;
                }
                doScrape(source as ScrapeSource, {
                    scrapeFn: () => fetlife.scrapeEvents(handles),
                    forceSkipExisting: true,
                    approveExisting: true,
                    filenamePrefix: `fetlife-${handles[0]}`,
                });

                sendResponse({ ok: true });
                return;
            }

            doScrape(source as ScrapeSource);

            sendResponse({ ok: true });
            return;
        }

        if (msg.action === 'branchStatsScrape') {
            runBranchStatsScrape();
            sendResponse({ ok: true });
            return;
        }

        if (msg.action === 'eventbritePromoCodes') {
            runEventbritePromoCodes();
            sendResponse({ ok: true });
            return;
        }

        if (msg.action === 'setStage2Handles' && Array.isArray(msg.handles)) {
            try {
                await fetlife.saveStage2Handles(msg.handles);
                sendResponse({ ok: true });
            } catch (err) {
                console.error('Failed to save stage2 handles', err);
                sendResponse({ ok: false });
            }
            return;
        }
    })();

    return true;
});

console.log('🛠️ [SW] background.ts loaded');

const ALARM = 'fetlifeTimer';
const ALARM_INTERVAL_MINUTES = 12 * 60;
const LAST_RUN_KEY = 'fetlifeTimer';

async function setLastRun(ts: number) {
    await chrome.storage.local.set({ [LAST_RUN_KEY]: ts });
}

async function getLastRun(): Promise<number | null> {
    const res = await chrome.storage.local.get(LAST_RUN_KEY);
    return typeof res?.[LAST_RUN_KEY] === 'number' ? res[LAST_RUN_KEY] : null;
}

async function ensureAlarm() {
    const existing = await chrome.alarms.get(ALARM);
    if (!existing) {
        chrome.alarms.create(ALARM, { periodInMinutes: ALARM_INTERVAL_MINUTES });
    }
}

async function runSourcesSequential(sources: ScrapeSource[]) {
    for (const src of sources) {
        await doScrape(src);
    }
}

async function getAutoSources(): Promise<ScrapeSource[]> {
    try {
        const res = await chrome.storage.local.get([AUTO_FETLIFE_KEY, AUTO_FETLIFE_NEARBY_KEY]);
        const sources: ScrapeSource[] = [];
        const autoEnabled = !!res[AUTO_FETLIFE_KEY] || !!res[AUTO_FETLIFE_NEARBY_KEY];
        if (autoEnabled) {
            sources.push('fetlifeFestivals', 'fetlifeNearby');
        }
        return sources;
    } catch {
        return [];
    }
}

async function runScheduledScrapes() {
    const sources = await getAutoSources();
    if (!sources.length) {
        postStatus('⏸️ Auto-run disabled for Fetlife Nearby/Festivals; skipping scheduled scrape.');
        return;
    }
    await runSourcesSequential(sources);
}

async function maybeRunOnStartup() {
    const now = Date.now();
    const lastRun = await getLastRun();
    const intervalMs = ALARM_INTERVAL_MINUTES * 60 * 1000;
    if (!lastRun || (now - lastRun) >= intervalMs - 60_000) {
        await setLastRun(now);
        await runScheduledScrapes();
    }
}

chrome.alarms.onAlarm.addListener(async alarm => {
    if (alarm.name !== ALARM) return;

    const now = Date.now();

    const lastRun = await getLastRun();
    const intervalMs = ALARM_INTERVAL_MINUTES * 60 * 1000;

    if (lastRun && (now - lastRun) < intervalMs - 60_000) { // 1 min buffer
        console.log('Skipping duplicate alarm fire');
        return;
    }

    // Save run time
    await setLastRun(now);

    // Do your task
    console.log('Running scheduled job at', new Date(now).toISOString());
    await runScheduledScrapes();
});

ensureAlarm().catch(err => console.warn('Failed to ensure alarm', err));
maybeRunOnStartup().catch(err => console.warn('Failed startup run', err));
