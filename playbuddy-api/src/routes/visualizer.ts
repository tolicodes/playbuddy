import { Router } from 'express';
import igRouter, { igVisualizers, VisualizerInfo } from './visualizer/instagram.js';

const router = Router();

const visualizers: VisualizerInfo[] = [...igVisualizers];

router.get('/', (_req, res) => {
    res.json({ visualizers });
});

// Mount Instagram-specific routes at the root to keep existing paths stable
router.use('/', igRouter);

router.get('/:id', (req, res) => {
    const visualizer = visualizers.find(s => s.id === req.params.id);
    if (!visualizer) {
        res.status(404).json({ error: 'visualizer not found' });
        return;
    }
    res.json(visualizer);
});

export default router;
