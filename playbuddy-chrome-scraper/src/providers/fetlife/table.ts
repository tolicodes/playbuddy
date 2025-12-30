import type { EventResult } from '../../types.js';
import { TABLE_LOG_KEY } from './constants.js';
import type { SkippedEntry, TableRow, TableRowStatus } from './types.js';

const safe = (v: string | null | undefined) => (v || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const formatDate = (iso?: string | null, fallback?: string) => {
    if (!iso) return fallback || '';
    try {
        return new Date(iso).toISOString().slice(0, 10);
    } catch {
        return fallback || '';
    }
};

const statusLabel = (status?: TableRowStatus) => {
    if (status === 'pending') return 'Pending';
    if (status === 'skipped') return 'Skipped';
    return 'Scraped';
};

export const buildStatusTable = (events: EventResult[], skipped?: SkippedEntry[], tableRows?: TableRow[]) => {
    const rows: TableRow[] = (tableRows && tableRows.length)
        ? tableRows
        : [
            ...events.map(ev => ({
                organizer: ev.fetlife_handle || ev.instagram_handle || 'Unknown',
                name: ev.name || '(no title)',
                url: ev.ticket_url || (ev as any).event_url || '',
                type: ev.category || '',
                date: formatDate(ev.start_date),
                status: 'scraped' as TableRowStatus,
            })),
            ...(skipped || []).map(s => ({
                organizer: s.organizer || '',
                name: s.name || '',
                url: s.url || '',
                status: 'skipped' as TableRowStatus,
                reason: s.reason || '',
                type: '',
            })),
        ];

    const rowHtml = rows.map(row => {
        const organizer = safe(row.organizer || '');
        const title = safe(row.name || '(no title)');
        const reason = safe(row.reason || '');
        const type = safe(row.type || '');
        const date = safe(row.date || '');
        const url = row.url || '';
        const link = url ? `<a href="${url}" target="_blank" rel="noreferrer" style="color:#fff;">${title}</a>` : title;
        const location = safe((row as any).location || '');
        const uploadStatus = safe((row as any).uploadStatus || '');
        return `<tr><td>${date}</td><td>${organizer}</td><td>${link}</td><td>${type}</td><td>${location}</td><td>${uploadStatus}</td><td>${statusLabel(row.status)}</td><td>${reason}</td></tr>`;
    });
    const body = rowHtml.length ? rowHtml.join('') : '<tr><td colspan="8">No events yet</td></tr>';
    return `<table border="1" cellspacing="0" cellpadding="6" style="color:#fff;"><thead><tr><th>Date</th><th>Organizer</th><th>Event</th><th>Type</th><th>Location</th><th>Upload</th><th>Status</th><th>Reason</th></tr></thead><tbody>${body}</tbody></table>`;
};

export async function updateTableProgress(events: EventResult[], skipped?: SkippedEntry[], tableRows?: TableRow[]) {
    const html = buildStatusTable(events, skipped, tableRows);
    try {
        await chrome.storage.local.set({ [TABLE_LOG_KEY]: html });
        chrome.runtime.sendMessage({ action: 'table', html });
    } catch {
        // best effort
    }
}
