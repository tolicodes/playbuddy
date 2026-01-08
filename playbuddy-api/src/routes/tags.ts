import express from 'express';
import { fetchAllRows } from '../helpers/fetchAllRows.js';

const router = express.Router();

/**
 * GET /api/tags
 * Fetch all tags
 */
router.get('/', async (req, res) => {
    try {
        const data = await fetchAllRows({
            from: 'tags',
            select: '*',
            queryModifier: (query) => query.order('name', { ascending: true }),
        });
        return res.json(data);
    } catch (err) {
        console.error('Unexpected error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
