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

chrome.runtime.onMessage.addListener((
    msg: ScrapeMessage,
    _,
    sendResponse: (response: ScrapeResponse) => void
) => {
    console.log('🔔 [SW] got message:', msg);

    if (msg.action === 'scrapeSingleSource') {
        const { source } = msg;
        scrapeBySource(source as ScrapeSource)
            .then((events: EventResult[]) => {
                const json = JSON.stringify(events, null, 2);
                const blobUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
                chrome.downloads.download({ url: blobUrl, filename: `${source}-events.json` });
                postStatus(`✅ Done! Downloaded ${events.length} events.`);
            })
            .catch(err => {
                console.error('❌ Error in scrapeBySource:', err);
                chrome.runtime.sendMessage({ action: 'log', text: `❌ Error: ${err.message}` });
            });

        sendResponse({ ok: true });
        return true;
    }
});

console.log('🛠️ [SW] background.ts loaded');
