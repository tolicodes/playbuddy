import { supabaseClient } from "../connections/supabaseClient.js"
import { pgQuery } from "../connections/postgres.js";
import { Router } from "express";
import { Request, Response } from "express";
import { authenticateAdminRequest, AuthenticatedRequest } from '../middleware/authenticateRequest.js';
import asyncHandler from './helpers/asyncHandler.js';

export const router = Router();

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    // 1) Query: deep_links plus nested relationships
    const { data, error } = await supabaseClient
      .from('deep_links')
      .select(`
        *,
        organizer:organizer_id(
          *,
          communities:communities(
            *,
            organizer:organizer_id(*)
          )
        ),
        community:community_id(*),
        featured_event:featured_event_id(
          *,
          organizer:organizer_id(*)
        ),
        featured_promo_code:featured_promo_code_id(*),
        deep_link_promo_codes(
          promo_codes:promo_code_id(
            *,
            promo_code_event(*)
          )
        ),
        deep_link_events:deep_link_events!fk_dle_deep_link(
          description,
          featured_promo_code:featured_promo_code_id(*),
          event:event_id(
            *,
            organizer:organizer_id(*)
          )
        )
      `);

    if (error) {
      throw new Error(`Failed to fetch deep links: ${error.message}`);
    }

    const deepLinks = data ?? [];
    const statsById = new Map<string, any>();
    if (deepLinks.length) {
      const ids = deepLinks.map((dl) => dl.id).filter(Boolean);
      if (ids.length) {
        try {
          const { rows: statsRows } = await pgQuery(`
            SELECT DISTINCT ON (deep_link_id)
              deep_link_id,
              range_start_date,
              range_end_date,
              range_label,
              range_days,
              generated_at,
              overall_clicks,
              ios_link_clicks,
              ios_install,
              ios_reopen,
              android_link_clicks,
              android_install,
              android_reopen,
              desktop_link_clicks,
              desktop_texts_sent,
              desktop_ios_install,
              desktop_ios_reopen,
              desktop_android_install,
              desktop_android_reopen,
              source_url,
              source_name
            FROM public.deep_link_branch_stats
            WHERE deep_link_id = ANY($1::uuid[])
            ORDER BY deep_link_id,
                     range_end_date DESC NULLS LAST,
                     generated_at DESC NULLS LAST,
                     updated_at DESC NULLS LAST;
          `, [ids]);
          for (const row of statsRows) {
            statsById.set(String(row.deep_link_id), row);
          }
        } catch (statsError: any) {
          console.warn("Failed to fetch branch stats for deep links", statsError?.message || statsError);
        }
      }
    }

    // 2) Optional post-transform to flatten the attached events at the deep link level
    const transformed = deepLinks.map((dl) => {
      // Extract the nested arrays
      const dpc = dl.deep_link_promo_codes ?? [];

      // Build an array of all attached promo codes
      const promoCodes = dpc.map((item: any) => item.promo_codes);

      // For each promo code with scope = 'event', gather its attached events
      const eventIds: number[] = [];

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
        branch_stats: statsById.get(String(dl.id)) ?? null,
      };
    });

    return res.json(transformed);
  } catch (err) {
    console.error(err);
    throw err;
  }
}));

router.post('/', authenticateAdminRequest, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { campaign, slug, type, organizer_id, featured_event_id, featured_promo_code_id, facilitator_id, campaign_start_date, campaign_end_date, channel } = req.body;

  const { data, error } = await supabaseClient
    .from('deep_links')
    .insert([
      {
        campaign,
        slug,
        type,
        featured_event_id: featured_event_id ? featured_event_id : null,
        featured_promo_code_id: featured_promo_code_id ? featured_promo_code_id : null,
        facilitator_id: facilitator_id ? facilitator_id : null,
        organizer_id: organizer_id ? organizer_id : null,
        channel,
      }
    ])
    .select()
    .single();

  if (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }

  return res.json({ data });
}));

export default router;  
