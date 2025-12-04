import { CreateOrganizerInput, Media, NormalizedEventInput, Event } from "../../../common/types/commonTypes.js";
import { supabaseClient } from "../../../connections/supabaseClient.js";
import { upsertOrganizer } from "./upsertOrganizer.js";
import axios from "axios";
import crypto from "crypto";
import { EVENT_FIELDS } from "./eventFields.js";
import { syncEntityMedia } from "../syncMedia.js";

export const NYC_LOCATION_ID = "73352aef-334c-49a6-9256-0baf91d56b49";

export type UpsertEventResult = {
    result: 'inserted' | 'updated' | 'failed';
    event: Event | null;
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

    const logName = organizer?.name || organizerId || organizer?.instagram_handle || organizer?.fetlife_handle || 'Unknown';
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
    };
}

async function resolveExistingEventId(event: NormalizedEventInput, organizerId: string) {
    return event.id?.toString() || await checkExistingEvent(event, organizerId);
}

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


export async function upsertEvent(event: NormalizedEventInput, authUserId?: string): Promise<UpsertEventResult> {
    const organizerInfo = prepareOrganizer(event);
    if (!organizerInfo) return { result: 'failed', event: null };

    logEventHeader(organizerInfo.logName, event);

    try {
        const upsertedOrganizer = await tryUpsertOrganizer(event.organizer!);
        if (!upsertedOrganizer) return { result: 'failed', event: null };

        const { organizerId, organizerCommunityId } = upsertedOrganizer;

        const existingEventId = await resolveExistingEventId(event, organizerId);

        if (existingEventId && event.visibility === 'public') {
            await setVisibility(existingEventId, 'public');
            log(`VISIBILITY: Changed to public`);
        }

        const locationAreaId = NYC_LOCATION_ID; // TODO: Replace with real location
        const upsertedEvent = await upsertEventInDB(event, organizerId, locationAreaId, existingEventId);

        if (!upsertedEvent) {
            logError(`EVENT: Failed to upsert event`);
            return { result: 'failed', event: null };
        }

        const communities = event.communities || [];
        const attached = await attachCommunities(upsertedEvent.id, communities, organizerCommunityId);
        if (!attached) return { result: 'failed', event: null };

        if (event.media && event.media.length > 0) {
            await syncEntityMedia({
                entityId: upsertedEvent.id,
                entityKey: 'event_id',
                joinTable: 'event_media',
                media: event.media?.map((med: Media) => {
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

            log(`EVENT MEDIA: Synced ${event.media?.length} media`);
        }

        log(`EVENT: ${existingEventId ? 'Updated' : 'Inserted'}`);

        return {
            result: existingEventId ? 'updated' : 'inserted',
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

const checkExistingEvent = async (event: NormalizedEventInput, organizerId: string): Promise<null | string> => {
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
        .select("id")
        .or(filters.join(','));


    // error is not null if it doesn't exist
    if (fetchError && fetchError.code !== "PGRST116") {
        throw new Error(`CHECK EXISTING EVENT: Error fetching existing event ${fetchError?.message}`);
    }

    if (existingEvents && existingEvents.length > 0) {
        console.log(`CHECK EXISTING EVENT: Found existing event ${existingEvents[0].id}`);
        return existingEvents[0].id;
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

    upsertedEvent.organizer = { name: event.organizer?.name };

    if (upsertError || !upsertedEvent) {
        throw new Error(`EVENT: Error upserting event ${upsertError?.message}`);
    }

    return upsertedEvent;
}
