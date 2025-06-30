import { supabaseClient } from '../../connections/supabaseClient.js';
import { extname } from 'path';
import { Media } from '../../commonTypes.js';
import { uploadSupabaseVideoToCloudflareViaCopy } from './uploadToCloudflareStream.js';

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


type SyncMediaInput = Array<{
    id?: string;
    storage_path: string;
    title: string;
    description?: string;
    is_explicit?: boolean;
    is_public?: boolean;
}>;

interface SyncEntityMediaParams {
    entityId: string;
    media: SyncMediaInput;
    authUserId: string;
    entityKey: string; // e.g., "facilitator_id"
    joinTable: string; // e.g., "facilitator_media"
}

export async function syncEntityMedia({
    entityId,
    media,
    authUserId,
    entityKey,
    joinTable,
}: SyncEntityMediaParams) {
    let existingJoinRecords: any[] = [];

    try {
        // Fetch existing media links
        const { data: existingData } = await supabaseClient
            .from(joinTable)
            .select()
            .eq(entityKey, entityId);

        existingJoinRecords = existingData || [];

        // Delete existing links
        const { error: deleteError } = await supabaseClient
            .from(joinTable)
            .delete()
            .eq(entityKey, entityId);

        if (deleteError) throw deleteError;

        // Prepare and insert new media
        if (media.length) {
            const mediaRecords = [];

            for (let i = 0; i < media.length; i++) {
                const item = media[i];

                let mediaId = item.id;

                if (!mediaId) {
                    const mediaRecord = await createMedia({
                        storage_path: item.storage_path,
                        title: item.title,
                        description: item.description,
                        is_explicit: item.is_explicit || false,
                        is_public: item.is_public ?? true,
                        authUserId,
                    });
                    mediaId = mediaRecord.id;
                }

                mediaRecords.push({
                    [entityKey]: entityId,
                    media_id: mediaId,
                    sort_order: i,
                });
            }

            const { error: insertError } = await supabaseClient
                .from(joinTable)
                .insert(mediaRecords);

            if (insertError) throw insertError;
        }
    } catch (err: any) {
        // Rollback to previous state
        await supabaseClient
            .from(joinTable)
            .insert(existingJoinRecords)
            .eq(entityKey, entityId);

        console.error(`Error syncing media for ${entityKey}:`, err.message || err);
        throw err;
    }
}
