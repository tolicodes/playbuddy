import { extname } from 'path';
import express, { Request, Response } from 'express';
import { AuthenticatedRequest, authenticateRequest } from '../middleware/authenticateRequest.js';
import { supabaseClient } from '../connections/supabaseClient.js';
import { Media } from '../common/types/commonTypes.js';
import { uploadSupabaseVideoToCloudflareViaCopy } from './helpers/uploadToCloudflareStream.js';

const router = express.Router();

// Utility function
function inferMediaType(path: string): 'video' | 'image' | null {
    const extension = extname(path).toLowerCase();
    if (['.mp4', '.mov', '.webm', '.mkv'].includes(extension)) return 'video';
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extension)) return 'image';
    return null;
}

type CreateMediaInput = Partial<Media> & { authUserId: string };


export const createMedia = async ({
    is_public = true,
    authUserId,
    is_explicit,
    title,
    description,
    storage_path
}: CreateMediaInput) => {
    if (!storage_path) {
        throw new Error('Missing storage_path')
    }

    const inferredType = inferMediaType(storage_path);
    if (!inferredType) {
        throw new Error('Unsupported file type');
    }

    let cloudflareVideoInfo;
    if (inferredType === 'video') {
        cloudflareVideoInfo = await uploadSupabaseVideoToCloudflareViaCopy(
            storage_path,
            title || ''
        )
    }

    const storagePath = cloudflareVideoInfo?.hlsUrl || storage_path;

    const { data, error } = await supabaseClient
        .from('media')
        .insert([
            {
                title,
                description,
                storage_path: storagePath,
                type: inferredType,
                auth_user_id: authUserId,
                thumbnail_url: cloudflareVideoInfo?.thumbnail,
                is_explicit,
                is_public,
            },
        ])
        .select()
        .single();

    if (error) throw error;
    return data;
}

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
