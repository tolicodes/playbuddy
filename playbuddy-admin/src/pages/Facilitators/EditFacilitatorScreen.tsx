import React, { useEffect, useState, useCallback } from 'react';
import {
    Paper,
    Box,
    Typography,
    TextField,
    Button,
    Checkbox,
    FormControlLabel,
    CircularProgress,
    Autocomplete,
    Chip,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { useDropzone } from 'react-dropzone';
import { supabaseClient } from '../../lib/supabaseClient';
import {
    useFetchFacilitators,
    useCreateFacilitator,
    useUpdateFacilitator,
} from '../../common/db-axios/useFacilitators';
import { useFetchOrganizers } from '../../common/db-axios/useOrganizers';
import { useFetchEvents } from '../../common/db-axios/useEvents';
import { EventsManager } from './AddEventToFacilitator';
import { MediaManager } from '../MediaManager';

// Form values interface
type FormValues = {
    name: string;
    bio: string;
    profile_image_url: string;
    location: string;
    verified: boolean;
    instagram_handle: string;
    fetlife_handle: string;
    tags?: string[];
    media?: string[];
};

// Validation schema
const schema: Yup.ObjectSchema<FormValues> = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    bio: Yup.string().required('Bio is required'),
    profile_image_url: Yup.string()
        .url('Must be a valid URL')
        .required('Profile image is required'),
    location: Yup.string().required('Location is required'),
    verified: Yup.boolean().required('Required'),
    instagram_handle: Yup.string().required('Instagram handle is required'),
    fetlife_handle: Yup.string().required('FetLife handle is required'),
    tags: Yup.array().of(Yup.string().required('Required')),
    media: Yup.array().of(Yup.string().required('Required')),
});

export default function EditFacilitatorScreen() {
    // Fetch data hooks
    const { data: list, isLoading, error, refetch } = useFetchFacilitators();
    const createFac = useCreateFacilitator();
    const updateFac = useUpdateFacilitator();
    const { data: organizers } = useFetchOrganizers();
    const { data: events } = useFetchEvents();

    // Determine editing ID from URL
    const [editingId, setEditingId] = useState<string | null>(null);
    useEffect(() => {
        const parts = window.location.pathname.split('/');
        const id = parts[parts.length - 1];
        if (id && id !== 'new') setEditingId(id);
    }, []);

    // React Hook Form
    const {
        control,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<FormValues>({
        resolver: yupResolver(schema),
        defaultValues: {
            name: '', bio: '', profile_image_url: '',
            location: '', verified: false, instagram_handle: '', fetlife_handle: '',
            tags: [], media: []
        },
    });

    // Watch for preview URLs
    const profileImageUrl = watch('profile_image_url');

    // Populate form when editing
    useEffect(() => {
        if (editingId && list) {
            const f = list.find((f) => f.id === editingId);
            if (f) {
                setValue('name', f.name);
                setValue('bio', f.bio ?? '');
                setValue('profile_image_url', f.profile_image_url ?? '');
                setValue('location', f.location ?? '');
                setValue('verified', f.verified);
                setValue('instagram_handle', f.instagram_handle ?? '');
                setValue('fetlife_handle', f.fetlife_handle ?? '');
                setValue('tags', f.tags.map((t) => t.name));
                setValue('media', f.media.map((m) => m.url));
            }
        } else {
            reset();
        }
    }, [editingId, list, reset, setValue]);

    // Dropzone for profile image
    const onDrop = useCallback(async (files: File[]) => {
        const file = files[0];
        const ext = file.name.split('.').pop();
        const fileName = `fac-${Date.now()}.${ext}`;
        const { data, error: uploadError } = await supabaseClient
            .storage
            .from('general')
            .upload(fileName, file);
        if (uploadError) {
            console.error(uploadError.message);
            return;
        }
        const { data: { publicUrl } } = supabaseClient
            .storage
            .from('general')
            .getPublicUrl(data.path);
        setValue('profile_image_url', publicUrl);
    }, [setValue]);
    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] } });

    // Submit handler
    const onSubmit = async (vals: FormValues) => {
        if (editingId) {
            await updateFac.mutateAsync({ id: editingId, ...vals });
        } else {
            await createFac.mutateAsync(vals);
        }
        refetch();
        reset();
        // setEditingId(null);
    };

    if (isLoading) return <CircularProgress />;
    if (error) return <Typography color="error">Error loading facilitators</Typography>;

    return (
        <Paper sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
            <Typography variant="h4" gutterBottom>
                {editingId ? 'Edit Facilitator' : 'Add Facilitator'}
            </Typography>

            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                {/* Name */}
                <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                        <TextField {...field} label="Name" fullWidth margin="normal"
                            error={!!errors.name} helperText={errors.name?.message} />
                    )}
                />

                {/* Dropzone for photo */}
                <Box
                    {...getRootProps()}
                    sx={{
                        border: '2px dashed #ccc', p: 2, textAlign: 'center', my: 2,
                        bgcolor: isDragActive ? '#fafafa' : 'transparent', cursor: 'pointer'
                    }}
                >
                    <input {...getInputProps()} />
                    <Typography>
                        {isDragActive ? 'Drop photo here...' : 'Drag & drop photo, or click to select'}
                    </Typography>
                </Box>
                {/* Preview uploaded image */}
                {profileImageUrl && (
                    <Box
                        component="img"
                        src={profileImageUrl}
                        alt="Profile preview"
                        sx={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 1, mx: 'auto', mb: 2 }}
                    />
                )}

                {/* Photo URL */}
                <Controller
                    name="profile_image_url"
                    control={control}
                    render={({ field }) => (
                        <TextField {...field} label="Photo URL" fullWidth margin="normal"
                            error={!!errors.profile_image_url} helperText={errors.profile_image_url?.message} />
                    )}
                />

                {/* Intro Video URL */}
                {/* <Controller
                    name="intro_video_url"
                    control={control}
                    render={({ field }) => (
                        <TextField {...field} label="Intro Video URL" fullWidth margin="normal"
                            error={!!errors.intro_video_url} helperText={errors.intro_video_url?.message} />
                    )}
                /> */}
                {/* Preview uploaded video */}
                {/* {introVideoUrl && (
                    <Box sx={{ mt: 2, mb: 2 }}>
                        <video
                            src={introVideoUrl}
                            controls
                            style={{ width: '100%', maxHeight: 240, display: 'block', margin: '0 auto' }}
                        />
                    </Box>
                )} */}

                {/* Bio */}
                <Controller
                    name="bio"
                    control={control}
                    render={({ field }) => (
                        <TextField {...field} label="Bio" fullWidth margin="normal" multiline rows={3}
                            error={!!errors.bio} helperText={errors.bio?.message} />
                    )}
                />

                {/* Location */}
                <Controller
                    name="location"
                    control={control}
                    render={({ field }) => (
                        <TextField {...field} label="Location" fullWidth margin="normal"
                            error={!!errors.location} helperText={errors.location?.message} />
                    )}
                />

                {/* Verified */}
                <Controller
                    name="verified"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                        <FormControlLabel
                            control={<Checkbox checked={value} onChange={e => onChange(e.target.checked)} />}
                            label="Verified" />
                    )}
                />

                {/* Instagram Handle */}
                <Controller
                    name="instagram_handle"
                    control={control}
                    render={({ field }) => (
                        <TextField {...field} label="Instagram Handle" fullWidth margin="normal"
                            error={!!errors.instagram_handle} helperText={errors.instagram_handle?.message} />
                    )}
                />

                {/* FetLife Handle */}
                <Controller
                    name="fetlife_handle"
                    control={control}
                    render={({ field }) => (
                        <TextField {...field} label="FetLife Handle" fullWidth margin="normal"
                            error={!!errors.fetlife_handle} helperText={errors.fetlife_handle?.message} />
                    )}
                />

                <Controller
                    name="tags"
                    control={control}
                    defaultValue={[]}
                    render={({ field: { value, onChange } }) => (
                        <Autocomplete
                            multiple
                            freeSolo
                            options={[]}            // you can preload common tags here
                            value={value}
                            onChange={(_, newTags) => onChange(newTags)}
                            renderTags={(tagValues, getTagProps) =>
                                tagValues.map((tag, idx) => (
                                    <Chip
                                        label={tag}
                                        {...getTagProps({ index: idx })}
                                    />
                                ))
                            }
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Tags"
                                    placeholder="Enter or comma-separate"
                                    margin="normal"
                                />
                            )}
                        />
                    )}
                />

                <Controller
                    name="media"
                    control={control}
                    defaultValue={[]}
                    render={({ field: { value, onChange } }) => (
                        <MediaManager urls={value || []} onUrlsChange={onChange} />
                    )}
                />


                {/* Submit Button */}
                <Box sx={{ mt: 3, textAlign: 'right' }}>
                    <Button type="submit" variant="contained" disabled={isSubmitting}>
                        {editingId ? 'Update' : 'Create'}
                    </Button>
                </Box>
            </Box>

            {/* Events Manager */}
            {editingId && (
                <EventsManager facilitatorId={editingId} events={events} organizers={organizers} refetch={refetch} />
            )}
        </Paper>
    );
}