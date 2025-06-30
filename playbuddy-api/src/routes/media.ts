import express, { Response } from 'express';
import { AuthenticatedRequest, authenticateRequest } from '../middleware/authenticateRequest.js';
import { createMedia } from './helpers/syncMedia.js';

const router = express.Router();

// POST /api/media
router.post('/media', authenticateRequest, async (req: AuthenticatedRequest, res: Response) => {
    const {
        title,
        description,
        storage_path, // e.g. videos/user123/media.mp4
        is_explicit = false,
    } = req.body;

    const data = await createMedia({
        title,
        description,
        storage_path,
        is_explicit,
        authUserId: req.authUser!.id,
        is_public: true,
    });

    res.json(data);
});

export default router;
