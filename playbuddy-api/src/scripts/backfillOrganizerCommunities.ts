/**
 * backfillOrganizerCommunities.ts
 *
 * Creates missing organizer_public_community rows for organizers that don't have one.
 *
 * Usage:
 *   SUPABASE_HOST=... SUPABASE_ADMIN_KEY=... node --loader ts-node/esm src/scripts/backfillOrganizerCommunities.ts
 */

import { supabaseClient } from "../connections/supabaseClient.js";
import { fetchAllRows } from "../helpers/fetchAllRows.js";

type OrganizerRow = { id: number; name: string };
type CommunityRow = { id: string; organizer_id: number | null; type: string | null };

const COMMUNITY_TYPE = "organizer_public_community";
const COMMUNITY_VISIBILITY = "public";

const chunk = <T>(items: T[], size: number) => {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
};

const backfillOrganizerCommunities = async () => {
    const organizers = (await fetchAllRows({
        from: "organizers",
        select: "id,name",
        pageSize: 1000,
    })) as OrganizerRow[];

    const communities = (await fetchAllRows({
        from: "communities",
        select: "id,organizer_id,type",
        pageSize: 1000,
    })) as CommunityRow[];

    const existingOrganizerIds = new Set(
        communities
            .filter((community) => community.type === COMMUNITY_TYPE && community.organizer_id !== null)
            .map((community) => String(community.organizer_id))
    );

    const toInsert = organizers
        .filter((organizer) => organizer.id && !existingOrganizerIds.has(String(organizer.id)))
        .map((organizer) => ({
            name: organizer.name || "Organizer",
            description: `Public community for ${organizer.name || "Organizer"}`,
            organizer_id: organizer.id,
            visibility: COMMUNITY_VISIBILITY,
            type: COMMUNITY_TYPE,
        }));

    if (toInsert.length === 0) {
        console.log("No missing organizer communities found.");
        return;
    }

    console.log(`Creating ${toInsert.length} organizer communities...`);

    for (const batch of chunk(toInsert, 200)) {
        const { error } = await supabaseClient.from("communities").insert(batch);
        if (error) {
            throw new Error(`Failed inserting batch: ${error.message}`);
        }
    }

    console.log("Backfill complete.");
};

backfillOrganizerCommunities().catch((error) => {
    console.error("Backfill failed:", error);
    process.exit(1);
});
