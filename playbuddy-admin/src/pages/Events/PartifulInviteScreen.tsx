import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useFetchEvents } from "../../common/db-axios/useEvents";
import type { Event } from "../../common/types/commonTypes";

type PartifulInviteResponse = {
  partifulId: string;
  url: string;
};

type PartifulInvitePayload = {
  event: Record<string, unknown>;
  cohostIds?: string[];
};

type PersistedState = {
  selectedEventId?: number;
  lastInvite?: PartifulInviteResponse;
};

type ExtensionStatus = "unknown" | "connected" | "missing" | "blocked";

type ExtensionMessage =
  | {
      type: "pb-partiful-pong";
      requestId: string;
      allowed?: boolean;
      host?: string;
    }
  | {
      type: "pb-partiful-log";
      requestId: string;
      level: "info" | "warn" | "error";
      message: string;
      data?: Record<string, unknown>;
    }
  | {
      type: "pb-partiful-response";
      requestId: string;
      ok: boolean;
      result?: PartifulInviteResponse;
      error?: string;
    };

const STORAGE_KEY = "partifulInviteAdminState";
const DEFAULT_TIMEZONE = "America/New_York";

const DEFAULT_GUEST_STATUS_COUNTS = {
  READY_TO_SEND: 0,
  SENDING: 0,
  SENT: 0,
  SEND_ERROR: 0,
  DELIVERY_ERROR: 0,
  INTERESTED: 0,
  MAYBE: 0,
  GOING: 0,
  DECLINED: 0,
  WAITLIST: 0,
  PENDING_APPROVAL: 0,
  APPROVED: 0,
  WITHDRAWN: 0,
  RESPONDED_TO_FIND_A_TIME: 0,
  WAITLISTED_FOR_APPROVAL: 0,
  REJECTED: 0,
};

const DEFAULT_POSTER = {
  id: "gamenight-apd",
  name: "gamenight-apd",
  contentType: "image/png",
  createdAt: "2025-05-02T00:06:18.000Z",
  version: 1746147223,
  tags: [
    "a.p.d",
    "ace",
    "board game",
    "board games",
    "cards",
    "casino",
    "clubs",
    "dealer",
    "deck",
    "game night",
    "games",
    "hearts",
    "joker",
    "playing games",
    "poker",
    "spades",
  ],
  size: 1906910,
  width: 2160,
  height: 2160,
  categories: ["Chill", "Themed"],
  url: "https://assets.getpartiful.com/posters/gamenight-apd",
  ordersMap: { default: 0, us: 0 },
  cardOrdersMap: {},
  bgColor: "#FDFBE4",
  blurHash: "eHR3T6bI%4j[s;f,RPW9M{fP~WfiNGofRjxuoza$xuWB-;oej?oLt6",
};

const DEFAULT_IMAGE = {
  source: "partiful_posters",
  poster: DEFAULT_POSTER,
  url: "https://assets.getpartiful.com/posters/gamenight-apd",
  blurHash: "eHR3T6bI%4j[s;f,RPW9M{fP~WfiNGofRjxuoza$xuWB-;oej?oLt6",
  contentType: "image/png",
  name: "gamenight-apd",
  height: 2160,
  width: 2160,
};

const DEFAULT_DISPLAY_SETTINGS = {
  theme: "karaoke",
  effect: "sunbeams",
  titleFont: "display",
};

const DEFAULT_EVENT_TEMPLATE = {
  title: "Untitled",
  startDate: new Date().toISOString(),
  timezone: DEFAULT_TIMEZONE,
  guestStatusCounts: DEFAULT_GUEST_STATUS_COUNTS,
  displaySettings: DEFAULT_DISPLAY_SETTINGS,
  showHostList: true,
  showGuestCount: true,
  showGuestList: true,
  showActivityTimestamps: true,
  displayInviteButton: true,
  visibility: "public",
  allowGuestPhotoUpload: true,
  enableGuestReminders: true,
  rsvpsEnabled: true,
  allowGuestsToInviteMutuals: true,
  rsvpButtonGlyphType: "emojis",
  image: DEFAULT_IMAGE,
  status: "UNSAVED",
  endDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  locationInfo: {
    type: "freeform",
    value: "TBA",
  },
  description: "",
};

const loadPersistedState = (): PersistedState => {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as PersistedState;
  } catch {
    return {};
  }
};

const persistState = (state: PersistedState) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const isValidDate = (date: Date) => !Number.isNaN(date.getTime());

const toIsoOrFallback = (value: string | undefined, fallback: Date) => {
  if (!value) return fallback.toISOString();
  const parsed = new Date(value);
  return isValidDate(parsed) ? parsed.toISOString() : fallback.toISOString();
};

const buildEventPayload = (event: Event) => {
  const start = new Date(event.start_date);
  const fallbackStart = isValidDate(start) ? start : new Date();
  const endFallback = new Date(fallbackStart.getTime() + 2 * 60 * 60 * 1000);

  return {
    ...DEFAULT_EVENT_TEMPLATE,
    title: event.name ?? DEFAULT_EVENT_TEMPLATE.title,
    startDate: toIsoOrFallback(event.start_date, fallbackStart),
    endDate: toIsoOrFallback(event.end_date, endFallback),
    timezone: DEFAULT_TIMEZONE,
    locationInfo: {
      type: "freeform",
      value: event.location ?? DEFAULT_EVENT_TEMPLATE.locationInfo.value,
    },
    description: event.description ?? DEFAULT_EVENT_TEMPLATE.description,
  };
};

const makeRequestId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export default function PartifulInviteScreen() {
  const persisted = useMemo(loadPersistedState, []);
  const [query, setQuery] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<number | null>(
    persisted.selectedEventId ?? null
  );
  const [lastInvite, setLastInvite] = useState<PartifulInviteResponse | null>(
    persisted.lastInvite ?? null
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus>(
    "unknown"
  );
  const [blockedHost, setBlockedHost] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [requestInFlight, setRequestInFlight] = useState(false);
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const pendingRequestIdRef = useRef<string | null>(null);
  const requestTimeoutRef = useRef<number | null>(null);

  const { data: events = [], isLoading: eventsLoading } = useFetchEvents({
    includeHidden: true,
    includeHiddenOrganizers: true,
    includePrivate: true,
  });

  useEffect(() => {
    persistState({
      selectedEventId: selectedEventId ?? undefined,
      lastInvite: lastInvite ?? undefined,
    });
  }, [selectedEventId, lastInvite]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.origin !== window.location.origin) return;
      const data = event.data as ExtensionMessage | undefined;
      if (!data || typeof data !== "object" || !("type" in data)) return;
      const activeRequestId = pendingRequestIdRef.current;
      if (data.type === "pb-partiful-pong") {
        if (data.allowed === false) {
          setExtensionStatus("blocked");
          setBlockedHost(data.host ?? null);
        } else {
          setExtensionStatus("connected");
          setBlockedHost(null);
        }
        return;
      }
      if (!activeRequestId || data.requestId !== activeRequestId) return;

      if (data.type === "pb-partiful-log") {
        const detail = data.data ? ` ${JSON.stringify(data.data)}` : "";
        setLogs((prev) => [
          ...prev,
          `${new Date().toISOString()} [${data.level}] ${data.message}${detail}`,
        ]);
        return;
      }
      if (data.type === "pb-partiful-response") {
        if (requestTimeoutRef.current) {
          window.clearTimeout(requestTimeoutRef.current);
          requestTimeoutRef.current = null;
        }
        pendingRequestIdRef.current = null;
        setRequestInFlight(false);
        if (data.ok && data.result) {
          setLastInvite(data.result);
          setActionError(null);
          if (data.result.url) {
            window.open(data.result.url, "_blank", "noopener,noreferrer");
          }
        } else {
          setActionError(data.error || "Failed to create Partiful invite.");
        }
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  useEffect(() => {
    const requestId = makeRequestId();
    const timeout = window.setTimeout(() => {
      setExtensionStatus((prev) => (prev === "unknown" ? "missing" : prev));
    }, 1500);
    window.postMessage(
      { type: "pb-partiful-ping", requestId },
      window.location.origin
    );
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const container = logContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [logs]);

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter((event) => {
      const name = event.name?.toLowerCase() || "";
      const location = event.location?.toLowerCase() || "";
      return (
        name.includes(q) ||
        location.includes(q) ||
        String(event.id).includes(q)
      );
    });
  }, [events, query]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) || null,
    [events, selectedEventId]
  );

  const extensionLabel =
    extensionStatus === "connected"
      ? "Connected"
      : extensionStatus === "blocked"
        ? "Blocked"
      : extensionStatus === "missing"
        ? "Not detected"
        : "Checking";

  const extensionColor =
    extensionStatus === "connected"
      ? "success"
      : extensionStatus === "blocked"
        ? "warning"
      : extensionStatus === "missing"
        ? "warning"
        : "default";

  const handleCreateInvite = async () => {
    if (!selectedEvent) return;
    setActionError(null);
    setLastInvite(null);
    setLogs([]);
    setRequestInFlight(true);

    const requestId = makeRequestId();
    pendingRequestIdRef.current = requestId;
    window.postMessage(
      {
        type: "pb-partiful-request",
        requestId,
        payload: {
          event: buildEventPayload(selectedEvent),
          cohostIds: [],
        } as PartifulInvitePayload,
      },
      window.location.origin
    );

    if (requestTimeoutRef.current) {
      window.clearTimeout(requestTimeoutRef.current);
    }
    requestTimeoutRef.current = window.setTimeout(() => {
      pendingRequestIdRef.current = null;
      setRequestInFlight(false);
      setActionError("No response from the Chrome extension.");
    }, 60000);
  };

  const handlePingExtension = () => {
    setExtensionStatus("unknown");
    setBlockedHost(null);
    const requestId = makeRequestId();
    const timeout = window.setTimeout(() => {
      setExtensionStatus((prev) => (prev === "unknown" ? "missing" : prev));
    }, 1500);
    window.postMessage(
      { type: "pb-partiful-ping", requestId },
      window.location.origin
    );
    window.setTimeout(() => window.clearTimeout(timeout), 2000);
  };

  return (
    <Box p={2}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">Partiful Invites (Chrome Extension)</Typography>
          <Button variant="outlined" onClick={handlePingExtension}>
            Check extension
          </Button>
        </Stack>

        {actionError && <Alert severity="error">{actionError}</Alert>}

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="subtitle1">Extension status</Typography>
              <Chip label={extensionLabel} color={extensionColor} size="small" />
            </Stack>

            <Typography variant="body2">
              Install the Playbuddy Chrome extension and log into Partiful in the
              same browser. The extension creates the invite on your behalf.
            </Typography>
            {extensionStatus === "blocked" && (
              <Alert severity="warning">
                Extension detected but blocked on{" "}
                {blockedHost ? blockedHost : "this host"}. Use localhost,
                127.0.0.1, 0.0.0.0, or a playbuddy domain.
              </Alert>
            )}
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Typography variant="subtitle1">Selected event</Typography>
            {selectedEvent ? (
              <Stack spacing={0.5}>
                <Typography variant="body2">
                  <strong>{selectedEvent.name}</strong>
                </Typography>
                <Typography variant="caption">
                  {formatDate(selectedEvent.start_date)} →{" "}
                  {formatDate(selectedEvent.end_date)}
                </Typography>
                <Typography variant="caption">
                  {selectedEvent.location}
                </Typography>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Select an event below.
              </Typography>
            )}
            <Button
              variant="contained"
              disabled={!selectedEvent || requestInFlight}
              onClick={handleCreateInvite}
            >
              {requestInFlight ? "Creating..." : "Create Partiful invite"}
            </Button>
            {lastInvite && (
              <Alert severity="success">
                Partiful invite created:{" "}
                <Link href={lastInvite.url} target="_blank" rel="noreferrer">
                  {lastInvite.url}
                </Link>
              </Alert>
            )}
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Typography variant="subtitle1">Extension log</Typography>
            <Box
              ref={logContainerRef}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                p: 1,
                bgcolor: "background.default",
                maxHeight: 240,
                overflowY: "auto",
                fontFamily: "monospace",
                fontSize: 12,
                whiteSpace: "pre-wrap",
              }}
            >
              {logs.length ? logs.join("\n") : "No logs yet."}
            </Box>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="Search events"
              size="small"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />

            {eventsLoading ? (
              <Typography variant="body2">Loading events...</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Start</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell align="right">Select</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow
                      key={event.id}
                      selected={event.id === selectedEventId}
                    >
                      <TableCell>{event.id}</TableCell>
                      <TableCell>{event.name}</TableCell>
                      <TableCell>{formatDate(event.start_date)}</TableCell>
                      <TableCell>{event.location}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant={
                            event.id === selectedEventId
                              ? "contained"
                              : "outlined"
                          }
                          onClick={() => setSelectedEventId(event.id)}
                        >
                          {event.id === selectedEventId ? "Selected" : "Select"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
