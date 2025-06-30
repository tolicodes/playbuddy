import React, { useCallback, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import {
    TextField,
    Button,
    MenuItem,
    Select,
    InputLabel,
    FormControl,
    FormHelperText,
    Typography,
    Box,
    Paper,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useDropzone } from 'react-dropzone';
import { useFetchOrganizers } from '../../common/db-axios/useOrganizers';
import { useCreateEvent, useFetchEvents } from '../../common/db-axios/useEvents';
import { supabaseClient } from '../../lib/supabaseClient';
import { useUpdateEvent } from '../../common/db-axios/useEvents';
import { MediaManager } from '../MediaManager';

const schema = Yup.object().shape({
    name: Yup.string().required('Required'),
    start_date: Yup.date().required('Required'),
    end_date: Yup.date()
        .min(Yup.ref('start_date'), 'End must be after start')
        .required('Required'),
    ticket_url: Yup.string().url('Invalid URL').required('Required'),
    image_url: Yup.string().required('Required'),
    description: Yup.string().required('Required'),
    type: Yup.string().optional(),
    organizer: Yup.number().optional(),
    organizer_name: Yup.string().optional(),
    play_party: Yup.boolean().optional().nullable(),
    facilitator_only: Yup.boolean().optional().nullable(),
    play_party_instructions: Yup.string().optional(),
    vetted: Yup.boolean().optional().nullable(),
    vetting_url: Yup.string().optional(),
    location: Yup.string().optional(),
    media: Yup.array()
        .of(
            Yup.object().shape({
                id: Yup.string().optional(),
                storage_path: Yup.string().optional(),
                thumbnail_url: Yup.string().optional().nullable(),
            })
        )
        .optional(),
});

type FormValues = Yup.InferType<typeof schema>


export default function EditEventPage() {
    const { data: organizers, isLoading: organizersLoading } = useFetchOrganizers();
    const createEventMutation = useCreateEvent()

    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        const pathSegments = window.location.pathname.split('/');
        const lastSegment = pathSegments[pathSegments.length - 1];

        if (lastSegment && lastSegment !== 'new' && /^[a-zA-Z0-9\-]+$/.test(lastSegment)) {
            setEditingId(lastSegment);
        } else {
            setEditingId(null);
        }
    }, []);

    const updateEventMutation = useUpdateEvent();

    const { data: events = [], isLoading: loadingEvents } = useFetchEvents();

    const eventToEdit = events.find((e: any) => e.id + '' === editingId);


    const form = useForm<FormValues>({
        // @ts-ignore
        resolver: yupResolver(schema),
        defaultValues: {
            name: '',
            start_date: new Date(),
            end_date: new Date(),
            ticket_url: '',
            image_url: '',
            description: '',
            type: 'event',
            organizer: 0,
            organizer_name: '',
            play_party: false,
            facilitator_only: false,
            vetted: false,
            vetting_url: '',
            location: '',
            media: [],
        },
    });
    const { control, handleSubmit, setValue, reset, watch, formState: { errors, isSubmitting } } = form;

    useEffect(() => {
        if (eventToEdit) {
            reset({
                ...eventToEdit,
                start_date: new Date(eventToEdit.start_date),
                end_date: new Date(eventToEdit.end_date),
                organizer: eventToEdit.organizer?.id || 0,
                organizer_name: eventToEdit.organizer?.name || '',
                vetted: eventToEdit.vetted || false,
                vetting_url: eventToEdit.vetting_url || '',
                location: eventToEdit.location || '',
                media: eventToEdit.media || [],
            });
        }
    }, [eventToEdit, reset]);


    const imageUrl = watch('image_url');

    // Dropzone for image upload
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
        setValue('image_url', publicUrl);
    }, [setValue]);

    const { getRootProps, getInputProps } = useDropzone({ onDrop });

    const onSubmit = (data: FormValues) => {
        const organizerId = data.organizer?.toString();
        const organizerName = data.organizer_name?.toString() || '';

        if (!organizerId && !organizerName) {
            alert('Organizer is required');
            return;
        }

        const organizer = organizerId && organizerId !== '0'
            ? { id: organizerId }
            : { name: organizerName };

        const payload = {
            ...data,
            organizer,
            event_url: data.ticket_url,
            start_date: data.start_date.toISOString(),
            end_date: data.end_date.toISOString(),
            price: '0',
            tags: [],
            recurring: 'none',
        };

        if (editingId) {
            updateEventMutation.mutate({ id: editingId, ...payload });
        } else {
            // @ts-ignore
            createEventMutation.mutate(payload);
        }
    };

    return (
        <Paper sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
            <Typography variant="h5" mb={2}>
                Add New Event
            </Typography>
            {/* @ts-ignore */}
            <form onSubmit={handleSubmit(onSubmit, (err) => {
                alert('Validation failed: ' + JSON.stringify(err));
            })}>
                <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            label="Event Name"
                            fullWidth
                            error={!!errors.name}
                            helperText={errors.name?.message}
                            margin="normal"
                        />
                    )}
                />

                <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <Controller
                        name="start_date"
                        control={control}
                        render={({ field }) => (
                            <DateTimePicker
                                label="Start Date"
                                {...field}
                            />
                        )}
                    />
                    <Controller
                        name="end_date"
                        control={control}
                        render={({ field }) => (
                            <DateTimePicker
                                label="End Date"
                                {...field}
                            />
                        )}
                    />
                </LocalizationProvider>

                <Controller
                    name="organizer"
                    control={control}
                    render={({ field }) => (
                        <FormControl fullWidth margin="normal" error={!!errors.organizer}>
                            <InputLabel>Organizers</InputLabel>
                            <Select {...field} label="Organizer">
                                <MenuItem value="0">Create an organizer</MenuItem>
                                {organizers?.map((o: any) => (
                                    <MenuItem key={o.id} value={o.id}>
                                        {o.name}
                                    </MenuItem>
                                ))}
                            </Select>
                            <FormHelperText>{errors.organizer?.message}</FormHelperText>
                        </FormControl>
                    )}
                />

                <Controller
                    name="organizer_name"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            label="Organizer Name"
                            fullWidth
                            margin="normal"
                        />
                    )}
                />


                <Controller
                    name="ticket_url"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            label="Ticket URL"
                            fullWidth
                            margin="normal"
                            error={!!errors.ticket_url}
                            helperText={errors.ticket_url?.message}
                        />
                    )}
                />

                <Box
                    {...getRootProps()}
                    sx={{
                        border: '2px dashed #ccc',
                        p: 2,
                        textAlign: 'center',
                        my: 2,
                        cursor: 'pointer',
                    }}
                >
                    <input {...getInputProps()} />
                    {(
                        <Typography>Drag & drop image here, or click to select</Typography>
                    )}
                    {/* Preview uploaded image */}
                    {imageUrl && (
                        <Box
                            component="img"
                            src={imageUrl}
                            alt="Profile preview"
                            sx={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 1, mx: 'auto', mb: 2 }}
                        />
                    )}
                    {/* Photo URL */}
                    <Controller
                        name="image_url"
                        control={control}
                        render={({ field }) => (
                            <TextField {...field} label="Photo URL" fullWidth margin="normal"
                                error={!!errors.image_url} helperText={errors.image_url?.message} />
                        )}
                    />
                </Box>

                <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            label="Description (Markdown)"
                            fullWidth
                            multiline
                            rows={6}
                            margin="normal"
                            error={!!errors.description}
                            helperText={errors.description?.message}
                        />
                    )}
                />

                <Controller
                    name="location"
                    control={control}
                    render={({ field }) => (
                        <TextField {...field} label="Location" fullWidth margin="normal"
                            error={!!errors.location} helperText={errors.location?.message} />
                    )}
                />

                <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Type</InputLabel>
                            <Select {...field} label="Type">
                                <MenuItem value="event">Event</MenuItem>
                                <MenuItem value="retreat">Retreat</MenuItem>
                            </Select>
                        </FormControl>
                    )}
                />

                <Controller
                    name="play_party"
                    control={control}
                    render={({ field }) => (
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Play Party</InputLabel>
                            <Select {...field} label="Play Party">
                                <MenuItem value="true">Yes</MenuItem>
                                <MenuItem value="false">No</MenuItem>
                            </Select>
                        </FormControl>
                    )}
                />

                <Controller
                    name="facilitator_only"
                    control={control}
                    render={({ field }) => (
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Facilitator Only</InputLabel>
                            <Select {...field} label="Facilitator Only">
                                <MenuItem value="true">Yes</MenuItem>
                                <MenuItem value="false">No</MenuItem>
                            </Select>
                        </FormControl>
                    )}
                />

                <Controller
                    name="vetted"
                    control={control}
                    render={({ field }) => (
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Vetted</InputLabel>
                            <Select {...field} label="Vetted">
                                <MenuItem value="true">Yes</MenuItem>
                                <MenuItem value="false">No</MenuItem>
                            </Select>
                        </FormControl>
                    )}
                />

                <Controller
                    name="vetting_url"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            label="Vetting URL"
                            fullWidth
                            margin="normal"
                            error={!!errors.vetting_url}
                            helperText={errors.vetting_url?.message}
                        />
                    )}
                />

                {/* Media Manager */}
                <Controller
                    name="media"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                        <MediaManager media={value || []} onMediaChange={onChange} />
                    )}
                />

                <Button
                    variant="contained"
                    type="submit"
                    disabled={isSubmitting || createEventMutation.isPending || updateEventMutation.isPending}
                >
                    {editingId
                        ? updateEventMutation.isPending
                            ? 'Updating...'
                            : 'Update Event'
                        : createEventMutation.isPending
                            ? 'Submitting...'
                            : 'Add Event'}
                </Button>

            </form>
        </Paper >
    );
}
