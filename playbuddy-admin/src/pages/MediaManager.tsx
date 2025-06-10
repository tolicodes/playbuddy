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

interface MediaManagerProps {
    urls: string[];
    onUrlsChange: (urls: string[]) => void;
}

export const MediaManager: React.FC<MediaManagerProps> = ({ urls, onUrlsChange }) => {
    const [files, setFiles] = useState<string[]>(urls);
    const [uploading, setUploading] = useState(false);

    // Sync with parent-controlled urls
    useEffect(() => setFiles(urls), [urls]);

    const onDrop = useCallback(async (accepted: File[]) => {
        setUploading(true);
        const newUrls: string[] = [];

        for (const file of accepted) {
            const path = `media/${Date.now()}-${file.name}`;
            const { error } = await supabaseClient.storage.from('general').upload(path, file);
            if (!error) {
                const { data } = supabaseClient.storage.from('general').getPublicUrl(path);
                newUrls.push(data.publicUrl);
            } else {
                console.error('Upload error', error.message);
            }
        }

        const updated = [...files, ...newUrls];
        setFiles(updated);
        onUrlsChange(updated);

        setUploading(false);
    }, [files, onUrlsChange]);

    const handleDelete = (idx: number) => {
        const updated = files.filter((_, i) => i !== idx);
        setFiles(updated);
        onUrlsChange(updated);
        // Optionally: also delete from Supabase
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
                {files.map((url, idx) => (
                    <Grid key={idx} size={{ xs: 6, sm: 4, md: 3 }}>
                        <Card>
                            {url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                <CardMedia component="img" height="100" image={url} />
                            ) : (
                                <Box display="flex" justifyContent="center" alignItems="center" height={100}>
                                    <InsertDriveFileIcon fontSize="large" />
                                </Box>
                            )}
                            <CardActions sx={{ justifyContent: 'space-between', p: 0.5 }}>
                                <IconButton href={url} target="_blank" size="small">
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
