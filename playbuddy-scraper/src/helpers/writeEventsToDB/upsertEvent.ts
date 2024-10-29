import { CreateEventInput } from "commonTypes.js";
import { supabaseClient } from "../../connections/supabaseClient.js";
import { upsertOrganizer } from "./upsertOrganizer.js";
import { upsertLocation } from "./upsertLocation.js";

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

// Insert new event if it doesn't exist
const createEvent = async (event: CreateEventInput, organizerId: string, locationAreaId: string) => {
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
            image_url: event.image_url || '',

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

    console.log("createdEvent", event.name)

    if (insertError || !createdEvent) {
        console.error("Error inserting event:", insertError);
        return null;
    }

    return createdEvent;
}