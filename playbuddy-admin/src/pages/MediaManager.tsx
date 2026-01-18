import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Grid from '@mui/material/Grid';
import {
    Box,
    Card,
    CardMedia,
    CardActions,
    IconButton,
    LinearProgress,
    Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { supabaseClient } from '../lib/supabaseClient';
import { Media } from '../common/types/commonTypes';

interface MediaManagerProps {
    media: Partial<Media>[];
    onMediaChange: (media: Partial<Media>[]) => void;
}

export const MediaManager: React.FC<MediaManagerProps> = ({ media, onMediaChange }) => {
    const [mediaItems, setMediaItems] = useState<Partial<Media>[]>(media);
    const [uploading, setUploading] = useState(false);

    // Sync with parent-controlled media
    useEffect(() => {
        setMediaItems(media);
    }, [media]);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        setUploading(true);
        const newItems: Partial<Media>[] = [];

        for (const file of acceptedFiles) {
            const path = `media/${Date.now()}-${file.name}`;
            const { error } = await supabaseClient
                .storage
                .from('general')
                .upload(path, file);
            if (error) {
                console.error('Upload error', error.message);
                continue;
            }
            const { data: { publicUrl } } = supabaseClient.storage.from('general').getPublicUrl(path);
            newItems.push({ storage_path: publicUrl });
        }

        const updated = [...mediaItems, ...newItems];
        setMediaItems(updated);
        onMediaChange(updated);
        setUploading(false);
    }, [mediaItems, onMediaChange]);

    const handleDelete = (idx: number) => {
        const updated = mediaItems.filter((_, i) => i !== idx);
        setMediaItems(updated);
        onMediaChange(updated);
        // TODO: Optionally delete from storage
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [], 'video/*': [], 'application/pdf': [] },
        multiple: true,
    });

    return (
        <Box>
            <Box
                {...getRootProps()}
                sx={{
                    border: '2px dashed #aaa',
                    p: { xs: 2, sm: 3 },
                    textAlign: 'center',
                    borderRadius: 2,
                    bgcolor: isDragActive ? '#eee' : 'transparent',
                    cursor: 'pointer',
                }}
            >
                <input {...getInputProps()} />
                <Typography>
                    {isDragActive ? 'Drop files here...' : 'Drag & drop or click to upload'}
                </Typography>
            </Box>

            {uploading && <LinearProgress sx={{ mt: 1 }} />}

            <Grid container spacing={1} sx={{ mt: 1 }}>
                {mediaItems.map((item, idx) => (
                    <Grid size={{ xs: 6, sm: 4, md: 3 }} key={idx}>
                        <Card>
                            {item.storage_path?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                <CardMedia component="img" height="100" image={item.storage_path} />
                            ) : (
                                <Box display="flex" justifyContent="center" alignItems="center" height={100}>
                                    {item.thumbnail_url ? (
                                        <CardMedia component="img" height="100" image={item.thumbnail_url} />
                                    ) : (
                                        <InsertDriveFileIcon fontSize="large" />
                                    )}
                                </Box>
                            )}
                            <CardActions sx={{ justifyContent: 'space-between', p: 0.5 }}>
                                <IconButton href={item.storage_path ?? ''} target="_blank" size="small">
                                    <VisibilityIcon />
                                </IconButton>
                                <IconButton onClick={() => handleDelete(idx)} size="small">
                                    <DeleteIcon />
                                </IconButton>
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};
