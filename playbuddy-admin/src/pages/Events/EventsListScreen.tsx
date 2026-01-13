import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { AutoFixHigh, Edit } from '@mui/icons-material';
import { useQueryClient } from '@tanstack/react-query';
import { useFetchEvents } from '../../common/db-axios/useEvents';
import { useFetchOrganizers } from '../../common/db-axios/useOrganizers';
import { useReclassifyEvents } from '../../common/db-axios/useClassifications';
import EventEditorForm from './EventEditorForm';
import type { Event, EventTypes } from '../../common/types/commonTypes';
import EventsTable from './EventsTable';
import { EVENT_TYPE_OPTIONS, formatEventTypeLabel } from './eventTypeOptions';

export default function EventsListScreen() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: events = [], isLoading: loadingEvents, error: errorEvents } = useFetchEvents({
        includeFacilitatorOnly: true,
    });
    const { data: organizers = [], isLoading: loadingOrganizers, error: errorOrganizers } = useFetchOrganizers();

    const [searchText, setSearchText] = useState('');
  const [selectedOrganizerId, setSelectedOrganizerId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<EventTypes | 'all'>('all');
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const { mutateAsync: reclassifyEvent } = useReclassifyEvents();
  const [reclassifyStartTimes, setReclassifyStartTimes] = useState<Record<number, number>>({});
  const [selectedEventIds, setSelectedEventIds] = useState<number[]>([]);
  const [batchReclassifyMeta, setBatchReclassifyMeta] = useState<{ startedAt: number; total: number } | null>(null);
  const [etaNow, setEtaNow] = useState(Date.now());
  const ESTIMATED_SECONDS_PER_EVENT = 12;

  useEffect(() => {
    if (!Object.keys(reclassifyStartTimes).length && !batchReclassifyMeta) return;
    const interval = setInterval(() => setEtaNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [batchReclassifyMeta, reclassifyStartTimes]);

    const organizerOptions = useMemo(() => {
        return organizers
            .slice()
            .filter((org) => org?.name)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [organizers]);

  const selectedOrganizer = useMemo(() => {
    return organizerOptions.find((org) => String(org.id) === selectedOrganizerId) || null;
  }, [organizerOptions, selectedOrganizerId]);

  const eventById = useMemo(() => {
    const map = new Map<number, Event>();
    events.forEach((event) => map.set(event.id, event));
    return map;
  }, [events]);

  useEffect(() => {
    setSelectedEventIds((prev) => prev.filter((id) => eventById.has(id)));
  }, [eventById]);

  const resolveEventType = (event: Event): EventTypes => {
    if (event.play_party || event.type === 'play_party') return 'play_party';
    if (event.is_munch || event.type === 'munch') return 'munch';
    return event.type || 'event';
  };

  const isFutureEvent = (event: Event) => {
    const startTs = new Date(event.start_date).getTime();
    return Number.isFinite(startTs) && startTs >= Date.now();
  };

  const filteredEvents = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    return events.filter((event) => {
            if (selectedOrganizerId && String(event.organizer?.id || '') !== selectedOrganizerId) {
                return false;
            }
            if (selectedType !== 'all' && resolveEventType(event) !== selectedType) {
                return false;
            }
            if (normalizedSearch) {
                const haystack = [
                    event.name,
                    event.organizer?.name,
                    event.location,
                    event.neighborhood,
                    event.city,
                    event.region,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                if (!haystack.includes(normalizedSearch)) return false;
            }
            return true;
    });
  }, [events, searchText, selectedOrganizerId, selectedType]);

  const selectableEventIds = useMemo(() => {
    return filteredEvents.filter(isFutureEvent).map((event) => event.id);
  }, [filteredEvents]);

  const selectedEventIdSet = useMemo(() => new Set(selectedEventIds), [selectedEventIds]);

  const selectedFutureEventIds = useMemo(() => {
    return selectedEventIds.filter((id) => {
      const event = eventById.get(id);
      return event ? isFutureEvent(event) : false;
    });
  }, [eventById, selectedEventIds]);

  const allSelectableSelected =
    selectableEventIds.length > 0 &&
    selectableEventIds.every((id) => selectedEventIdSet.has(id));
  const someSelectableSelected =
    selectableEventIds.some((id) => selectedEventIdSet.has(id)) && !allSelectableSelected;

  const toggleSelectedEvent = (eventId: number) => {
    setSelectedEventIds((prev) =>
      prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedEventIds((prev) => {
      if (checked) {
        const next = new Set([...prev, ...selectableEventIds]);
        return Array.from(next);
      }
      const selectableSet = new Set(selectableEventIds);
      return prev.filter((id) => !selectableSet.has(id));
    });
  };

  const getEtaSeconds = (eventId: number) => {
    const start = reclassifyStartTimes[eventId];
    if (!start) return null;
    const elapsedMs = Math.max(0, etaNow - start);
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    return Math.max(0, ESTIMATED_SECONDS_PER_EVENT - elapsedSeconds);
  };

  const batchEtaSeconds = batchReclassifyMeta
    ? Math.max(
        0,
        batchReclassifyMeta.total * ESTIMATED_SECONDS_PER_EVENT -
          Math.floor((etaNow - batchReclassifyMeta.startedAt) / 1000)
      )
    : null;

  const handleReclassifySelected = async () => {
    if (!selectedFutureEventIds.length) return;
    setBatchReclassifyMeta({ startedAt: Date.now(), total: selectedFutureEventIds.length });
    try {
      await reclassifyEvent({ eventIds: selectedFutureEventIds });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setSelectedEventIds((prev) => prev.filter((id) => !selectedFutureEventIds.includes(id)));
    } catch (err) {
      console.error(err);
      alert('Failed to reclassify events');
    } finally {
      setBatchReclassifyMeta(null);
    }
  };

  const handleReclassify = async (event: Event) => {
    const eventId = event.id;
    setReclassifyStartTimes((prev) => ({ ...prev, [eventId]: Date.now() }));
        try {
            await reclassifyEvent({ eventIds: [eventId] });
            queryClient.invalidateQueries({ queryKey: ['events'] });
        } catch (err) {
            console.error(err);
            alert('Failed to reclassify event');
        } finally {
            setReclassifyStartTimes((prev) => {
                const next = { ...prev };
                delete next[eventId];
                return next;
            });
        }
    };

    if (loadingEvents) return <CircularProgress />;
    if (errorEvents) return <Typography color="error">Failed to load events</Typography>;

    return (
        <Paper sx={{ p: 4, maxWidth: 1000, mx: 'auto' }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4">Events</Typography>

                <Button
                    variant="contained"
                    onClick={() => navigate('/events/new')}
                >
                    Add Event
                </Button>

                <Button
                    variant="contained"
                    onClick={() => navigate('/events/import-csv')}
                >
                    Import from CSV
                </Button>

                <Button
                    variant="contained"
                    onClick={() => navigate('/events/import-urls')}
                >
                    Import from URLs
                </Button>

                <Button
                    variant="outlined"
                    onClick={() => navigate('/events/duplicates')}
                >
                    Find Duplicates
                </Button>

                <Stack spacing={2} sx={{ mt: 2 }}>
                    <TextField
                        fullWidth
                        label="Search"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="Search title, organizer, or location"
                    />

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <FormControl sx={{ minWidth: 220 }}>
                            <InputLabel>Type</InputLabel>
                            <Select
                                label="Type"
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value as EventTypes | 'all')}
                            >
                                <MenuItem value="all">All types</MenuItem>
                                {EVENT_TYPE_OPTIONS.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                                <MenuItem value="event">{formatEventTypeLabel('event')}</MenuItem>
                            </Select>
                        </FormControl>

                        <Autocomplete
                            options={organizerOptions}
                            getOptionLabel={(option) => option.name || ''}
                            value={selectedOrganizer}
                            onChange={(_, value) => setSelectedOrganizerId(value ? String(value.id) : null)}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Organizer"
                                    placeholder="All organizers"
                                    error={Boolean(errorOrganizers)}
                                    helperText={
                                        errorOrganizers
                                            ? 'Failed to load organizers'
                                            : loadingOrganizers
                                                ? 'Loading organizers...'
                                                : undefined
                                    }
                                />
                            )}
                            disabled={loadingOrganizers || Boolean(errorOrganizers)}
                            sx={{ minWidth: 280 }}
                        />
                    </Stack>
                </Stack>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                {filteredEvents.length} event{filteredEvents.length === 1 ? '' : 's'}
              </Typography>
              <Button variant="contained" onClick={() => navigate('/events/new')}>
                Add Event
              </Button>
            </Box>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems={{ md: 'center' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={allSelectableSelected}
                    indeterminate={someSelectableSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    disabled={selectableEventIds.length === 0}
                  />
                }
                label={`Select all future (${selectableEventIds.length})`}
              />
              <Button
                variant="contained"
                onClick={handleReclassifySelected}
                disabled={selectedFutureEventIds.length === 0 || !!batchReclassifyMeta}
              >
                {batchReclassifyMeta ? 'Reclassifying...' : 'Reclassify selected'}
              </Button>
              {batchReclassifyMeta && batchEtaSeconds !== null && (
                <Typography variant="caption" color="text.secondary">
                  ETA ~{batchEtaSeconds}s
                </Typography>
              )}
              {!batchReclassifyMeta && selectedFutureEventIds.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {selectedFutureEventIds.length} selected
                </Typography>
              )}
            </Stack>

            <EventsTable
                events={filteredEvents}
                actionsHeader="Actions"
                enableTypeEditor
                enableHorizontalScroll
                renderActions={(event) => {
                    const isReclassifying = Boolean(reclassifyStartTimes[event.id]);
                    const etaSeconds = getEtaSeconds(event.id);
                    const futureEvent = isFutureEvent(event);
                    const isSelected = selectedEventIdSet.has(event.id);
                    return (
                        <Stack spacing={0.5}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Tooltip title={futureEvent ? 'Select for batch reclassify' : 'Only future events can be reclassified'}>
                                    <span>
                                        <Checkbox
                                            size="small"
                                            checked={isSelected}
                                            onChange={() => toggleSelectedEvent(event.id)}
                                            disabled={!futureEvent}
                                        />
                                    </span>
                                </Tooltip>
                                <IconButton onClick={() => setEditingEvent(event)}>
                                    <Edit />
                                </IconButton>
                                <Tooltip title={futureEvent ? 'Reclassify this event' : 'Only future events can be reclassified'}>
                                    <span>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<AutoFixHigh fontSize="small" />}
                                            disabled={isReclassifying || !futureEvent}
                                            onClick={() => handleReclassify(event)}
                                        >
                                            {isReclassifying ? 'Reclassifying...' : 'Reclassify'}
                                        </Button>
                                    </span>
                                </Tooltip>
                            </Stack>
                            {isReclassifying && etaSeconds !== null && (
                                <Typography variant="caption" color="text.secondary">
                                    ETA ~{etaSeconds}s
                                </Typography>
                            )}
                        </Stack>
                    );
                }}
            />

            <Dialog
                open={!!editingEvent}
                onClose={() => setEditingEvent(null)}
                fullWidth
                maxWidth="md"
            >
                <DialogTitle>Edit Event</DialogTitle>
                <DialogContent dividers>
                    {editingEvent && (
                        <EventEditorForm
                            event={editingEvent}
                            mode="edit"
                            submitLabel="Save changes"
                            showCancel
                            onCancel={() => setEditingEvent(null)}
                            onSaved={() => setEditingEvent(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </Paper>
    );
}
