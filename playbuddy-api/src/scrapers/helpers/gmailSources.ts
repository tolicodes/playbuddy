import fs from 'fs';
import path from 'path';
import { supabaseClient } from '../../connections/supabaseClient.js';
import type { GmailSourceConfig } from '../gmail.js';

const extractSourceEmail = (entry: any): string => {
    const raw = entry?.source_email
        || entry?.sourceEmail
        || entry?.identifier
        || entry?.email
        || entry?.metadata?.source_email
        || entry?.metadata?.sourceEmail;
    if (!raw) return '';
    return String(raw).trim().replace(/^mailto:/i, '');
};

const extractEventStatus = (entry: any): GmailSourceConfig['event_status'] => {
    const raw = entry?.event_status
        || entry?.eventStatus
        || entry?.event_defaults?.approval_status
        || entry?.approval_status;
    const normalized = String(raw || '').trim().toLowerCase();
    return normalized === 'approved' ? 'approved' : 'pending';
};

const extractSkipExisting = (entry: any): GmailSourceConfig['skip_existing'] => {
    const raw = entry?.skip_existing
        ?? entry?.skipExisting
        ?? entry?.metadata?.skip_existing
        ?? entry?.metadata?.skipExisting;
    if (raw === undefined || raw === null) return undefined;
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'number') return raw !== 0;
    if (typeof raw === 'string') {
        const normalized = raw.trim().toLowerCase();
        if (!normalized) return undefined;
        if (['1', 'true', 'yes', 'y'].includes(normalized)) return true;
        if (['0', 'false', 'no', 'n'].includes(normalized)) return false;
    }
    return undefined;
};

const normalizeGmailSources = (raw: any): GmailSourceConfig[] => {
    const seen = new Set<string>();
    return (Array.isArray(raw) ? raw : [raw])
        .map((entry: any) => {
            const source_email = extractSourceEmail(entry);
            if (!source_email) return null;
            const key = source_email.toLowerCase();
            if (seen.has(key)) return null;
            seen.add(key);
            return {
                source_email,
                event_status: extractEventStatus(entry),
                skip_existing: extractSkipExisting(entry),
            } as GmailSourceConfig;
        })
        .filter(Boolean) as GmailSourceConfig[];
};

const readGmailSourcesFromFile = (): GmailSourceConfig[] => {
    const listPathEnv = process.env.GMAIL_SOURCES_LIST;
    if (!listPathEnv) return [];
    const listPath = path.resolve(process.cwd(), listPathEnv);
    const raw = fs.existsSync(listPath) ? JSON.parse(fs.readFileSync(listPath, 'utf-8')) : [];
    return normalizeGmailSources(raw);
};

export const fetchGmailSources = async ({ fallbackToFile = true } = {}): Promise<GmailSourceConfig[]> => {
    try {
        const { data, error } = await supabaseClient
            .from('import_sources')
            .select('id, source, method, identifier, approval_status, event_defaults, metadata, skip_existing')
            .or('source.eq.gmail,method.eq.gmail');
        if (error) {
            console.error('[gmail] Failed to fetch import_sources for gmail', error);
        } else if (data && data.length) {
            return normalizeGmailSources(data);
        }
    } catch (err) {
        console.error('[gmail] Failed to fetch import_sources for gmail', err);
    }

    return fallbackToFile ? readGmailSourcesFromFile() : [];
};

export { normalizeGmailSources };
