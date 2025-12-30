import { isTestMode, MAX_EVENTS_KEY } from '../../config.js';
import { closeTab, getRandomDelay, openTab, postStatus } from '../../utils.js';
import { DEFAULT_NEARBY_CAP, LOG_SKIP_REASONS } from './constants.js';
import { getListRsvpThreshold, isBdsmparty, isTargetLocation, meetsBdsmpartyThreshold } from './parsers.js';
import { formatDate, updateTableProgress } from './table.js';
import type { EventResult } from '../../types.js';
import type { SkippedEntry, TableRow, TableRowStatus } from './types.js';

type FetlifeApiEntry = {
    id: number;
    name: string;
    description?: string;
    category?: string;
    friendly_category?: string;
    start_date_time?: string;
    end_date_time?: string;
    interested_count?: number | null;
    cover_image?: string | null;
    author?: { nickname?: string; profile_url?: string | null } | null;
    place?: { full_name?: string } | null;
};

const NYC_QUERY = {
    mapbox_location_id: 'place.233720044',
    long: '-74.005994',
    lat: '40.712749',
    range: '8047', // 5mi in meters (matches provided curl)
    place_name: 'New York City, New York, United States',
    bbox: '-74.259633,40.477399,-73.700292,40.917577',
};

export async function scrapeNearbyEventsApi(): Promise<EventResult[] & { skippedLog?: SkippedEntry[]; tableRows?: TableRow[] }> {
    const results: EventResult[] = [];
    const skippedLog: SkippedEntry[] = [];
    const testMode = await isTestMode();
    let MAX_NEARBY_EVENTS = DEFAULT_NEARBY_CAP;
    try {
        const res = await chrome.storage.local.get(MAX_EVENTS_KEY);
        const n = Number(res[MAX_EVENTS_KEY]);
        if (Number.isFinite(n) && n > 0) {
            MAX_NEARBY_EVENTS = n;
        }
    } catch { /* ignore */ }
    let tableRows: TableRow[] = [];

    const allEntries: FetlifeApiEntry[] = [];
    let tab: chrome.tabs.Tab | null = null;
    try {
        tab = await openTab('https://fetlife.com/events/near');
        try { await chrome.tabs.update(tab.id!, { active: true }); } catch { /* best effort */ }
        await getRandomDelay(400, 900);

        const [{ result }]: any = await chrome.scripting.executeScript({
            target: { tabId: tab.id! },
            args: [testMode, MAX_NEARBY_EVENTS, NYC_QUERY],
            func: async (testModeFlag: boolean, maxEvents: number, query: typeof NYC_QUERY) => {
                const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
                const sendLog = (msg: string) => {
                    try { chrome.runtime?.sendMessage?.({ action: 'log', text: msg }); } catch { /* ignore */ }
                };

                const buildNearbyUrl = (page: number) => {
                    const params = new URLSearchParams();
                    params.set('page', String(page));
                    params.set('field', 'range');
                    params.append('categories[]', 'bdsm_party');
                    params.append('categories[]', 'educational');
                    params.append('categories[]', 'social');
                    params.append('categories[]', 'conference_festival');
                    params.set('mapbox_location_id', query.mapbox_location_id);
                    params.set('search[long]', query.long);
                    params.set('search[lat]', query.lat);
                    params.set('search[range]', query.range);
                    params.set('search[place_name]', query.place_name);
                    params.set('search[bbox]', query.bbox);
                    const nowIso = new Date().toISOString();
                    params.set('from_date', nowIso);
                    params.set('from_time', nowIso);
                    return `https://fetlife.com/events/near?${params.toString()}`;
                };

                const getCsrfToken = () =>
                    (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content || '';

                const entries: FetlifeApiEntry[] = [];
                const logs: string[] = [];
                let page = 1;
                let totalPages = 1;
                do {
                    const url = buildNearbyUrl(page);
                    logs.push(`Nearby API: fetching page ${page}/${totalPages || '?'}`);
                    sendLog(`Nearby API: fetching page ${page}/${totalPages || '?'}`);
                    const token = getCsrfToken();
                    const res = await fetch(url, {
                        method: 'GET',
                        headers: {
                            accept: 'application/json',
                            'content-type': 'application/json',
                            ...(token ? { 'x-csrf-token': token } : {}),
                        },
                        credentials: 'same-origin',
                    });
                    if (!res.ok) throw new Error(`Failed nearby API page ${page}: ${res.status}`);
                    const json: any = await res.json();
                    entries.push(...(json?.entries || []));
                    totalPages = json?.paging?.total_pages || 1;
                    page += 1;
                    if (testModeFlag && page > 1) break;
                    if (entries.length >= maxEvents) break;
                    await sleep(testModeFlag ? 100 : 300);
                } while (page <= totalPages);

                return { entries, logs };
            },
        });
        const entries = Array.isArray(result?.entries) ? result.entries as FetlifeApiEntry[] : (Array.isArray(result) ? result as FetlifeApiEntry[] : []);
        const logs: string[] = Array.isArray(result?.logs) ? result.logs as string[] : [];
        logs.forEach(msg => postStatus(msg));
        allEntries.push(...entries);
    } catch (err: any) {
        postStatus(`❌ Nearby API error: ${err?.message || err}`);
    } finally {
        if (tab) await closeTab(tab);
    }

    postStatus(`🔍 Nearby API returned ${allEntries.length} entries (cap ${MAX_NEARBY_EVENTS})`);

    tableRows = allEntries.map((entry) => ({
        url: `https://fetlife.com/events/${entry.id}`,
        name: entry.name || `https://fetlife.com/events/${entry.id}`,
        organizer: entry.author?.nickname || '',
        status: 'pending' as TableRowStatus,
        reason: '',
        rsvps: typeof entry.interested_count === 'number' ? entry.interested_count : null,
        type: entry.friendly_category || entry.category || '',
        date: formatDate(entry.start_date_time, entry.start_date_time),
        location: entry.place?.full_name || '',
    }));

    const upsertTableRow = (url: string, updates: Partial<TableRow>) => {
        const idx = tableRows.findIndex(r => r.url === url);
        if (idx >= 0) {
            tableRows[idx] = { ...tableRows[idx], ...updates };
        } else {
            tableRows.push({ url, status: 'pending', ...updates });
        }
    };

    let skippedNJ = 0;
    let skippedBDSM = 0;
    let skippedLowRsvp = 0;
    let skippedLowRsvpNonBDSM = 0;
    let invalidDate = 0;
    let skippedCap = 0;
    let skippedSexParty = 0;

    const totalToProcess = Math.min(allEntries.length, MAX_NEARBY_EVENTS);

    for (let i = 0; i < totalToProcess; i++) {
        const entry = allEntries[i];
        const url = `https://fetlife.com/events/${entry.id}`;
        const listRsvps = typeof entry.interested_count === 'number' ? entry.interested_count : null;

        const result: EventResult = {
            name: entry.name || url,
            description: entry.description || '',
            category: entry.friendly_category || entry.category || '',
            start_date: entry.start_date_time || '',
            end_date: entry.end_date_time || '',
            rawDatetime: entry.start_date_time || '',
            ticket_url: url,
            fetlife_handle: entry.author?.nickname || '',
            organizer_href: entry.author?.profile_url ? `https://fetlife.com${entry.author.profile_url}` : undefined,
            location: entry.place?.full_name || undefined,
            rsvp_count: listRsvps,
            image_url: undefined,
        };

        const dateOnly = formatDate(result.start_date, result.start_date || '');
        upsertTableRow(url, {
            name: result.name || url,
            organizer: result.fetlife_handle || '',
            type: result.category || '',
            date: dateOnly,
            location: result.location || '',
        });

        const markSkipped = (reason: string) => {
            skippedLog.push({ reason, name: result.name || undefined, url, organizer: result.fetlife_handle || undefined });
            if (LOG_SKIP_REASONS) postStatus(`SKIP: ${reason} | ${result.name} | ${url}`);
            upsertTableRow(url, {
                status: 'skipped',
                reason,
                name: result.name || url,
                organizer: result.fetlife_handle || '',
                type: result.category || '',
                date: dateOnly,
            });
        };

        if (!result.start_date || !result.end_date) {
            invalidDate += 1;
            markSkipped('invalid datetime');
            continue;
        } else if ((result.category || '').toLowerCase().includes('sex')) {
            skippedSexParty += 1;
            markSkipped('category=sex_party');
            continue;
        } else if (!isTargetLocation(result.location)) {
            skippedNJ += 1;
            const reason = `non-NY${result.location ? ` (${result.location})` : ''}`;
            markSkipped(reason);
            continue;
        } else if (!meetsBdsmpartyThreshold(result)) {
            skippedBDSM += 1;
            markSkipped('BDSM<50');
            continue;
        } else if (listRsvps !== null) {
            const listRsvpThreshold = getListRsvpThreshold(result.category);
            if (listRsvps < listRsvpThreshold) {
                skippedLowRsvp += 1;
                if (!isBdsmparty(result.category)) skippedLowRsvpNonBDSM += 1;
                const reason = `listRSVP<${listRsvpThreshold}${listRsvps !== null ? ` (${listRsvps})` : ''}`;
                markSkipped(reason);
                continue;
            }
        }
        results.push(result);
        upsertTableRow(url, {
            status: 'scraped',
            reason: '',
            name: result.name || url,
            organizer: result.fetlife_handle || '',
            type: result.category || '',
            date: dateOnly,
        });
    }

    if (allEntries.length > totalToProcess) {
        const capReason = `not processed (cap ${MAX_NEARBY_EVENTS})`;
        const remaining = tableRows.filter(r => (r.status || 'pending') === 'pending');
        remaining.forEach(row => {
            row.status = 'skipped';
            row.reason = capReason;
            skippedLog.push({ reason: capReason, name: row.name || '', url: row.url || '', organizer: row.organizer || '' });
        });
        skippedCap = remaining.length;
    }

    await updateTableProgress(results, skippedLog, tableRows);

    postStatus(
        `📈 Nearby API summary: found ${allEntries.length}, scraped ${results.length} (cap ${MAX_NEARBY_EVENTS}), skipped sex-party ${skippedSexParty}, skipped non-NY ${skippedNJ}, skipped low-RSVP BDSM ${skippedBDSM}, skipped list RSVPs<50 (BDSM) ${skippedLowRsvp - skippedLowRsvpNonBDSM}, skipped list RSVPs<10 (other) ${skippedLowRsvpNonBDSM}, invalid datetime ${invalidDate}${skippedCap ? `, not processed (cap) ${skippedCap}` : ''}`
    );

    return Object.assign(results, { skippedLog, tableRows });
}
