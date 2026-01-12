
// Import necessary types and clients
import { CreateOrganizerInput } from "../../../common/types/commonTypes.js";
import { supabaseClient } from "../../../connections/supabaseClient.js";


// Function to upsert an organizer and its associated community
const normalizeHandle = (val?: string | null) => (val || '').replace(/^@/, '').trim().toLowerCase();
const normalizeHandles = (handles: Array<string | null | undefined>) => {
    const normalized = handles
        .map((handle) => normalizeHandle(handle))
        .filter(Boolean);
    return Array.from(new Set(normalized));
};

export async function upsertOrganizer(
    organizer: CreateOrganizerInput
): Promise<{ organizerId?: string; communityId?: string; hidden?: boolean | null }> {
    const { id, name, url, original_id } = organizer;
    const instagram_handle = normalizeHandle(organizer.instagram_handle);
    const fetlife_handles = normalizeHandles([
        organizer.fetlife_handle,
        ...(organizer.fetlife_handles || []),
    ]);
    const primaryFetlifeHandle = fetlife_handles[0];

    // Require at least one identifier
    if (!id && !name && !instagram_handle && !primaryFetlifeHandle) {
        const msg = "ORGANIZER: No id, name, instagram_handle, or fetlife_handle provided";
        console.error(msg);
        throw new Error(msg);
    }

    // Normalize + resolve a display name
    const trimmedName = name?.trim();
    const trimmedInsta = instagram_handle || undefined;
    const trimmedFet = primaryFetlifeHandle || undefined;
    const resolvedName = trimmedName || trimmedInsta || trimmedFet || "Unknown Organizer";

    type OrgRow = {
        id: string;
        name: string;
        aliases?: string[] | null;
        instagram_handle?: string | null;
        fetlife_handle?: string | null;
        fetlife_handles?: string[] | null;
        hidden?: boolean | null;
    };

    let existing: OrgRow | null = null;

    // 1) Prefer explicit ID
    if (id && !existing) {
        const { data } = await supabaseClient
            .from("organizers")
            .select("id,name,aliases,instagram_handle,fetlife_handle,fetlife_handles,hidden")
            .eq("id", id)
            .maybeSingle();
        if (data) existing = data as OrgRow;
    }

    // 2) Exact name match
    if (trimmedName && !existing) {
        const { data } = await supabaseClient
            .from("organizers")
            .select("id,name,aliases,instagram_handle,fetlife_handle,fetlife_handles,hidden")
            .eq("name", trimmedName)
            .maybeSingle();
        if (data) existing = data as OrgRow;
    }

    // 3) Alias contains (text[]). If your column is JSONB, this still works in supabase-js.
    if (trimmedName && !existing) {
        const { data } = await supabaseClient
            .from("organizers")
            .select("id,name,aliases,instagram_handle,fetlife_handle,fetlife_handles,hidden")
            .contains("aliases", [trimmedName])
            .maybeSingle();
        if (data) existing = data as OrgRow;
    }

    // 4) Social handles
    if (trimmedInsta && !existing) {
        const { data } = await supabaseClient
            .from("organizers")
            .select("id,name,aliases,instagram_handle,fetlife_handle,fetlife_handles,hidden")
            .ilike("instagram_handle", trimmedInsta)
            .maybeSingle();
        if (data) existing = data as OrgRow;
    }

    if (fetlife_handles.length && !existing) {
        for (const handle of fetlife_handles) {
            const { data } = await supabaseClient
                .from("organizers")
                .select("id,name,aliases,instagram_handle,fetlife_handle,fetlife_handles,hidden")
                .contains("fetlife_handles", [handle])
                .maybeSingle();
            if (data) {
                existing = data as OrgRow;
                break;
            }
        }
    }

    if (fetlife_handles.length && !existing) {
        for (const handle of fetlife_handles) {
            const { data } = await supabaseClient
                .from("organizers")
                .select("id,name,aliases,instagram_handle,fetlife_handle,fetlife_handles,hidden")
                .ilike("fetlife_handle", handle)
                .maybeSingle();
            if (data) {
                existing = data as OrgRow;
                break;
            }
        }
    }

    let organizerId = existing?.id;
    let organizerHidden: boolean | null | undefined = existing?.hidden;

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

        const existingFetlifeHandles = normalizeHandles([
            existing.fetlife_handle,
            ...(existing.fetlife_handles || []),
        ]);
        const mergedFetlifeHandles = normalizeHandles([
            ...existingFetlifeHandles,
            ...fetlife_handles,
        ]);
        const existingHandleList = Array.isArray(existing.fetlife_handles)
            ? existing.fetlife_handles
            : null;
        const hasAllMergedHandles = !!existingHandleList
            && mergedFetlifeHandles.every((handle) => existingHandleList.includes(handle));

        // Only set handles if not already present
        if (trimmedInsta && !existing.instagram_handle) {
            updatePatch.instagram_handle = trimmedInsta;
        }
        if (mergedFetlifeHandles.length) {
            if (!hasAllMergedHandles) {
                updatePatch.fetlife_handles = mergedFetlifeHandles;
            }
            if (!existing.fetlife_handle && mergedFetlifeHandles[0]) {
                updatePatch.fetlife_handle = mergedFetlifeHandles[0];
            }
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
                .select("id,name,hidden")
                .single();

            if (error) {
                console.error("ORGANIZER: update failed", error);
                throw error;
            }
            organizerId = data?.id ?? organizerId;
            organizerHidden = data?.hidden ?? organizerHidden;
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
            fetlife_handles: fetlife_handles.length ? fetlife_handles : null,
            aliases: trimmedName ? [trimmedName] : []
        };

        const { data, error } = await supabaseClient
            .from("organizers")
            .upsert(insertPayload, { onConflict: "name" })
            .select("id,name,hidden")
            .single();

        if (error) {
            console.error("ORGANIZER: upsert failed", error);
            throw error;
        }

        organizerId = data?.id;
        organizerHidden = data?.hidden ?? organizerHidden;
        console.log(`ORGANIZER: Upserted ${data?.name}`);
    }

    // Create/update the related community
    const communityId = await upsertCommunityFromOrganizer({
        organizerId: organizerId ?? "",
        organizerName: existing?.name ?? resolvedName
    });

    return { organizerId, communityId, hidden: organizerHidden ?? null };
}


// Function to upsert a community from an organizer
export const upsertCommunityFromOrganizer = async ({
    organizerId,
    organizerName
}: {
    organizerId: string,
    organizerName: string
}) => {
    // Check if a public organizer community already exists for the organizer.
    const { data: existingCommunities, error: existingCommunityError } = await supabaseClient
        .from('communities')
        .select("id,created_at")
        .eq("organizer_id", organizerId)
        .eq("type", "organizer_public_community")
        .order("created_at", { ascending: true })
        .limit(2);

    if (existingCommunityError) {
        console.error("Error fetching existing community:", existingCommunityError);
        throw existingCommunityError;
    }

    if (existingCommunities && existingCommunities.length > 0) {
        if (existingCommunities.length > 1) {
            console.warn(`ORGANIZER: Multiple organizer_public_community rows for organizer ${organizerId}. Using ${existingCommunities[0].id}`);
        }
        console.log(`ORGANIZER: Found existing community ${existingCommunities[0].id}`);
        return existingCommunities[0].id;
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
