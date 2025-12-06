import React from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Chip,
  Collapse,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  useScrapeJobs,
  type ScrapeJobWithTasks,
  type ScrapeTask,
} from "../../common/db-axios/useScrapeJobs";
import { useFetchOrganizers } from "../../common/db-axios/useOrganizers";
import type { Event } from "../../common/types/commonTypes";
import { API_BASE_URL } from "../../common/config";
import { useFetchEvents } from "../../common/db-axios/useEvents";

const statusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
      return "error";
    case "running":
      return "warning";
    default:
      return "default";
  }
};

const organizerKey = (url: string) => {
  try {
    const u = new URL(url);
    if (/eventbrite\.com\/o\//i.test(url)) {
      const m = url.match(/eventbrite\.com\/o\/([^/]+)/i);
      if (m?.[1]) return `eventbrite:${m[1]}`;
    }
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
};

const getEventIdsFromTask = (t: ScrapeTask): string[] => {
  const res = (t.result || {}) as any;
  return [
    ...(res.insertedIds || []),
    ...(res.updatedIds || []),
    ...(res.failedIds || []),
  ];
};

const JobsScreen: React.FC = () => {
  const { data: jobs = [], isLoading } = useScrapeJobs();
  const { data: events = [] } = useFetchEvents({
    includeFacilitatorOnly: true,
    includeNonNY: true,
    includePrivate: true,
    includeHiddenOrganizers: true,
    includeHidden: true,
  })
  const { data: organizers = [] } = useFetchOrganizers({ includeHidden: true });

  const eventById = React.useMemo(() => {
    const map: Record<string, Event> = {};
    (events as Event[]).forEach((ev) => {
      map[String(ev.id)] = ev;
    });
    return map;
  }, [events]);

  const organizerInfoByName = React.useMemo(() => {
    const map: Record<string, { hidden?: boolean; total?: number; hiddenCount?: number }> = {};
    (organizers as any[]).forEach((org: any) => {
      if (org?.name) {
        const total = org.events?.[0]?.count ?? org.events_count ?? 0;
        const hiddenCount = org.events_hidden_count ?? 0;
        const allHidden = total > 0 && hiddenCount >= total;
        map[org.name] = {
          hidden: org.hidden || allHidden,
          total,
          hiddenCount,
        };
      }
    });
    return map;
  }, [organizers]);

  const organizerHiddenById = React.useMemo(() => {
    const map: Record<string, boolean> = {};
    (organizers as any[]).forEach((org: any) => {
      if (org?.id) {
        const total = org.events?.[0]?.count ?? org.events_count ?? 0;
        const hiddenCount = org.events_hidden_count ?? 0;
        const allHidden = total > 0 && hiddenCount >= total;
        map[String(org.id)] = !!org.hidden || allHidden;
      }
    });
    return map;
  }, [organizers]);

  const [expandedTasks, setExpandedTasks] = React.useState<Record<string, boolean>>({});

  const toggleTask = (id: string) => {
    setExpandedTasks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        Scrape Jobs
      </Typography>
      {isLoading && <Typography variant="body2">Loading…</Typography>}
      <Stack spacing={2}>
        {[...jobs]
          .sort((a, b) => {
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            return bTime - aTime;
          })
          .map((job: ScrapeJobWithTasks) => {
            const tasks = job.tasks || [];
            const total = job.total_tasks || tasks.length || 0;
            const done = job.completed_tasks + job.failed_tasks;
            const pct = total ? Math.round((done / total) * 100) : 0;
            const jobCreated = job.created_at
              ? new Date(job.created_at).toLocaleString()
              : "unknown";
            const grouped = tasks.reduce<Record<string, ScrapeTask[]>>((acc, t) => {
              const ids = getEventIdsFromTask(t);
              const ev = ids.length ? eventById[ids[0]] : undefined;
              const orgName = ev?.organizer?.name;
              const key = orgName ? `organizer:${orgName}` : organizerKey(t.url);
              acc[key] = acc[key] || [];
              acc[key].push(t);
              return acc;
            }, {});

          return (
            <Accordion key={job.id}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ width: "100%" }}>
                  <Typography variant="subtitle1">Job {job.id}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Started: {jobCreated}
                  </Typography>
                  <Chip size="small" label={job.status} color={statusColor(job.status) as any} />
                  <Typography variant="body2">
                    {done}/{total} completed
                  </Typography>
                    <Box sx={{ flex: 1 }}>
                      <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 4 }} />
                    </Box>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    {[...Object.entries(grouped)].sort((a, b) => {
                      const nameA = a[0].startsWith("organizer:") ? a[0].replace("organizer:", "") : a[0];
                      const nameB = b[0].startsWith("organizer:") ? b[0].replace("organizer:", "") : b[0];
                      const cntA = organizerInfoByName[nameA]?.total ?? a[1].length;
                      const cntB = organizerInfoByName[nameB]?.total ?? b[1].length;
                      return cntB - cntA;
                    }).map(([group, list]) => {
                      const displayGroup = group.startsWith("organizer:") ? group.replace("organizer:", "") : group;
                      const completedCount = list.filter((t) => t.status === "completed").length;
                      return (
                        <Accordion key={group} disableGutters sx={{ border: "1px solid #e5e7eb", boxShadow: "none" }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
                              <Typography variant="subtitle2" sx={{ flex: 1 }}>
                                {displayGroup}
                              </Typography>
                              {(() => {
                                const info = organizerInfoByName[displayGroup];
                                return info?.hidden ? <Chip size="small" label="Hidden org" variant="outlined" /> : null;
                              })()}
                              <Chip size="small" label={`${list.length} tasks`} />
                              <Chip size="small" color="success" variant="outlined" label={`${completedCount} done`} />
                            </Stack>
                          </AccordionSummary>
                          <AccordionDetails sx={{ pt: 0 }}>
                            <Stack spacing={0.5}>
                              {list.map((t) => {
                                const result = t.result || {};
                                const badges: string[] = [];
                                if (result.inserted) badges.push("inserted");
                                if (result.updated) badges.push("updated");
                                if (result.failed) badges.push("failed");

                                const eventIds = (
                                  result.insertedIds ||
                                  result.updatedIds ||
                                  result.failedIds ||
                                  []
                                ) as string[];
                                const primaryEventId = (t.event_id || eventIds[0]) as string | undefined;
                                const event = primaryEventId ? eventById[primaryEventId] : undefined;
                                if (primaryEventId && !event) {
                                  console.warn("[jobs] missing event for task", {
                                    taskId: t.id,
                                    eventId: primaryEventId,
                                    eventIds,
                                  });
                                }
                                const title =
                                  event?.name && event?.start_date
                                    ? `${event.start_date.slice(0, 10)} ${event.name}`
                                    : event?.name || t.url;
                                const hiddenOrg =
                                  event?.organizer?.hidden ||
                                  (event?.organizer?.id ? organizerHiddenById[event.organizer.id] : undefined);
                                const hiddenEvent = (event as any)?.hidden;
                                const hiddenTag = hiddenEvent ? 'hidden' : hiddenOrg ? 'hidden org' : null;

                                return (
                                  <Box key={t.id} sx={{ border: "1px solid #f1f5f9", borderRadius: 1, p: 0.75 }}>
                                    <Stack direction="row" spacing={1.25} alignItems="center">
                                      {event?.image_url && (
                                        <Box
                                          component="img"
                                          src={event.image_url}
                                          alt={event.name}
                                          sx={{
                                            width: 56,
                                            height: 56,
                                            borderRadius: 1,
                                            objectFit: "cover",
                                            border: "1px solid #e5e7eb",
                                          }}
                                        />
                                      )}
                                      <Stack
                                        spacing={0.25}
                                        sx={{ flex: 1, cursor: "pointer" }}
                                        onClick={() => toggleTask(t.id)}
                                      >
                                        <Stack direction="row" spacing={1} alignItems="center">
                                          <Chip size="small" label={t.status} color={statusColor(t.status) as any} />
                                          <Typography
                                            variant="body2"
                                            sx={{ flex: 1, color: hiddenOrg || hiddenEvent ? 'text.disabled' : 'inherit' }}
                                            noWrap
                                          >
                                            {title}
                                          </Typography>
                                          {badges.length > 0 && (
                                            <Chip
                                              size="small"
                                              label={badges.join("/")}
                                              color={result.failed ? "error" : "success"}
                                              variant="outlined"
                                            />
                                          )}
                                          {hiddenOrg && <Chip size="small" label="Hidden org" color="default" variant="outlined" />}
                                          {hiddenEvent && <Chip size="small" label="Hidden event" color="default" variant="outlined" />}
                                        </Stack>
                                        {hiddenTag && (
                                          <Typography variant="caption" color="text.secondary">
                                            {hiddenTag}
                                          </Typography>
                                        )}
                                        {event?.short_description && (
                                          <Typography variant="caption" color="text.secondary" noWrap>
                                            {event.short_description}
                                          </Typography>
                                        )}
                                        {result.errorMessage && (
                                          <Typography variant="caption" color="error">
                                            {result.errorMessage}
                                          </Typography>
                                        )}
                                        {t.last_error && (
                                          <Typography variant="caption" color="error">
                                            {t.last_error}
                                          </Typography>
                                        )}
                                      </Stack>
                                    </Stack>
                                    <Collapse in={!!expandedTasks[t.id]} unmountOnExit>
                                      <Box sx={{ mt: 1, bgcolor: "#f8fafc", borderRadius: 1, p: 1 }}>
                                        <Typography variant="caption" color="text.secondary">
                                          {event ? "Event JSON" : "Result JSON"}
                                        </Typography>
                                        <Typography
                                          component="pre"
                                          variant="body2"
                                          sx={{ whiteSpace: "pre-wrap", fontSize: 12, mt: 0.5 }}
                                        >
                                          {JSON.stringify(event || result, null, 2)}
                                        </Typography>
                                      </Box>
                                    </Collapse>
                                  </Box>
                                );
                              })}
                            </Stack>
                          </AccordionDetails>
                        </Accordion>
                      );
                    })}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            );
          })}
      </Stack>
    </Box>
  );
};

export default JobsScreen;
