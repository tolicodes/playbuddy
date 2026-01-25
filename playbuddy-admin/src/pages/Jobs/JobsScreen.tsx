import React from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Chip,
  Collapse,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useSearchParams } from "react-router-dom";
import {
  useScrapeJobs,
  type ScrapeJobWithTasks,
  type ScrapeTask,
} from "../../common/db-axios/useScrapeJobs";
import { useFetchOrganizers } from "../../common/db-axios/useOrganizers";
import type { Event } from "../../common/types/commonTypes";
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

const resultStatusColor = (status: string) => {
  switch (status) {
    case "inserted":
      return "success";
    case "updated":
      return "info";
    case "failed":
      return "error";
    case "skipped":
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
    ...(res.skippedIds || []),
  ];
};

const getTaskFailedCount = (task: ScrapeTask): number => {
  const result = (task.result || {}) as any;
  const failedCount =
    typeof result.failedCount === "number"
      ? result.failedCount
      : Array.isArray(result.failedIds)
        ? result.failedIds.length
        : 0;
  const eventFailedCount = Array.isArray(result.eventResults)
    ? result.eventResults.filter((item: any) => item?.status === "failed" || item?.error).length
    : 0;
  const count = Math.max(failedCount, eventFailedCount);
  if (count > 0) return count;
  return task.status === "failed" || result.failed || result.scrapeFailed ? 1 : 0;
};

const getTaskSkippedCount = (task: ScrapeTask): number => {
  const result = (task.result || {}) as any;
  if (typeof result.skippedCount === "number") return result.skippedCount;
  if (Array.isArray(result.skippedIds)) return result.skippedIds.length;
  if (Array.isArray(result.skipped)) return result.skipped.length;
  if (Array.isArray(result.eventResults)) {
    return result.eventResults.filter((item: any) => item?.status === "skipped" || item?.skip?.reason).length;
  }
  return 0;
};

const JobsScreen: React.FC = () => {
  const { data: jobs = [], isLoading } = useScrapeJobs({ stream: true });
  const [searchParams] = useSearchParams();
  const targetJobId = searchParams.get("jobId");
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
  const [expandedJobs, setExpandedJobs] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (!targetJobId) return;
    setExpandedJobs((prev) => ({ ...prev, [targetJobId]: true }));
    const el = document.getElementById(`job-${targetJobId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [targetJobId]);

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
            <Accordion
              key={job.id}
              id={`job-${job.id}`}
              expanded={!!expandedJobs[job.id]}
              onChange={(_, expanded) =>
                setExpandedJobs((prev) => ({ ...prev, [job.id]: expanded }))
              }
            >
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
                      const failedCount = list.reduce((sum, t) => sum + getTaskFailedCount(t), 0);
                      const skippedCount = list.reduce((sum, t) => sum + getTaskSkippedCount(t), 0);
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
                              {failedCount > 0 && (
                                <Chip size="small" color="error" variant="outlined" label={`${failedCount} failed`} />
                              )}
                              {skippedCount > 0 && (
                                <Chip size="small" color="warning" variant="outlined" label={`${skippedCount} skipped`} />
                              )}
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
                                const skippedList = Array.isArray(result.skipped) ? result.skipped : [];
                                const skippedCount = getTaskSkippedCount(t);
                                if (skippedCount > 0) badges.push("skipped");

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
                                        {skippedCount > 0 && (
                                          <Typography variant="caption" color="text.secondary">
                                            Skipped {skippedCount}
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
                                        {Array.isArray(result.eventResults) && result.eventResults.length > 0 && (
                                          <Box sx={{ mb: 1 }}>
                                            <Typography variant="caption" color="text.secondary">
                                              Events ({result.eventResults.length})
                                            </Typography>
                                            <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                                              {result.eventResults.map((item: any, idx: number) => {
                                                const eventId = item?.eventId ? String(item.eventId) : null;
                                                const resolvedEvent = eventId ? eventById[eventId] : undefined;
                                                const date = resolvedEvent?.start_date || item?.start_date || null;
                                                const name =
                                                  resolvedEvent?.name ||
                                                  item?.name ||
                                                  item?.event_url ||
                                                  item?.ticket_url ||
                                                  item?.source_url ||
                                                  t.url;
                                                const displayTitle = date
                                                  ? `${date.slice(0, 10)} ${name}`
                                                  : name;
                                                const status = item?.status || "unknown";
                                                const url =
                                                  item?.event_url ||
                                                  item?.ticket_url ||
                                                  item?.source_url ||
                                                  null;
                                                return (
                                                  <Box key={`${t.id}-event-${idx}`} sx={{ border: "1px solid #e5e7eb", borderRadius: 1, p: 0.75, bgcolor: "#ffffff" }}>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                      <Chip size="small" label={status} color={resultStatusColor(status) as any} />
                                                      <Typography variant="caption" sx={{ flex: 1 }} noWrap>
                                                        {displayTitle}
                                                      </Typography>
                                                      {eventId && (
                                                        <Chip size="small" variant="outlined" label={`id ${eventId}`} />
                                                      )}
                                                    </Stack>
                                                    {item?.organizer && (
                                                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                                        Organizer: {item.organizer}
                                                      </Typography>
                                                    )}
                                                    {url && (
                                                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                                        URL: {url}
                                                      </Typography>
                                                    )}
                                                    {item?.original_id && (
                                                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                                        Original ID: {item.original_id}
                                                      </Typography>
                                                    )}
                                                    {item?.location && (
                                                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                                        Location: {item.location}
                                                      </Typography>
                                                    )}
                                                    {item?.error && (
                                                      <Typography variant="caption" color="error" sx={{ display: "block" }}>
                                                        Error: {item.error}
                                                      </Typography>
                                                    )}
                                                    {item?.skip?.reason && (
                                                      <Typography variant="caption" sx={{ display: "block", color: "#9a3412" }}>
                                                        Skip: {item.skip.reason}
                                                      </Typography>
                                                    )}
                                                    {item?.skip?.detail && (
                                                      <Typography variant="caption" sx={{ display: "block", color: "#9a3412" }}>
                                                        {item.skip.detail}
                                                      </Typography>
                                                    )}
                                                  </Box>
                                                );
                                              })}
                                            </Stack>
                                          </Box>
                                        )}
                                        {Array.isArray(result.htmlFiles) && result.htmlFiles.length > 0 && (
                                          <Box sx={{ mb: 1 }}>
                                            <Typography variant="caption" color="text.secondary">
                                              HTML files
                                            </Typography>
                                            <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                                              {result.htmlFiles.map((file: string, index: number) => (
                                                <Typography key={`${t.id}-html-${index}`} variant="caption" sx={{ display: "block" }}>
                                                  {file}
                                                </Typography>
                                              ))}
                                            </Stack>
                                          </Box>
                                        )}
                                        {skippedList.length > 0 && (
                                          <Box sx={{ mb: 1 }}>
                                            <Typography variant="caption" color="text.secondary">
                                              Skipped events
                                            </Typography>
                                            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                              {skippedList.map((skip: any, index: number) => (
                                                <Box key={`${skip.url || "skip"}-${index}`} sx={{ border: "1px solid #e5e7eb", borderRadius: 1, p: 0.75, bgcolor: "#fff7ed" }}>
                                                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#9a3412" }}>
                                                    {skip.reason}
                                                  </Typography>
                                                  {skip.eventName && (
                                                    <Typography variant="caption" sx={{ display: "block", color: "#7c2d12" }}>
                                                      {skip.eventName}
                                                    </Typography>
                                                  )}
                                                  {skip.url && (
                                                    <Typography variant="caption" sx={{ display: "block", color: "#b45309" }}>
                                                      {skip.url}
                                                    </Typography>
                                                  )}
                                                  {skip.detail && (
                                                    <Typography variant="caption" sx={{ display: "block", color: "#9a3412" }}>
                                                      {skip.detail}
                                                    </Typography>
                                                  )}
                                                </Box>
                                              ))}
                                            </Stack>
                                          </Box>
                                        )}
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
