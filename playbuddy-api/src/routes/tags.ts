import express from 'express';
import { supabaseClient } from '../connections/supabaseClient';
import { authenticateRequest } from 'middleware/authenticateRequest';

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
        res.json(data);
    } catch (err) {
        console.error('Unexpected error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/tags
 * Create a new tag
 * Expects JSON body { name: string }
 */
router.post('/', authenticateRequest, async (req, res) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Tag name is required' });
    }

    try {
        // Upsert to avoid duplicates
        const { data, error } = await supabaseClient
            .from('tags')
            .upsert(
                { name: name.trim().toLowerCase() },
                { onConflict: 'name', returning: 'representation' }
            );
        if (error) {
            console.error('Error creating tag:', error);
            return res.status(400).json({ error: error.message });
        }
        // upsert returns an array
        res.status(201).json(data[0]);
    } catch (err) {
        console.error('Unexpected error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;