import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Button,
} from '@mui/material';
import { useCreateEvent, useCreateEventBulk } from '../../common/db-axios/useEvents';
import { useUpdateMunch } from '../../common/db-axios/useMunches';
import { useFetchMunches } from '../../common/db-axios/useMunches';
import { Munch, Event } from '../../common/types/commonTypes';

const FETLIFE_URL = 'https://fetlife.com';

interface ImportedEvent extends Event {
  fetlife_handle: string;
  category: string;
}

interface MappedEvent extends ImportedEvent {
  munch: Munch;
}

export default function ImportFetlifeScreen() {
  const { data: munches = [] } = useFetchMunches();
  const createEventBulk = useCreateEventBulk();
  const updateMunch = useUpdateMunch();

  const [importedEvents, setImportedEvents] = useState<ImportedEvent[]>([]);
  const [excluded, setExcluded] = useState<Record<string, boolean>>({});
  const [isMunchOverride, setIsMunchOverride] = useState<Record<string, boolean>>({});
  const [isPlayParty, setIsPlayParty] = useState<Record<string, boolean>>({});
  const [unmatchedHandles, setUnmatchedHandles] = useState<ImportedEvent[]>([]);

  const munchMap = useMemo(() => {
    const map: Record<string, Munch> = {};
    munches.forEach((munch: Munch) => {
      if (munch.fetlife_handle) {
        map[munch.fetlife_handle.toLowerCase()] = munch;
      }
    });
    return map;
  }, [munches]);

  const groupedEvents = useMemo(() => {
    const grouped: Record<string, MappedEvent[]> = {};
    importedEvents.forEach((event) => {
      const handle = event.fetlife_handle?.toLowerCase();
      const munch = munchMap[handle];
      if (munch) {
        if (!grouped[handle]) grouped[handle] = [];
        grouped[handle].push({ ...event, munch });
      }
    });
    return grouped;
  }, [importedEvents, munchMap]);

  useEffect(() => {
    const unmatched: ImportedEvent[] = [];
    importedEvents.forEach((event) => {
      const handle = event.fetlife_handle?.toLowerCase();
      const munch = munchMap[handle];
      if (!munch) unmatched.push(event);
    });
    setUnmatchedHandles(unmatched);
  }, [importedEvents, munchMap]);

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed: ImportedEvent[] = JSON.parse(e?.target?.result as string);
        setImportedEvents(parsed);

        // Auto-check boxes
        const newPlayParty: Record<string, boolean> = {};
        const newIsMunch: Record<string, boolean> = {};

        parsed.forEach((event) => {
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
        alert('Invalid JSON');
      }
    };

    reader.readAsText(file);
  };

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
    for (const [handle, handleEvents] of Object.entries(groupedEvents)) {
      const createEventsInput = []
      for (const event of handleEvents) {
        const key = `${event.name}_${event.start_date}`;
        if (excluded[key]) continue;

        const isMunch = !!isMunchOverride[key];
        const munch = isMunch ? event.munch : undefined;
        const organizerId = munch?.organizer_id;

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

          // @ts-ignore
          organizer: {
            ...(organizerId ? {
              id: organizerId,
            } : {
              name: event.fetlife_handle,
              url: `${FETLIFE_URL}/${event.fetlife_handle}`,
            })
          },
        };

        createEventsInput.push(commonProps);
      }

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
    <Box p={4}>
      <Typography variant="h4" gutterBottom>Fetlife Importer</Typography>
      <input type="file" accept=".json" onChange={handleJsonUpload} />

      {Object.entries(groupedEvents).map(([handle, munchEvents]) => (
        <Box key={handle} mt={4}>
          <Typography variant="h6">Group: {handle}</Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Is Munch?</TableCell>
                <TableCell>Is Play Party?</TableCell>
                <TableCell>Exclude</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {munchEvents.map((event, idx) => {
                const key = `${event.name}_${event.start_date}`;
                const missingFields = getMissingFields(event);

                return (
                  <TableRow key={idx}>
                    <TableCell>
                      <a href={event.ticket_url} target="_blank" rel="noopener noreferrer">
                        {event.name}
                      </a>
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
                      {missingFields.length > 0 && (
                        <Typography color="error" fontSize="0.875rem">
                          Missing: {missingFields.join(', ')}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>

                );
              })}
            </TableBody>
          </Table>
        </Box>
      ))}

      <Box mt={4}>
        <Typography variant="h6">Couldn't find munch for:</Typography>
        {unmatchedHandles.map((event, idx) => (
          <Typography key={idx}>{event.fetlife_handle || 'Unknown'} — {event.name}</Typography>
        ))}
      </Box>

      <Box mt={4}>
        <Button variant="contained" onClick={handleCreateAll}>Create Events</Button>
      </Box>
    </Box>
  );
}
