import { CreateOrganizerInput, Media, NormalizedEventInput, Event } from "../../../common/types/commonTypes.js";
import { supabaseClient } from "../../../connections/supabaseClient.js";
import { upsertOrganizer } from "./upsertOrganizer.js";
import axios from "axios";
import crypto from "crypto";
import { EVENT_FIELDS } from "./eventFields.js";
import { syncEntityMedia } from "../syncMedia.js";

export const NYC_LOCATION_ID = "73352aef-334c-49a6-9256-0baf91d56b49";

export type UpsertEventResult = {
    result: 'inserted' | 'updated' | 'failed' | 'skipped';
    event: Event | null;
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

// stash originals before overriding
const originalLog = console.log;
const originalError = console.error;

const log = (message?: any, ...optionalParams: any[]) => {
    originalLog(message, ...optionalParams);
};

const logError = (message: string, error?: Error) => {
    // print in red, then trace
    originalError(`\x1b[31mERROR: ${message} ${error?.message}\x1b[0m`);
    originalError(error?.stack);
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
    if (normalizedEvent.approval_status === undefined || normalizedEvent.approval_status === null) {
        normalizedEvent.approval_status = 'approved';
    }
    if (!normalizedEvent.end_date && normalizedEvent.start_date) {
        const start = new Date(normalizedEvent.start_date);
        if (!Number.isNaN(start.getTime())) {
            normalizedEvent.end_date = new Date(start.getTime() + 3 * 60 * 60 * 1000).toISOString();
        }
    }

    const organizerInfo = prepareOrganizer(normalizedEvent);
    if (!organizerInfo) return { result: 'failed', event: null };

    logEventHeader(organizerInfo.logName, normalizedEvent);

    try {
        const upsertedOrganizer = await tryUpsertOrganizer(normalizedEvent.organizer!);
        if (!upsertedOrganizer) return { result: 'failed', event: null };

        const { organizerId, organizerCommunityId, organizerHidden } = upsertedOrganizer;
        const isApprovedEvent = normalizedEvent.approval_status === 'approved';
        const organizerFetlifeHandles = getOrganizerFetlifeHandles(normalizedEvent.organizer);

        if (organizerHidden) {
            log(`EVENT: Skipping hidden organizer ${organizerInfo.logName}`);
            await ensureImportSourcesForHandles(organizerFetlifeHandles, organizerId, isApprovedEvent);
            return { result: 'skipped', event: null };
        }

        const existingEvent = await resolveExistingEvent(normalizedEvent, organizerId);

        if (existingEvent?.frozen && !opts.ignoreFrozen) {
            log(`EVENT: Skipping frozen event ${existingEvent.id}`);
            await ensureImportSourcesForHandles(organizerFetlifeHandles, organizerId, isApprovedEvent);
            return { result: 'skipped', event: null };
        }

        if (existingEvent?.id && opts.skipExisting) {
            const shouldApproveExisting = opts.approveExisting || (!opts.skipExistingNoApproval && normalizedEvent.approval_status === 'approved');
            if (shouldApproveExisting) {
                const approvedEvent = await setApprovalStatus(existingEvent.id, normalizedEvent.approval_status!);
                log(`EVENT: Updated approval_status for existing event ${existingEvent.id} -> ${normalizedEvent.approval_status}`);
                await ensureImportSourcesForHandles(organizerFetlifeHandles, organizerId, isApprovedEvent);
                return { result: 'updated', event: approvedEvent };
            }
            log(`EVENT: Skipping existing event ${existingEvent.id} (skipExisting=true)`);
            await ensureImportSourcesForHandles(organizerFetlifeHandles, organizerId, isApprovedEvent);
            return { result: 'skipped', event: null };
        }

        if (existingEvent?.id && normalizedEvent.visibility === 'public') {
            await setVisibility(existingEvent.id, 'public');
            log(`VISIBILITY: Changed to public`);
        }

        const locationAreaId = NYC_LOCATION_ID; // TODO: Replace with real location
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

        await ensureImportSourcesForHandles(organizerFetlifeHandles, organizerId, isApprovedEvent);

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
            .select('id, approval_status, event_defaults')
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
            if (isApproved && row.approval_status !== 'approved') {
                updates.approval_status = 'approved';
            } else if (!isApproved && (!row.approval_status || row.approval_status === 'pending')) {
                updates.approval_status = 'pending';
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
