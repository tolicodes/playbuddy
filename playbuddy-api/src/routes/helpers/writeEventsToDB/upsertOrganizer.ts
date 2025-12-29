
// Import necessary types and clients
import { CreateOrganizerInput } from "../../../common/types/commonTypes.js";
import { supabaseClient } from "../../../connections/supabaseClient.js";


// Function to upsert an organizer and its associated community
const normalizeHandle = (val?: string | null) => (val || '').replace(/^@/, '').trim();

export async function upsertOrganizer(
    organizer: CreateOrganizerInput
): Promise<{ organizerId?: string; communityId?: string }> {
    const { id, name, url, original_id } = organizer;
    const instagram_handle = normalizeHandle(organizer.instagram_handle);
    const fetlife_handle = normalizeHandle(organizer.fetlife_handle);

    // Require at least one identifier
    if (!id && !name && !instagram_handle && !fetlife_handle) {
        const msg = "ORGANIZER: No id, name, instagram_handle, or fetlife_handle provided";
        console.error(msg);
        throw new Error(msg);
    }

    // Normalize + resolve a display name
    const trimmedName = name?.trim();
    const trimmedInsta = instagram_handle || undefined;
    const trimmedFet = fetlife_handle || undefined;
    const resolvedName = trimmedName || trimmedInsta || trimmedFet || "Unknown Organizer";

    type OrgRow = { id: string; name: string; aliases?: string[] | null; instagram_handle?: string | null; fetlife_handle?: string | null };

    let existing: OrgRow | null = null;

    // 1) Prefer explicit ID
    if (id && !existing) {
        const { data } = await supabaseClient
            .from("organizers")
            .select("id,name,aliases,instagram_handle,fetlife_handle")
            .eq("id", id)
            .maybeSingle();
        if (data) existing = data as OrgRow;
    }

    // 2) Exact name match
    if (trimmedName && !existing) {
        const { data } = await supabaseClient
            .from("organizers")
            .select("id,name,aliases,instagram_handle,fetlife_handle")
            .eq("name", trimmedName)
            .maybeSingle();
        if (data) existing = data as OrgRow;
    }

    // 3) Alias contains (text[]). If your column is JSONB, this still works in supabase-js.
    if (trimmedName && !existing) {
        const { data } = await supabaseClient
            .from("organizers")
            .select("id,name,aliases,instagram_handle,fetlife_handle")
            .contains("aliases", [trimmedName])
            .maybeSingle();
        if (data) existing = data as OrgRow;
    }

    // 4) Social handles
    if (trimmedInsta && !existing) {
        const { data } = await supabaseClient
            .from("organizers")
            .select("id,name,aliases,instagram_handle,fetlife_handle")
            .ilike("instagram_handle", trimmedInsta)
            .maybeSingle();
        if (data) existing = data as OrgRow;
    }

    if (trimmedFet && !existing) {
        const { data } = await supabaseClient
            .from("organizers")
            .select("id,name,aliases,instagram_handle,fetlife_handle")
            .ilike("fetlife_handle", trimmedFet)
            .maybeSingle();
        if (data) existing = data as OrgRow;
    }

    let organizerId = existing?.id;

    if (existing) {
        // Merge aliases if we got a new human-readable name
        const currentAliases = Array.isArray(existing.aliases) ? existing.aliases : [];
        const needsAlias =
            !!trimmedName &&
            trimmedName !== existing.name &&
            !currentAliases.includes(trimmedName);

        const updatePatch: Record<string, any> = {
            url: url ?? undefined,
            original_id: original_id ?? undefined,
        };

        // Only set handles if not already present
        if (trimmedInsta && !existing.instagram_handle) {
            updatePatch.instagram_handle = trimmedInsta;
        }
        if (trimmedFet && !existing.fetlife_handle) {
            updatePatch.fetlife_handle = trimmedFet;
        }

        if (needsAlias) {
            updatePatch.aliases = Array.from(new Set([...currentAliases, trimmedName!]));
        }

        // Remove undefined keys to avoid overwriting with nulls unintentionally
        Object.keys(updatePatch).forEach((k) => updatePatch[k] === undefined && delete updatePatch[k]);

        if (Object.keys(updatePatch).length > 0) {
            const { data, error } = await supabaseClient
                .from("organizers")
                .update(updatePatch)
                .eq("id", existing.id)
                .select("id,name")
                .single();

            if (error) {
                console.error("ORGANIZER: update failed", error);
                throw error;
            }
            organizerId = data?.id ?? organizerId;
            console.log(`ORGANIZER: Updated ${data?.name || existing.name}`);
        } else {
            console.log(`ORGANIZER: No updates needed for ${existing.name}`);
        }
    } else {
        // Insert with conflict on name so duplicates don't throw 23505
        const insertPayload: Record<string, any> = {
            name: resolvedName,
            url,
            original_id,
            instagram_handle: trimmedInsta ?? null,
            fetlife_handle: trimmedFet ?? null,
            aliases: trimmedName ? [trimmedName] : []
        };

        const { data, error } = await supabaseClient
            .from("organizers")
            .upsert(insertPayload, { onConflict: "name" })
            .select("id,name")
            .single();

        if (error) {
            console.error("ORGANIZER: upsert failed", error);
            throw error;
        }

        organizerId = data?.id;
        console.log(`ORGANIZER: Upserted ${data?.name}`);
    }

    // Create/update the related community
    const communityId = await upsertCommunityFromOrganizer({
        organizerId: organizerId ?? "",
        organizerName: existing?.name ?? resolvedName
    });

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
        console.log(`ORGANIZER: Found existing community ${communityId}`);
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
