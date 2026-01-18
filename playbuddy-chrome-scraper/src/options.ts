import { API_ENV_KEY, AUTO_FETLIFE_KEY, AUTO_FETLIFE_NEARBY_KEY } from './config.js';

type ScrapeSource =
    | 'fetlife'
    | 'fetlifeNearby'
    | 'fetlifeNearbyApi'
    | 'fetlifeFestivals'
    | 'fetlifeFriendsStage1'
    | 'fetlifeFriendsStage2'
    | 'fetlifeFriendsApiStage1'
    | 'fetlifeFriendsApiStage2'
    | 'fetlifeSingle'
    | 'instagram'
    | 'tickettailor'
    | 'pluraPromoStats';

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

type ProgressEntry = { ts: number; msg: string };
type ProgressRun = { runId: string; startedAt: number; entries: ProgressEntry[] };
type RunTableEntry = { runId: string; source?: string; html: string; updatedAt?: number };

const SOURCE_LABELS: Record<string, string> = {
    fetlife: 'FetLife Events (deprecated)',
    fetlifeNearby: 'FetLife Nearby (HTML)',
    fetlifeNearbyApi: 'FetLife Nearby (API)',
    fetlifeFestivals: 'FetLife Festivals',
    fetlifeFriendsStage1: 'FetLife Friends Stage 1',
    fetlifeFriendsStage2: 'FetLife Friends Stage 2',
    fetlifeFriendsApiStage1: 'FetLife Friends API Stage 1',
    fetlifeFriendsApiStage2: 'FetLife Friends API Stage 2',
    fetlifeSingle: 'FetLife Single Handle',
    instagram: 'Instagram',
    tickettailor: 'TicketTailor',
    pluraPromoStats: 'Plura Promo Stats',
};

const LS_KEY = 'PLAYBUDDY_API_KEY';
const RUN_LOG_KEY = 'PB_SCRAPE_LOGS';
const TABLE_LOGS_KEY = 'PB_TABLE_LOGS';
const PROGRESS_KEY = 'PB_PROGRESS_LOGS';
const LIVE_LOG_KEY = 'PB_LIVE_LOG';
const TEST_MODE_KEY = 'PB_TEST_MODE';
const SKIP_OVERWRITE_KEY = 'PB_SKIP_OVERWRITE';
const TABLE_LOG_KEY = 'PB_TABLE_HTML';
const MAX_EVENTS_KEY = 'PB_MAX_EVENTS';

let cachedRunLogs: RunLogEntry[] = [];
let cachedProgressRuns: ProgressRun[] = [];
let cachedRunTables: RunTableEntry[] = [];
let selectedRunId: string | null = null;
let latestTableHtml = '';

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (ch) => {
        const map: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        };
        return map[ch] || ch;
    });
}

function formatDuration(ms?: number): string {
    if (typeof ms !== 'number' || !Number.isFinite(ms)) return 'n/a';
    return `${Math.round(ms / 1000)}s`;
}

function formatDateTime(ts?: number): string {
    if (typeof ts !== 'number' || !Number.isFinite(ts)) return 'n/a';
    return new Date(ts).toLocaleString();
}

function sourceLabel(source: string): string {
    return SOURCE_LABELS[source] || source;
}

function labelFromRunId(runId: string): string {
    if (runId.startsWith('branch-stats')) return 'Branch stats';
    const base = runId.split('-')[0] || runId;
    return sourceLabel(base);
}

function getLatestRunId(): string | null {
    return cachedRunLogs[0]?.id || cachedProgressRuns[0]?.runId || null;
}

function getRunTableEntry(runId: string | null): RunTableEntry | null {
    if (!runId) return null;
    return cachedRunTables.find(entry => entry.runId === runId) || null;
}

function tableLabelForRun(runId: string | null): string {
    if (!runId) return 'Latest run';
    const run = cachedRunLogs.find(r => r.id === runId);
    if (run) return sourceLabel(run.source);
    const progress = cachedProgressRuns.find(p => p.runId === runId);
    if (progress) return labelFromRunId(progress.runId);
    return 'Run table';
}

function normalizeTableHtml(raw: string): string {
    let html = raw || '';
    if (!html) return '';
    if (html.includes('<table') && !html.includes('status-table')) {
        html = html.replace('<table', '<table class="status-table"');
    }
    html = html.replace(/style="color:#fff;?"/g, '');
    if (!html.includes('status-table-link')) {
        html = html.replace(/<a(?![^>]*class=)/g, '<a class="status-table-link"');
    }
    return html;
}

function init() {
    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement | null;
    const saveBtn = document.getElementById('saveApiKey') as HTMLButtonElement | null;
    const testModeCheckbox = document.getElementById('testMode') as HTMLInputElement | null;
    const skipOverwriteCheckbox = document.getElementById('skipOverwrite') as HTMLInputElement | null;
    const maxEventsInput = document.getElementById('maxEvents') as HTMLInputElement | null;
    const apiStatus = document.getElementById('apiStatus') as HTMLSpanElement | null;
    const apiEnvSelect = document.getElementById('apiEnv') as HTMLSelectElement | null;
    const autoFetlifeCheckbox = document.getElementById('autoFetlife') as HTMLInputElement | null;
    const runLogsDiv = document.getElementById('runLogs') as HTMLDivElement | null;
    const logDiv = document.getElementById('log') as HTMLDivElement | null;
    const tableDiv = document.getElementById('tableOutput') as HTMLDivElement | null;
    const stage2Input = document.getElementById('stage2File') as HTMLInputElement | null;
    const stage2Btn = document.getElementById('startFetlifeFriendsStage2') as HTMLButtonElement | null;
    const stage2ApiBtn = document.getElementById('startFetlifeFriendsApiStage2') as HTMLButtonElement | null;
    const singleHandleInput = document.getElementById('singleFetlifeHandle') as HTMLInputElement | null;
    const singleHandleBtn = document.getElementById('startSingleFetlifeHandle') as HTMLButtonElement | null;
    const branchStatsBtn = document.getElementById('startBranchStats') as HTMLButtonElement | null;
    const runDetailTitle = document.getElementById('runDetailTitle') as HTMLSpanElement | null;
    const runDetailMeta = document.getElementById('runDetailMeta') as HTMLDivElement | null;
    const runDetailLog = document.getElementById('runDetailLog') as HTMLDivElement | null;
    const runTableLabel = document.getElementById('runTableLabel') as HTMLSpanElement | null;
    const runDetailSkipReasons = document.getElementById('runDetailSkipReasons') as HTMLDivElement | null;

    if (!apiKeyInput || !saveBtn || !apiStatus) {
        console.warn('Options page failed to find API key inputs.');
        return;
    }

    function setApiStatus(text: string, state: 'saved' | 'empty') {
        if (!apiStatus) return;
        apiStatus.textContent = text;
        apiStatus.dataset.state = state;
    }

    if (apiEnvSelect) {
        chrome.storage.local.get(API_ENV_KEY, res => {
            const val = res[API_ENV_KEY] || 'local';
            apiEnvSelect.value = val;
        });
        apiEnvSelect.addEventListener('change', () => {
            chrome.storage.local.set({ [API_ENV_KEY]: apiEnvSelect.value || 'local' });
        });
    }
    if (autoFetlifeCheckbox) {
        chrome.storage.local.get([AUTO_FETLIFE_KEY, AUTO_FETLIFE_NEARBY_KEY], res => {
            autoFetlifeCheckbox.checked = !!res[AUTO_FETLIFE_KEY] || !!res[AUTO_FETLIFE_NEARBY_KEY];
        });
        autoFetlifeCheckbox.addEventListener('change', () => {
            const enabled = !!autoFetlifeCheckbox.checked;
            chrome.storage.local.set({
                [AUTO_FETLIFE_KEY]: enabled,
                [AUTO_FETLIFE_NEARBY_KEY]: enabled,
            });
        });
    }

    function loadApiKey(): void {
        if (!apiKeyInput || !apiStatus) return;
        chrome.storage.local.get(LS_KEY, (result) => {
            const existing = result[LS_KEY] ?? '';
            apiKeyInput.value = existing;
            if (existing) {
                setApiStatus('Saved', 'saved');
            } else {
                setApiStatus('Not saved', 'empty');
            }
        });
    }

    function saveApiKey(): void {
        if (!apiKeyInput || !apiStatus) return;
        const val = apiKeyInput.value.trim();
        if (!val) {
            setApiStatus('Missing key', 'empty');
            return;
        }
        chrome.storage.local.set({ [LS_KEY]: val }, () => {
            setApiStatus('Saved', 'saved');
        });
    }

    saveBtn.addEventListener('click', saveApiKey);
    loadApiKey();

    if (testModeCheckbox) {
        chrome.storage.local.get(TEST_MODE_KEY, res => {
            testModeCheckbox.checked = !!res[TEST_MODE_KEY];
        });
        testModeCheckbox.addEventListener('change', () => {
            chrome.storage.local.set({ [TEST_MODE_KEY]: !!testModeCheckbox.checked });
        });
    }
    if (skipOverwriteCheckbox) {
        chrome.storage.local.get(SKIP_OVERWRITE_KEY, res => {
            skipOverwriteCheckbox.checked = !!res[SKIP_OVERWRITE_KEY];
        });
        skipOverwriteCheckbox.addEventListener('change', () => {
            chrome.storage.local.set({ [SKIP_OVERWRITE_KEY]: !!skipOverwriteCheckbox.checked });
        });
    }
    if (maxEventsInput) {
        chrome.storage.local.get(MAX_EVENTS_KEY, res => {
            const n = Number(res[MAX_EVENTS_KEY]);
            if (Number.isFinite(n) && n > 0) maxEventsInput.value = String(n);
        });
        maxEventsInput.addEventListener('change', () => {
            const n = Number(maxEventsInput.value);
            if (Number.isFinite(n) && n > 0) {
                chrome.storage.local.set({ [MAX_EVENTS_KEY]: n });
            } else {
                chrome.storage.local.remove(MAX_EVENTS_KEY);
            }
        });
    }

    function bindScrapeButton(buttonId: string, sourceName: ScrapeSource): void {
        const button = document.getElementById(buttonId) as HTMLButtonElement | null;
        if (!button) return;

        button.addEventListener('click', () => {
            chrome.runtime.sendMessage(
                { action: 'scrapeSingleSource', source: sourceName },
                (response: { ok: boolean }) => {
                    console.log(`Response from background (${sourceName}):`, response);
                }
            );
        });
    }

    const deprecatedFetlifeBtn = document.getElementById('startFetlife') as HTMLButtonElement | null;
    if (deprecatedFetlifeBtn) {
        deprecatedFetlifeBtn.disabled = true;
        deprecatedFetlifeBtn.title = 'Deprecated: use FetLife Nearby or Festivals.';
    }
    bindScrapeButton('startFetlifeNearby', 'fetlifeNearby');
    bindScrapeButton('startFetlifeNearbyApi', 'fetlifeNearbyApi');
    bindScrapeButton('startFetlifeFestivals', 'fetlifeFestivals');
    bindScrapeButton('startFetlifeFriendsStage1', 'fetlifeFriendsStage1');
    bindScrapeButton('startFetlifeFriendsApiStage1', 'fetlifeFriendsApiStage1');
    bindScrapeButton('startInstagram', 'instagram');
    bindScrapeButton('startTicketTailor', 'tickettailor');
    bindScrapeButton('startPluraPromoStats', 'pluraPromoStats');

    branchStatsBtn?.addEventListener('click', () => {
        chrome.runtime.sendMessage(
            { action: 'branchStatsScrape' },
            (response: { ok: boolean }) => {
                console.log('Branch stats scrape response:', response);
            }
        );
    });

    async function readStage2File(file: File): Promise<string[]> {
        const text = await file.text();
        let parsed: any;
        try { parsed = JSON.parse(text); } catch { return []; }
        if (!Array.isArray(parsed)) return [];
        const normalize = (value: string) =>
            value.trim()
                .replace(/^@+/, '')
                .replace(/^https?:\/\/(www\.)?fetlife\.com\//i, '');
        const handles = parsed
            .map((row: any) => {
                const raw =
                    row?.username ||
                    row?.nickname ||
                    row?.handle ||
                    row?.root_handle ||
                    row?.profile_url ||
                    row?.url ||
                    '';
                return typeof raw === 'string' ? normalize(raw) : '';
            })
            .filter((h: string) => h);
        return Array.from(new Set(handles));
    }

    const runStage2 = (source: ScrapeSource) => async () => {
        if (!stage2Input || !stage2Input.files?.length) {
            alert('Please choose a Stage 1 JSON file first.');
            return;
        }
        const handles = await readStage2File(stage2Input.files[0]);
        if (!handles.length) {
            alert('No valid handles found in file.');
            return;
        }
        chrome.runtime.sendMessage({ action: 'setStage2Handles', handles }, () => {
            chrome.runtime.sendMessage({ action: 'scrapeSingleSource', source }, (response: { ok: boolean }) => {
                console.log('Stage 2 response:', response);
            });
        });
    };

    stage2Btn?.addEventListener('click', runStage2('fetlifeFriendsStage2'));
    stage2ApiBtn?.addEventListener('click', runStage2('fetlifeFriendsApiStage2'));

    singleHandleBtn?.addEventListener('click', () => {
        if (!singleHandleInput) return;
        const handle = singleHandleInput.value.trim();
        if (!handle) {
            alert('Please enter a FetLife handle to scrape.');
            return;
        }
        chrome.runtime.sendMessage(
            { action: 'scrapeSingleSource', source: 'fetlifeSingle', handles: [handle] },
            (response: { ok: boolean }) => {
                console.log('Single handle response:', response);
            }
        );
    });

    function persistLiveLog(line: string) {
        chrome.storage.local.get(LIVE_LOG_KEY, (res) => {
            const existing = ((res && (res as any)[LIVE_LOG_KEY]) || []) as { ts: number; msg: string }[];
            const last = existing[existing.length - 1];
            const next =
                last && last.msg === line
                    ? existing
                    : [...existing, { ts: Date.now(), msg: line }].slice(-500);
            chrome.storage.local.set({ [LIVE_LOG_KEY]: next });
        });
    }

    function renderLogEntry(msg: string, ts?: number) {
        if (!logDiv) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'log-line';
        const stamp = ts ? new Date(ts).toLocaleTimeString() : new Date().toLocaleTimeString();
        if (msg.includes('<table')) {
            wrapper.innerHTML = `<span class="log-time">[${stamp}]</span> ${normalizeTableHtml(msg)}`;
        } else {
            wrapper.textContent = `[${stamp}] ${msg}`;
        }
        logDiv.appendChild(wrapper);
        logDiv.scrollTop = logDiv.scrollHeight;
    }

    function appendLog(line: string) {
        renderLogEntry(line);
        persistLiveLog(line);
    }

    function renderRunLogs() {
        if (!runLogsDiv) return;
        const rows: string[] = [];
        const used = new Set<string>();

        cachedRunLogs.forEach((r) => {
            used.add(r.id);
            const start = formatDateTime(r.startedAt);
            const duration = formatDuration(r.durationMs);
            const count = Number.isFinite(r.eventCount) ? String(r.eventCount) : 'n/a';
            const skipped = Number.isFinite(r.skippedCount) ? r.skippedCount : null;
            const skippedLabel = skipped && skipped > 0 ? ` | skipped: ${skipped}` : '';
            const statusClass = r.status === 'success' ? 'success' : 'error';
            const error = r.error ? ` | error: ${escapeHtml(r.error)}` : '';
            const active = r.id === selectedRunId ? 'active' : '';
            rows.push(
                `<button class="run-row ${active}" data-run-id="${escapeHtml(r.id)}">
                    <div class="run-row-top">
                        <span class="run-source">${escapeHtml(sourceLabel(r.source))}</span>
                        <span class="status ${statusClass}">${escapeHtml(r.status)}</span>
                    </div>
                    <div class="run-row-meta">${escapeHtml(start)} | ${escapeHtml(duration)} | events: ${count}${escapeHtml(skippedLabel)}${error}</div>
                </button>`
            );
        });

        cachedProgressRuns.forEach((p) => {
            if (used.has(p.runId)) return;
            const start = formatDateTime(p.startedAt);
            const label = labelFromRunId(p.runId);
            const active = p.runId === selectedRunId ? 'active' : '';
            rows.push(
                `<button class="run-row ${active}" data-run-id="${escapeHtml(p.runId)}">
                    <div class="run-row-top">
                        <span class="run-source">${escapeHtml(label)}</span>
                        <span class="status neutral">log-only</span>
                    </div>
                    <div class="run-row-meta">${escapeHtml(start)} | entries: ${p.entries?.length || 0}</div>
                </button>`
            );
        });

        if (!rows.length) {
            runLogsDiv.innerHTML = '<div class="muted">No runs yet.</div>';
            return;
        }
        runLogsDiv.innerHTML = rows.join('');
    }

    function renderRunDetail() {
        if (!runDetailTitle || !runDetailMeta || !runDetailLog) return;
        if (!selectedRunId) {
            runDetailTitle.textContent = 'No run selected';
            runDetailMeta.innerHTML = '';
            if (runDetailSkipReasons) runDetailSkipReasons.innerHTML = '<span class="muted">Select a run to view skip reasons.</span>';
            runDetailLog.textContent = 'Select a run to view its saved log.';
            return;
        }

        const run = cachedRunLogs.find(r => r.id === selectedRunId) || null;
        const progress = cachedProgressRuns.find(p => p.runId === selectedRunId) || null;
        const label = run ? sourceLabel(run.source) : (progress ? labelFromRunId(progress.runId) : 'Run');
        runDetailTitle.textContent = label;

        const skippedCount = typeof run?.skippedCount === 'number' ? run.skippedCount : null;
        const metaRows = [
            { label: 'Run ID', value: run?.id || progress?.runId || 'n/a' },
            { label: 'Status', value: run?.status || (progress ? 'log-only' : 'n/a') },
            { label: 'Scraped', value: run ? String(run.eventCount) : 'n/a' },
            { label: 'Skipped', value: skippedCount !== null ? String(skippedCount) : 'n/a' },
            { label: 'Started', value: formatDateTime(run?.startedAt ?? progress?.startedAt) },
            { label: 'Duration', value: formatDuration(run?.durationMs) },
            { label: 'Uploaded', value: typeof run?.uploaded === 'boolean' ? (run.uploaded ? 'yes' : 'no') : 'n/a' },
        ];

        runDetailMeta.innerHTML = metaRows.map(row => (
            `<div class="meta-item"><span>${escapeHtml(row.label)}</span>${escapeHtml(row.value)}</div>`
        )).join('');

        if (runDetailSkipReasons) {
            const byReason = run?.skippedByReason || {};
            const entries = Object.entries(byReason).sort((a, b) => b[1] - a[1]);
            if (!entries.length) {
                runDetailSkipReasons.innerHTML = '<span class="muted">No skipped events recorded.</span>';
            } else {
                runDetailSkipReasons.innerHTML = entries
                    .map(([reason, count]) => `<span class="skip-pill">${escapeHtml(reason)}: ${count}</span>`)
                    .join('');
            }
        }

        const entries = progress?.entries || [];
        if (!entries.length) {
            runDetailLog.textContent = 'No log entries saved for this run.';
            return;
        }
        runDetailLog.innerHTML = entries.map((entry) => {
            const stamp = new Date(entry.ts).toLocaleTimeString();
            return `<div class="log-line"><span class="log-time">[${escapeHtml(stamp)}]</span> ${escapeHtml(entry.msg)}</div>`;
        }).join('');
    }

    function renderRunTable() {
        if (!tableDiv) return;
        const entry = getRunTableEntry(selectedRunId);
        const latestRunId = getLatestRunId();
        let html = entry?.html || '';
        if (!html) {
            if (!selectedRunId) {
                html = latestTableHtml || '';
            } else if (latestRunId && selectedRunId === latestRunId) {
                html = latestTableHtml || '';
            }
        }
        const normalized = normalizeTableHtml(html);
        if (normalized) {
            tableDiv.innerHTML = normalized;
        } else {
            tableDiv.innerHTML = selectedRunId
                ? '<div class="muted">No table saved for this run.</div>'
                : '<div class="muted">No table available yet.</div>';
        }
        if (runTableLabel) {
            runTableLabel.textContent = selectedRunId
                ? tableLabelForRun(selectedRunId)
                : (latestTableHtml ? 'Latest run' : 'No run selected');
        }
    }

    function selectRun(runId: string) {
        selectedRunId = runId;
        renderRunLogs();
        renderRunDetail();
        renderRunTable();
    }

    runLogsDiv?.addEventListener('click', (event) => {
        const target = (event.target as HTMLElement).closest('.run-row') as HTMLElement | null;
        if (!target?.dataset?.runId) return;
        selectRun(target.dataset.runId);
    });

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg?.action === 'log' && typeof msg.text === 'string') {
            appendLog(msg.text);
        }
        if (msg?.action === 'table' && typeof msg.html === 'string') {
            latestTableHtml = msg.html || '';
            renderRunTable();
        }
    });

    function loadLiveLog() {
        if (!logDiv) return;
        chrome.storage.local.get(LIVE_LOG_KEY, (res) => {
            const entries = (res && (res as any)[LIVE_LOG_KEY]) || [];
            logDiv.innerHTML = '';
            entries.forEach((e: any) => renderLogEntry(e?.msg || '', e?.ts));
        });
    }

    function loadRunLogs() {
        chrome.storage.local.get(RUN_LOG_KEY, (res) => {
            cachedRunLogs = (res && (res as any)[RUN_LOG_KEY]) || [];
            if (!selectedRunId && cachedRunLogs.length) {
                selectedRunId = cachedRunLogs[0].id;
            }
            renderRunLogs();
            renderRunDetail();
            renderRunTable();
        });
    }

    function loadProgressRuns() {
        chrome.storage.local.get(PROGRESS_KEY, (res) => {
            cachedProgressRuns = (res && (res as any)[PROGRESS_KEY]) || [];
            if (!selectedRunId && cachedProgressRuns.length) {
                selectedRunId = cachedProgressRuns[0].runId;
            }
            renderRunLogs();
            renderRunDetail();
            renderRunTable();
        });
    }

    function loadRunTables() {
        chrome.storage.local.get(TABLE_LOGS_KEY, (res) => {
            cachedRunTables = (res && (res as any)[TABLE_LOGS_KEY]) || [];
            renderRunTable();
        });
    }

    function loadTablePreview() {
        if (!tableDiv) return;
        chrome.storage.local.get(TABLE_LOG_KEY, res => {
            latestTableHtml = res[TABLE_LOG_KEY] || '';
            renderRunTable();
        });
    }

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && RUN_LOG_KEY in changes) loadRunLogs();
        if (area === 'local' && PROGRESS_KEY in changes) loadProgressRuns();
        if (area === 'local' && LIVE_LOG_KEY in changes) loadLiveLog();
        if (area === 'local' && TABLE_LOGS_KEY in changes) loadRunTables();
        if (area === 'local' && TABLE_LOG_KEY in changes) loadTablePreview();
    });

    loadRunLogs();
    loadProgressRuns();
    loadRunTables();
    loadLiveLog();
    loadTablePreview();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
