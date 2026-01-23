import type { NormalizedEventInput } from '../../commonTypes.js';

const normalizeSourceUrl = (value?: string | null) => {
    if (value === undefined || value === null) return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
};

const normalizeTicketingSlug = (platform?: string | null) => {
    if (!platform) return undefined;
    const normalized = platform.trim().toLowerCase();
    if (!normalized || normalized === 'website' || normalized === 'unknown') return undefined;
    if (normalized === 'lu.ma' || normalized === 'luma') return 'luma';
    if (normalized === 'forbiddentickets' || normalized === 'forbidden tickets') return 'forbidden-tickets';
    return normalized.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

export const deriveTicketingOrigin = (
    platform?: NormalizedEventInput['source_ticketing_platform'] | null
): NormalizedEventInput['source_origination_platform'] | undefined => {
    const slug = normalizeTicketingSlug(platform || undefined);
    return slug ? (`ticketing-${slug}` as NormalizedEventInput['source_origination_platform']) : undefined;
};

type SourceFieldsInput = {
    eventDefaults?: Partial<NormalizedEventInput>;
    sourceUrl?: string | null;
    ticketingPlatform?: NormalizedEventInput['source_ticketing_platform'] | null;
    originPlatform?: NormalizedEventInput['source_origination_platform'] | null;
};

export const resolveSourceFields = ({
    eventDefaults,
    sourceUrl,
    ticketingPlatform,
    originPlatform,
}: SourceFieldsInput): Partial<NormalizedEventInput> => {
    const resolvedSourceUrl =
        normalizeSourceUrl(eventDefaults?.source_url) ?? normalizeSourceUrl(sourceUrl);
    const resolvedTicketing =
        eventDefaults?.source_ticketing_platform ?? ticketingPlatform ?? undefined;
    const resolvedOrigin: NormalizedEventInput['source_origination_platform'] | undefined =
        eventDefaults?.source_origination_platform
        ?? originPlatform
        ?? deriveTicketingOrigin(resolvedTicketing);

    const out: Partial<NormalizedEventInput> = {};
    if (resolvedSourceUrl) out.source_url = resolvedSourceUrl;
    if (resolvedTicketing) out.source_ticketing_platform = resolvedTicketing;
    if (resolvedOrigin) out.source_origination_platform = resolvedOrigin;
    return out;
};
