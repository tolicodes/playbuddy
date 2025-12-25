import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Checkbox,
  Chip,
  Tabs,
  Tab,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import TurndownService from 'turndown';


import { useCreateEventBulk } from '../../common/db-axios/useEvents';
import { useUpdateMunch } from '../../common/db-axios/useMunches';
import { useFetchMunches } from '../../common/db-axios/useMunches';
import { useFetchOrganizers } from '../../common/db-axios/useOrganizers';
import { Munch, Event } from '../../common/types/commonTypes';

const FETLIFE_URL = 'https://fetlife.com';

interface ImportedEvent extends Event {
  fetlife_handle: string;
  category: string;
  instagram_handle: string;
  description_html: string;
  image_url: string;
}

interface MappedEvent extends ImportedEvent {
  munch: Munch;
}

export default function ImportCSVScreen() {
  const { data: munches = [] } = useFetchMunches();
  const { data: organizers = [] } = useFetchOrganizers({ includeHidden: true });
  const createEventBulk = useCreateEventBulk();
  const updateMunch = useUpdateMunch();

  const [importedEvents, setImportedEvents] = useState<ImportedEvent[]>([]);
  const [excluded, setExcluded] = useState<Record<string, boolean>>({});
  const [isMunchOverride, setIsMunchOverride] = useState<Record<string, boolean>>({});
  const [isPlayParty, setIsPlayParty] = useState<Record<string, boolean>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<'table' | 'calendar'>('table');
  const [typeFilter, setTypeFilter] = useState<'all' | 'social' | 'bdsm_party' | 'other'>('all');
  const [hideExistingOrgsInCalendar, setHideExistingOrgsInCalendar] = useState(true);

  const turndownService = new TurndownService();

  const normalizeHandle = (handle?: string | null) =>
    (handle || '').replace(/^@/, '').trim().toLowerCase() || 'unknown';

  const compareByDate = (a?: string | null, b?: string | null) => {
    const da = a ? new Date(a).getTime() : NaN;
    const db = b ? new Date(b).getTime() : NaN;
    if (Number.isNaN(da) && Number.isNaN(db)) return 0;
    if (Number.isNaN(da)) return 1;
    if (Number.isNaN(db)) return -1;
    return da - db;
  };

  const formatDateParts = (iso?: string | null) => {
    if (!iso) return { weekday: '–', monthDay: '' };
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { weekday: '–', monthDay: '' };
    const weekday = d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
    const monthDay = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase();
    return { weekday, monthDay };
  };

  const munchMap = useMemo(() => {
    const map: Record<string, Munch> = {};
    munches.forEach((munch: Munch) => {
      if (munch.fetlife_handle) {
        map[normalizeHandle(munch.fetlife_handle)] = munch;
      }
    });
    return map;
  }, [munches]);

  const organizerByFetlifeHandle = useMemo(() => {
    const map: Record<string, any> = {};
    organizers.forEach((org: any) => {
      if (org.fetlife_handle) {
        map[normalizeHandle(org.fetlife_handle)] = org;
      }
    });
    return map;
  }, [organizers]);

  const groupedEvents = useMemo(() => {
    const grouped: Record<string, MappedEvent[]> = {};
    importedEvents.forEach((event) => {
      const handle = normalizeHandle(event.fetlife_handle || event.instagram_handle);
      const munch = munchMap[handle];
      if (!grouped[handle]) grouped[handle] = [];
      grouped[handle].push({ ...event, munch });

    });

    console.log('grouped', grouped)
    return grouped;
  }, [importedEvents, munchMap]);

  const sortedGroupEntries = useMemo(() => {
    return Object.entries(groupedEvents)
      .map(([handle, events]) => [handle, [...events].sort((a, b) => compareByDate(a.start_date, b.start_date))] as [string, MappedEvent[]])
      .sort(([, aEvents], [, bEvents]) => compareByDate(aEvents[0]?.start_date, bEvents[0]?.start_date));
  }, [groupedEvents]);

  type CalendarEvent = ImportedEvent & {
    sourceType: 'fetlife' | 'instagram';
    orgName: string;
    orgUrl?: string;
    existing?: any;
  };

  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    const filtered = [...importedEvents]
      .filter(ev => {
        const cat = (ev.category || '').toLowerCase();
        if (typeFilter === 'social') return cat === 'social';
        if (typeFilter === 'bdsm_party') return cat === 'bdsm party' || cat === 'bdsm party';
        if (typeFilter === 'other') return cat && cat !== 'social' && cat !== 'bdsm party';
        return true;
      })
      .map((ev) => {
        const sourceType: 'fetlife' | 'instagram' = ev.fetlife_handle ? 'fetlife' : 'instagram';
        const orgName = ev.fetlife_handle || ev.instagram_handle || 'Unknown organizer';
        const orgUrl =
          sourceType === 'fetlife'
            ? `https://fetlife.com/${ev.fetlife_handle}`
            : ev.instagram_handle
              ? `https://instagram.com/${ev.instagram_handle}`
              : undefined;
        const handle = normalizeHandle(ev.fetlife_handle || ev.instagram_handle);
        const existing = organizerByFetlifeHandle[handle];
        return { ...ev, sourceType, orgName, orgUrl, existing };
      })
      .filter((ev) => !(hideExistingOrgsInCalendar && ev.existing))
      .sort((a, b) => compareByDate(a.start_date, b.start_date));
    return filtered as CalendarEvent[];
  }, [importedEvents, hideExistingOrgsInCalendar, organizerByFetlifeHandle, typeFilter]);

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed: ImportedEvent[] = JSON.parse(e?.target?.result as string);

        const normalized = parsed.map((event) => {
          return {
            ...event,
            description: turndownService.turndown(event.description_html || event.description),
          }
        })

        setImportedEvents(normalized);

        // Auto-check boxes
        const newPlayParty: Record<string, boolean> = {};
        const newIsMunch: Record<string, boolean> = {};

        normalized.forEach((event) => {
          const key = `${event.name}_${event.start_date}`;
          if (event.name.toLowerCase().includes('play party')) {
            newPlayParty[key] = true;
          }
          if (event.category === 'Social') {
            newIsMunch[key] = true;
          }
        });

        setIsPlayParty(newPlayParty);
        setIsMunchOverride(newIsMunch);
      } catch (err) {
        // @ts-ignore
        alert('Invalid JSON' + err.message);
      }
    };

    reader.readAsText(file);
  };

  useEffect(() => {
    setCollapsedGroups((prev) => {
      const next = { ...prev };
      let changed = false;
      Object.keys(groupedEvents).forEach((handle) => {
        if (next[handle] === undefined) {
          next[handle] = !!organizerByFetlifeHandle[handle];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [groupedEvents, organizerByFetlifeHandle]);

  const getMissingFields = (event: ImportedEvent) => {
    const missing = [];
    if (!event.name) missing.push('name');
    if (!event.start_date) missing.push('start_date');
    if (!event.ticket_url) missing.push('ticket_url');
    if (!event.description) missing.push('description');
    return missing;
  };


  const toggleExclude = (eventKey: string) => {
    setExcluded((prev) => ({ ...prev, [eventKey]: !prev[eventKey] }));
  };

  const handleCreateAll = async () => {
    for (const [, handleEvents] of Object.entries(groupedEvents)) {
      const createEventsInput = []
      for (const event of handleEvents) {
        const key = `${event.name}_${event.start_date}`;
        if (excluded[key]) continue;

        const isMunch = !!isMunchOverride[key];
        const munch = isMunch ? event.munch : undefined;
        const organizerId = munch?.organizer_id;

        const sourceType = event.fetlife_handle ? 'fetlife' : 'instagram';

        const commonProps = {
          name: event.name,
          start_date: event.start_date,
          end_date: event.end_date,
          description: event.description,
          ticket_url: event.ticket_url,
          event_url: event.ticket_url,
          location: event.location,
          type: isMunch ? 'munch' : 'event' as 'munch' | 'event',
          ...(isMunch && { munch_id: munch?.id }),
          is_munch: isMunch,
          is_play_party: !!isPlayParty[key],
          image_url: event.image_url,

          // @ts-ignore
          organizer: {
            ...(organizerId ? {
              id: organizerId,
            } : {
              ...(sourceType === 'fetlife' ? {
                fetlife_handle: event.fetlife_handle,
              } : {
                instagram_handle: event.instagram_handle,
              }),
              url: sourceType === 'fetlife' ? `${FETLIFE_URL}/${event.fetlife_handle}` : `https://instagram.com/${event.instagram_handle}`,
            })
          },
        };

        createEventsInput.push(commonProps);
      }

      console.log('createEventsInput', createEventsInput);

      const res = await createEventBulk.mutateAsync(createEventsInput);

      for (const event of res) {
        const newOrganizerId = event?.organizer?.id;
        if (event.type === 'munch' && newOrganizerId) {
          await updateMunch.mutateAsync({ id: event.munch_id!, organizer_id: newOrganizerId });
        }
      }
    }

    alert('Events created');
  };

  return (
    <Box p={4} sx={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Stack direction="row" alignItems="center" spacing={2} mb={2}>
        <Typography variant="h4">CSV Importer</Typography>
        <Chip label="FetLife / Instagram JSON" color="primary" variant="outlined" />
      </Stack>
      <Typography color="text.secondary" mb={2}>
        Upload the JSON exported from the scraper. Existing FetLife organizers will start collapsed and grayed out.
      </Typography>
      <Button variant="contained" component="label" sx={{ mb: 3 }}>
        Upload JSON
        <input hidden type="file" accept=".json" onChange={handleJsonUpload} />
      </Button>

      <Divider sx={{ mb: 2 }} />
      <Tabs value={tab} onChange={(_, val) => setTab(val)} sx={{ mb: 2 }}>
        <Tab value="table" label="Table" />
        <Tab value="calendar" label="Calendar" />
      </Tabs>

      {tab === 'table' && sortedGroupEntries.map(([handle, munchEvents]) => {
        const firstEvent = munchEvents[0];
        const sourceType = firstEvent.fetlife_handle ? 'fetlife' : 'instagram';
        const url = sourceType === 'fetlife'
          ? `https://fetlife.com/${firstEvent.fetlife_handle}`
          : `https://instagram.com/${firstEvent.instagram_handle}`;
        const name = sourceType === 'fetlife'
          ? firstEvent.fetlife_handle
          : firstEvent.instagram_handle;
        const existingOrganizer = organizerByFetlifeHandle[handle];
        const isCollapsed = !!collapsedGroups[handle];

        return (
          <Paper
            key={handle}
            elevation={0}
            sx={{
              mt: 3,
              borderRadius: 2,
              border: '1px solid #e5e7eb',
              backgroundColor: existingOrganizer ? '#f3f4f6' : '#fff',
              opacity: existingOrganizer && isCollapsed ? 0.75 : 1,
              transition: 'background-color 0.2s ease, opacity 0.2s ease',
              p: 2.5,
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" rowGap={1}>
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" rowGap={1}>
                <Typography variant="h6">
                  <a href={url} target="_blank" rel="noopener noreferrer">{name || '(unknown handle)'}</a>
                </Typography>
                <Chip label={`${munchEvents.length} event${munchEvents.length === 1 ? '' : 's'}`} size="small" />
                <Chip label={sourceType === 'fetlife' ? 'FetLife' : 'Instagram'} size="small" color="secondary" variant="outlined" />
                {existingOrganizer && (
                  <Chip
                    label={`Existing organizer: ${existingOrganizer.name}`}
                    size="small"
                    color="default"
                    variant="filled"
                  />
                )}
              </Stack>
              <Stack direction="row" spacing={1}>
                {existingOrganizer && (
                  <Chip label="Already in DB" size="small" color="default" variant="outlined" />
                )}
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() =>
                    setCollapsedGroups((prev) => ({ ...prev, [handle]: !prev[handle] }))
                  }
                >
                  {isCollapsed ? 'Expand' : 'Collapse'}
                </Button>
              </Stack>
            </Stack>

            {!isCollapsed && (
              <Table size="small" sx={{ mt: 2, backgroundColor: '#fff' }}>
                <TableHead>
              <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Is Munch?</TableCell>
                  <TableCell>Is Play Party?</TableCell>
                  <TableCell>Exclude</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
                </TableHead>
                <TableBody>
                  {munchEvents.map((event, idx) => {
                    const { weekday, monthDay } = formatDateParts(event.start_date);
                    const key = `${event.name}_${event.start_date}`;
                    const missingFields = getMissingFields(event);

                    return (
                      <TableRow key={idx} hover>
                        <TableCell width="110">
                          <Stack alignItems="center" spacing={0.5}>
                            <Typography fontWeight={700} fontSize="0.9rem" color="text.secondary">
                              {weekday}
                            </Typography>
                            <Typography fontWeight={800} fontSize="1.1rem" letterSpacing={1}>
                              {monthDay}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <a href={event.ticket_url} target="_blank" rel="noopener noreferrer">
                            {event.name}
                          </a>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {event.location}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={!!isMunchOverride[key]}
                            onChange={() =>
                              setIsMunchOverride((prev) => ({
                                ...prev,
                                [key]: !prev[key],
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={!!isPlayParty[key]}
                            onChange={() =>
                              setIsPlayParty((prev) => ({
                                ...prev,
                                [key]: !prev[key],
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={!!excluded[key]}
                            onChange={() => toggleExclude(key)}
                          />
                        </TableCell>

                        <TableCell>
                          {missingFields.length > 0 ? (
                            <Typography color="error" fontSize="0.875rem">
                              Missing: {missingFields.join(', ')}
                            </Typography>
                          ) : (
                            <Typography color="success.main" fontSize="0.875rem">
                              Ready
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>

                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Paper>
        );
      })}

      {tab === 'calendar' && (
        <Paper elevation={0} sx={{ mt: 2, p: 2.5, border: '1px solid #e5e7eb', borderRadius: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" mb={2}>
            <Chip
              label={hideExistingOrgsInCalendar ? 'Existing organizers hidden' : 'Existing organizers shown'}
              size="small"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: '#fff',
                fontSize: 13,
              }}
            >
              <option value="all">All types</option>
              <option value="social">Social</option>
              <option value="bdsm_party">BDSM Party</option>
              <option value="other">Other</option>
            </select>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setHideExistingOrgsInCalendar((prev) => !prev)}
            >
              {hideExistingOrgsInCalendar ? 'Show existing organizers' : 'Hide existing organizers'}
            </Button>
          </Stack>
          <List dense>
            {calendarEvents.map((ev, idx) => {
              const { weekday, monthDay } = formatDateParts(ev.start_date);
              return (
                <ListItem key={`${ev.name}_${ev.start_date}_${idx}`} alignItems="flex-start" divider>
                  <Stack width={96} alignItems="center" spacing={0.5} mr={2}>
                    <Typography fontWeight={700} fontSize="0.9rem" color="text.secondary">
                      {weekday}
                    </Typography>
                    <Typography fontWeight={800} fontSize="1.1rem" letterSpacing={1}>
                      {monthDay}
                    </Typography>
                  </Stack>
                  <ListItemText
                    primary={
                      <a href={ev.ticket_url} target="_blank" rel="noopener noreferrer">
                        {ev.name}
                      </a>
                    }
                    secondary={
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        {ev.orgUrl ? (
                          <a href={ev.orgUrl} target="_blank" rel="noopener noreferrer">
                            {ev.orgName}
                          </a>
                        ) : (
                          ev.orgName
                        )}
                        <Chip label={ev.sourceType === 'fetlife' ? 'FetLife' : 'Instagram'} size="small" />
                        {ev.category && (
                          <Chip label={ev.category} size="small" color="primary" variant="outlined" />
                        )}
                        {ev.location && (
                          <Typography variant="caption" color="text.secondary">
                            {ev.location}
                          </Typography>
                        )}
                      </Stack>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        </Paper>
      )}

      {Object.keys(groupedEvents).length > 0 && tab === 'table' && (
        <Box mt={4}>
          <Button variant="contained" onClick={handleCreateAll}>Create Events</Button>
        </Box>
      )}
    </Box>
  );
}
