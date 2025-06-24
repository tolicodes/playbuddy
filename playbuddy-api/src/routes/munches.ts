// routes/munches.ts

import { Router, Request, Response } from 'express';
import { supabaseClient } from '../connections/supabaseClient.js'; // Adjust path if needed
import { authenticateAdminRequest, authenticateAdminRequest, AuthenticatedRequest } from 'middleware/authenticateRequest.js';

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

// PUT /api/munches/:id
router.put('/:id', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { data, error } = await supabaseClient
        .from('munches')
        .update(req.body)
        .eq('id', id)
        .single();

    if (error) {
        console.error(`Error updating munch with id ${id}:`, error);
        return res.status(400).json({ error: error.message });
    }

    return res.json(data);
});


export default router;
