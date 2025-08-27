import type { NormalizedEventInput } from './common/types/commonTypes';
import { scrapeBySource, type ScrapeSource } from './scrapeRouter';
import type { EventResult } from './types';
import { postStatus } from './utils';

type ScrapeAction = 'scrapeSingleSource';

interface ScrapeMessage {
    action: ScrapeAction;
    source: string;
}

interface ScrapeResponse {
    ok: boolean;
}

// Minimal browser JS: map your FetLife JSON array -> /events/bulk (no batching)

// const API_BASE = "https://api.playbuddy.me";   // change if needed
const API_BASE = "http://localhost:8080";
const BULK_URL = `${API_BASE}/events/bulk`;

const getApiKey = () => {
    return chrome.storage.local.get('PLAYBUDDY_API_KEY').then((result) => {
        return result['PLAYBUDDY_API_KEY'];
    });
}


function mapEvent(e: EventResult): NormalizedEventInput {
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
        type: 'event'
    };
}

async function uploadEvents(jsonArray: EventResult[]) {
    const events = jsonArray.map(mapEvent);
    const res = await fetch(BULK_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${await getApiKey()}`
        },
        body: JSON.stringify(events)
    });
    const text = await res.text();
    try { console.log(JSON.parse(text)); } catch { console.log(text); }
}

const doScrape = (source: ScrapeSource) => {
    scrapeBySource(source)
        .then((events: EventResult[]) => {

            console.log('events', events)
            const json = JSON.stringify(events, null, 2);
            const blobUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
            chrome.downloads.download({ url: blobUrl, filename: `${source}-events.json` });
            uploadEvents(events);
            postStatus(`✅ Done! Downloaded ${events.length} events.`);
        })
        .catch(err => {
            console.error('❌ Error in scrapeBySource:', err);
            chrome.runtime.sendMessage({ action: 'log', text: `❌ Error: ${err.message}` });
        });
}

chrome.runtime.onMessage.addListener((
    msg: ScrapeMessage,
    _,
    sendResponse: (response: ScrapeResponse) => void
) => {
    console.log('🔔 [SW] got message:', msg);

    if (msg.action === 'scrapeSingleSource') {
        const { source } = msg;
        doScrape(source as ScrapeSource);

        sendResponse({ ok: true });
        return true;
    }
});

console.log('🛠️ [SW] background.ts loaded');

const ALARM = 'fetlifeTimer';

chrome.alarms.onAlarm.addListener(async alarm => {
    if (alarm.name !== ALARM) return;

    const now = Date.now();

    const { lastRun } = await chrome.storage.local.get('fetlifeTimer');
    const DAY = 24 * 60 * 60 * 1000;

    if (lastRun && (now - lastRun) < DAY - 60_000) { // 1 min buffer
        console.log('Skipping duplicate alarm fire');
        return;
    }

    // Save run time
    await chrome.storage.local.set({ lastRun: now });

    // Do your task
    console.log('Running daily job at', new Date(now).toISOString());
});
