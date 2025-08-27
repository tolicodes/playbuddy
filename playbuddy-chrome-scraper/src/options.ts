type ScrapeSource =
    | 'fetlife'
    | 'fetlifeNearby'
    | 'instagram'
    | 'tickettailor'
    | 'pluraPromoStats';

const LS_KEY = 'PLAYBUDDY_API_KEY';

const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
const saveBtn = document.getElementById('saveApiKey') as HTMLButtonElement;
const apiStatus = document.getElementById('apiStatus') as HTMLSpanElement;

function loadApiKey(): void {
    chrome.storage.local.get(LS_KEY, (result) => {
        const existing = result[LS_KEY] ?? '';
        apiKeyInput.value = existing;
        apiStatus.textContent = existing ? 'Saved' : 'Not saved';
    });
}

function saveApiKey(): void {
    const val = apiKeyInput.value.trim();
    if (!val) {
        apiStatus.textContent = 'Cannot save empty key';
        return;
    }
    chrome.storage.local.set({ [LS_KEY]: val }, () => {
        apiStatus.textContent = 'Saved';
    });
}

saveBtn.addEventListener('click', saveApiKey);

loadApiKey();

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
bindScrapeButton('startInstagram', 'instagram');
bindScrapeButton('startTicketTailor', 'tickettailor');
bindScrapeButton('startPluraPromoStats', 'pluraPromoStats');


const logDiv = document.getElementById('log') as HTMLDivElement;

function appendLog(line: string) {
    if (!logDiv) return;
    const time = new Date().toLocaleTimeString();
    logDiv.textContent += `[${time}] ${line}\n`;
    logDiv.scrollTop = logDiv.scrollHeight;
}

chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.action === 'log' && typeof msg.text === 'string') {
        appendLog(msg.text);
    }
});
