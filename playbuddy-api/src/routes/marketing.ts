// routes/marketing/print-run-facilitator.ts
import express from 'express';
import { supabaseClient } from '../connections/supabaseClient.js'; // adjust path as needed

const router = express.Router();

router.post('/print-run/facilitator', async (req, res) => {
    const { campaign, type = 'facilitator_profile', channel = 'business_card', facilitator_id, deep_links } = req.body;

    if (!facilitator_id || !Array.isArray(deep_links) || deep_links.length === 0) {
        return res.status(400).json({
            error: 'Missing facilitator_id or deep_links array',
        });
    }

    const inserts = [];

    for (const item of deep_links) {
        const { printRunAssetNumber, slug } = item;

        if (printRunAssetNumber === undefined || !slug) {
            return res.status(400).json({
                error: 'Each deep_link must include printRunAssetNumber and slug',
            });
        }

        inserts.push({
            facilitator_id,
            campaign: `[${printRunAssetNumber}] ${campaign}`,
            type: 'facilitator_profile',
            channel,
            slug,
            print_run_asset_number: printRunAssetNumber,
        });
    }

    const { data, error } = await supabaseClient
        .from('deep_links')
        .insert(inserts)
        .select(); // return inserted rows

    if (error) {
        console.error('Supabase insert error:', error);
        return res.status(500).json({ error: 'Failed to insert deep links', details: error.message });
    }

    return res.status(200).json({ success: true, data });
});

export default router;
