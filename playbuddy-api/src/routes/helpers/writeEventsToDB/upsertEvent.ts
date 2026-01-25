import { CreateOrganizerInput, Media, NormalizedEventInput, Event, LocationArea } from "../../../common/types/commonTypes.js";
import { supabaseClient } from "../../../connections/supabaseClient.js";
import { upsertOrganizer } from "./upsertOrganizer.js";
import axios from "axios";
import crypto from "crypto";
import { EVENT_FIELDS } from "./eventFields.js";
import { syncEntityMedia } from "../syncMedia.js";
import { MODEL, openai } from "../../../scrapers/ai/config.js";
import { safeParseJsonObject } from "../../../scrapers/ai/html.js";

export const NYC_LOCATION_ID = "73352aef-334c-49a6-9256-0baf91d56b49";

export type UpsertEventResult = {
    result: 'inserted' | 'updated' | 'failed' | 'skipped';
    event: Event | null;
    skip?: {
        reason: string;
        detail?: string;
        code?: 'organizer_hidden' | 'event_frozen' | 'existing_event';
        eventId?: string;
    };
};

type ExistingEventMeta = {
    id: string;
    frozen?: boolean | null;
};

type ClassificationInput = {
    tags?: string[] | null;
    experience_level?: string | null;
    interactivity_level?: string | null;
    inclusivity?: string[] | null;
};

type ImportSourceStatus = 'approved' | 'pending' | 'rejected';

const normalizeHandle = (val?: string | null) => (val || '').replace(/^@/, '').trim().toLowerCase();
const getOrganizerFetlifeHandles = (organizer?: CreateOrganizerInput | null) => {
    if (!organizer) return [];
    const handles = [
        ...(organizer.fetlife_handles || []),
        organizer.fetlife_handle,
    ];
    const normalized = handles.map((handle) => normalizeHandle(handle)).filter(Boolean);
    return Array.from(new Set(normalized));
};
const normalizeImportSourceUrl = (val?: string | null) => {
    if (!val) return '';
    const raw = val.trim();
    if (!raw) return '';
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
        const url = new URL(withScheme);
        url.hash = '';
        url.search = '';
        const normalized = `${url.host}${url.pathname}`.replace(/\/$/, '');
        return normalized.toLowerCase();
    } catch {
        return raw.replace(/^https?:\/\//i, '').replace(/\/$/, '').toLowerCase();
    }
};

const buildUrlVariants = (raw?: string | null) => {
    if (!raw) return [];
    const trimmed = raw.trim();
    if (!trimmed) return [];
    const withoutHash = trimmed.split('#')[0];
    const withoutQuery = withoutHash.split('?')[0];
    const withScheme = /^https?:\/\//i.test(withoutQuery) ? withoutQuery : `https://${withoutQuery}`;
    const withoutScheme = withoutQuery.replace(/^https?:\/\//i, '');
    const stripSlash = (value: string) => value.replace(/\/$/, '');
    const out = new Set<string>();
    [trimmed, withoutHash, withoutQuery, withScheme, withoutScheme].forEach((value) => {
        if (!value) return;
        out.add(value);
        out.add(stripSlash(value));
    });
    return Array.from(out);
};

const getEventUrlCandidates = (event: NormalizedEventInput) => {
    const urls = [
        event?.source_url,
        event?.ticket_url,
        event?.event_url,
    ]
        .filter(Boolean)
        .map((val) => String(val).trim())
        .filter(Boolean);
    return Array.from(new Set(urls));
};

const getImportSourceApprovalSummary = async ({
    handles,
    urls,
    importSourceId,
}: {
    handles: string[];
    urls?: Array<string | null | undefined>;
    importSourceId?: string | number | null;
}): Promise<{
    hasApproved: boolean;
    hasRejected: boolean;
    hasExcluded: boolean;
    hasPending: boolean;
    resolvedStatus: ImportSourceStatus | null;
}> => {
    const normalizedHandles = Array.from(new Set(handles.map((handle) => normalizeHandle(handle)).filter(Boolean)));
    const urlCandidates = (urls || [])
        .filter(Boolean)
        .map((val) => String(val).trim())
        .filter(Boolean);
    const hasImportSourceId = importSourceId !== undefined && importSourceId !== null && String(importSourceId).trim() !== '';
    if (!normalizedHandles.length && !urlCandidates.length && !hasImportSourceId) {
        return { hasApproved: false, hasRejected: false, hasExcluded: false, hasPending: false, resolvedStatus: null as null };
    }

    const rows: any[] = [];
    if (hasImportSourceId) {
        const { data, error } = await supabaseClient
            .from('import_sources')
            .select('approval_status, is_excluded')
            .eq('id', importSourceId);

        if (error) {
            throw new Error(`IMPORT_SOURCE: Error fetching approval_status for source id ${importSourceId}: ${error?.message}`);
        }
        rows.push(...(data || []));
    }
    if (normalizedHandles.length) {
        const { data, error } = await supabaseClient
            .from('import_sources')
            .select('approval_status, is_excluded')
            .eq('source', 'fetlife_handle')
            .in('identifier', normalizedHandles);

        if (error) {
            throw new Error(`IMPORT_SOURCE: Error fetching approval_status for handles: ${error?.message}`);
        }
        rows.push(...(data || []));
    }

    if (urlCandidates.length) {
        const normalizedCandidates = new Set<string>();
        urlCandidates.forEach((url) => {
            const normalized = normalizeImportSourceUrl(url);
            if (normalized) normalizedCandidates.add(normalized);
        });

        const variants = new Set<string>();
        urlCandidates.forEach((url) => {
            buildUrlVariants(url).forEach((value) => variants.add(value));
        });
        normalizedCandidates.forEach((value) => variants.add(value));

        const orFilters = Array.from(variants)
            .map((value) => `identifier.ilike.${value}`)
            .join(',');
        if (orFilters) {
            const { data, error } = await supabaseClient
                .from('import_sources')
                .select('approval_status, is_excluded')
                .in('source', ['eb_url', 'url'])
                .or(orFilters);

            if (error) {
                throw new Error(`IMPORT_SOURCE: Error fetching approval_status for urls: ${error?.message}`);
            }
            rows.push(...(data || []));
        }
    }

    let hasApproved = false;
    let hasRejected = false;
    let hasExcluded = false;
    let hasPending = false;
    (rows || []).forEach((row: any) => {
        const status = row?.approval_status ?? null;
        if (status === 'rejected') {
            hasRejected = true;
        } else if (status === 'pending') {
            hasPending = true;
        } else if (status === 'approved' || status === null) {
            hasApproved = true;
        }
        if (row?.is_excluded && status !== 'approved' && status !== 'rejected') {
            hasExcluded = true;
        }
    });

    const resolvedStatus =
        hasRejected
            ? 'rejected'
            : (hasExcluded || hasPending)
                ? 'pending'
                : hasApproved
                    ? 'approved'
                    : null;

    return { hasApproved, hasRejected, hasExcluded, hasPending, resolvedStatus };
};

const isHandleImportSource = (source: any) => {
    const identifierType = (source?.identifier_type || '').toLowerCase();
    const sourceType = (source?.source || '').toLowerCase();
    return identifierType === 'handle' || sourceType === 'fetlife_handle';
};

const updateImportSourceOrganizer = async (source: any, organizer_id: number) => {
    if (!source?.id) return;
    const defaults = source?.event_defaults || {};
    const existingOrganizerId = defaults.organizer_id ?? defaults.organizerId;
    if (existingOrganizerId && String(existingOrganizerId) !== String(organizer_id)) {
        console.warn(`IMPORT_SOURCE: Organizer mismatch for ${source.identifier} (existing ${existingOrganizerId}, new ${organizer_id})`);
        return;
    }
    if (String(existingOrganizerId) === String(organizer_id)) return;

    const { error } = await supabaseClient
        .from('import_sources')
        .update({
            event_defaults: {
                ...(defaults || {}),
                organizer_id,
            },
        })
        .eq('id', source.id);
    if (error) {
        console.error(`IMPORT_SOURCE: Failed to update organizer for ${source.identifier}`, error);
    }
};

// stash originals before overriding
const originalLog = console.log;
const originalError = console.error;

const log = (message?: any, ...optionalParams: any[]) => {
    originalLog(message, ...optionalParams);
};

const logError = (message: string, error?: unknown) => {
    const err = error instanceof Error ? error : null;
    const errMessage = err?.message
        ?? (error && typeof error === 'object' && 'message' in error
            ? String((error as { message?: unknown }).message)
            : '');
    // print in red, then trace
    originalError(`\x1b[31mERROR: ${message} ${errMessage}\x1b[0m`.trim());
    if (err?.stack) {
        originalError(err.stack);
    }
};

const buildSkipResult = (skip: NonNullable<UpsertEventResult['skip']>): UpsertEventResult => {
    return { result: 'skipped', event: null, skip };
};

function prepareOrganizer(event: NormalizedEventInput) {
    const { organizer } = event;

    let organizerId: string | undefined;

    const fallbackFetlife = organizer?.fetlife_handle || organizer?.fetlife_handles?.[0];
    const logName = organizer?.name || organizerId || organizer?.instagram_handle || fallbackFetlife || 'Unknown';
    log(`ORGANIZER: ${logName}`);

    if (!organizer && !organizerId) {
        logError(`ORGANIZER: No organizer id or name found`);
        return null;
    }

    return { logName, organizerCreateInput: organizer, organizerId };
}


function logEventHeader(organizerName: string, event: NormalizedEventInput) {
    const separator = '-'.repeat(process.stdout.columns);
    log('\n' + separator);
    log(`UPSERT EVENT: [${organizerName}] ${event.name}`);
    log(`Ticket URL: ${event.ticket_url || 'N/A'}`);
    log(separator + '\n');
}

type LocationConfidence = 'high' | 'medium' | 'low';

type LocationInference = {
    city: string | null;
    region: string | null;
    region_code: string | null;
    country: string | null;
    country_code: string | null;
    confidence: LocationConfidence;
};

const LOCATION_AREAS_CACHE_TTL_MS = 5 * 60 * 1000;
let locationAreasCache: { data: LocationArea[]; fetchedAt: number } | null = null;
const LOCATION_INFERENCE_CACHE = new Map<string, LocationInference>();

const normalizeLocationValue = (value?: string | null) => {
    if (!value) return '';
    return value
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
};

const normalizeCode = (value?: string | null) => {
    if (!value) return null;
    const trimmed = value.toString().trim();
    return trimmed ? trimmed.toUpperCase() : null;
};

const normalizeConfidence = (value: unknown): LocationConfidence => {
    if (typeof value !== 'string') return 'low';
    const normalized = value.trim().toLowerCase();
    if (normalized === 'high' || normalized === 'medium' || normalized === 'low') {
        return normalized as LocationConfidence;
    }
    return 'low';
};

const normalizeLocationField = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
};

const buildLocationCacheKey = (event: NormalizedEventInput) => {
    const parts = [
        event.location,
        event.city,
        event.region,
        event.country,
        event.name,
        event.organizer?.name,
        event.event_url,
        event.ticket_url,
    ];
    const normalized = parts.map((value) => normalizeLocationValue(value)).filter(Boolean);
    return normalized.join('|');
};

const getLocationAreas = async (): Promise<LocationArea[]> => {
    if (locationAreasCache && Date.now() - locationAreasCache.fetchedAt < LOCATION_AREAS_CACHE_TTL_MS) {
        return locationAreasCache.data;
    }

    const { data, error } = await supabaseClient
        .from('location_areas')
        .select('id, name, code, city, region, country, entity_type, aliases, timezone, shown');

    if (error) {
        throw new Error(`LOCATION: Failed to fetch location areas: ${error.message}`);
    }

    const rows = data ?? [];
    locationAreasCache = { data: rows, fetchedAt: Date.now() };
    return rows;
};

const appendLocationAreaCache = (area: LocationArea) => {
    if (!locationAreasCache) {
        locationAreasCache = { data: [area], fetchedAt: Date.now() };
        return;
    }
    locationAreasCache.data = [...locationAreasCache.data, area];
    locationAreasCache.fetchedAt = Date.now();
};

const findLocationAreaByCity = (areas: LocationArea[], city: string) => {
    const target = normalizeLocationValue(city);
    if (!target) return null;
    return (
        areas.find((area) => {
            const candidates = [
                area.city,
                area.name,
                area.code,
                ...(area.aliases || []),
            ];
            return candidates.some((candidate) => normalizeLocationValue(candidate) === target);
        }) || null
    );
};

const findLocationAreaByRegion = (areas: LocationArea[], region?: string | null, regionCode?: string | null) => {
    const targets = [region, regionCode].map((value) => normalizeLocationValue(value)).filter(Boolean);
    if (!targets.length) return null;
    return (
        areas.find((area) => {
            const candidates = [
                area.region,
                area.name,
                area.code,
                ...(area.aliases || []),
            ];
            const normalizedCandidates = candidates.map((candidate) => normalizeLocationValue(candidate));
            return targets.some((target) => normalizedCandidates.includes(target));
        }) || null
    );
};

const findLocationAreaByCountry = (areas: LocationArea[], country?: string | null, countryCode?: string | null) => {
    const targets = [country, countryCode].map((value) => normalizeLocationValue(value)).filter(Boolean);
    if (!targets.length) return null;
    return (
        areas.find((area) => {
            const candidates = [
                area.country,
                area.name,
                area.code,
                ...(area.aliases || []),
            ];
            const normalizedCandidates = candidates.map((candidate) => normalizeLocationValue(candidate));
            return targets.some((target) => normalizedCandidates.includes(target));
        }) || null
    );
};

const isUnitedStates = (country?: string | null, countryCode?: string | null) => {
    const code = normalizeCode(countryCode);
    if (code === 'US' || code === 'USA') return true;
    const normalized = normalizeLocationValue(country);
    return normalized === 'united states' || normalized === 'united states of america' || normalized === 'usa';
};

const buildAliases = (...values: Array<string | null | undefined>) => {
    const set = new Set<string>();
    values.forEach((value) => {
        if (!value) return;
        const trimmed = value.toString().trim();
        if (trimmed) set.add(trimmed);
    });
    return Array.from(set);
};

const formatKnownLocationsForPrompt = (areas: LocationArea[]) => {
    if (!areas.length) return [];
    return areas.map((area) => ({
        id: area.id,
        name: area.name,
        city: area.city,
        region: area.region,
        country: area.country,
        code: area.code,
        aliases: area.aliases,
        timezone: area.timezone,
        entity_type: area.entity_type,
    }));
};

const inferLocationFromAI = async (
    event: NormalizedEventInput,
    knownLocations: LocationArea[],
): Promise<LocationInference | null> => {
    const cacheKey = buildLocationCacheKey(event);
    if (cacheKey && LOCATION_INFERENCE_CACHE.has(cacheKey)) {
        return LOCATION_INFERENCE_CACHE.get(cacheKey)!;
    }

    const description = typeof event.description === 'string'
        ? event.description.slice(0, 1200)
        : '';

    const payload = {
        name: event.name,
        location: event.location,
        neighborhood: event.neighborhood,
        city: event.city,
        region: event.region,
        country: event.country,
        organizer: event.organizer?.name,
        event_url: event.event_url,
        ticket_url: event.ticket_url,
        description,
    };

    const knownLocationsPayload = formatKnownLocationsForPrompt(knownLocations);

    const prompt = [
        'You are a location extraction assistant for events.',
        'Use the known locations list to match events to existing locations whenever possible.',
        'If an event matches a known location, set city to that location\'s city or name.',
        'Do not invent locations that are not in the event details.',
        'Return ONLY strict JSON with keys:',
        'city, region, region_code, country, country_code, confidence.',
        'Rules:',
        '- Be conservative. If you cannot confidently identify the city, set city to null and confidence to "low".',
        '- Only use information present in the event details. Do not guess.',
        '- For US events, region is the state name (e.g. "New York") and region_code is the two-letter state code (e.g. "NY").',
        '- country is the full English name (e.g. "United States") and country_code is ISO-3166-1 alpha-2 (e.g. "US").',
        '- Use null for unknown fields.',
        `KNOWN_LOCATIONS:\n${JSON.stringify(knownLocationsPayload, null, 2)}`,
        `EVENT:\n${JSON.stringify(payload, null, 2)}`,
    ].join('\n');

    const resp = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
    });

    const raw = resp.choices[0]?.message?.content ?? '';
    const parsed = safeParseJsonObject(raw);
    if (!parsed) {
        log(`LOCATION: AI parse failed for ${event.name}`);
        return null;
    }

    const result: LocationInference = {
        city: normalizeLocationField(parsed.city),
        region: normalizeLocationField(parsed.region),
        region_code: normalizeCode(parsed.region_code),
        country: normalizeLocationField(parsed.country),
        country_code: normalizeCode(parsed.country_code),
        confidence: normalizeConfidence(parsed.confidence),
    };

    if (cacheKey) {
        LOCATION_INFERENCE_CACHE.set(cacheKey, result);
    }

    log('LOCATION: AI inference', result);
    return result;
};

const createLocationArea = async (payload: Partial<LocationArea>) => {
    const { data, error } = await supabaseClient
        .from('location_areas')
        .insert(payload)
        .select('id, name, code, city, region, country, entity_type, aliases, timezone, shown')
        .single();

    if (error) {
        logError(`LOCATION: Failed to create location area ${payload.name}`, error);
        return null;
    }

    if (data) {
        appendLocationAreaCache(data);
    }

    return data;
};

const resolveLocationAreaId = async (event: NormalizedEventInput) => {
    const explicitLocationId = event.location_area && 'id' in event.location_area
        ? event.location_area.id
        : null;
    if (explicitLocationId) return explicitLocationId;

    if (event.source_origination_platform === 'admin') {
        return NYC_LOCATION_ID;
    }

    const locationAreas = await getLocationAreas();

    let inference: LocationInference | null = null;
    try {
        inference = await inferLocationFromAI(event, locationAreas);
    } catch (error) {
        logError('LOCATION: AI inference failed', error as Error);
        return NYC_LOCATION_ID;
    }

    if (!inference?.city || inference.confidence !== 'high') {
        log('LOCATION: Defaulting to NYC (low confidence city)');
        return NYC_LOCATION_ID;
    }

    if (!event.city && inference.city) event.city = inference.city;
    if (!event.region && inference.region) event.region = inference.region;
    if (!event.country && inference.country) event.country = inference.country;

    const cityMatch = findLocationAreaByCity(locationAreas, inference.city);
    if (cityMatch) return cityMatch.id;

    const inUsa = isUnitedStates(inference.country, inference.country_code);
    if (inUsa) {
        const regionName = inference.region || null;
        const regionCode = inference.region_code || null;
        if (!regionName && !regionCode) {
            log('LOCATION: Missing region for US event, defaulting to NYC');
            return NYC_LOCATION_ID;
        }

        const regionMatch = findLocationAreaByRegion(locationAreas, regionName, regionCode);
        if (regionMatch) return regionMatch.id;

        const aliases = buildAliases(regionCode, regionName);
        const created = await createLocationArea({
            name: regionName || (regionCode ?? 'Unknown State'),
            code: regionCode ?? null,
            region: regionName || regionCode,
            country: inference.country || 'United States',
            entity_type: 'state',
            aliases: aliases.length ? aliases : null,
        });
        return created?.id ?? NYC_LOCATION_ID;
    }

    if (!inference.country && !inference.country_code) {
        log('LOCATION: Missing country for non-US event, defaulting to NYC');
        return NYC_LOCATION_ID;
    }

    const countryMatch = findLocationAreaByCountry(locationAreas, inference.country, inference.country_code);
    if (countryMatch) return countryMatch.id;

    const countryName = inference.country || inference.country_code || 'Unknown Country';
    const countryAliases = buildAliases(inference.country_code, inference.country);
    const created = await createLocationArea({
        name: countryName,
        code: inference.country_code ?? null,
        country: inference.country ?? countryName,
        entity_type: 'country',
        aliases: countryAliases.length ? countryAliases : null,
    });
    return created?.id ?? NYC_LOCATION_ID;
};

async function tryUpsertOrganizer(organizer: CreateOrganizerInput) {
    log(`ORGANIZER: Upserting organizer`);

    const result = await upsertOrganizer(organizer);

    if (!result.organizerId || !result.communityId) {
        logError(`ORGANIZER: Failed to upsert organizer`);
        return null;
    }

    return {
        organizerId: result.organizerId,
        organizerCommunityId: result.communityId,
        organizerHidden: result.hidden ?? null,
    };
}

async function fetchExistingEventMetaById(eventId: string): Promise<ExistingEventMeta | null> {
    const { data, error } = await supabaseClient
        .from("events")
        .select("id,frozen")
        .eq("id", eventId)
        .limit(1);

    if (error) {
        throw new Error(`FETCH EVENT: Error fetching event ${eventId}: ${error?.message}`);
    }

    if (!data || data.length === 0) {
        return null;
    }

    const id = data[0].id;
    if (id === undefined || id === null) {
        return null;
    }

    return { id: String(id), frozen: (data[0] as any).frozen ?? null };
}

async function resolveExistingEvent(event: NormalizedEventInput, organizerId: string): Promise<ExistingEventMeta | null> {
    if (event.id) {
        const existing = await fetchExistingEventMetaById(event.id.toString());
        if (existing) return existing;
    }

    return await checkExistingEvent(event, organizerId);
}

const ensureImportSourcesForHandles = async (
    handles: string[],
    organizerId?: string | number | null,
    isApproved?: boolean
) => {
    for (const handle of handles) {
        await ensureImportSourceForHandle(handle, organizerId, isApproved);
    }
};

const ensureImportSourcesForUrls = async (
    event: NormalizedEventInput,
    organizerId?: string | number | null
) => {
    const organizer_id = organizerId ? Number(organizerId) : null;
    if (!organizer_id || Number.isNaN(organizer_id)) return;

    const metadata = (event?.metadata || {}) as Record<string, any>;
    const importSourceId = metadata.import_source_id ?? metadata.importSourceId;

    let sources: any[] = [];
    if (importSourceId) {
        const { data, error } = await supabaseClient
            .from('import_sources')
            .select('id, source, identifier_type, identifier, event_defaults')
            .eq('id', importSourceId)
            .limit(1);
        if (error) {
            console.error(`IMPORT_SOURCE: Failed to fetch source ${importSourceId}`, error);
            return;
        }
        sources = data || [];
    } else {
        const candidates = getEventUrlCandidates(event);
        if (!candidates.length) return;

        const normalizedCandidates = new Set<string>();
        candidates.forEach((url) => {
            const normalized = normalizeImportSourceUrl(url);
            if (normalized) normalizedCandidates.add(normalized);
        });

        const variants = new Set<string>();
        candidates.forEach((url) => {
            buildUrlVariants(url).forEach((value) => variants.add(value));
        });
        normalizedCandidates.forEach((value) => variants.add(value));

        const orFilters = Array.from(variants)
            .map((value) => `identifier.ilike.${value}`)
            .join(',');
        if (!orFilters) return;

        const { data, error } = await supabaseClient
            .from('import_sources')
            .select('id, source, identifier_type, identifier, event_defaults')
            .or(orFilters);
        if (error) {
            console.error('IMPORT_SOURCE: Failed to lookup URL sources', error);
            return;
        }
        sources = data || [];
    }

    for (const source of sources) {
        if (isHandleImportSource(source)) continue;
        await updateImportSourceOrganizer(source, organizer_id);
    }
};

async function attachCommunities(eventId: string, communities: any[], organizerCommunityId?: string) {
    for (const community of communities) {
        if (!('id' in community)) {
            logError(`ATTACH COMMUNITY: Inserting via community name not supported ${community.name}`);
            return false;
        }

        await attachCommunity(eventId, community.id);
    }

    if (organizerCommunityId) {
        await attachCommunity(eventId, organizerCommunityId);
    }

    return true;
}


export async function upsertEvent(
    event: NormalizedEventInput,
    authUserId?: string,
    opts: { skipExisting?: boolean; approveExisting?: boolean; ignoreFrozen?: boolean; skipExistingNoApproval?: boolean } = {}
): Promise<UpsertEventResult> {
    const normalizedEvent: NormalizedEventInput = { ...event };
    if (!normalizedEvent.end_date && normalizedEvent.start_date) {
        const start = new Date(normalizedEvent.start_date);
        if (!Number.isNaN(start.getTime())) {
            normalizedEvent.end_date = new Date(start.getTime() + 4 * 60 * 60 * 1000).toISOString();
        }
    }

    const organizerInfo = prepareOrganizer(normalizedEvent);
    if (!organizerInfo) return { result: 'failed', event: null };

    const organizerFetlifeHandles = getOrganizerFetlifeHandles(normalizedEvent.organizer);
    const importSourceMetadata = (normalizedEvent.metadata || {}) as Record<string, any>;
    const importSourceId = importSourceMetadata.import_source_id ?? importSourceMetadata.importSourceId ?? null;
    const importSourceIdentifier = importSourceMetadata.import_source_identifier ?? importSourceMetadata.importSourceIdentifier ?? null;
    const rawImportSourceApproval =
        importSourceMetadata.import_source_approval_status ??
        importSourceMetadata.importSourceApprovalStatus ??
        null;
    const importSourceExcluded =
        !!(importSourceMetadata.import_source_is_excluded ?? importSourceMetadata.importSourceIsExcluded);
    const normalizeApproval = (value: unknown): ImportSourceStatus | null => {
        if (value === 'approved' || value === 'pending' || value === 'rejected') return value;
        return null;
    };
    const normalizedImportSourceApproval = normalizeApproval(rawImportSourceApproval);
    const hasImportSourceId =
        importSourceId !== undefined &&
        importSourceId !== null &&
        String(importSourceId).trim() !== '';
    const derivedImportSourceApproval: ImportSourceStatus | null = hasImportSourceId
        ? (normalizedImportSourceApproval ?? (importSourceExcluded ? 'pending' : 'approved'))
        : null;
    const eventUrlCandidates = [
        normalizedEvent.source_url,
        normalizedEvent.ticket_url,
        normalizedEvent.event_url,
        importSourceIdentifier,
    ];
    const forcePendingApproval = normalizedEvent.source_origination_platform === 'gmail';

    logEventHeader(organizerInfo.logName, normalizedEvent);

    try {
        if (!forcePendingApproval && derivedImportSourceApproval) {
            normalizedEvent.approval_status = derivedImportSourceApproval;
            log(`APPROVAL: import_source_id=${importSourceId ?? 'unknown'} status=${derivedImportSourceApproval} raw=${rawImportSourceApproval ?? 'null'} excluded=${importSourceExcluded}`);
        } else if (!forcePendingApproval && (organizerFetlifeHandles.length || eventUrlCandidates.some(Boolean))) {
            try {
                const summary = await getImportSourceApprovalSummary({
                    handles: organizerFetlifeHandles,
                    urls: eventUrlCandidates,
                    importSourceId,
                });
                if (summary.resolvedStatus) {
                    normalizedEvent.approval_status = summary.resolvedStatus;
                    log(`APPROVAL: resolved via sources status=${summary.resolvedStatus} handles=${organizerFetlifeHandles.length} urls=${eventUrlCandidates.filter(Boolean).length} import_source_id=${importSourceId ?? 'none'}`);
                }
            } catch (error) {
                logError('IMPORT_SOURCE: Failed to check approval status for sources', error as Error);
            }
        }

        if (forcePendingApproval) {
            normalizedEvent.approval_status = 'pending';
        }

        if (normalizedEvent.approval_status === undefined || normalizedEvent.approval_status === null) {
            normalizedEvent.approval_status = 'approved';
        }
        if (normalizedEvent.approval_status !== 'approved') {
            log(`APPROVAL: final status=${normalizedEvent.approval_status} event=${normalizedEvent.name || 'unknown'} source_url=${normalizedEvent.source_url || normalizedEvent.ticket_url || normalizedEvent.event_url || 'none'}`);
        }

        const upsertedOrganizer = await tryUpsertOrganizer(normalizedEvent.organizer!);
        if (!upsertedOrganizer) return { result: 'failed', event: null };

        const { organizerId, organizerCommunityId, organizerHidden } = upsertedOrganizer;
        const isApprovedEvent = normalizedEvent.approval_status === 'approved';
        const syncImportSources = async () => {
            await ensureImportSourcesForHandles(organizerFetlifeHandles, organizerId, isApprovedEvent);
            await ensureImportSourcesForUrls(normalizedEvent, organizerId);
        };

        if (organizerHidden) {
            log(`EVENT: Skipping hidden organizer ${organizerInfo.logName}`);
            await syncImportSources();
            return buildSkipResult({
                reason: 'Organizer is hidden',
                detail: organizerInfo.logName ? `organizer=${organizerInfo.logName}` : undefined,
                code: 'organizer_hidden',
            });
        }

        const existingEvent = await resolveExistingEvent(normalizedEvent, organizerId);

        if (existingEvent?.frozen && !opts.ignoreFrozen) {
            log(`EVENT: Skipping frozen event ${existingEvent.id}`);
            await syncImportSources();
            return buildSkipResult({
                reason: 'Event is frozen',
                detail: `eventId=${existingEvent.id}`,
                code: 'event_frozen',
                eventId: existingEvent.id,
            });
        }

        if (existingEvent?.id && opts.skipExisting) {
            const shouldApproveExisting = opts.approveExisting || (!opts.skipExistingNoApproval && normalizedEvent.approval_status === 'approved');
            if (shouldApproveExisting) {
                const approvedEvent = await setApprovalStatus(existingEvent.id, normalizedEvent.approval_status!);
                log(`EVENT: Updated approval_status for existing event ${existingEvent.id} -> ${normalizedEvent.approval_status}`);
                await syncImportSources();
                return { result: 'updated', event: approvedEvent };
            }
            log(`EVENT: Skipping existing event ${existingEvent.id} (skipExisting=true)`);
            await syncImportSources();
            return buildSkipResult({
                reason: 'Existing event skipped',
                detail: `eventId=${existingEvent.id}`,
                code: 'existing_event',
                eventId: existingEvent.id,
            });
        }

        if (existingEvent?.id && normalizedEvent.visibility === 'public') {
            await setVisibility(existingEvent.id, 'public');
            log(`VISIBILITY: Changed to public`);
        }

        const locationAreaId = await resolveLocationAreaId(normalizedEvent);
        const upsertedEvent = await upsertEventInDB(normalizedEvent, organizerId, locationAreaId, existingEvent?.id ?? null);

        if (!upsertedEvent) {
            logError(`EVENT: Failed to upsert event`);
            return { result: 'failed', event: null };
        }

        const communities = normalizedEvent.communities || [];
        const attached = await attachCommunities(upsertedEvent.id, communities, organizerCommunityId);
        if (!attached) return { result: 'failed', event: null };

        await upsertEventClassification(upsertedEvent.id, normalizedEvent.classification as ClassificationInput | null | undefined);

        if (normalizedEvent.media && normalizedEvent.media.length > 0) {
            await syncEntityMedia({
                entityId: upsertedEvent.id,
                entityKey: 'event_id',
                joinTable: 'event_media',
                media: normalizedEvent.media?.map((med: Media) => {
                    return {
                        id: med.id,
                        storage_path: med.storage_path,
                        title: med.title!,
                        description: med.description!,
                        is_explicit: med.is_explicit,
                        is_public: med.is_public,
                        authUserId: authUserId!,
                    };
                }),
                authUserId: authUserId!,
            });

            log(`EVENT MEDIA: Synced ${normalizedEvent.media?.length} media`);
        }

        log(`EVENT: ${existingEvent?.id ? 'Updated' : 'Inserted'}`);

        await syncImportSources();

        return {
            result: existingEvent?.id ? 'updated' : 'inserted',
            event: upsertedEvent,
        }

    } catch (error) {
        logError(`EVENT: Failed to upsert event`, error as Error);
        return { result: 'failed', event: null };
    }
}


const setVisibility = async (eventId: string, visibility: 'public' | 'private') => {
    const { error: visibilityError } = await supabaseClient
        .from("events")
        .update({ visibility })
        .eq("id", eventId);

    if (visibilityError) {
        throw new Error(`SET VISIBILITY: Error setting visibility for event ${eventId}: ${visibilityError?.message}`);
    }
}

const setApprovalStatus = async (eventId: string, approval_status: 'approved' | 'pending' | 'rejected') => {
    const { data, error } = await supabaseClient
        .from("events")
        .update({ approval_status })
        .eq("id", eventId)
        .select()
        .single();

    if (error) {
        throw new Error(`SET APPROVAL: Error setting approval_status for event ${eventId}: ${error?.message}`);
    }

    return data;
}

const upsertEventClassification = async (eventId: string | number, classification?: ClassificationInput | null) => {
    if (!classification) return;
    const eventIdNum = Number(eventId);
    if (!Number.isFinite(eventIdNum)) {
        throw new Error(`CLASSIFICATION: Invalid event id ${eventId}`);
    }

    const payload: Record<string, any> = { event_id: eventIdNum };
    if (classification.tags !== undefined) payload.tags = classification.tags;
    if (classification.experience_level !== undefined) payload.experience_level = classification.experience_level;
    if (classification.interactivity_level !== undefined) payload.interactivity_level = classification.interactivity_level;
    if (classification.inclusivity !== undefined) payload.inclusivity = classification.inclusivity;

    if (Object.keys(payload).length === 1) return;

    const { error } = await supabaseClient
        .from('classifications')
        .upsert([payload], { onConflict: 'event_id' });

    if (error) {
        throw new Error(`CLASSIFICATION: Error upserting classification for event ${eventId}: ${error?.message}`);
    }
};

const ensureImportSourceForHandle = async (fetlife_handle?: string | null, organizerId?: string | number | null, isApproved?: boolean) => {
    const handle = normalizeHandle(fetlife_handle);
    if (!handle) return;

    const organizer_id = organizerId ? Number(organizerId) : null;

    try {
        const { data: existing, error: fetchError } = await supabaseClient
            .from('import_sources')
            .select('id, approval_status, event_defaults, is_excluded')
            .eq('source', 'fetlife_handle')
            .eq('identifier', handle)
            .limit(1);
        if (fetchError) {
            console.error(`IMPORT_SOURCE: Failed to fetch existing for ${handle}`, fetchError);
            return;
        }

        if (existing && existing.length) {
            const row = existing[0] as any;
            const updates: any = {};
            const approvalStatus = row.approval_status;
            const skipApprovalUpdate = approvalStatus === 'rejected' || row.is_excluded;
            if (!skipApprovalUpdate) {
                if (isApproved && approvalStatus !== 'approved') {
                    updates.approval_status = 'approved';
                } else if (!isApproved && (!approvalStatus || approvalStatus === 'pending')) {
                    updates.approval_status = 'pending';
                }
            }
            if (organizer_id) {
                updates.event_defaults = { ...(row.event_defaults || {}), organizer_id };
            }
            if (Object.keys(updates).length) {
                const { error: updateError } = await supabaseClient
                    .from('import_sources')
                    .update(updates)
                    .eq('id', row.id);
                if (updateError) {
                    console.error(`IMPORT_SOURCE: Failed to update ${handle}`, updateError);
                }
            }
            return;
        }

        const { error: insertError } = await supabaseClient
            .from('import_sources')
            .insert({
                source: 'fetlife_handle',
                method: 'chrome_scraper',
                identifier: handle,
                identifier_type: 'handle',
                approval_status: isApproved ? 'approved' : 'pending',
                metadata: {},
                event_defaults: organizer_id ? { organizer_id } : {},
            });
        if (insertError) {
            console.error(`IMPORT_SOURCE: Failed to insert source ${handle}`, insertError);
        }
    } catch (err) {
        console.error(`IMPORT_SOURCE: Unexpected error for ${fetlife_handle}`, err);
    }
};

const attachCommunity = async (eventId: string, communityId: string) => {
    // lookup if community event relationship already exists
    const { data: existingCommunityEvent, error: existingCommunityEventError } = await supabaseClient
        .from("event_communities")
        .select("*")
        .eq("event_id", eventId)
        .eq("community_id", communityId);

    if (existingCommunityEventError) {
        throw new Error(`COMMUNITY: Error fetching existing community event ${eventId} ${communityId}: ${existingCommunityEventError?.message}`);
    }

    // if we already have a relationship, don't create a new one
    if (existingCommunityEvent?.length > 0) {
        return;
    }

    const { error: communityError } = await supabaseClient
        .from("event_communities")
        .insert({
            event_id: eventId,
            community_id: communityId
        });

    if (communityError) {
        throw new Error(`COMMUNITY: Error inserting event community ${eventId} ${communityId}: ${communityError?.message}`);
    }
}

const checkExistingEvent = async (event: NormalizedEventInput, organizerId: string): Promise<ExistingEventMeta | null> => {
    const filters: string[] = [];

    if (event.original_id) {
        console.log(`CHECK EXISTING EVENT: Checking by original_id ${event.original_id}`)
        filters.push(`original_id.eq."${event.original_id}"`);
    }

    filters.push(
        `and(start_date.eq."${event.start_date}",organizer_id.eq."${organizerId}")`
    );

    filters.push(
        `and(start_date.eq."${event.start_date}",name.eq."${event.name}")`
    );


    // Check for existing event by original_id or by start_date and organizer_id
    const { data: existingEvents, error: fetchError } = await supabaseClient
        .from("events")
        .select("id,frozen")
        .or(filters.join(','));


    // error is not null if it doesn't exist
    if (fetchError && fetchError.code !== "PGRST116") {
        throw new Error(`CHECK EXISTING EVENT: Error fetching existing event ${fetchError?.message}`);
    }

    if (existingEvents && existingEvents.length > 0) {
        console.log(`CHECK EXISTING EVENT: Found existing event ${existingEvents[0].id}`);
        const id = existingEvents[0].id;
        if (id === undefined || id === null) {
            return null;
        }

        return {
            id: String(id),
            frozen: (existingEvents[0] as any).frozen ?? null,
        };
    }

    console.log(`CHECK EXISTING EVENT: No existing event found`);
    return null;
}

const IMAGE_BUCKET_NAME = "event-images";

const downloadImage = async (url: string) => {
    try {
        let response;
        // Download the image
        try {
            response = await axios({
                url,
                method: 'GET',
                responseType: 'arraybuffer', // Download image as binary data
            });
        } catch (error) {
            console.error(`IMAGE: Error downloading image: ${error}`);
            return url;
        }


        const imageBuffer = Buffer.from(response.data, 'binary');

        const extension = response.headers['content-type'] ?
            response.headers['content-type'].split('/')[1] : 'jpg'; // Extract the file extension

        // Create a random image name with the appropriate extension
        const randomHash = crypto.randomBytes(16).toString('hex');
        const imageName = `${randomHash}.${extension}`;

        // Upload to Supabase Storage
        const { data, error } = await supabaseClient.storage
            .from(IMAGE_BUCKET_NAME)
            .upload(imageName, imageBuffer, {
                contentType: response.headers['content-type'],
                upsert: true, // overwrite if file already exists
            });

        if (error) {
            throw new Error(`IMAGE: Error uploading image: ${error}`);
        }

        const imagePath = data.path;

        // get public url
        const { data: publicUrlData } = await supabaseClient.storage.from(IMAGE_BUCKET_NAME).getPublicUrl(imagePath);

        if (!publicUrlData) {
            throw new Error(`IMAGE: Error getting public URL for image`);
        }

        return publicUrlData?.publicUrl;

    } catch (error) {
        throw new Error(`IMAGE: Error downloading or uploading image: ${error}`);
    }
}


const buildUpsertPayload = (
    event: NormalizedEventInput,
    overrides: Record<string, any> = {}
) => {
    const payload: Record<string, any> = {};

    for (const field of EVENT_FIELDS) {
        if (overrides[field] !== undefined) {
            payload[field] = overrides[field];
        } else if (event[field] !== undefined) {
            payload[field] = event[field];
        }
    }

    return payload;
};

// Upsert event in the database
const upsertEventInDB = async (event: NormalizedEventInput, organizerId: string, locationAreaId: string, existingEventId: string | null) => {
    const imageUrl = event.image_url ? await downloadImage(event.image_url) : null;

    const { data: upsertedEvent, error: upsertError } = await supabaseClient
        .from("events")
        .upsert({
            ...buildUpsertPayload(event),
            id: existingEventId || undefined,
            organizer_id: organizerId,
            image_url: imageUrl || '',
            timestamp_scraped: event.timestamp_scraped || new Date(),
            // TODO: Do we need?
            visibility: event.visibility || 'public',
            location_area_id: locationAreaId,
        }, { onConflict: 'id' })
        .select()
        .single();
    if (upsertError || !upsertedEvent) {
        throw new Error(`EVENT: Error upserting event ${upsertError?.message}`);
    }

    upsertedEvent.organizer = { name: event.organizer?.name };

    return upsertedEvent;
}
