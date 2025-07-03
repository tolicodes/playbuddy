importScripts(
    'libs/moment.js',
    'libs/moment-tz.js'
);

const MUNCH_FETLIFE_HANDLES = [


    // 'Queens_Kinksters',
    // 'TES-NYC', // no promo
    // 'JinkyKews',
    // 'Geekaholic',
    // 'KinkyCannaMunch',
    // 'Black-bleu',
    // 'MistressBuffyNYC',
    // 'KinkyKlimbers',
    // 'TallGoddessNY',
    // 'Sir-airose',
    // 'Kink-Collective', // no promo
    // 'Miss__Scorpio',
    'thetaillorgroup', // ask promo
    // 'JJWatchEvents', // munch only
    // 'shemagickevents',
    // 'queertakeover'
    // 'missbloomsexed',


    // ask
    // 'jjwatchevents' - M
    // poohseefairy - M
    // bellaanastasya - M
    // smiley4face - M
    // sirs_unicorn - M
    // sanctionedevents - M
    // naughtynzuri - M
    // absolutedlight - M
    // _i- - M
    // knotasha - M
    // ethero - M
    // natashaxdress - M
    // mastcliftonnj - M
    // 
    // nyclittlescouts
    // ropeisfun
    // apollodelfino
    // dommenationnyc
    // malswitch
    // masterdanteamor - ghosted
    // knotty_chris
    // bossy_switcher
    // ropeboi
    // laughingbonobo
    /// hedonez_
    // 
    // callmebilly - ghosted
    // efn
    // freythor
    // nj_sextherapist
    // nakedinmotion
    // nyctng - ghost
    // lolamontez
    // ezulie_supreme
    // shaggals
    // misschele
    // deviantsnyc
    // parkslopegowanus
    // creatrixofchaos
    // lubegirl - ghosted
    // nyc_cgl_munch
    // eroticanyc
    // odynenj
    // queensdarkangel
    // bowtie_prod
    // haitianqueen4kng
    // s8nshrimp
    // smittenslair
    // mistressmarley94
    // thebodyelect
    // dubbull_dickens

    // rorpheus - in pagan's
    // dominus_eros - pagan's
    // goddessshakti - pagan's
];

const maxEventsPerHour = 60;
const minDelayMs = 5000;
const maxDelayMs = 15000;
const MAX_EVENTS = Infinity;

let eventsThisWindow = 0;
let windowStartTs = Date.now();

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomDelay(min = 1000, max = 5000) {
    return min + Math.random() * (max - min);
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
        .replace(/\u00A0|\u2009|\u202F/g, ' ')
        .replace(/\u2013|\u2014/g, '-')
        .replace(/EDT|EST/g, '')
        .trim();

    const lines = cleaned
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);

    try {
        if (lines.length >= 3 && lines[0].toLowerCase().startsWith('starts in')) {
            const [_, dateLine, timeRange] = lines;
            const [startTime, endTime] = timeRange.split('-').map(s => s.trim());
            const start = moment.tz(`${dateLine} ${startTime}`, fmt, tz);
            const end = moment.tz(`${dateLine} ${endTime}`, fmt, tz);
            return { start: start.toISOString(), end: end.toISOString() };
        }

        if (lines.length === 1 && lines[0].includes(' at ') && lines[0].includes('-')) {
            const [datePart, timePart] = lines[0].split(' at ').map(s => s.trim());
            const [startTime, endTime] = timePart.split('-').map(s => s.trim());
            const start = moment.tz(`${datePart} ${startTime}`, fmt, tz);
            const end = moment.tz(`${datePart} ${endTime}`, fmt, tz);
            return { start: start.toISOString(), end: end.toISOString() };
        }

        if (lines.length === 2 && lines[1].includes('-')) {
            const [startTime, endTime] = lines[1].split('-').map(s => s.trim());
            const start = moment.tz(`${lines[0]} ${startTime}`, fmt, tz);
            const end = moment.tz(`${lines[0]} ${endTime}`, fmt, tz);
            return { start: start.toISOString(), end: end.toISOString() };
        }

        if (lines.length >= 5 && lines[2].toLowerCase().startsWith('until')) {
            const start = moment.tz(`${lines[0]} ${lines[1]}`, fmt, tz);
            const end = moment.tz(`${lines[3]} ${lines[4]}`, fmt, tz);
            return { start: start.toISOString(), end: end.toISOString() };
        }

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

// This function will be injected into tab context
function extractEventDetailFromPage() {
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
    const blocks = Array.from(document.querySelectorAll('.text-gray-200'));
    const orgBlock = blocks.find(b => b.textContent.includes('Organized by'));
    const organizerLink = orgBlock?.querySelector('a');

    return {
        name: document.querySelector('h1.break-words.text-left')?.textContent.trim() || '',
        rawDatetime: ps[2]?.innerText || fallbackDatetime || '',
        location: cleanHtml(ps[3]?.innerHTML || ''),
        category,
        description: cleanHtml(document.querySelector('div.story__copy')?.innerHTML || ''),
        ticket_url: location.href,
        fetlife_handle: organizerLink?.textContent?.trim() || null,
        organizer_href: organizerLink?.href || null,
    };
}

async function scrapeAll(users) {
    const results = [];
    const errors = [];

    for (const u of users) {
        postStatus(`🔍 Fetching events for ${u}`);
        await getRandomDelay();

        const tab = await openTab(`https://fetlife.com/${u}`);
        await sleep(3000);

        const [{ result: links }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: async () => {
                async function retryUntilTruthy(fn, max = 10, delay = 500) {
                    for (let i = 0; i < max; i++) {
                        const val = fn();
                        if (val) return val;
                        await new Promise(res => setTimeout(res, delay));
                    }
                    return null;
                }

                const header = await retryUntilTruthy(() =>
                    Array.from(document.querySelectorAll('h6')).find(h => h.textContent.trim() === 'Events Organizing')
                );
                const container = header?.parentElement?.nextElementSibling;
                if (!container) return [];

                const viewAll = Array.from(container.querySelectorAll('a'))
                    .find(a => a.textContent.trim().toLowerCase().startsWith('view all'));
                if (viewAll) {
                    viewAll.click();
                    await new Promise(res => setTimeout(res, 1000));
                }

                return Array.from(container.querySelectorAll('a')).map(a => a.href);
            }
        });

        for (const url of links) {
            await throttleHourly();
            await getRandomDelay();

            postStatus(`    – Scraping ${url}`);
            const eventTab = await openTab(url);
            await sleep(3000);

            const [{ result }] = await chrome.scripting.executeScript({
                target: { tabId: eventTab.id },
                func: extractEventDetailFromPage,
            });

            result.fetlife_handle = u;
            const { start, end, error } = parseToISO(result.rawDatetime);
            result.start_date = start;
            result.end_date = end;

            if (error || !start || !end) {
                errors.push({ name: result.name, ticket_url: result.ticket_url, error });
            }

            results.push(result);
            eventsThisWindow++;
            postStatus(`       ✔️ Scraped "${result.name}"`);
        }
    }

    const json = JSON.stringify(results, null, 2);
    const blobUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
    chrome.downloads.download({ url: blobUrl, filename: 'fetlife-events.json' });
    postStatus(`✅ Done! Downloaded ${results.length} events.`);
}

async function scrapeAllNonPartyEvents() {
    const NEARBY_EVENTS_URL = 'https://fetlife.com/events/near';
    const results = [];

    postStatus(`📍 Opening ${NEARBY_EVENTS_URL}`);
    const tab = await openTab(NEARBY_EVENTS_URL);
    await sleep(4000);

    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async () => {
            function wait(ms) {
                return new Promise(res => setTimeout(res, ms));
            }

            function clickInputContainingText(text) {
                const el = Array.from(document.querySelectorAll('.bg-input'))
                    .find(e => e.textContent.includes(text));
                if (el) el.click();
            }

            function clickDropdownText(text) {
                const entries = Array.from(document.querySelectorAll('.dropdown-menu-entry'));
                const entry = entries.find(e => e.textContent.trim() === text);
                if (entry) entry.click();
            }

            function clickFilterButtons(texts) {
                const buttons = Array.from(document.querySelectorAll('button'));
                for (const label of texts) {
                    const btn = buttons.find(b => b.textContent.trim() === label);
                    if (btn) btn.click();
                }
            }

            clickInputContainingText("50m");
            await wait(300);
            clickDropdownText("5mi");
            await wait(300);
            clickFilterButtons(["Educational", "Social", "Conference / Festival"]);
        }
    });

    await sleep(5000);

    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async () => {
            for (let i = 0; i < 15; i++) {
                window.scrollTo(0, document.body.scrollHeight);
                await new Promise(res => setTimeout(res, 3000));
            }
        }
    });

    const [{ result: cards }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            function getText(el) {
                return el?.textContent?.trim() || '';
            }

            const cards = Array.from(document.querySelectorAll('.mt-2.cursor-pointer.rounded-sm.bg-gray-900'));
            return cards.map(card => {
                const titleEl = card.querySelector('a.link.text-red-500');
                const infoEls = card.querySelectorAll('.flex.items-start.py-1');
                return {
                    title: getText(titleEl),
                    url: titleEl?.href || '',
                    date: getText(infoEls[0]),
                    location: getText(infoEls[1]),
                    rsvps: getText(infoEls[2]),
                };
            });
        }
    });

    for (let i = 0; i < Math.min(cards.length, MAX_EVENTS); i++) {
        const card = cards[i];
        postStatus(`🔗 Visiting "${card.title}"…`);
        await sleep(getRandomDelay());

        const detailTab = await openTab(card.url);
        await sleep(3000);

        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: detailTab.id },
            func: extractEventDetailFromPage,
        });

        const { start, end, error } = parseToISO(result.rawDatetime);
        result.start_date = start;
        result.end_date = end;
        results.push(result);
    }

    const json = JSON.stringify(results, null, 2);
    const blobUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
    chrome.downloads.download({ url: blobUrl, filename: 'fetlife-events-nearby.json' });

    postStatus(`✅ Scraped ${results.length} events from Nearby page.`);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log('🔔 [SW] got message:', msg);

    if (msg.action === 'ping') {
        sendResponse({ pong: true });
    } else if (msg.action === 'startScrape') {
        sendResponse({ ok: true });
        scrapeAll(MUNCH_FETLIFE_HANDLES);
        return true;
    } else if (msg.action === 'scrapeNonPartyEvents') {
        sendResponse({ ok: true });
        scrapeAllNonPartyEvents();
        return true;
    }
});

console.log('🛠️ [SW] background.js loaded');
