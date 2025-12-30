import type { EventTypes, NormalizedEventInput } from './common/types/commonTypes';
import * as fetlife from './providers/fetlife';
import { scrapeBySource, type ScrapeSource } from './scrapeRouter';
import type { EventResult } from './types';
import { postStatus, setActiveRunId, resetLiveLog } from './utils';
import { getApiBase, AUTO_FETLIFE_KEY, AUTO_FETLIFE_NEARBY_KEY } from './config.js';
import { fetchImportSources } from './data.js';

type ScrapeAction = 'scrapeSingleSource' | 'setStage2Handles';
type DoScrapeOpts = {
    scrapeFn?: () => Promise<EventResult[]>;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    forceSkipExisting?: boolean;
    approveExisting?: boolean;
    filenamePrefix?: string;
};

interface ScrapeMessage {
    action: ScrapeAction;
    source: string;
    handles?: string[];
}

interface ScrapeResponse {
    ok: boolean;
}

// Minimal browser JS: map your FetLife JSON array -> /events/bulk (no batching)

const RUN_LOG_KEY = 'PB_SCRAPE_LOGS';
const FETLIFE_HISTORY_KEY = 'PB_FETLIFE_HISTORY';
const SKIP_OVERWRITE_KEY = 'PB_SKIP_OVERWRITE';
const TABLE_LOG_KEY = 'PB_TABLE_HTML';

type RunLogEntry = {
    id: string;
    source: ScrapeSource;
    startedAt: number;
    endedAt: number;
    durationMs: number;
    eventCount: number;
    status: 'success' | 'error';
    error?: string;
    uploaded?: boolean;
    filename?: string;
};

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

const EVENT_TYPES: EventTypes[] = ['event', 'play_party', 'munch', 'retreat', 'festival', 'workshop', 'performance', 'discussion'];
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
        const link = r.url ? `<a href="${r.url}" target="_blank" rel="noreferrer" style="color:#fff;">${name}</a>` : name;
        const location = safe((r as any).location || '');
        const uploadStatus = safe((r as any).uploadStatus || '');
        return `<tr><td>${date}</td><td>${organizer}</td><td>${link}</td><td>${type}</td><td>${location}</td><td>${uploadStatus}</td><td>${statusLabel(r.status)}</td><td>${reason}</td></tr>`;
    }).join('');
    return `<table border="1" cellspacing="0" cellpadding="6" style="color:#fff;"><thead><tr><th>Date</th><th>Organizer</th><th>Event</th><th>Type</th><th>Location</th><th>Upload</th><th>Status</th><th>Reason</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
}

const doScrape = (source: ScrapeSource, opts: DoScrapeOpts = {}) => {
    const startedAt = Date.now();
    const runId = `${source}-${startedAt}-${Math.random().toString(36).slice(2, 8)}`;
    resetLiveLog();
    setActiveRunId(runId);
    // Keep prior table; do not clear between runs
    postStatus(`▶️ Started ${source} (${runId})`);
    const scrapeFn = opts.scrapeFn || (() => scrapeBySource(source));
    return scrapeFn()
        .then(async (events: EventResult[]) => {
            try {
                console.log('events', events)
                const json = JSON.stringify(events, null, 2);
                const blobUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
                const isFriendSource = source.startsWith('fetlifeFriends');
                const filenameBase = opts.filenamePrefix || source;
                const filename = isFriendSource ? `${filenameBase}-friends.json` : `${filenameBase}-events.json`;
                chrome.downloads.download({ url: blobUrl, filename });

                if (!isFriendSource) {
                    const isNearby = source.startsWith('fetlifeNearby');
                    const approval_status = opts.approvalStatus ?? (isNearby ? 'pending' : undefined);
                    const forceSkipExisting = opts.forceSkipExisting ?? (isNearby ? true : (source === 'fetlife' || source === 'fetlifeFestivals'));
                    const approveExisting = opts.approveExisting ?? (source === 'fetlife' && !isNearby);

                    const skipped = (events as any)?.skippedLog || [];
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
                        await setTableLog(tableHtml);
                        try { chrome.runtime.sendMessage({ action: 'table', html: tableHtml }); } catch {}

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
                        await setTableLog(tableHtml);
                        try { chrome.runtime.sendMessage({ action: 'table', html: tableHtml }); } catch {}
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
    msg: ScrapeMessage,
    _,
    sendResponse: (response: ScrapeResponse) => void
) => {
    console.log('🔔 [SW] got message:', msg);

    (async () => {
        if (msg.action === 'scrapeSingleSource') {
            const { source } = msg;
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
        if (res[AUTO_FETLIFE_KEY]) sources.push('fetlife');
        if (res[AUTO_FETLIFE_NEARBY_KEY]) sources.push('fetlifeNearby');
        return sources;
    } catch {
        return [];
    }
}

async function runScheduledScrapes() {
    const sources = await getAutoSources();
    if (!sources.length) {
        postStatus('⏸️ Auto-run disabled for Fetlife/FetlifeNearby; skipping scheduled scrape.');
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
