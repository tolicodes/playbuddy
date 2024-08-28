import { Event } from "../commonTypes.js";

import { supabaseClient } from "../connections/supabaseClient.js";

// Function to upsert an organizer and return its ID
async function upsertOrganizer({
  name, url, original_id
}: {
  name: string, url: string, original_id?: string
}): Promise<string> {
  console.log('Upserting', name, url, original_id)
  // @ts-ignore
  const { data, error } = await supabaseClient
    .from("organizers")
    // @ts-ignore
    .upsert(
      { name, url, original_id },
      { onConflict: ["name"] },
    )
    .select("id")
    .single();

  if (error) {
    console.error("Error upserting organizer:", error);
    throw error;
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
    const { data: existingEvent } = await supabaseClient
      .from("events")
      .select("id")
      .or(
        `original_id.eq.${event.original_id},and(start_date.eq.${event.start_date},organizer_id.eq.${organizerId})`,
      )
      .single();

    if (existingEvent) {
      console.log(`Event ${event.name} already exists.`);
      return 0;
    }

    // Insert new event if it doesn't exist
    const { error: insertError } = await supabaseClient.from("events").insert({
      original_id: event.original_id,
      organizer_id: organizerId,

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
    });

    if (insertError) {
      console.error("Error inserting event:", insertError);
    } else {
      console.log(`Event ${event.name} inserted successfully.`);
      return 1;
    }

  } catch (error) {
    console.error("Error upserting event:", error);
  }

  return 0;
}

export const writeEventsToDB = async (events: Event[]): Promise<void> => {
  let addedCount = 0;
  for (const event of events) {
    const success = await upsertEvent(event);
    addedCount += success || 0;
  }

  console.log(`Processed ${events.length} events.`);
  console.log(`Successfully added ${addedCount} events.`);
};
