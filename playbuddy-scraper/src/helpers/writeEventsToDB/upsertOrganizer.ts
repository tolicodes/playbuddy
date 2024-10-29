// Function to upsert an organizer and return its ID

import { CreateOrganizerInput } from "commonTypes.js";
import { supabaseClient } from "../../connections/supabaseClient.js";

// we will check aliases as well
// @ts-expect-error - TODO: fix this
export async function upsertOrganizer({ name, url, original_id }: CreateOrganizerInput): Promise<{
    organizerId?: string,
    communityId?: string
}> {
    if (!name) {
        console.log('No name for organizer', original_id, url);
        return {
            organizerId: undefined,
            communityId: undefined
        };
    }

    // Check if the organizer exists by name or alias
    const { data: existingOrganizer, error: fetchError } = await supabaseClient
        .from("organizers")
        .select("id, name")
        .or(`name.eq."${name}",aliases.cs.{"${name}"}`)
        .single();

    // Handle error if it's not the no rows error
    if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Error fetching organizer:", fetchError);
        throw fetchError;
    }

    // If an organizer exists with the name or alias, use its name and ID
    if (existingOrganizer) {
        const { data: existingCommunity } = await supabaseClient
            .from('communities')
            .select("id")
            .eq("organizer_id", existingOrganizer.id)
            .single();

        return {
            organizerId: existingOrganizer.id,
            communityId: existingCommunity?.id
        }
    }

    // Upsert the organizer
    const { data: upsertedOrganizer, error: upsertError } = await supabaseClient
        .from("organizers")
        .upsert(
            { name, url, original_id },
            { onConflict: "name" }
        )
        .select("id, name")
        .single();

    if (upsertError) {
        console.error("Error upserting organizer:", upsertError);
        throw upsertError;
    }

    const organizerId = upsertedOrganizer?.id;

    // we don't need to return it, because it's already linked to the organizer
    // and transitively the event
    const communityId = await upsertCommunityFromOrganizer({
        organizerId: organizerId ?? "",
        // use organizer name
        organizerName: name
    });

    return { organizerId, communityId };
}

export const upsertCommunityFromOrganizer = async ({
    organizerId,
    organizerName
}: {
    organizerId: string,
    organizerName: string
}) => {
    // Check if the community for this organizer already exists
    const { data: existingCommunity } = await supabaseClient
        .from('communities')
        .select("id")
        .eq("organizer_id", organizerId)
        .single();

    const communityId = existingCommunity?.id;

    if (communityId) {
        return communityId;
    }

    // If no existing community found, insert a new one
    const { data: newCommunity, error: communityInsertError } = await supabaseClient
        .from('communities')
        .insert({
            name: organizerName,
            description: `Public community for ${organizerName}`,
            organizer_id: organizerId,
            visibility: 'public',
            type: 'organizer_public_community'
        })
        .select("id")
        .single();

    if (communityInsertError) {
        console.error("Error inserting community:", communityInsertError);
        throw communityInsertError;
    }

    return newCommunity?.id;
}