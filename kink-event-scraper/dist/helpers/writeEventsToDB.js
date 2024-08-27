import { supabaseClient } from "../connections/supabaseClient.js";
async function upsertOrganizer(organizerName, organizerUrl) {
    const { data, error } = await supabaseClient
        .from("organizers")
        .upsert({ name: organizerName, url: organizerUrl }, { onConflict: ["name"] })
        .select("id")
        .single();
    if (error) {
        console.error("Error upserting organizer:", error);
        throw error;
    }
    return data?.id ?? "";
}
async function upsertEvent(event) {
    try {
        if (!event.organizer || !event.organizerUrl) {
            console.error("Event is missing organizer or organizerUrl:", event);
            return;
        }
        const organizerId = await upsertOrganizer(event.organizer, event.organizerUrl);
        if (!organizerId) {
            return;
        }
        const { data: existingEvent } = await supabaseClient
            .from("events")
            .select("id")
            .or(`original_id.eq.${event.original_id},and(start_date.eq.${event.start_date},organizer_id.eq.${organizerId})`)
            .single();
        if (!existingEvent) {
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
            }
            else {
                console.log(`Event ${event.name} inserted successfully.`);
            }
        }
        else {
            console.log(`Event ${event.name} already exists.`);
        }
    }
    catch (error) {
        console.error("Error upserting event:", error);
    }
}
export const writeEventsToDB = async (events) => {
    for (const event of events) {
        await upsertEvent(event);
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid3JpdGVFdmVudHNUb0RCLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2hlbHBlcnMvd3JpdGVFdmVudHNUb0RCLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUdsRSxLQUFLLFVBQVUsZUFBZSxDQUM1QixhQUFxQixFQUNyQixZQUFvQjtJQUdwQixNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLE1BQU0sY0FBYztTQUN6QyxJQUFJLENBQUMsWUFBWSxDQUFDO1NBRWxCLE1BQU0sQ0FDTCxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsR0FBRyxFQUFFLFlBQVksRUFBRSxFQUMxQyxFQUFFLFVBQVUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQ3pCO1NBQ0EsTUFBTSxDQUFDLElBQUksQ0FBQztTQUNaLE1BQU0sRUFBRSxDQUFDO0lBRVosSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUNWLE9BQU8sQ0FBQyxLQUFLLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbkQsTUFBTSxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsT0FBTyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQztBQUN4QixDQUFDO0FBR0QsS0FBSyxVQUFVLFdBQVcsQ0FBQyxLQUFZO0lBQ3JDLElBQUksQ0FBQztRQUNILElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQzVDLE9BQU8sQ0FBQyxLQUFLLENBQUMsNkNBQTZDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDcEUsT0FBTztRQUNULENBQUM7UUFHRCxNQUFNLFdBQVcsR0FBVyxNQUFNLGVBQWUsQ0FDL0MsS0FBSyxDQUFDLFNBQVMsRUFDZixLQUFLLENBQUMsWUFBWSxDQUNuQixDQUFDO1FBQ0YsSUFBSSxDQUFDLFdBQVcsRUFBRSxD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