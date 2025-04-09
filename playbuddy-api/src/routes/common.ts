import { supabaseClient } from "../connections/supabaseClient";
import { Router } from "express";
import { Request, Response } from "express";

export const router = Router();

router.get('/deep-links', async (req: Request, res: Response) => {
    try {
        // 1) Query: deep_links plus nested relationships
        const { data, error } = await supabaseClient
            .from('deep_links')
            .select(`
          *,
          organizer:organizer_id (*),
          community:community_id (*),
          featured_event:featured_event_id (*),
          featured_promo_code:featured_promo_code_id (*),
          deep_link_promo_codes (
            promo_codes:promo_code_id (
              *,
              promo_code_event (*)
            )
          )
        `);

        if (error) {
            throw new Error(`Failed to fetch deep links: ${error.message}`);
        }

        // 2) Optional post-transform to flatten the attached events at the deep link level
        const transformed = (data ?? []).map((dl) => {
            // Extract the nested arrays
            const dpc = dl.deep_link_promo_codes ?? [];

            // Build an array of all attached promo codes
            const promoCodes = dpc.map((item: any) => item.promo_codes);

            // For each promo code with scope = 'event', gather its attached events
            let eventIds: number[] = [];
            let eventObjects: any[] = []; // if you want actual event objects, you'd do a separate fetch or store them differently

            promoCodes.forEach((pc: any) => {
                if (pc?.scope === 'event' && pc?.promo_code_event) {
                    // If one promo code can reference multiple events, handle that here
                    pc.promo_code_event.forEach((pce: any) => {
                        // pce.event_id references an event
                        eventIds.push(pce.event_id);
                    });
                }
            });

            return {
                ...dl,
                // Flatten out the array of promo codes
                promo_codes: promoCodes,
                // Flatten event IDs that came from promo_code_event
                event_ids: eventIds,
            };
        });

        return res.json(transformed);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: (err as Error).message });
    }
});

export default router;  