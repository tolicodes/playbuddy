import { useMemo, useState } from 'react';
import {
    Box,
    Button,
    Checkbox,
    Collapse,
    Divider,
    FormControlLabel,
    Link,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { Link as RouterLink } from 'react-router-dom';
import {
    useCreateLocationArea,
    useDeleteLocationArea,
    useFetchLocationAreas,
    useUpdateLocationArea,
} from '../../common/db-axios/useLocationAreas';
import { useFetchEvents } from '../../common/db-axios/useEvents';
import type { Event, LocationArea } from '../../common/types/commonTypes';

type Draft = {
    name: string;
    code: string;
    city: string;
    region: string;
    country: string;
    entity_type: string;
    timezone: string;
    aliases: string;
    shown: boolean;
};

const emptyDraft: Draft = {
    name: '',
    code: '',
    city: '',
    region: '',
    country: '',
    entity_type: '',
    timezone: '',
    aliases: '',
    shown: true,
};

const normalizeInput = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
};

const parseAliases = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return [];
    return Array.from(new Set(
        trimmed
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
    ));
};

const formatAliases = (aliases?: string[] | null) => (aliases?.length ? aliases.join(', ') : '');

const buildPayload = (draft: Draft) => ({
    name: normalizeInput(draft.name) ?? '',
    code: normalizeInput(draft.code),
    city: normalizeInput(draft.city),
    region: normalizeInput(draft.region),
    country: normalizeInput(draft.country),
    entity_type: normalizeInput(draft.entity_type),
    timezone: normalizeInput(draft.timezone),
    aliases: parseAliases(draft.aliases),
    shown: draft.shown,
});

const buildSummary = (area: LocationArea) => {
    const parts = [
        area.code ? area.code.toUpperCase() : null,
        area.city || area.region || area.country || null,
        area.timezone || null,
        area.shown === false ? 'Hidden' : null,
    ].filter(Boolean);
    return parts.join(' · ');
};

const formatEventDate = (value?: string | null) => {
    if (!value) return 'Date TBD';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
};

const getEventAreaId = (event: Event) => {
    if (event.location_area?.id) return event.location_area.id;
    if (event.location_area_id) return event.location_area_id;
    return null;
};

const getEventSortKey = (value?: string | null) => {
    if (!value) return Number.POSITIVE_INFINITY;
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
};

export default function LocationAreasScreen() {
    const { data: locationAreas = [], isLoading, error } = useFetchLocationAreas();
    const eventsQuery = useFetchEvents({
        includeHidden: true,
        includeHiddenOrganizers: true,
        includeApprovalPending: true,
        includeFacilitatorOnly: true,
    });
    const createLocationArea = useCreateLocationArea();
    const updateLocationArea = useUpdateLocationArea();
    const deleteLocationArea = useDeleteLocationArea();

    const [createDraft, setCreateDraft] = useState<Draft>(emptyDraft);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);
    const [formError, setFormError] = useState<string | null>(null);
    const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({});

    const eventsByArea = useMemo(() => {
        const grouped: Record<string, Event[]> = {};
        const events = eventsQuery.data ?? [];
        events.forEach((event) => {
            const areaId = getEventAreaId(event);
            if (!areaId) return;
            if (!grouped[areaId]) grouped[areaId] = [];
            grouped[areaId].push(event);
        });
        Object.values(grouped).forEach((list) => {
            list.sort((a, b) => getEventSortKey(a.start_date) - getEventSortKey(b.start_date));
        });
        return grouped;
    }, [eventsQuery.data]);

    const sortedAreas = useMemo(
        () => [...locationAreas].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
        [locationAreas]
    );

    const handleCreate = async () => {
        setFormError(null);
        const name = createDraft.name.trim();
        if (!name) {
            setFormError('Name is required.');
            return;
        }
        try {
            await createLocationArea.mutateAsync(buildPayload(createDraft));
            setCreateDraft(emptyDraft);
        } catch (err: any) {
            setFormError(err?.message || 'Unable to create location area.');
        }
    };

    const beginEdit = (area: LocationArea) => {
        setEditingId(area.id);
        setEditDraft({
            name: area.name || '',
            code: area.code || '',
            city: area.city || '',
            region: area.region || '',
            country: area.country || '',
            entity_type: area.entity_type || '',
            timezone: area.timezone || '',
            aliases: formatAliases(area.aliases),
            shown: area.shown ?? true,
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditDraft(emptyDraft);
    };

    const handleUpdate = async () => {
        if (!editingId) return;
        if (!editDraft.name.trim()) {
            setFormError('Name is required.');
            return;
        }
        setFormError(null);
        try {
            await updateLocationArea.mutateAsync({ id: editingId, ...buildPayload(editDraft) });
            cancelEdit();
        } catch (err: any) {
            setFormError(err?.message || 'Unable to update location area.');
        }
    };

    const handleDelete = async (area: LocationArea) => {
        const confirmed = window.confirm(`Delete location area "${area.name}"?`);
        if (!confirmed) return;
        try {
            await deleteLocationArea.mutateAsync(area.id);
        } catch (err: any) {
            setFormError(err?.message || 'Unable to delete location area.');
        }
    };

    const toggleAreaExpanded = (areaId: string) => {
        setExpandedAreas((prev) => ({
            ...prev,
            [areaId]: !prev[areaId],
        }));
    };

    return (
        <Box p={3}>
            <Stack spacing={3}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>Location Areas</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Add and manage location areas. Timezones should be valid IANA strings (e.g. America/New_York).
                    </Typography>
                </Box>

                <Paper variant="outlined" sx={{ p: 3 }}>
                    <Stack spacing={2}>
                        <Typography variant="h6">Add location area</Typography>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                            <TextField
                                label="Name"
                                value={createDraft.name}
                                onChange={(event) => setCreateDraft((prev) => ({ ...prev, name: event.target.value }))}
                                fullWidth
                            />
                            <TextField
                                label="Code"
                                value={createDraft.code}
                                onChange={(event) => setCreateDraft((prev) => ({ ...prev, code: event.target.value }))}
                                fullWidth
                            />
                            <TextField
                                label="Timezone"
                                value={createDraft.timezone}
                                onChange={(event) => setCreateDraft((prev) => ({ ...prev, timezone: event.target.value }))}
                                placeholder="America/New_York"
                                fullWidth
                            />
                        </Stack>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                            <TextField
                                label="City"
                                value={createDraft.city}
                                onChange={(event) => setCreateDraft((prev) => ({ ...prev, city: event.target.value }))}
                                fullWidth
                            />
                            <TextField
                                label="Region"
                                value={createDraft.region}
                                onChange={(event) => setCreateDraft((prev) => ({ ...prev, region: event.target.value }))}
                                fullWidth
                            />
                            <TextField
                                label="Country"
                                value={createDraft.country}
                                onChange={(event) => setCreateDraft((prev) => ({ ...prev, country: event.target.value }))}
                                fullWidth
                            />
                        </Stack>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                            <TextField
                                label="Entity type"
                                value={createDraft.entity_type}
                                onChange={(event) => setCreateDraft((prev) => ({ ...prev, entity_type: event.target.value }))}
                                fullWidth
                            />
                            <TextField
                                label="Aliases (comma separated)"
                                value={createDraft.aliases}
                                onChange={(event) => setCreateDraft((prev) => ({ ...prev, aliases: event.target.value }))}
                                fullWidth
                            />
                        </Stack>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={createDraft.shown}
                                    onChange={(event) => setCreateDraft((prev) => ({ ...prev, shown: event.target.checked }))}
                                />
                            }
                            label="Shown in onboarding"
                        />
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Button
                                variant="contained"
                                onClick={handleCreate}
                                disabled={createLocationArea.isPending}
                            >
                                Add location
                            </Button>
                            {formError && (
                                <Typography variant="body2" color="error">
                                    {formError}
                                </Typography>
                            )}
                        </Stack>
                    </Stack>
                </Paper>

                <Stack spacing={2}>
                    {isLoading && (
                        <Typography variant="body2" color="text.secondary">
                            Loading location areas...
                        </Typography>
                    )}
                    {error && (
                        <Typography variant="body2" color="error">
                            Failed to load location areas.
                        </Typography>
                    )}
                    {!isLoading && !sortedAreas.length && (
                        <Typography variant="body2" color="text.secondary">
                            No location areas found.
                        </Typography>
                    )}
                    {sortedAreas.map((area) => {
                        const isEditing = editingId === area.id;
                        const isExpanded = Boolean(expandedAreas[area.id]);
                        const areaEvents = eventsByArea[area.id] ?? [];
                        const eventsCountLabel = eventsQuery.isLoading ? '…' : areaEvents.length.toString();
                        return (
                            <Paper key={area.id} variant="outlined" sx={{ p: 2 }}>
                                <Stack spacing={2}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                        <Box>
                                            <Typography variant="h6">{area.name}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {buildSummary(area) || 'No metadata'}
                                            </Typography>
                                        </Box>
                                        <Stack direction="row" spacing={1}>
                                            {isEditing ? (
                                                <>
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        startIcon={<SaveOutlinedIcon />}
                                                        onClick={handleUpdate}
                                                        disabled={updateLocationArea.isPending}
                                                    >
                                                        Save
                                                    </Button>
                                                    <Button
                                                        variant="text"
                                                        size="small"
                                                        startIcon={<CloseIcon />}
                                                        onClick={cancelEdit}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        startIcon={<EditOutlinedIcon />}
                                                        onClick={() => beginEdit(area)}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="text"
                                                        size="small"
                                                        color="error"
                                                        startIcon={<DeleteOutlineIcon />}
                                                        onClick={() => handleDelete(area)}
                                                        disabled={deleteLocationArea.isPending}
                                                    >
                                                        Delete
                                                    </Button>
                                                </>
                                            )}
                                        </Stack>
                                    </Stack>

                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Button
                                            variant="text"
                                            size="small"
                                            onClick={() => toggleAreaExpanded(area.id)}
                                        >
                                            {isExpanded ? 'Hide events' : 'Show events'} ({eventsCountLabel})
                                        </Button>
                                        {eventsQuery.isError && (
                                            <Typography variant="caption" color="error">
                                                Failed to load events.
                                            </Typography>
                                        )}
                                    </Stack>

                                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                        <Divider sx={{ mb: 2 }} />
                                        <Stack spacing={1}>
                                            {eventsQuery.isLoading && (
                                                <Typography variant="body2" color="text.secondary">
                                                    Loading events...
                                                </Typography>
                                            )}
                                            {!eventsQuery.isLoading && !areaEvents.length && (
                                                <Typography variant="body2" color="text.secondary">
                                                    No events assigned to this location area.
                                                </Typography>
                                            )}
                                            {!eventsQuery.isLoading && areaEvents.map((event) => (
                                                <Stack
                                                    key={event.id}
                                                    direction={{ xs: 'column', md: 'row' }}
                                                    spacing={1}
                                                    justifyContent="space-between"
                                                    alignItems={{ xs: 'flex-start', md: 'center' }}
                                                >
                                                    <Box>
                                                        <Link
                                                            component={RouterLink}
                                                            to={`/events/${event.id}`}
                                                            underline="hover"
                                                            fontWeight={600}
                                                        >
                                                            {event.name || `Event #${event.id}`}
                                                        </Link>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {formatEventDate(event.start_date)}
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {event.organizer?.name || 'Organizer unknown'}
                                                    </Typography>
                                                </Stack>
                                            ))}
                                        </Stack>
                                    </Collapse>

                                    {isEditing && (
                                        <Stack spacing={2}>
                                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                                <TextField
                                                    label="Name"
                                                    value={editDraft.name}
                                                    onChange={(event) => setEditDraft((prev) => ({ ...prev, name: event.target.value }))}
                                                    fullWidth
                                                />
                                                <TextField
                                                    label="Code"
                                                    value={editDraft.code}
                                                    onChange={(event) => setEditDraft((prev) => ({ ...prev, code: event.target.value }))}
                                                    fullWidth
                                                />
                                                <TextField
                                                    label="Timezone"
                                                    value={editDraft.timezone}
                                                    onChange={(event) => setEditDraft((prev) => ({ ...prev, timezone: event.target.value }))}
                                                    placeholder="America/New_York"
                                                    fullWidth
                                                />
                                            </Stack>
                                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                                <TextField
                                                    label="City"
                                                    value={editDraft.city}
                                                    onChange={(event) => setEditDraft((prev) => ({ ...prev, city: event.target.value }))}
                                                    fullWidth
                                                />
                                                <TextField
                                                    label="Region"
                                                    value={editDraft.region}
                                                    onChange={(event) => setEditDraft((prev) => ({ ...prev, region: event.target.value }))}
                                                    fullWidth
                                                />
                                                <TextField
                                                    label="Country"
                                                    value={editDraft.country}
                                                    onChange={(event) => setEditDraft((prev) => ({ ...prev, country: event.target.value }))}
                                                    fullWidth
                                                />
                                            </Stack>
                                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                                <TextField
                                                    label="Entity type"
                                                    value={editDraft.entity_type}
                                                    onChange={(event) => setEditDraft((prev) => ({ ...prev, entity_type: event.target.value }))}
                                                    fullWidth
                                                />
                                                <TextField
                                                    label="Aliases (comma separated)"
                                                    value={editDraft.aliases}
                                                    onChange={(event) => setEditDraft((prev) => ({ ...prev, aliases: event.target.value }))}
                                                    fullWidth
                                                />
                                            </Stack>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={editDraft.shown}
                                                        onChange={(event) => setEditDraft((prev) => ({ ...prev, shown: event.target.checked }))}
                                                    />
                                                }
                                                label="Shown in onboarding"
                                            />
                                        </Stack>
                                    )}
                                </Stack>
                            </Paper>
                        );
                    })}
                </Stack>
            </Stack>
        </Box>
    );
}
