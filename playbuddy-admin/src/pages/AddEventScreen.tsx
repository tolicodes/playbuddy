import React, { useCallback, useEffect } from 'react';
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
import { useFetchOrganizers } from '../common/db-axios/useOrganizers';
import { useCreateEvent } from '../common/db-axios/useEvents';
import { supabaseClient } from '../lib/supabaseClient';



const schema = Yup.object().shape({
    name: Yup.string().required('Required'),
    start_date: Yup.date().required('Required'),
    end_date: Yup.date()
        .min(Yup.ref('start_date'), 'End must be after start')
        .required('Required'),
    ticket_url: Yup.string().url('Invalid URL').required('Required'),
    image_url: Yup.string().required('Required'),
    description: Yup.string().required('Required'),
    type: Yup.string().oneOf(['event', 'retreat']).required('Required'),
    organizer: Yup.number().required('Required'),
    organizer_name: Yup.string().required('Required'),
    play_party: Yup.boolean().required('Required'),
});

type FormValues = Yup.InferType<typeof schema>


export default function AddEventPage() {
    const { data: organizers, isLoading: organizersLoading } = useFetchOrganizers();
    const createEventMutation = useCreateEvent()

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
        setValue,
        watch,
    } = useForm<FormValues>({
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
        },
    });

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

        const organizer = organizerId && organizerId !== '0' ? {
            id: organizerId,
        } : {
            name: organizerName
        }

        const payload = {
            ...data,
            event_url: data.ticket_url,
            ticket_url: data.ticket_url,
            location: '',
            price: '0',
            tags: [],
            recurring: 'none' as 'none' | 'weekly' | 'monthly',
            organizer,
            start_date: data.start_date.toISOString(),
            end_date: data.end_date.toISOString(),
            image_url: data.image_url,
            play_party: data.play_party,
        };

        createEventMutation.mutate(payload);
    };

    return (
        <Paper sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
            <Typography variant="h5" mb={2}>
                Add New Event
            </Typography>
            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
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
                            <InputLabel>Organizer</InputLabel>
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

                <Button
                    variant="contained"
                    type="submit"
                    disabled={isSubmitting || createEventMutation.isPending}
                >
                    {createEventMutation.isPending ? 'Submitting...' : 'Add Event'}
                </Button>
            </Box>
        </Paper>
    );
}
