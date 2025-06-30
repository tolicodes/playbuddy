import { Router, Request, Response } from 'express';
import { supabaseClient } from '../connections/supabaseClient.js'; // Adjust the import path to match your project

const router = Router();

// Fetch buddies
router.get('/', async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabaseClient
            .from('organizers')
            .select(`
                *
            `)


        if (error) {
            console.error(`Error fetching organizers`, error);
            throw error;
        }


        res.json(data);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: `Failed to fetch organizers: ${error.message}` });
        } else {
            res.status(500).json({ error: 'Failed to fetch organizers' });
        }
    }
});

export default router;