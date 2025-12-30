import { API_ENV_KEY, AUTO_FETLIFE_KEY, AUTO_FETLIFE_NEARBY_KEY } from './config.js';

type ScrapeSource =
    | 'fetlife'
    | 'fetlifeNearby'
    | 'fetlifeFestivals'
    | 'fetlifeFriendsStage1'
    | 'fetlifeFriendsStage2'
    | 'fetlifeSingle'
    | 'instagram'
    | 'tickettailor'
    | 'pluraPromoStats';

const LS_KEY = 'PLAYBUDDY_API_KEY';
const RUN_LOG_KEY = 'PB_SCRAPE_LOGS';
const LIVE_LOG_KEY = 'PB_LIVE_LOG';
const TEST_MODE_KEY = 'PB_TEST_MODE';
const SKIP_OVERWRITE_KEY = 'PB_SKIP_OVERWRITE';
const TABLE_LOG_KEY = 'PB_TABLE_HTML';
const MAX_EVENTS_KEY = 'PB_MAX_EVENTS';

function init() {
    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement | null;
    const saveBtn = document.getElementById('saveApiKey') as HTMLButtonElement | null;
    const testModeCheckbox = document.getElementById('testMode') as HTMLInputElement | null;
    const skipOverwriteCheckbox = document.getElementById('skipOverwrite') as HTMLInputElement | null;
    const maxEventsInput = document.getElementById('maxEvents') as HTMLInputElement | null;
    const apiStatus = document.getElementById('apiStatus') as HTMLSpanElement | null;
    const apiEnvSelect = document.getElementById('apiEnv') as HTMLSelectElement | null;
    const autoFetlifeCheckbox = document.getElementById('autoFetlife') as HTMLInputElement | null;
    const autoFetlifeNearbyCheckbox = document.getElementById('autoFetlifeNearby') as HTMLInputElement | null;
    const runLogsDiv = document.getElementById('runLogs') as HTMLDivElement | null;
    const logDiv = document.getElementById('log') as HTMLDivElement | null;
    const tableDiv = document.getElementById('tableOutput') as HTMLDivElement | null;
    const stage2Input = document.getElementById('stage2File') as HTMLInputElement | null;
    const stage2Btn = document.getElementById('startFetlifeFriendsStage2') as HTMLButtonElement | null;
    const singleHandleInput = document.getElementById('singleFetlifeHandle') as HTMLInputElement | null;
    const singleHandleBtn = document.getElementById('startSingleFetlifeHandle') as HTMLButtonElement | null;

    if (!apiKeyInput || !saveBtn || !apiStatus) {
        console.warn('Options page failed to find API key inputs.');
        return;
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
        chrome.storage.local.get(AUTO_FETLIFE_KEY, res => {
            autoFetlifeCheckbox.checked = !!res[AUTO_FETLIFE_KEY];
        });
        autoFetlifeCheckbox.addEventListener('change', () => {
            chrome.storage.local.set({ [AUTO_FETLIFE_KEY]: !!autoFetlifeCheckbox.checked });
        });
    }
    if (autoFetlifeNearbyCheckbox) {
        chrome.storage.local.get(AUTO_FETLIFE_NEARBY_KEY, res => {
            autoFetlifeNearbyCheckbox.checked = !!res[AUTO_FETLIFE_NEARBY_KEY];
        });
        autoFetlifeNearbyCheckbox.addEventListener('change', () => {
            chrome.storage.local.set({ [AUTO_FETLIFE_NEARBY_KEY]: !!autoFetlifeNearbyCheckbox.checked });
        });
    }

    function loadApiKey(): void {
        if (!apiKeyInput || !apiStatus) return;
        chrome.storage.local.get(LS_KEY, (result) => {
            const existing = result[LS_KEY] ?? '';
            if (apiKeyInput) apiKeyInput.value = existing;
            if (apiStatus) apiStatus.textContent = existing ? 'Saved' : 'Not saved';
        });
    }

    function saveApiKey(): void {
        if (!apiKeyInput || !apiStatus) return;
        const val = apiKeyInput.value.trim();
        if (!val) {
            if (apiStatus) apiStatus.textContent = 'Cannot save empty key';
            return;
        }
        chrome.storage.local.set({ [LS_KEY]: val }, () => {
            if (apiStatus) apiStatus.textContent = 'Saved';
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

    // --- Scrape buttons ---
    function bindScrapeButton(buttonId: string, sourceName: ScrapeSource): void {
        const button = document.getElementById(buttonId) as HTMLButtonElement | null;
        if (!button) return;

        button.addEventListener('click', () => {
            chrome.runtime.sendMessage(
                { action: 'scrapeSingleSource', source: sourceName },
                (response: { ok: boolean }) => {
                    console.log(`🚀 Response from background (${sourceName}):`, response);
                }
            );
        });
    }

    bindScrapeButton('startFetlife', 'fetlife');
    bindScrapeButton('startFetlifeNearby', 'fetlifeNearby');
    bindScrapeButton('startFetlifeNearbyApi', 'fetlifeNearbyApi' as ScrapeSource);
    bindScrapeButton('startFetlifeFestivals', 'fetlifeFestivals');
    bindScrapeButton('startFetlifeFriendsStage1', 'fetlifeFriendsStage1');
    bindScrapeButton('startInstagram', 'instagram');
    bindScrapeButton('startTicketTailor', 'tickettailor');
    bindScrapeButton('startPluraPromoStats', 'pluraPromoStats');

    async function readStage2File(file: File): Promise<string[]> {
        const text = await file.text();
        let parsed: any;
        try { parsed = JSON.parse(text); } catch { return []; }
        if (!Array.isArray(parsed)) return [];
        const handles = parsed
            .map((row: any) => (row?.root_handle || row?.username || '') as string)
            .filter((h: string) => typeof h === 'string' && h.trim())
            .map((h: string) => h.trim());
        return Array.from(new Set(handles));
    }

    stage2Btn?.addEventListener('click', async () => {
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
            chrome.runtime.sendMessage({ action: 'scrapeSingleSource', source: 'fetlifeFriendsStage2' }, (response: { ok: boolean }) => {
                console.log('🚀 Stage2 response:', response);
            });
        });
    });

    singleHandleBtn?.addEventListener('click', () => {
        if (!singleHandleInput) return;
        const handle = singleHandleInput.value.trim();
        if (!handle) {
            alert('Please enter a Fetlife handle to scrape.');
            return;
        }
        chrome.runtime.sendMessage(
            { action: 'scrapeSingleSource', source: 'fetlifeSingle', handles: [handle] },
            (response: { ok: boolean }) => {
                console.log('🚀 Single handle response:', response);
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
        const stamp = ts ? new Date(ts).toLocaleTimeString() : new Date().toLocaleTimeString();
        if (msg.includes('<table')) {
            wrapper.innerHTML = `<div style="color:#9ca3af;">[${stamp}]</div>${msg}`;
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

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg?.action === 'log' && typeof msg.text === 'string') {
            appendLog(msg.text);
        }
        if (msg?.action === 'table' && typeof msg.html === 'string') {
            if (tableDiv) tableDiv.innerHTML = msg.html || '<em>No events</em>';
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

    function renderRunLogs(logs: any[]) {
        if (!runLogsDiv) return;
        if (!logs?.length) {
            runLogsDiv.textContent = 'No runs yet';
            return;
        }
        const rows = logs.slice(0, 20).map((r) => {
            const start = new Date(r.startedAt).toLocaleString();
            const dur = r.durationMs ? `${Math.round(r.durationMs / 1000)}s` : '–';
            return `<div style="padding:6px 0; border-bottom:1px solid #1f2937;">
              <div><strong>${r.source}</strong> • ${r.status}${r.error ? ` (${r.error})` : ''}</div>
              <div style="font-size:12px; color:#94a3b8;">${start} • ${dur} • events: ${r.eventCount ?? '–'}</div>
            </div>`;
        }).join('');
        runLogsDiv.innerHTML = rows;
    }

    function loadRunLogs() {
        chrome.storage.local.get(RUN_LOG_KEY, (res) => {
            renderRunLogs((res && (res as any)[RUN_LOG_KEY]) || []);
        });
    }

    function loadTablePreview() {
        if (!tableDiv) return;
        chrome.storage.local.get(TABLE_LOG_KEY, res => {
            const html = res[TABLE_LOG_KEY] || '';
            tableDiv.innerHTML = html || '<em>No events</em>';
        });
    }

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && RUN_LOG_KEY in changes) loadRunLogs();
        if (area === 'local' && LIVE_LOG_KEY in changes) loadLiveLog();
        if (area === 'local' && TABLE_LOG_KEY in changes) loadTablePreview();
    });

    loadRunLogs();
    loadLiveLog();
    loadTablePreview();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
