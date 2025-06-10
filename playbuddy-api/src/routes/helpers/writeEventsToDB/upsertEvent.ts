import { NormalizedEventInput, Organizer } from "commonTypes.js";
import { supabaseClient } from "../../../connections/supabaseClient.js";
import { upsertOrganizer } from "./upsertOrganizer.js";
import axios from "axios";
import crypto from "crypto";

export const NYC_LOCATION_ID = "73352aef-334c-49a6-9256-0baf91d56b49";


type UpsertEventResult = 'inserted' | 'updated' | 'failed';

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

export async function upsertEvent(event: NormalizedEventInput): Promise<UpsertEventResult> {
    const { organizer } = event;

    let organizerId = 'id' in organizer ? organizer.id : undefined;
    const organizerCreateInput = 'name' in organizer ? {
        name: organizer.name,
        url: organizer.url,
        original_id: organizer.original_id,
    } : undefined;

    console.log(`ORGANIZER: ${organizerCreateInput?.name} ${organizerId}`)


    const organizerName = organizerCreateInput?.name || organizerId || 'Unknown';
    const separator = '-'.repeat(process.stdout.columns);

    log('\n' + separator);
    log(`UPSERT EVENT: [${organizerName}] ${event.name}`);
    log(`Ticket URL: ${event.ticket_url || 'N/A'}`);
    log(separator + '\n');

    if (!organizerCreateInput && !organizerId) {
        logError(`ORGANIZER: No organizer id or name found`);
        return 'failed';
    }

    let organizerCommunityId: string | undefined;

    try {
        log(`ORGANIZER: Upserting organizer ${organizerName}`);
        const { organizerId: organizerIdFromUpsert, communityId: organizerCommunityIdFromUpsert } =
            await upsertOrganizer(event.organizer as { name: string } | { id: string });

        if (!organizerIdFromUpsert || !organizerCommunityIdFromUpsert) {
            logError(`ORGANIZER: Failed to upsert organizer`);
            return 'failed';
        }

        organizerId = organizerIdFromUpsert;
        organizerCommunityId = organizerCommunityIdFromUpsert;

        const existingEventId = await checkExistingEvent(
            event,
            organizerId
        );

        // check visibility
        // if the new event is public, then we mark it as public, even if it's private
        // if it's private, we don't change the privacy (it's public by default)
        if (existingEventId && event.visibility === 'public') {
            await setVisibility(existingEventId, 'public');
            log(`VISIBILITY: Changed to public`);
        }

        let locationAreaId = NYC_LOCATION_ID;

        if (!locationAreaId) {
            logError(`LOCATION AREA: Failed to upsert location area`);
            return 'failed';
        }

        // Upsert the event in the database
        const upsertedEvent = await upsertEventInDB(
            event,
            organizerId,
            locationAreaId,
            existingEventId
        );

        if (!upsertedEvent) {
            logError(`EVENT: Failed to upsert event`);
            return 'failed';
        }

        // attach all custom communities (interest groups)
        for (const community of event.communities || []) {
            // TODO: Allow upsert community

            if (!('id' in community)) {
                // TODO: Critical error because it has no community id
                logError(`ATTACH COMMUNITY: Inserting via community name not supported ${community.name}`);
                return 'failed';
            }

            await attachCommunity(upsertedEvent.id, community.id);
        }


        if (organizerCommunityId) {
            await attachCommunity(upsertedEvent.id, organizerCommunityId);
        }

        log(`EVENT: ${existingEventId ? 'Updated' : 'Inserted'}`);
        // This is the success
        return existingEventId ? 'updated' : 'inserted';

    } catch (error) {
        logError(`EVENT: Failed to upsert event`, error as Error);
        return 'failed';
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
    const filterString = `original_id.eq."${event.original_id}",and(start_date.eq."${event.start_date}",organizer_id.eq."${(organizerId)}"),and(start_date.eq."${(event.start_date)}",name.eq."${(event.name)}")`;

    // Check for existing event by original_id or by start_date and organizer_id
    const { data: existingEvents, error: fetchError } = await supabaseClient
        .from("events")
        .select("id")

        // original_id matches
        // OR start_date and organizer_id matches
        // OR start_date and event name matches 

        // original_id.eq.${event.original_id},
        // and(
        //   start_date.eq.${event.start_date},
        //   organizer_id.eq.${organizerId}
        // ),
        // and(
        //   start_date.eq.${event.start_date},
        //   name.eq.${event.name}
        // )
        .or(filterString)
    // for some reason it doesn't like when I format it like above


    // error is not null if it doesn't exist
    if (fetchError && fetchError.code !== "PGRST116") {

        throw new Error(`CHECK EXISTING EVENT: Error fetching existing event ${fetchError?.message}`);
    }
    // otherwise it doesn't exist and we continue

    if (existingEvents && existingEvents.length > 0) {
        return existingEvents[0].id;
    }

    // otherwise it doesn't exist
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
            throw new Error(`IMAGE: Error downloading image: ${error}`);
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

// Upsert event in the database
const upsertEventInDB = async (event: NormalizedEventInput, organizerId: string, locationAreaId: string, existingEventId: string | null) => {
    const imageUrl = event.image_url ? await downloadImage(event.image_url) : null;
    const { data: upsertedEvent, error: upsertError } = await supabaseClient
        .from("events")
        .upsert({
            id: existingEventId || undefined,
            original_id: event.original_id || '',
            organizer_id: organizerId,
            type: event.type || '',
            recurring: event.recurring || '',

            name: event.name || '',
            start_date: event.start_date || '',
            end_date: event.end_date || '',

            ticket_url: event.ticket_url || '',
            event_url: event.event_url || '',
            image_url: imageUrl || '',

            location: event.location || '',
            price: event.price || '',

            description: event.description || '',
            tags: event.tags || [],
            play_party: event.play_party || false,

            timestamp_scraped: event.timestamp_scraped || new Date(),
            source_origination_group_id: event.source_origination_group_id || '',
            source_origination_group_name: event.source_origination_group_name || '',
            source_origination_platform: event.source_origination_platform || '',
            source_ticketing_platform: event.source_origination_platform || '',
            dataset: event.dataset || '',
            visibility: event.visibility || 'public',

            location_area_id: locationAreaId
        }, { onConflict: 'id' })
        .select()
        .single();

    if (upsertError || !upsertedEvent) {
        throw new Error(`EVENT: Error upserting event ${upsertError?.message}`);
    }

    return upsertedEvent;
}
