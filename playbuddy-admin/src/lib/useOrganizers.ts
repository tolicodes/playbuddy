// src/lib/useOrganizers.ts

import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

// Zod schema for an Organizer row
const OrganizerSchema = z.object({
    id: z.number(),
    name: z.string(),
    logo_url: z.string().url().optional().nullable(),
});
export type Organizer = z.infer<typeof OrganizerSchema>;

/**
 * Fetches the list of organizers from a REST endpoint using axios.
 * Adjust `ENDPOINT_URL` to match your actual backend route.
 */
const ENDPOINT_URL = "http://localhost:8080/organizers";

export function useOrganizers() {
    return useQuery<Organizer[], Error>({
        queryKey: ["organizers"],
        queryFn: async () => {
            const response = await axios.get(ENDPOINT_URL);
            if (response.status !== 200) {
                throw new Error(`Failed to fetch organizers: ${response.status}`);
            }
            const data = response.data as unknown[];

            // Validate and parse each row with Zod
            return data.map((row) => OrganizerSchema.parse(row))
                .sort((a, b) => a.name.localeCompare(b.name));
        },
        staleTime: 60 * 1000, // cache for 1 minute
    });
}
