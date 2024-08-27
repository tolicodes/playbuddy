import { Event } from "../types.js";

import { supabaseClient } from "../connections/supabaseClient.js";

// Function to upsert an organizer and return its ID
async function upsertOrganizer(
  organizerName: string,
  organizerUrl: string,
): Promise<string> {
  // @ts-ignore
  const { data, error } = await supabaseClient
    .from("organizers")
    // @ts-ignore
    .upsert(
      { name: organizerName, url: organizerUrl },
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
    if (!event.organizer || !event.organizerUrl) {
      console.error("Event is missing organizer or organizerUrl:", event);
      return;
    }

    // Upsert Organizer and get its ID
    const organizerId: string = await upsertOrganizer(
      event.organizer,
      event.organizerUrl,
    );
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

    if (!existingEvent) {
      // Insert new event if it doesn't exist
      const { error: insertError } = await supabaseClient.from("events").insert({
        original_id: event.id,
        name: event.name,
        start_date: event.start_date,
        end_date: event.end_date,
        location: event.location,
        price: event.price,
        imageUrl: event.imageUrl,
        organizer_id: organizerId,
        eventUrl: event.eventUrl,
        summary: event.summary,
        tags: event.tags,
        min_ticket_price: event.min_ticket_price,
        max_ticket_price: event.max_ticket_price,
        url: event.url,
        timestamp_scraped: event.timestamp_scraped,
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
    } else {
      console.log(`Event ${event.name} already exists.`);
      return 0;
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
