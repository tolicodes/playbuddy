importScripts(
    'libs/moment.js',
    'libs/moment-tz.js'
);

const MUNCH_FETLIFE_HANDLES = [
    // waiting
    // 'callmebilly',

    // create munch
    // 'SheMagickEvents',
    // 'QueerTakeover',

    // can't find
    // 'babygirl'

    // knotty kris
    // christian dark side

    'Queens_Kinksters',
    'TES-NYC',
    'JinkyKews',
    'Geekaholic', // jamie Vu cuddle knight queen hershy
    'KinkyCannaMunch',
    'Black-bleu',
    'MistressBuffyNYC',
    'KinkyKlimbers',
    'TallGoddessNY',
    'Sir-airose',
    'Kink-Collective',
];

const maxEventsPerHour = 60;
const minDelayMs = 5000;
const maxDelayMs = 15000;

let eventsThisWindow = 0;
let windowStartTs = Date.now();

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function throttleHourly() {
    const now = Date.now();
    if (now - windowStartTs >= 3600_000) {
        windowStartTs = now;
        eventsThisWindow = 0;
    }
    if (eventsThisWindow >= maxEventsPerHour) {
        const wait = 3600_000 - (now - windowStartTs);
        postStatus(`⏳ Hourly cap reached — sleeping ${Math.round(wait / 60000)} min…`);
        await sleep(wait);
        windowStartTs = Date.now();
        eventsThisWindow = 0;
    }
}

async function randomDelay() {
    const delay = minDelayMs + Math.random() * (maxDelayMs - minDelayMs);
    postStatus(`🕒 Waiting ${Math.round(delay / 1000)} s to mimic human pacing…`);
    await sleep(delay);
}

function postStatus(text) {
    console.log('📢', text);
    chrome.runtime.sendMessage({ action: 'log', text }, () => { });
}

function openTab(url) {
    return new Promise(resolve => {
        chrome.tabs.create({ url, active: false }, tab => {
            const listener = (tabId, info) => {
                if (tabId === tab.id && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve(tab);
                }
            };
            chrome.tabs.onUpdated.addListener(listener);
        });
    });
}

function parseToISO(input) {
    const tz = "America/New_York";
    const fmt = "ddd, MMM D, YYYY h:mm A";

    const cleaned = input
        .replace(/\u00A0|\u2009|\u202F/g, ' ')    // normalize weird spaces
        .replace(/\u2013|\u2014/g, '-')           // normalize dashes
        .replace(/EDT|EST/g, '')                  // remove timezone labels
        .trim();

    const lines = cleaned
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);

    try {
        // Format 0: "Starts in…" + date + time
        if (lines.length >= 3 && lines[0].toLowerCase().startsWith('starts in')) {
            const [_, dateLine, timeRange] = lines;
            const [startTime, endTime] = timeRange.split('-').map(s => s.trim());
            const start = moment.tz(`${dateLine} ${startTime}`, fmt, tz);
            const end = moment.tz(`${dateLine} ${endTime}`, fmt, tz);
            return { start: start.toISOString(), end: end.toISOString() };
        }

        // ✅ NEW: Format 1 — single line with " at "
        if (lines.length === 1 && lines[0].includes(' at ') && lines[0].includes('-')) {
            const [datePart, timePart] = lines[0].split(' at ').map(s => s.trim());
            const [startTime, endTime] = timePart.split('-').map(s => s.trim());
            const start = moment.tz(`${datePart} ${startTime}`, fmt, tz);
            const end = moment.tz(`${datePart} ${endTime}`, fmt, tz);
            return { start: start.toISOString(), end: end.toISOString() };
        }

        // Format 2: two lines — date on line 1, time range on line 2
        if (lines.length === 2 && lines[1].includes('-')) {
            const [startTime, endTime] = lines[1].split('-').map(s => s.trim());
            const start = moment.tz(`${lines[0]} ${startTime}`, fmt, tz);
            const end = moment.tz(`${lines[0]} ${endTime}`, fmt, tz);
            return { start: start.toISOString(), end: end.toISOString() };
        }

        // Format 3: multi-line with “Until”
        if (lines.length >= 5 && lines[2].toLowerCase().startsWith('until')) {
            const start = moment.tz(`${lines[0]} ${lines[1]}`, fmt, tz);
            const end = moment.tz(`${lines[3]} ${lines[4]}`, fmt, tz);
            return { start: start.toISOString(), end: end.toISOString() };
        }

        // Format 4: “From” + “Until” multi-line
        if (lines.length >= 6 && lines[0].toLowerCase().startsWith('from') && lines[3].toLowerCase().startsWith('until')) {
            const start = moment.tz(`${lines[1]} ${lines[2]}`, fmt, tz);
            const end = moment.tz(`${lines[4]} ${lines[5]}`, fmt, tz);
            return { start: start.toISOString(), end: end.toISOString() };
        }

        throw new Error('Unrecognized datetime format');
    } catch (err) {
        return { start: null, end: null, error: err.message, raw: input };
    }
}


async function scrapeAll(users) {
    const results = [];
    const errors = [];

    for (const u of users) {
        postStatus(`🔍 Fetching “Events Organizing” for ${u}…`);
        await randomDelay();

        const profileTab = await openTab(`https://fetlife.com/${u}`);

        const [{ result: links }] = await chrome.scripting.executeScript({
            target: { tabId: profileTab.id },
            func: async () => {
                async function retryUntilTruthy(fn, maxAttempts = 10, delayMs = 500) {
                    for (let i = 0; i < maxAttempts; i++) {
                        const result = fn();
                        if (result) return result;
                        await new Promise(res => setTimeout(res, delayMs));
                    }
                    return null;
                }

                const header = await retryUntilTruthy(() => Array.from(document.querySelectorAll('h6'))
                    .find(h => h.textContent.trim() === 'Events Organizing'));

                const container = header?.parentElement?.nextElementSibling;
                if (!container) return [];

                const viewAll = Array.from(container.querySelectorAll('a'))
                    .find(a => a.textContent.trim().toLowerCase().startsWith('view all'));
                if (viewAll) {
                    viewAll.click();
                    await new Promise(res => setTimeout(res, 1000));
                }

                return Array.from(container.querySelectorAll('a'))
                    .map(a => a.href);
            }
        });

        postStatus(`  • Found ${links.length} events for ${u}`);

        for (const url of links) {
            await throttleHourly();
            await randomDelay();

            postStatus(`    – Scraping ${url}`);
            const eventTab = await openTab(url);

            const [{ result }] = await chrome.scripting.executeScript({
                target: { tabId: eventTab.id },
                func: () => {
                    function cleanHtml(html) {
                        const tmp = document.createElement('div');
                        tmp.innerHTML = html || '';
                        tmp.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
                        tmp.querySelectorAll('p').forEach(p => {
                            const txt = p.textContent.trim();
                            p.replaceWith(txt + '\n');
                        });
                        return tmp.textContent.trim();
                    }
                    const ps = Array.from(document.querySelectorAll('p.pt-px.text-sm.text-gray-200'));

                    const fallbackDatetime = (() => {
                        const startsInEl = Array.from(document.querySelectorAll('p'))
                            .find(el => el.textContent.toLowerCase().includes('starts in'));

                        const sibling = startsInEl?.closest('div')?.querySelector('.text-gray-200');
                        return sibling?.innerText?.trim() || '';
                    })();

                    const category = cleanHtml(Array.from(document.querySelectorAll('.text-gray-200.text-sm.flex-auto.break-words'))[5]?.innerHTML || '');

                    return {
                        name: document.querySelector('h1.break-words.text-left')?.textContent.trim() || '',
                        rawDatetime: ps[2]?.innerText || fallbackDatetime || '',
                        location: cleanHtml(ps[3]?.innerHTML || ''),
                        category,
                        description: cleanHtml(document.querySelector('div.story__copy')?.innerHTML || ''),
                        ticket_url: location.href,
                    };
                }
            });

            result.fetlife_handle = u;
            const { start, end, error } = parseToISO(result.rawDatetime);
            result.start_date = start;
            result.end_date = end;

            if (error || !start || !end) {
                errors.push({
                    name: result.name,
                    ticket_url: result.url,
                    category: result.category,
                    location: result.location,
                    rawDatetime: result.rawDatetime,
                    error
                });
            }

            results.push(result);
            eventsThisWindow++;
            postStatus(`       ✔️ Scraped "${result.name}"`);
        }
    }

    if (errors.length) {
        console.warn('⛔ Parse errors:', errors);
        postStatus(`⚠️ ${errors.length} events failed datetime parsing. See console for details.`);
    }

    const json = JSON.stringify(results, null, 2);
    const blobUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
    chrome.downloads.download({ url: blobUrl, filename: 'fetlife-events.json' });
    postStatus(`✅ Done! Downloaded ${results.length} events.`);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log('🔔 [SW] got message:', msg);

    if (msg.action === 'ping') {
        sendResponse({ pong: true });
    } else if (msg.action === 'startScrape') {
        sendResponse({ ok: true, usersReceived: msg.users?.length || 0 });
        scrapeAll(MUNCH_FETLIFE_HANDLES);
        return true;
    }
});

console.log('🛠️ [SW] background.js loaded');