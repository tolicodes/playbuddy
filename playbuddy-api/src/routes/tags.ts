import express from 'express';
import { supabaseClient } from '../connections/supabaseClient.js';

const router = express.Router();

/**
 * GET /api/tags
 * Fetch all tags
 */
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabaseClient
            .from('tags')
            .select('*')
            .order('name', { ascending: true });
        if (error) {
            console.error('Error fetching tags:', error);
            return res.status(400).json({ error: error.message });
        }
        return res.json(data);
    } catch (err) {
        console.error('Unexpected error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;