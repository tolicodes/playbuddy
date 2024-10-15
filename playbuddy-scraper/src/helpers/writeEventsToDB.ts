import { Event } from "../commonTypes.js";

import { supabaseClient } from "../connections/supabaseClient.js";

const NYC_LOCATION_ID = "73352aef-334c-49a6-9256-0baf91d56b49";
const CONSCIOUS_TOUCH_COMMUNITY_ID = "72f599a9-6711-4d4f-a82d-1cb66eac0b7b";

// Function to upsert an organizer and return its ID
// we will check aliases as well
async function upsertOrganizer({
  name,
  url,
  original_id,
}: {
  name: string;
  url: string;
  original_id?: string;
}): Promise<string> {
  console.log("Upserting", name, url, original_id);

  // Check if the organizer exists by name or alias
  const { data: existingOrganizer, error: fetchError } = await supabaseClient
    .from("organizers")
    .select("name")
    .or(`name.eq.${name},aliases.cs.{${name}}`)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") { // PGRST116: no rows returned
    console.error("Error fetching organizer:", fetchError);
    throw fetchError;
  }

  // If an organizer exists with the name or alias, use the original name
  const organizerName = existingOrganizer ? existingOrganizer.name : name;

  // Upsert the organizer
  const { data, error: upsertError } = await supabaseClient
    .from("organizers")
    .upsert(
      { name: organizerName, url, original_id },
      { onConflict: "name" }
    )
    .select("id")
    .single();

  if (upsertError) {
    console.error("Error upserting organizer:", upsertError);
    throw upsertError;
  }

  // Insert community
  const { error: communityInsertError } = await supabaseClient
    .from('communities')
    .insert({
      name: organizerName,
      description: `Public community for ${organizerName}`,
      organizer_id: data.id,
      visibility: 'public',
      type: 'organizer_public_community'
    })
    .select()
    .single();

  if (communityInsertError) {
    console.error("Error inserting community:", communityInsertError);
  }


  return data?.id ?? "";
}

// Function to upsert an event
async function upsertEvent(event: Event): Promise<number | undefined> {
  try {
    if (!event.organizer || !event.organizer.name) {
      console.error("Event is missing organizer or organizerUrl:", event);
      return;
    }

    // Upsert Organizer and get its ID
    const organizerId: string = await upsertOrganizer(event.organizer);
    if (!organizerId) {
      return;
    }

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
      console.error("Error fetching existing event:", fetchError);
      return;
    }

    if (existingEvents?.length && existingEvents.length > 0) {
      console.log(`Event ${event.name} already exists.`);
      return 0;
    }

    // Insert new event if it doesn't exist
    const { data: createdEvent, error: insertError } = await supabaseClient
      .from("events")
      .insert({
        original_id: event.original_id,
        organizer_id: organizerId,
        type: event.type,
        recurring: event.recurring,

        name: event.name,
        start_date: event.start_date,
        end_date: event.end_date,

        ticket_url: event.ticket_url,
        event_url: event.event_url,
        image_url: event.image_url,

        location: event.location,
        price: event.price,

        description: event.description,
        tags: event.tags,

        timestamp_scraped: event.timestamp_scraped || new Date(),
        source_origination_group_id: event.source_origination_group_id,
        source_origination_group_name: event.source_origination_group_name,
        source_origination_platform: event.source_origination_platform,
        source_ticketing_platform: event.source_ticketing_platform,
        dataset: event.dataset,

        location_area_id: NYC_LOCATION_ID,
      })
      .select()
      .single();

    console.log("createdEvent", createdEvent)

    if (insertError || !createdEvent) {
      console.error("Error inserting event:", insertError);
      return 0;
    }

    // Insert communities (hardcode to conscious touch for now)
    const { error: communityError } = await supabaseClient
      .from("event_communities")
      .insert({
        event_id: createdEvent.id, // Assuming the event id is available after insertion
        community_id: CONSCIOUS_TOUCH_COMMUNITY_ID // Hardcoded community ID for Conscious Touch
      });

    if (communityError) {
      console.error("Error inserting event community:", communityError);
    } else {
      console.log(`Community added for event ${event.name}`);
    }

    console.log(`Event ${event.name} inserted successfully.`);
    return 1;

  } catch (error) {
    console.error("Error upserting event:", error);
  }

  return 0;
}

export const writeEventsToDB = async (events: Event[]): Promise<number> => {
  let addedCount = 0;
  for (const event of events) {
    const success = await upsertEvent(event);
    addedCount += success || 0;
  }

  console.log(`Processed ${events.length} events.`);
  console.log(`Successfully added ${addedCount} events.`);
  return addedCount;
};
