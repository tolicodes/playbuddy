import { useEffect, useMemo, useState, type MouseEvent } from 'react';
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
  ListItemText,
  MenuItem,
  Menu,
  Pagination,
  Paper,
  Select,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { AutoFixHigh, Delete, Edit } from '@mui/icons-material';
import { useQueryClient } from '@tanstack/react-query';
import { useDeleteEvent, useFetchEvents } from '../../common/db-axios/useEvents';
import { useFetchAttendees } from '../../common/db-axios/useAttendees';
import { useFetchOrganizers } from '../../common/db-axios/useOrganizers';
import { useReclassifyEvents } from '../../common/db-axios/useClassifications';
import EventEditorForm from './EventEditorForm';
import type { Event, EventTypes } from '../../common/types/commonTypes';
import EventsTable from './EventsTable';
import { EVENT_TYPE_OPTIONS, formatEventTypeLabel } from './eventTypeOptions';

const ADMIN_APPROVAL_STATUSES = ['approved', 'pending', 'rejected'];

const formatUrlHost = (value?: string | null) => {
    if (!value) return '';
    try {
        return new URL(value).hostname.replace(/^www\./, '');
    } catch {
        return value;
    }
};

const formatEventSource = (event: Event) => {
    return (
        event.source_ticketing_platform ||
        event.source_origination_platform ||
        event.dataset ||
        formatUrlHost(event.source_url) ||
        formatUrlHost(event.event_url) ||
        formatUrlHost(event.ticket_url) ||
        '-'
    );
};

const formatDateTime = (value?: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleString() : value;
};

const formatBool = (value?: boolean | null) => {
    if (value === null || value === undefined) return '-';
    return value ? 'Yes' : 'No';
};

const formatText = (value?: string | null) => (value && value.trim()) || '-';

const formatNumber = (value?: number | null) => (Number.isFinite(value ?? NaN) ? String(value) : '-');

const formatTags = (value?: string[] | null) => {
    if (!value?.length) return '-';
    return value.filter(Boolean).join(', ') || '-';
};

const formatLongText = (value?: string | null, limit = 120) => {
    if (!value) return '-';
    const trimmed = value.trim();
    if (!trimmed) return '-';
    if (trimmed.length <= limit) return trimmed;
    return `${trimmed.slice(0, limit)}...`;
};

const formatNameList = (value?: Array<{ name?: string | null }> | null) => {
    if (!value?.length) return '-';
    const names = value.map((item) => item?.name).filter(Boolean) as string[];
    return names.length ? names.join(', ') : '-';
};

const formatPromoCodeList = (value?: Array<{ promo_code?: string | null }> | null) => {
    if (!value?.length) return '-';
    const codes = value.map((item) => item?.promo_code).filter(Boolean) as string[];
    return codes.length ? codes.join(', ') : '-';
};

const formatMediaSummary = (value?: Array<{ type?: string | null }> | null) => {
    if (!value?.length) return '-';
    const counts = value.reduce<Record<string, number>>((acc, item) => {
        const key = item?.type || 'media';
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
    }, {});
    return Object.entries(counts)
        .map(([type, count]) => `${type}:${count}`)
        .join(', ');
};

const DEFAULT_VISIBLE_EXTRA_COLUMNS = ['source'];
const EVENTS_PAGE_SIZE = 50;

export default function EventsListScreen() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
  const { data: events = [], isLoading: loadingEvents, error: errorEvents } = useFetchEvents({
        includeFacilitatorOnly: true,
        includeHidden: true,
        includeHiddenOrganizers: true,
        approvalStatuses: ADMIN_APPROVAL_STATUSES,
    });
  const { data: organizers = [], isLoading: loadingOrganizers, error: errorOrganizers } = useFetchOrganizers();
  const { data: attendees = [] } = useFetchAttendees();
  const deleteEventMutation = useDeleteEvent();

    const [searchText, setSearchText] = useState('');
  const [selectedOrganizerId, setSelectedOrganizerId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<EventTypes | 'all'>('all');
  const [userSubmittedOnly, setUserSubmittedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const { mutateAsync: reclassifyEvent } = useReclassifyEvents();
  const [reclassifyStartTimes, setReclassifyStartTimes] = useState<Record<number, number>>({});
  const [selectedEventIds, setSelectedEventIds] = useState<number[]>([]);
  const [batchReclassifyMeta, setBatchReclassifyMeta] = useState<{ startedAt: number; total: number } | null>(null);
  const [etaNow, setEtaNow] = useState(Date.now());
  const ESTIMATED_SECONDS_PER_EVENT = 12;
  const [deletingEventIds, setDeletingEventIds] = useState<Record<number, boolean>>({});
  const [columnsMenuAnchorEl, setColumnsMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [visibleExtraColumnIds, setVisibleExtraColumnIds] = useState<string[]>(DEFAULT_VISIBLE_EXTRA_COLUMNS);

  const extraColumns = useMemo(() => ([
    { id: 'id', label: 'ID', minWidth: 80, render: (event: Event) => formatNumber(event.id) },
    { id: 'source', label: 'Source', minWidth: 140, render: (event: Event) => formatEventSource(event) },
    { id: 'source_url', label: 'Source URL', minWidth: 160, render: (event: Event) => formatUrlHost(event.source_url) || '-' },
    { id: 'timestamp_scraped', label: 'Scraped At', minWidth: 160, render: (event: Event) => formatDateTime(event.timestamp_scraped) },
    { id: 'source_origination_platform', label: 'Source Platform', minWidth: 160, render: (event: Event) => formatText(event.source_origination_platform) },
    { id: 'source_ticketing_platform', label: 'Ticketing Platform', minWidth: 160, render: (event: Event) => formatText(event.source_ticketing_platform) },
    { id: 'dataset', label: 'Dataset', minWidth: 140, render: (event: Event) => formatText(event.dataset) },
    { id: 'source_origination_group_name', label: 'Source Group', minWidth: 160, render: (event: Event) => formatText(event.source_origination_group_name) },
    { id: 'source_origination_group_id', label: 'Source Group ID', minWidth: 160, render: (event: Event) => formatText(event.source_origination_group_id) },
    { id: 'original_id', label: 'Original ID', minWidth: 140, render: (event: Event) => formatText(event.original_id) },
    { id: 'type', label: 'Type', minWidth: 140, render: (event: Event) => formatEventTypeLabel(event.type) || '-' },
    { id: 'event_url', label: 'Event URL', minWidth: 160, render: (event: Event) => formatUrlHost(event.event_url) || '-' },
    { id: 'ticket_url', label: 'Ticket URL', minWidth: 160, render: (event: Event) => formatUrlHost(event.ticket_url) || '-' },
    { id: 'image_url', label: 'Image URL', minWidth: 160, render: (event: Event) => formatUrlHost(event.image_url) || '-' },
    { id: 'video_url', label: 'Video URL', minWidth: 160, render: (event: Event) => formatUrlHost(event.video_url) || '-' },
    { id: 'start_date', label: 'Start', minWidth: 160, render: (event: Event) => formatDateTime(event.start_date) },
    { id: 'end_date', label: 'End', minWidth: 160, render: (event: Event) => formatDateTime(event.end_date) },
    { id: 'visibility', label: 'Visibility', minWidth: 120, render: (event: Event) => formatText(event.visibility) },
    { id: 'approval_status', label: 'Approval', minWidth: 120, render: (event: Event) => formatText(event.approval_status) },
    { id: 'classification_status', label: 'Classification', minWidth: 140, render: (event: Event) => formatText(event.classification_status) },
    { id: 'weekly_pick', label: 'Weekly Pick', minWidth: 120, render: (event: Event) => formatBool(event.weekly_pick) },
    { id: 'hidden', label: 'Hidden', minWidth: 100, render: (event: Event) => formatBool(event.hidden) },
    { id: 'user_submitted', label: 'User Submitted', minWidth: 140, render: (event: Event) => formatBool(event.user_submitted) },
    { id: 'frozen', label: 'Frozen', minWidth: 100, render: (event: Event) => formatBool(event.frozen) },
    { id: 'facilitator_only', label: 'Facilitator Only', minWidth: 160, render: (event: Event) => formatBool(event.facilitator_only) },
    { id: 'play_party', label: 'Play Party', minWidth: 120, render: (event: Event) => formatBool(event.play_party) },
    { id: 'is_munch', label: 'Munch', minWidth: 100, render: (event: Event) => formatBool(event.is_munch) },
    { id: 'munch_id', label: 'Munch ID', minWidth: 120, render: (event: Event) => formatNumber(event.munch_id) },
    { id: 'recurring', label: 'Recurring', minWidth: 120, render: (event: Event) => formatText(event.recurring) },
    { id: 'vetted', label: 'Vetted', minWidth: 100, render: (event: Event) => formatBool(event.vetted) },
    { id: 'vetting_url', label: 'Vetting URL', minWidth: 160, render: (event: Event) => formatUrlHost(event.vetting_url) || '-' },
    { id: 'non_ny', label: 'Non-NY', minWidth: 100, render: (event: Event) => formatBool(event.non_ny) },
    { id: 'organizer_id', label: 'Organizer ID', minWidth: 140, render: (event: Event) => formatNumber(event.organizer_id) },
    { id: 'location_area_id', label: 'Location Area ID', minWidth: 160, render: (event: Event) => formatText(event.location_area_id) },
    { id: 'location', label: 'Location', minWidth: 200, render: (event: Event) => formatText(event.location) },
    { id: 'neighborhood', label: 'Neighborhood', minWidth: 140, render: (event: Event) => formatText(event.neighborhood) },
    { id: 'city', label: 'City', minWidth: 120, render: (event: Event) => formatText(event.city) },
    { id: 'region', label: 'Region', minWidth: 120, render: (event: Event) => formatText(event.region) },
    { id: 'country', label: 'Country', minWidth: 120, render: (event: Event) => formatText(event.country) },
    { id: 'location_area', label: 'Location Area', minWidth: 160, render: (event: Event) => formatText(event.location_area?.name) },
    { id: 'price', label: 'Price', minWidth: 120, render: (event: Event) => formatText(event.price) },
    { id: 'short_price', label: 'Short Price', minWidth: 120, render: (event: Event) => formatText(event.short_price) },
    { id: 'event_categories', label: 'Categories', minWidth: 160, render: (event: Event) => formatText(event.event_categories) },
    { id: 'tags', label: 'Tags', minWidth: 200, render: (event: Event) => formatTags(event.tags) },
    { id: 'lat', label: 'Lat', minWidth: 120, render: (event: Event) => formatNumber(event.lat) },
    { id: 'lon', label: 'Lon', minWidth: 120, render: (event: Event) => formatNumber(event.lon) },
    { id: 'description', label: 'Description', minWidth: 240, render: (event: Event) => formatLongText(event.description, 160) },
    { id: 'short_description', label: 'Short Description', minWidth: 220, render: (event: Event) => formatLongText(event.short_description, 160) },
    { id: 'custom_description', label: 'Custom Description', minWidth: 220, render: (event: Event) => formatLongText(event.custom_description, 160) },
    { id: 'bio', label: 'Bio', minWidth: 200, render: (event: Event) => formatLongText(event.bio, 160) },
    { id: 'hosts', label: 'Hosts', minWidth: 160, render: (event: Event) => formatTags(event.hosts) },
    { id: 'facilitators', label: 'Facilitators', minWidth: 160, render: (event: Event) => formatTags(event.facilitators) },
    { id: 'communities', label: 'Communities', minWidth: 180, render: (event: Event) => formatNameList(event.communities) },
    { id: 'promo_codes', label: 'Promo Codes', minWidth: 160, render: (event: Event) => formatPromoCodeList(event.promo_codes) },
    { id: 'classification_id', label: 'Classification ID', minWidth: 160, render: (event: Event) => formatNumber(event.classification?.id) },
    { id: 'classification_tags', label: 'Classification Tags', minWidth: 200, render: (event: Event) => formatTags(event.classification?.tags) },
    { id: 'media', label: 'Media', minWidth: 140, render: (event: Event) => formatMediaSummary(event.media) },
  ]), []);

  const toggleExtraColumn = (columnId: string) => {
    setVisibleExtraColumnIds((prev) => (
      prev.includes(columnId) ? prev.filter((id) => id !== columnId) : [...prev, columnId]
    ));
  };

  useEffect(() => {
    if (!Object.keys(reclassifyStartTimes).length && !batchReclassifyMeta) return;
    const interval = setInterval(() => setEtaNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [batchReclassifyMeta, reclassifyStartTimes]);

  const isColumnsMenuOpen = Boolean(columnsMenuAnchorEl);
  const handleOpenColumnsMenu = (event: MouseEvent<HTMLElement>) => {
    setColumnsMenuAnchorEl(event.currentTarget);
  };
  const handleCloseColumnsMenu = () => {
    setColumnsMenuAnchorEl(null);
  };

  const organizerOptions = useMemo(() => {
        return organizers
            .slice()
            .filter((org) => org?.name)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [organizers]);

  const attendeeCountByEventId = useMemo(() => {
    const map = new Map<number, number>();
    attendees.forEach((group) => {
      if (Number.isFinite(group.event_id)) {
        map.set(group.event_id, group.attendees?.length ?? 0);
      }
    });
    return map;
  }, [attendees]);

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
            if (userSubmittedOnly && !event.user_submitted) {
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
  }, [events, searchText, selectedOrganizerId, selectedType, userSubmittedOnly]);

  const pageCount = useMemo(() => {
    return Math.max(1, Math.ceil(filteredEvents.length / EVENTS_PAGE_SIZE));
  }, [filteredEvents.length]);

  const pagedEvents = useMemo(() => {
    const start = (page - 1) * EVENTS_PAGE_SIZE;
    return filteredEvents.slice(start, start + EVENTS_PAGE_SIZE);
  }, [filteredEvents, page]);

  useEffect(() => {
    setPage((current) => (current > pageCount ? pageCount : current));
  }, [pageCount]);

  const selectableEventIds = useMemo(() => {
    return pagedEvents.filter(isFutureEvent).map((event) => event.id);
  }, [pagedEvents]);

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

  const handleDeleteEvent = async (event: Event) => {
    const label = event.name || `Event ${event.id}`;
    const attendeeCount = attendeeCountByEventId.get(event.id) ?? 0;
    if (attendeeCount > 0) {
      const confirmed = window.confirm(
        `Delete "${label}" (#${event.id})?\n\n${attendeeCount} ${
          attendeeCount === 1 ? 'person has' : 'people have'
        } saved this event. This cannot be undone.`
      );
      if (!confirmed) return;
    }
    setDeletingEventIds((prev) => ({ ...prev, [event.id]: true }));
    try {
      await deleteEventMutation.mutateAsync(event.id);
      setSelectedEventIds((prev) => prev.filter((id) => id !== event.id));
      if (editingEvent?.id === event.id) {
        setEditingEvent(null);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete event');
    } finally {
      setDeletingEventIds((prev) => {
        const next = { ...prev };
        delete next[event.id];
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

                <Stack spacing={2} sx={{ mt: 2 }}>
                    <TextField
                        fullWidth
                        label="Search"
                        value={searchText}
                        onChange={(e) => {
                            setSearchText(e.target.value);
                            setPage(1);
                        }}
                        placeholder="Search title, organizer, or location"
                    />

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <FormControl sx={{ minWidth: 220 }}>
                            <InputLabel>Type</InputLabel>
                            <Select
                                label="Type"
                                value={selectedType}
                                onChange={(e) => {
                                    setSelectedType(e.target.value as EventTypes | 'all');
                                    setPage(1);
                                }}
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
                            onChange={(_, value) => {
                                setSelectedOrganizerId(value ? String(value.id) : null);
                                setPage(1);
                            }}
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

                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={userSubmittedOnly}
                                onChange={(e) => {
                                    setUserSubmittedOnly(e.target.checked);
                                    setPage(1);
                                }}
                            />
                        }
                        label="User submitted only"
                    />
                </Stack>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
              <Typography variant="h6">
                {filteredEvents.length} event{filteredEvents.length === 1 ? '' : 's'}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" onClick={handleOpenColumnsMenu}>
                  Columns
                </Button>
                <Button variant="contained" onClick={() => navigate('/events/new')}>
                  Add Event
                </Button>
              </Stack>
            </Box>
            <Menu
              anchorEl={columnsMenuAnchorEl}
              open={isColumnsMenuOpen}
              onClose={handleCloseColumnsMenu}
              MenuListProps={{ dense: true }}
            >
              {extraColumns.map((column) => {
                const checked = visibleExtraColumnIds.includes(column.id);
                return (
                  <MenuItem key={column.id} onClick={() => toggleExtraColumn(column.id)}>
                    <Checkbox size="small" checked={checked} />
                    <ListItemText primary={column.label} />
                  </MenuItem>
                );
              })}
            </Menu>

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
                label={`Select page future (${selectableEventIds.length})`}
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
                events={pagedEvents}
                actionsHeader="Actions"
                enableTypeEditor
                enableHorizontalScroll
                extraColumns={extraColumns}
                visibleExtraColumnIds={visibleExtraColumnIds}
                renderActions={(event) => {
                    const isReclassifying = Boolean(reclassifyStartTimes[event.id]);
                    const isDeleting = Boolean(deletingEventIds[event.id]);
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
                                <Tooltip title={isDeleting ? 'Deleting...' : 'Delete event'}>
                                    <span>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleDeleteEvent(event)}
                                            disabled={isDeleting}
                                        >
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    </span>
                                </Tooltip>
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
            {filteredEvents.length > EVENTS_PAGE_SIZE && (
                <Stack direction="row" justifyContent="center" mt={2}>
                    <Pagination
                        count={pageCount}
                        page={page}
                        onChange={(_, nextPage) => setPage(nextPage)}
                        size="small"
                    />
                </Stack>
            )}

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
