
// Import necessary types and clients
import { Organizer } from "../../../common/types/commonTypes.js";
import { supabaseClient } from "../../../connections/supabaseClient.js";

// Function to upsert an organizer and its associated community
export async function upsertOrganizer(
    organizer: Omit<Organizer, 'id'> | { id: string }
): Promise<{ organizerId?: string, communityId?: string }> {
    // @ts-ignore
    const { name, url, original_id } = organizer;
    // @ts-ignore
    const id = organizer.id;

    const orIDClause = id ? `,id.eq.${id}` : '';

    // Attempt to find an existing organizer by name or alias
    const { data: existingOrganizer, error: fetchError } = await supabaseClient
        .from("organizers")
        .select("id, name")
        .or(`name.eq."${name}",aliases.cs.{"${name}"}${orIDClause}`)
        .single();

    // Handle any errors that occur during the fetch
    if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Error fetching organizer:", fetchError);
        throw fetchError;
    }

    // Initialize organizerId with the existing organizer's ID if found
    let organizerId = existingOrganizer?.id;

    // If no existing organizer is found, upsert a new organizer
    if (!organizerId) {
        const { data: insertedOrganizer, error: upsertError } = await supabaseClient
            .from("organizers")
            .upsert({ name, url, original_id }, { onConflict: "name" })
            .select("id, name")
            .single();

        // Handle any errors that occur during the upsert
        if (upsertError) {
            console.error("Error upserting organizer:", upsertError);
            throw upsertError;
        }

        // Assign the newly inserted organizer's ID
        organizerId = insertedOrganizer?.id;
    }

    // Upsert the community associated with the organizer
    const communityId = await upsertCommunityFromOrganizer({
        organizerId: organizerId ?? "",
        organizerName: name
    });

    // Return the organizer and community IDs
    return { organizerId, communityId };
}

// Function to upsert a community from an organizer
export const upsertCommunityFromOrganizer = async ({
    organizerId,
    organizerName
}: {
    organizerId: string,
    organizerName: string
}) => {
    // Check if a community already exists for the organizer
    const { data: existingCommunity } = await supabaseClient
        .from('communities')
        .select("id")
        .eq("organizer_id", organizerId)
        .single();

    // Retrieve the existing community ID if found
    const communityId = existingCommunity?.id;

    // Return the existing community ID if it exists
    if (communityId) {
        return communityId;
    }

    // If no existing community is found, insert a new one
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

    // Handle any errors that occur during the community insertion
    if (communityInsertError) {
        console.error("Error inserting community:", communityInsertError);
        throw communityInsertError;
    }

    // Return the newly inserted community's ID
    return newCommunity?.id;
}