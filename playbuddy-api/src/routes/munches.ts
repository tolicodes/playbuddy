// routes/munches.ts

import { Router, Request, Response } from 'express';
import { supabaseClient } from '../connections/supabaseClient.js'; // Adjust path if needed

const router = Router();

// GET /api/munches
router.get('/', async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabaseClient
            .from('munches')
            .select('*');

        if (error) {
            console.error(`Error fetching munches:`, error);
            throw error;
        }

        res.json(data);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: `Failed to fetch munches: ${error.message}` });
        } else {
            res.status(500).json({ error: 'Failed to fetch munches' });
        }
    }
});

export default router;
