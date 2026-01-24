import { supabaseClient } from '../../connections/supabaseClient.js';
import type { ImportSource } from '../../commonTypes.js';
import { canonicalizeUrl } from '../ai/normalize.js';

export type TicketingSourceKind = 'eventbrite_organizer' | 'extra_url';

export type TicketingSource = {
    id: string;
    kind: TicketingSourceKind;
    url: string;
    multipleEvents?: boolean;
    extractFromListPage?: boolean;
    metadata?: Record<string, any>;
};

const asRecord = (value: unknown): Record<string, any> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as Record<string, any>;
};

const parseOptionalBoolean = (value: unknown): boolean | undefined => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (!normalized) return undefined;
        if (['1', 'true', 'yes', 'y'].includes(normalized)) return true;
        if (['0', 'false', 'no', 'n'].includes(normalized)) return false;
    }
    return undefined;
};

const mergeEventDefaults = (eventDefaults?: Record<string, any> | null, metadata?: Record<string, any> | null): Record<string, any> => {
    const defaults = asRecord(eventDefaults);
    const meta = asRecord(metadata);
    const organizerDefaults = asRecord(defaults.organizer);
    const organizerMeta = asRecord(meta.organizer);
    return {
        ...defaults,
        ...meta,
        organizer: {
            ...organizerDefaults,
            ...organizerMeta,
        },
    };
};

const normalizeImportSourceUrl = (raw?: string | null): string | null => {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
        const canonical = canonicalizeUrl(withScheme) ?? withScheme;
        const url = new URL(canonical);
        if (!url.hostname || (!url.hostname.includes('.') && url.hostname !== 'localhost')) {
            return null;
        }
        return canonical;
    } catch {
        return null;
    }
};

const normalizeEventbriteOrganizerUrl = (raw?: string | null): string | null => {
    const url = normalizeImportSourceUrl(raw);
    if (!url) return null;
    if (!/eventbrite\.com\/o\//i.test(url)) return null;
    return url;
};

const buildImportSourceDefaults = (source: ImportSource, sourceUrl: string): Record<string, any> => {
    const metadata = asRecord(source?.metadata);
    const defaults = asRecord(source?.event_defaults);
    const eventDefaults = mergeEventDefaults(defaults, metadata);
    const eventDefaultsMetadata = asRecord(eventDefaults.metadata);
    const sourceApproval = source?.approval_status ?? null;
    const eventDefaultsWithSource: Record<string, any> = {
        ...eventDefaults,
        metadata: {
            ...eventDefaultsMetadata,
            import_source_id: source.id,
            import_source_identifier: source.identifier,
            import_source_approval_status: sourceApproval,
            import_source_is_excluded: !!source?.is_excluded,
        },
        source_url: eventDefaults.source_url ?? sourceUrl,
    };
    if (eventDefaultsWithSource.approval_status === undefined || eventDefaultsWithSource.approval_status === null) {
        if (sourceApproval === 'pending') {
            eventDefaultsWithSource.approval_status = 'pending';
        } else if (sourceApproval === 'rejected') {
            eventDefaultsWithSource.approval_status = 'rejected';
        } else {
            eventDefaultsWithSource.approval_status = 'approved';
        }
    }
    return eventDefaultsWithSource;
};

const isHandleImportSource = (source: ImportSource) => {
    const identifierType = (source.identifier_type || '').toLowerCase();
    const sourceType = (source.source || '').toLowerCase();
    return identifierType === 'handle' || sourceType === 'fetlife_handle';
};

const isGmailImportSource = (source: ImportSource) => {
    const sourceType = (source.source || '').toLowerCase();
    const methodType = (source.method || '').toLowerCase();
    return sourceType === 'gmail' || methodType === 'gmail';
};

const getListFlags = (source: ImportSource) => {
    const metadata = asRecord(source?.metadata);
    const defaults = asRecord(source?.event_defaults);
    const multipleEvents = parseOptionalBoolean(
        metadata.multipleEvents ?? metadata.multiple_events ?? defaults.multipleEvents ?? defaults.multiple_events
    );
    const extractFromListPage = parseOptionalBoolean(
        metadata.extractFromListPage ?? metadata.extract_from_list_page ?? defaults.extractFromListPage ?? defaults.extract_from_list_page
    );
    return { multipleEvents, extractFromListPage };
};

export const fetchTicketingSources = async (): Promise<TicketingSource[]> => {
    try {
        const { data, error } = await supabaseClient
            .from('import_sources')
            .select('*');
        if (error) {
            console.error('[ticketingSources] Failed to fetch import_sources', error);
            return [];
        }
        const sources = (data || []) as ImportSource[];
        const seenEventbrite = new Set<string>();
        const seenAiUrls = new Set<string>();
        const eventbriteSources: TicketingSource[] = [];
        const extraSources: TicketingSource[] = [];

        sources.forEach((source) => {
            if (!source || isHandleImportSource(source) || isGmailImportSource(source)) return;
            const url = normalizeImportSourceUrl(source.identifier);
            if (!url) return;

            const eventbriteUrl = normalizeEventbriteOrganizerUrl(url);
            if (eventbriteUrl) {
                const dedupeKey = eventbriteUrl.toLowerCase();
                if (seenEventbrite.has(dedupeKey)) return;
                seenEventbrite.add(dedupeKey);
                eventbriteSources.push({
                    id: String(source.id),
                    kind: 'eventbrite_organizer',
                    url: eventbriteUrl,
                });
                return;
            }

            const method = (source.method || '').toLowerCase();
            if (method === 'ai_scraper') {
                const dedupeKey = url.toLowerCase();
                if (seenAiUrls.has(dedupeKey)) return;
                seenAiUrls.add(dedupeKey);
            }

            const { multipleEvents, extractFromListPage } = getListFlags(source);
            const eventDefaults = buildImportSourceDefaults(source, url);
            extraSources.push({
                id: String(source.id),
                kind: 'extra_url',
                url,
                multipleEvents,
                extractFromListPage,
                metadata: eventDefaults,
            });
        });

        return [...eventbriteSources, ...extraSources];
    } catch (err) {
        console.error('[ticketingSources] Failed to fetch import_sources', err);
        return [];
    }
};
