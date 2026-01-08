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
    Stack,
    FormControlLabel,
    Switch,
    CircularProgress,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useDropzone } from 'react-dropzone';
import { useFetchOrganizers } from '../../common/db-axios/useOrganizers';
import { useCreateEvent, useUpdateEvent } from '../../common/db-axios/useEvents';
import { supabaseClient } from '../../lib/supabaseClient';
import { MediaManager } from '../MediaManager';
import type { Event } from '../../common/types/commonTypes';

const schema = Yup.object().shape({
    original_id: Yup.string().optional(),
    name: Yup.string().required('Required'),
    start_date: Yup.date().required('Required'),
    end_date: Yup.date()
        .min(Yup.ref('start_date'), 'End must be after start')
        .required('Required'),
    ticket_url: Yup.string().url('Invalid URL').required('Required'),
    event_url: Yup.string().optional(),
    image_url: Yup.string().required('Required'),
    video_url: Yup.string().optional(),
    description: Yup.string().required('Required'),
    short_description: Yup.string().optional(),
    custom_description: Yup.string().optional(),
    price: Yup.string().optional(),
    tags: Yup.string().optional(),
    classification_tags: Yup.string().optional(),
    classification_experience_level: Yup.string().optional(),
    classification_interactivity_level: Yup.string().optional(),
    classification_inclusivity: Yup.string().optional(),
    type: Yup.string().optional(),
    recurring: Yup.string().optional(),
    visibility: Yup.string().optional(),
    approval_status: Yup.string().optional(),
    organizer: Yup.number().optional(),
    organizer_name: Yup.string().optional(),
    play_party: Yup.boolean().optional().nullable(),
    facilitator_only: Yup.boolean().optional().nullable(),
    vetted: Yup.boolean().optional().nullable(),
    vetting_url: Yup.string().optional(),
    weekly_pick: Yup.boolean().optional().nullable(),
    non_ny: Yup.boolean().optional().nullable(),
    hidden: Yup.boolean().optional().nullable(),
    location: Yup.string().optional(),
    neighborhood: Yup.string().optional(),
    city: Yup.string().optional(),
    region: Yup.string().optional(),
    country: Yup.string().optional(),
    lat: Yup.string().optional(),
    lon: Yup.string().optional(),
    munch_id: Yup.string().optional(),
    frozen: Yup.boolean().optional().nullable(),
    dataset: Yup.string().optional(),
    source_url: Yup.string().optional(),
    source_origination_group_id: Yup.string().optional(),
    source_origination_group_name: Yup.string().optional(),
    source_origination_platform: Yup.string().optional(),
    source_ticketing_platform: Yup.string().optional(),
    timestamp_scraped: Yup.date().nullable().optional(),
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

type FormValues = Yup.InferType<typeof schema>;

type EventEditorFormProps = {
    event?: Event | null;
    mode: 'edit' | 'create';
    submitLabel?: string;
    showCancel?: boolean;
    onCancel?: () => void;
    onSaved?: () => void;
};

const defaultValues: FormValues = {
    original_id: '',
    name: '',
    start_date: new Date(),
    end_date: new Date(),
    ticket_url: '',
    event_url: '',
    image_url: '',
    video_url: '',
    description: '',
    short_description: '',
    custom_description: '',
    price: '',
    tags: '',
    classification_tags: '',
    classification_experience_level: '',
    classification_interactivity_level: '',
    classification_inclusivity: '',
    type: 'event',
    recurring: 'none',
    visibility: 'public',
    approval_status: 'approved',
    organizer: 0,
    organizer_name: '',
    play_party: false,
    facilitator_only: false,
    vetted: false,
    vetting_url: '',
    weekly_pick: false,
    non_ny: false,
    hidden: false,
    location: '',
    neighborhood: '',
    city: '',
    region: '',
    country: '',
    lat: '',
    lon: '',
    munch_id: '',
    frozen: false,
    dataset: '',
    source_url: '',
    source_origination_group_id: '',
    source_origination_group_name: '',
    source_origination_platform: '',
    source_ticketing_platform: '',
    timestamp_scraped: null,
    media: [],
};

const EXPERIENCE_LEVEL_OPTIONS = ['Beginner', 'Intermediate', 'Advanced'];
const INTERACTIVITY_LEVEL_OPTIONS = [
    'Social',
    'Discussion',
    'Intimate',
    'Sensual',
    'Erotic',
    'Sexual',
    'Extreme',
    'Hands-On',
    'Performance',
    'Observational',
];
const CLASSIFICATION_TAG_OPTIONS = [
    'Edge Play',
    'Rope',
    'Impact',
    'Dance',
    'Primal',
    'D/S',
    'Age Play',
    'Sensation',
    'Exhibitionism',
    'Knife Play',
    'Flirting',
    'Needle Play',
    'Medical',
    'Hypnosis',
    'Massage',
    'Ceremony',
    'Breathwork',
    'Energy',
    'Pet Play',
    'Art',
    'Wax Play',
    'Fire Play',
    'Electro',
    'Predicament',
    'Mindfuck',
    'Objectification',
    'Roleplay',
    'Protocol',
    'Pegging',
    'Yoga',
    'Cuddle',
    'Femdom',
    'Polyamory',
    'Dating',
    'Tantra',
    'Healing',
    'Community',
    'Connection',
];

export default function EventEditorForm({
    event,
    mode,
    submitLabel,
    showCancel = false,
    onCancel,
    onSaved,
}: EventEditorFormProps) {
    const { data: organizers = [] } = useFetchOrganizers();
    const createEventMutation = useCreateEvent();
    const updateEventMutation = useUpdateEvent();

    const formatCommaList = (values?: string[] | null) =>
        (values || []).filter(Boolean).join(', ');
    const parseCommaList = (value?: string | null) =>
        (value || '').split(',').map((item) => item.trim()).filter(Boolean);
    const toDateOrNull = (value?: string | null) => (value ? new Date(value) : null);

    const form = useForm<FormValues>({
        // @ts-ignore
        resolver: yupResolver(schema),
        defaultValues,
    });
    const { control, handleSubmit, setValue, reset, watch, formState: { errors } } = form;

    useEffect(() => {
        if (mode === 'edit') {
            if (!event) return;
            reset({
                ...defaultValues,
                ...event,
                original_id: event.original_id || '',
                start_date: new Date(event.start_date),
                end_date: new Date(event.end_date),
                organizer: event.organizer?.id || 0,
                organizer_name: event.organizer?.name || '',
                event_url: event.event_url || event.ticket_url || '',
                video_url: event.video_url || '',
                short_description: event.short_description || '',
                custom_description: event.custom_description || '',
                price: event.price || '',
                tags: formatCommaList(event.tags),
                classification_tags: formatCommaList(event.classification?.tags),
                classification_experience_level: event.classification?.experience_level || '',
                classification_interactivity_level: event.classification?.interactivity_level || '',
                classification_inclusivity: formatCommaList(event.classification?.inclusivity),
                type: event.type || 'event',
                recurring: event.recurring || 'none',
                visibility: event.visibility || 'public',
                approval_status: event.approval_status || 'approved',
                play_party: !!event.play_party,
                facilitator_only: !!event.facilitator_only,
                vetted: !!event.vetted,
                weekly_pick: !!event.weekly_pick,
                non_ny: !!event.non_ny,
                hidden: !!event.hidden,
                location: event.location || '',
                neighborhood: event.neighborhood || '',
                city: event.city || '',
                region: event.region || '',
                country: event.country || '',
                lat: event.lat !== undefined && event.lat !== null ? String(event.lat) : '',
                lon: event.lon !== undefined && event.lon !== null ? String(event.lon) : '',
                munch_id: event.munch_id ? String(event.munch_id) : '',
                frozen: !!event.frozen,
                dataset: event.dataset || '',
                source_url: event.source_url || '',
                source_origination_group_id: event.source_origination_group_id || '',
                source_origination_group_name: event.source_origination_group_name || '',
                source_origination_platform: event.source_origination_platform || '',
                source_ticketing_platform: event.source_ticketing_platform || '',
                timestamp_scraped: toDateOrNull(event.timestamp_scraped),
                media: event.media || [],
            });
        } else {
            reset(defaultValues);
        }
    }, [event, mode, reset]);

    const imageUrl = watch('image_url');

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

    const onSubmit = async (data: FormValues) => {
        const {
            classification_tags,
            classification_experience_level,
            classification_interactivity_level,
            classification_inclusivity,
            ...eventData
        } = data;
        const organizerId = eventData.organizer?.toString();
        const organizerName = eventData.organizer_name?.toString() || '';

        if (!organizerId && !organizerName) {
            alert('Organizer is required');
            return;
        }

        const organizer = organizerId && organizerId !== '0'
            ? { id: organizerId }
            : { name: organizerName };

        const classification = {
            tags: parseCommaList(classification_tags),
            experience_level: classification_experience_level || null,
            interactivity_level: classification_interactivity_level || null,
            inclusivity: parseCommaList(classification_inclusivity),
        };

        const payload = {
            ...eventData,
            organizer,
            event_url: eventData.event_url || eventData.ticket_url,
            start_date: eventData.start_date.toISOString(),
            end_date: eventData.end_date.toISOString(),
            timestamp_scraped: eventData.timestamp_scraped ? eventData.timestamp_scraped.toISOString() : null,
            tags: parseCommaList(eventData.tags),
            price: eventData.price ?? '',
            munch_id: eventData.munch_id ? Number(eventData.munch_id) : null,
            visibility: eventData.visibility || null,
            approval_status: eventData.approval_status || null,
            recurring: eventData.recurring || 'none',
            dataset: eventData.dataset || null,
            source_url: eventData.source_url || null,
            source_origination_group_id: eventData.source_origination_group_id || null,
            source_origination_group_name: eventData.source_origination_group_name || null,
            source_origination_platform: eventData.source_origination_platform || null,
            source_ticketing_platform: eventData.source_ticketing_platform || null,
            lat: eventData.lat || null,
            lon: eventData.lon || null,
            city: eventData.city || null,
            region: eventData.region || null,
            country: eventData.country || null,
            original_id: eventData.original_id || null,
            short_description: eventData.short_description || null,
            custom_description: eventData.custom_description || null,
            video_url: eventData.video_url || null,
            classification,
        };

        try {
            if (mode === 'edit') {
                if (!event?.id) {
                    alert('Missing event id');
                    return;
                }
                await updateEventMutation.mutateAsync({ id: event.id, ...payload });
            } else {
                // @ts-ignore
                await createEventMutation.mutateAsync(payload);
            }
            onSaved?.();
        } catch (err) {
            console.error(err);
            alert('Failed to save event');
        }
    };

    if (mode === 'edit' && !event) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={24} />
            </Box>
        );
    }

    return (
        // @ts-ignore
        <form onSubmit={handleSubmit(onSubmit, (err) => {
            alert('Validation failed: ' + JSON.stringify(err));
        })}>
            <Typography variant="subtitle1" sx={{ mt: 1 }}>
                Details
            </Typography>
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
            <Controller
                name="short_description"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        label="Short Description"
                        fullWidth
                        multiline
                        rows={2}
                        margin="normal"
                    />
                )}
            />
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
                name="custom_description"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        label="Custom Description"
                        fullWidth
                        multiline
                        rows={4}
                        margin="normal"
                    />
                )}
            />

            <Typography variant="subtitle1" sx={{ mt: 2 }}>
                Schedule
            </Typography>
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

            <Typography variant="subtitle1" sx={{ mt: 2 }}>
                Organizer
            </Typography>
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

            <Typography variant="subtitle1" sx={{ mt: 2 }}>
                Location
            </Typography>
            <Controller
                name="location"
                control={control}
                render={({ field }) => (
                    <TextField {...field} label="Location" fullWidth margin="normal"
                        error={!!errors.location} helperText={errors.location?.message} />
                )}
            />
            <Controller
                name="neighborhood"
                control={control}
                render={({ field }) => (
                    <TextField {...field} label="Neighborhood" fullWidth margin="normal" />
                )}
            />
            <Controller
                name="city"
                control={control}
                render={({ field }) => (
                    <TextField {...field} label="City" fullWidth margin="normal" />
                )}
            />
            <Controller
                name="region"
                control={control}
                render={({ field }) => (
                    <TextField {...field} label="Region" fullWidth margin="normal" />
                )}
            />
            <Controller
                name="country"
                control={control}
                render={({ field }) => (
                    <TextField {...field} label="Country" fullWidth margin="normal" />
                )}
            />
            <Controller
                name="lat"
                control={control}
                render={({ field }) => (
                    <TextField {...field} label="Latitude" fullWidth margin="normal" />
                )}
            />
            <Controller
                name="lon"
                control={control}
                render={({ field }) => (
                    <TextField {...field} label="Longitude" fullWidth margin="normal" />
                )}
            />

            <Typography variant="subtitle1" sx={{ mt: 2 }}>
                Links and Media
            </Typography>
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
            <Controller
                name="event_url"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        label="Event URL"
                        fullWidth
                        margin="normal"
                    />
                )}
            />
            <Controller
                name="video_url"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        label="Video URL"
                        fullWidth
                        margin="normal"
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
                {imageUrl && (
                    <Box
                        component="img"
                        src={imageUrl}
                        alt="Profile preview"
                        sx={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 1, mx: 'auto', mb: 2 }}
                    />
                )}
                <Controller
                    name="image_url"
                    control={control}
                    render={({ field }) => (
                        <input type="hidden" {...field} />
                    )}
                />
                {errors.image_url?.message && (
                    <FormHelperText error sx={{ mt: 1 }}>
                        {errors.image_url.message}
                    </FormHelperText>
                )}
            </Box>

            <Controller
                name="price"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        label="Price"
                        fullWidth
                        margin="normal"
                    />
                )}
            />
            <Controller
                name="tags"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        label="Tags (comma separated)"
                        fullWidth
                        margin="normal"
                    />
                )}
            />

            <Typography variant="subtitle1" sx={{ mt: 2 }}>
                Classification
            </Typography>
            <Controller
                name="classification_experience_level"
                control={control}
                render={({ field }) => (
                    <Autocomplete
                        freeSolo
                        options={EXPERIENCE_LEVEL_OPTIONS}
                        value={field.value || null}
                        inputValue={field.value || ''}
                        onChange={(_, value) => field.onChange(value || '')}
                        onInputChange={(_, value) => field.onChange(value)}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Experience Level"
                                fullWidth
                                margin="normal"
                            />
                        )}
                    />
                )}
            />
            <Controller
                name="classification_interactivity_level"
                control={control}
                render={({ field }) => (
                    <Autocomplete
                        freeSolo
                        options={INTERACTIVITY_LEVEL_OPTIONS}
                        value={field.value || null}
                        inputValue={field.value || ''}
                        onChange={(_, value) => field.onChange(value || '')}
                        onInputChange={(_, value) => field.onChange(value)}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Interactivity Level"
                                fullWidth
                                margin="normal"
                            />
                        )}
                    />
                )}
            />
            <Controller
                name="classification_inclusivity"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        label="Inclusivity (comma separated)"
                        fullWidth
                        margin="normal"
                    />
                )}
            />
            <Controller
                name="classification_tags"
                control={control}
                render={({ field }) => (
                    <Autocomplete
                        multiple
                        freeSolo
                        options={CLASSIFICATION_TAG_OPTIONS}
                        value={parseCommaList(field.value)}
                        onChange={(_, value) => {
                            const next = Array.from(new Set(value.map((item) => item.trim()).filter(Boolean)));
                            field.onChange(next.join(', '));
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Classification Tags"
                                fullWidth
                                margin="normal"
                            />
                        )}
                    />
                )}
            />

            <Typography variant="subtitle1" sx={{ mt: 2 }}>
                Settings
            </Typography>
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
                name="recurring"
                control={control}
                render={({ field }) => (
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Recurring</InputLabel>
                        <Select {...field} label="Recurring">
                            <MenuItem value="none">None</MenuItem>
                            <MenuItem value="weekly">Weekly</MenuItem>
                            <MenuItem value="monthly">Monthly</MenuItem>
                        </Select>
                    </FormControl>
                )}
            />
            <Controller
                name="visibility"
                control={control}
                render={({ field }) => (
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Visibility</InputLabel>
                        <Select {...field} label="Visibility">
                            <MenuItem value="public">Public</MenuItem>
                            <MenuItem value="private">Private</MenuItem>
                        </Select>
                    </FormControl>
                )}
            />
            <Controller
                name="approval_status"
                control={control}
                render={({ field }) => (
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Approval Status</InputLabel>
                        <Select {...field} label="Approval Status">
                            <MenuItem value="approved">Approved</MenuItem>
                            <MenuItem value="pending">Pending</MenuItem>
                            <MenuItem value="rejected">Rejected</MenuItem>
                        </Select>
                    </FormControl>
                )}
            />

            <Typography variant="subtitle1" sx={{ mt: 2 }}>
                Flags
            </Typography>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', mt: 1 }}>
                <Controller
                    name="play_party"
                    control={control}
                    render={({ field }) => (
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={!!field.value}
                                    onChange={(e) => field.onChange(e.target.checked)}
                                />
                            }
                            label="Play party"
                        />
                    )}
                />
                <Controller
                    name="facilitator_only"
                    control={control}
                    render={({ field }) => (
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={!!field.value}
                                    onChange={(e) => field.onChange(e.target.checked)}
                                />
                            }
                            label="Facilitator only"
                        />
                    )}
                />
                <Controller
                    name="vetted"
                    control={control}
                    render={({ field }) => (
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={!!field.value}
                                    onChange={(e) => field.onChange(e.target.checked)}
                                />
                            }
                            label="Vetted"
                        />
                    )}
                />
                <Controller
                    name="weekly_pick"
                    control={control}
                    render={({ field }) => (
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={!!field.value}
                                    onChange={(e) => field.onChange(e.target.checked)}
                                />
                            }
                            label="Weekly pick"
                        />
                    )}
                />
                <Controller
                    name="non_ny"
                    control={control}
                    render={({ field }) => (
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={!!field.value}
                                    onChange={(e) => field.onChange(e.target.checked)}
                                />
                            }
                            label="Non-NY"
                        />
                    )}
                />
                <Controller
                    name="hidden"
                    control={control}
                    render={({ field }) => (
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={!!field.value}
                                    onChange={(e) => field.onChange(e.target.checked)}
                                />
                            }
                            label="Hidden"
                        />
                    )}
                />
                <Controller
                    name="frozen"
                    control={control}
                    render={({ field }) => (
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={!!field.value}
                                    onChange={(e) => field.onChange(e.target.checked)}
                                />
                            }
                            label="Freeze event (block scraper updates)"
                        />
                    )}
                />
            </Stack>

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

            <Typography variant="subtitle1" sx={{ mt: 2 }}>
                Munch
            </Typography>
            <Controller
                name="munch_id"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        label="Munch ID"
                        fullWidth
                        margin="normal"
                        type="number"
                    />
                )}
            />

            <Typography variant="subtitle1" sx={{ mt: 2 }}>
                Source
            </Typography>
            <Controller
                name="original_id"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        label="Original ID"
                        fullWidth
                        margin="normal"
                    />
                )}
            />
            <Controller
                name="dataset"
                control={control}
                render={({ field }) => (
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Dataset</InputLabel>
                        <Select {...field} label="Dataset">
                            <MenuItem value="">None</MenuItem>
                            <MenuItem value="Kink">Kink</MenuItem>
                            <MenuItem value="Whatsapp POC">Whatsapp POC</MenuItem>
                            <MenuItem value="Acro">Acro</MenuItem>
                            <MenuItem value="Conscious Touch">Conscious Touch</MenuItem>
                        </Select>
                    </FormControl>
                )}
            />
            <Controller
                name="source_url"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        label="Source URL"
                        fullWidth
                        margin="normal"
                    />
                )}
            />
            <Controller
                name="source_origination_group_id"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        label="Source Group ID"
                        fullWidth
                        margin="normal"
                    />
                )}
            />
            <Controller
                name="source_origination_group_name"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        label="Source Group Name"
                        fullWidth
                        margin="normal"
                    />
                )}
            />
            <Controller
                name="source_origination_platform"
                control={control}
                render={({ field }) => (
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Source Platform</InputLabel>
                        <Select {...field} label="Source Platform">
                            <MenuItem value="">None</MenuItem>
                            <MenuItem value="WhatsApp">WhatsApp</MenuItem>
                            <MenuItem value="organizer_api">organizer_api</MenuItem>
                            <MenuItem value="acrofestivals">acrofestivals</MenuItem>
                            <MenuItem value="facebook">facebook</MenuItem>
                            <MenuItem value="lu.ma">lu.ma</MenuItem>
                            <MenuItem value="csv">csv</MenuItem>
                        </Select>
                    </FormControl>
                )}
            />
            <Controller
                name="source_ticketing_platform"
                control={control}
                render={({ field }) => (
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Ticketing Platform</InputLabel>
                        <Select {...field} label="Ticketing Platform">
                            <MenuItem value="">None</MenuItem>
                            <MenuItem value="Eventbrite">Eventbrite</MenuItem>
                            <MenuItem value="Plura">Plura</MenuItem>
                            <MenuItem value="Partiful">Partiful</MenuItem>
                            <MenuItem value="lu.ma">lu.ma</MenuItem>
                        </Select>
                    </FormControl>
                )}
            />
            <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Controller
                    name="timestamp_scraped"
                    control={control}
                    render={({ field }) => (
                        <DateTimePicker
                            label="Timestamp Scraped"
                            value={field.value || null}
                            onChange={field.onChange}
                        />
                    )}
                />
            </LocalizationProvider>

            <Typography variant="subtitle1" sx={{ mt: 2 }}>
                Media
            </Typography>
            <Controller
                name="media"
                control={control}
                render={({ field: { value, onChange } }) => (
                    <MediaManager media={value || []} onMediaChange={onChange} />
                )}
            />

            <Stack direction="row" spacing={2} mt={2}>
                {showCancel && (
                    <Button variant="outlined" onClick={onCancel}>
                        Cancel
                    </Button>
                )}
                <Button
                    variant="contained"
                    type="submit"
                    disabled={createEventMutation.isPending || updateEventMutation.isPending}
                >
                    {submitLabel
                        ? submitLabel
                        : mode === 'edit'
                            ? updateEventMutation.isPending
                                ? 'Updating...'
                                : 'Update Event'
                            : createEventMutation.isPending
                                ? 'Submitting...'
                                : 'Add Event'}
                </Button>
            </Stack>
        </form>
    );
}
