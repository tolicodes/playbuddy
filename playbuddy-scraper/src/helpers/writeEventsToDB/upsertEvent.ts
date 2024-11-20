import { CreateEventInput } from "commonTypes.js";
import { supabaseClient } from "../../connections/supabaseClient.js";
import { upsertOrganizer } from "./upsertOrganizer.js";
import { upsertLocation } from "./upsertLocation.js";
import axios from "axios";
import crypto from "crypto";
import { supabaseClient as supabase } from '../../connections/supabaseClient.js';

export async function upsertEvent(event: CreateEventInput): Promise<number | undefined> {
    try {
        if (!event?.organizer) {
            console.log('No organizer name for event', event);
            return 0;
        }

        const { organizerId, communityId: organizerCommunityId } = await upsertOrganizer(event.organizer);
        if (!organizerId || !organizerCommunityId) return 0;

        const existingEventId = await checkExistingEvent(event, organizerId);

        // check visibility
        // if the new event is public, then we mark it as public, even if it's private
        // if it's private, we don't change the privacy (it's public by default)
        if (existingEventId && event.visibility === 'public') {
            await setVisibility(existingEventId, 'public');
        }

        if (existingEventId) {
            console.log('attaching communities', existingEventId, event.communities);
            // attach all custom communities (interest groups)
            for (const community of event.communities || []) {
                await attachCommunity(existingEventId, community.id);
            }
            return 0;
        }

        // @ts-expect-error Not sure why this is complaining
        const locationAreaId = await upsertLocation(event.location_area?.code || '');

        const createdEvent = await createEvent(event, organizerId, locationAreaId || '');

        console.log('Created event', createdEvent);
        if (!createdEvent) {
            return 0;
        }

        // attach all custom communities (interest groups)
        for (const community of event.communities || []) {
            console.log('attaching community', createdEvent.id, community.id);
            await attachCommunity(createdEvent.id, community.id);
        }

        await attachCommunity(createdEvent.id, organizerCommunityId);

        console.log(`Event ${event.name} inserted successfully.`);

        return 1;

    } catch (error) {
        console.error(`Error upserting event ${event.name}:`, error);
    }

    return 0;
}

const setVisibility = async (eventId: string, visibility: 'public' | 'private') => {
    const { error: visibilityError } = await supabaseClient
        .from("events")
        .update({ visibility })
        .eq("id", eventId);

    if (visibilityError) {
        console.error(`Error setting visibility for event ${eventId}:`, visibilityError);
        throw visibilityError;
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
        console.error(`Error fetching existing community event ${eventId} ${communityId}:`, existingCommunityEventError);
        throw existingCommunityEventError;
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
        console.error(`Error inserting event community ${eventId} ${communityId}:`, communityError);
        throw communityError;
    }
}

const checkExistingEvent = async (event: CreateEventInput, organizerId: string): Promise<null | string> => {
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

        // for some reason it doesn't like when I format it like above

        .or(`original_id.eq."${event.original_id}",and(start_date.eq."${event.start_date}",organizer_id.eq."${(organizerId)}"),and(start_date.eq."${(event.start_date)}",name.eq."${(event.name)}")`)

    if (fetchError && fetchError.code !== "PGRST116") {
        console.error(`Error fetching existing event ${event.name}:`, fetchError);
        // we'll assume it doesn't exist
        return null;
    }

    if (existingEvents && existingEvents.length > 0) {
        console.log(`Event ${event.name} already exists.`);
        return existingEvents[0].id;
    }

    // otherwise it doesn't exist
    return null;
}

const IMAGE_BUCKET_NAME = "event-images";

const downloadImage = async (url: string) => {
    try {
        // Download the image
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'arraybuffer', // Download image as binary data
        });

        const imageBuffer = Buffer.from(response.data, 'binary');

        if (!response.headers['content-type'].startsWith('image/')) {
            throw new Error('The provided URL does not contain an image.');
        }

        const extension = response.headers['content-type'].split('/')[1]; // Extract the file extension

        // Create a random image name with the appropriate extension
        const randomHash = crypto.randomBytes(16).toString('hex');
        const imageName = `${randomHash}.${extension}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(IMAGE_BUCKET_NAME)
            .upload(imageName, imageBuffer, {
                contentType: response.headers['content-type'],
                upsert: true, // overwrite if file already exists
            });

        if (error) {
            console.error('Error uploading image:', error);
            throw error;
        }

        const imagePath = data.path;

        // get public url
        const { data: publicUrlData } = await supabase.storage.from(IMAGE_BUCKET_NAME).getPublicUrl(imagePath);

        return publicUrlData.publicUrl;

    } catch (error) {
        console.error('Error downloading or uploading image:', error);
        return null;
    }
}

// Insert new event if it doesn't exist
const createEvent = async (event: CreateEventInput, organizerId: string, locationAreaId: string) => {
    const imageUrl = await downloadImage(event.image_url);
    const { data: createdEvent, error: insertError } = await supabaseClient
        .from("events")
        .insert({
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

            timestamp_scraped: event.timestamp_scraped || new Date(),
            source_origination_group_id: event.source_origination_group_id || '',
            source_origination_group_name: event.source_origination_group_name || '',
            source_origination_platform: event.source_origination_platform || '',
            source_ticketing_platform: event.source_ticketing_platform || '',
            dataset: event.dataset || '',
            visibility: event.visibility || 'public',

            location_area_id: locationAreaId
        })
        .select()
        .single();

    if (insertError || !createdEvent) {
        console.error(`Error inserting event ${event.name}:`, insertError);
        return null;
    }

    return createdEvent;
}