import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Checkbox,
  FormControlLabel,
  LinearProgress,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  useCreateBranchStatsScrape,
  useFetchBranchStats,
  useFetchBranchStatsScrapeStatus,
  type BranchStatsRow,
} from "../../common/db-axios/useBranchStats";

const formatNumber = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return Number(value).toLocaleString();
};

const sum = (rows: BranchStatsRow[], getVal: (row: BranchStatsRow) => number | null | undefined) =>
  rows.reduce((acc, row) => acc + (getVal(row) ?? 0), 0);

export default function BranchStatsScreen() {
  const { data, isLoading, error, refetch: refetchStats, isFetching } = useFetchBranchStats();
  const { data: scrapeStatus, refetch: refetchScrapeStatus } = useFetchBranchStatsScrapeStatus();
  const createScrape = useCreateBranchStatsScrape();
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [headless, setHeadless] = useState(true);
  const prevScrapeStatus = useRef<string | null>(null);

  const rows = useMemo(() => data?.rows ?? [], [data?.rows]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = !q
      ? rows
      : rows.filter((row) => {
        const name = row.name?.toLowerCase() || "";
        const url = row.url?.toLowerCase() || "";
        return name.includes(q) || url.includes(q);
      });
    return list
      .slice()
      .sort((a, b) => (b.stats?.overallClicks ?? 0) - (a.stats?.overallClicks ?? 0));
  }, [rows, query]);

  const totals = useMemo(() => {
    return {
      overallClicks: sum(rows, (r) => r.stats?.overallClicks),
      desktopClicks: sum(rows, (r) => r.stats?.desktop?.linkClicks),
      androidInstalls: sum(rows, (r) => r.stats?.android?.install),
      iosInstalls: sum(rows, (r) => r.stats?.ios?.install),
    };
  }, [rows]);

  const meta = data?.meta;
  const rangeLabel = meta?.range?.label ||
    (meta?.range?.startDate && meta?.range?.endDate
      ? `${meta.range.startDate} to ${meta.range.endDate}`
      : "Last 14 days");

  const statsError = error as any;
  const statsErrorStatus = statsError?.response?.status;
  const statsErrorMessage =
    statsError?.response?.data?.error ||
    statsError?.message ||
    "Failed to load branch stats.";
  const statsErrorDebug = statsError?.response?.data?.debug;
  const statsErrorDebugLines = statsErrorDebug
    ? [
      `apiRoot: ${statsErrorDebug.apiRoot}`,
      `dataDir: ${statsErrorDebug.dataDir}`,
      `jsonPath: ${statsErrorDebug.jsonPath}`,
      `csvPath: ${statsErrorDebug.csvPath}`,
      `jsonExists: ${statsErrorDebug.jsonExists}`,
      `csvExists: ${statsErrorDebug.csvExists}`,
      `cwd: ${statsErrorDebug.cwd}`,
      `node: ${statsErrorDebug.nodeVersion}`,
    ].join("\n")
    : null;

  const isScraping = scrapeStatus?.status === "running";
  const progress = scrapeStatus?.progress;
  const progressPct = progress?.total
    ? Math.min(100, Math.round((progress.processed / Math.max(progress.total, 1)) * 100))
    : null;
  const debugInfo = scrapeStatus?.debug;
  const debugLines = debugInfo
    ? [
      `apiRoot: ${debugInfo.apiRoot}`,
      `dataDir: ${debugInfo.dataDir}`,
      `scriptPath: ${debugInfo.scriptPath}`,
      `scriptRunner: ${debugInfo.scriptRunner}`,
      `scriptExists: ${debugInfo.scriptExists}`,
      `cwd: ${debugInfo.cwd}`,
      `node: ${debugInfo.nodeVersion}`,
      `hasBranchEmail: ${debugInfo.hasBranchEmail}`,
      `hasBranchPassword: ${debugInfo.hasBranchPassword}`,
    ].join("\n")
    : null;

  useEffect(() => {
    if (!isScraping) return;
    const id = setInterval(() => {
      refetchScrapeStatus();
    }, 2000);
    return () => clearInterval(id);
  }, [isScraping, refetchScrapeStatus]);

  useEffect(() => {
    const status = scrapeStatus?.status ?? null;
    if (prevScrapeStatus.current === "running" && status === "completed") {
      refetchStats();
    }
    prevScrapeStatus.current = status;
  }, [scrapeStatus?.status, refetchStats]);

  const handleRunScrape = async () => {
    setTriggerError(null);
    try {
      await createScrape.mutateAsync({ headless });
      refetchScrapeStatus();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        refetchScrapeStatus();
        return;
      }
      const message = err?.response?.data?.error || err?.message || "Failed to start branch scrape.";
      setTriggerError(message);
    }
  };

  return (
    <Box p={2}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Typography variant="h5">Branch Stats</Typography>
          <Button variant="outlined" onClick={() => refetchStats()} disabled={isFetching}>
            {isFetching ? "Refreshing..." : "Refresh"}
          </Button>
        </Stack>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Typography variant="subtitle2">Data source</Typography>
            <Typography variant="body2">
              Reads `playbuddy-api/data/branch/branch_stats.json` (falls back to CSV if JSON is missing).
            </Typography>
            <Typography
              component="pre"
              variant="body2"
              sx={{ backgroundColor: "#f8fafc", borderRadius: 1, p: 1, fontFamily: "monospace", whiteSpace: "pre-wrap" }}
            >
              cd playbuddy-api
              BRANCH_EMAIL=... BRANCH_PASSWORD=... npx tsx src/scripts/branch/getBranchStats.ts --days=14
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip label={`Range: ${rangeLabel}`} size="small" />
              {meta?.generatedAt && (
                <Chip label={`Generated: ${new Date(meta.generatedAt).toLocaleString()}`} size="small" />
              )}
              {meta?.updatedAt && (
                <Chip label={`File updated: ${new Date(meta.updatedAt).toLocaleString()}`} size="small" />
              )}
              {meta?.source && <Chip label={`Source: ${meta.source}`} size="small" />}
            </Stack>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
              <Typography variant="subtitle2">Branch scrape</Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={headless}
                      onChange={(e) => setHeadless(e.target.checked)}
                    />
                  }
                  label="Headless"
                />
                <Button
                  variant="contained"
                  onClick={handleRunScrape}
                  disabled={isScraping || createScrape.isPending}
                >
                  {isScraping ? "Scraping..." : "Run scrape"}
                </Button>
              </Stack>
            </Stack>

            {triggerError && <Alert severity="error">{triggerError}</Alert>}

            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                size="small"
                label={`Status: ${scrapeStatus?.status || "idle"}`}
                color={scrapeStatus?.status === "completed" ? "success" : scrapeStatus?.status === "failed" ? "error" : "default"}
              />
              {progress && (
                <Chip
                  size="small"
                  label={`Processed: ${progress.processed}${progress.total ? ` / ${progress.total}` : ""}`}
                />
              )}
              {scrapeStatus?.startedAt && (
                <Chip size="small" label={`Started: ${new Date(scrapeStatus.startedAt).toLocaleString()}`} />
              )}
              {scrapeStatus?.finishedAt && (
                <Chip size="small" label={`Finished: ${new Date(scrapeStatus.finishedAt).toLocaleString()}`} />
              )}
            </Stack>

            {isScraping && (
              <LinearProgress
                variant={progressPct !== null ? "determinate" : "indeterminate"}
                value={progressPct !== null ? progressPct : undefined}
              />
            )}

            {scrapeStatus && (
              <Typography
                component="pre"
                variant="body2"
                sx={{
                  backgroundColor: "#f8fafc",
                  borderRadius: 1,
                  p: 1,
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                  maxHeight: 240,
                  overflow: "auto",
                }}
              >
                {(scrapeStatus.logs && scrapeStatus.logs.length > 0)
                  ? scrapeStatus.logs.join("\n")
                  : "No logs yet."}
              </Typography>
            )}

            {debugLines && (
              <Typography
                component="pre"
                variant="body2"
                sx={{
                  backgroundColor: "#f8fafc",
                  borderRadius: 1,
                  p: 1,
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                }}
              >
                {debugLines}
              </Typography>
            )}

            {scrapeStatus?.error && (
              <Alert severity="error">{scrapeStatus.error}</Alert>
            )}
          </Stack>
        </Paper>

        {error && (
          <Alert severity="error">
            <Stack spacing={0.5}>
              <Typography variant="subtitle2">Failed to load branch stats</Typography>
              <Typography variant="body2">
                {statsErrorStatus ? `HTTP ${statsErrorStatus}: ` : ""}{statsErrorMessage}
              </Typography>
              {statsErrorDebugLines && (
                <Typography
                  component="pre"
                  variant="body2"
                  sx={{
                    backgroundColor: "#f8fafc",
                    borderRadius: 1,
                    p: 1,
                    fontFamily: "monospace",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {statsErrorDebugLines}
                </Typography>
              )}
            </Stack>
          </Alert>
        )}
        {isLoading && <Typography variant="body2">Loading...</Typography>}

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <TextField
            size="small"
            label="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ minWidth: 220 }}
          />
          <Chip label={`${filtered.length} links`} size="small" />
          <Chip label={`Overall clicks: ${formatNumber(totals.overallClicks)}`} size="small" />
          <Chip label={`Desktop clicks: ${formatNumber(totals.desktopClicks)}`} size="small" />
          <Chip label={`Android installs: ${formatNumber(totals.androidInstalls)}`} size="small" />
          <Chip label={`iOS installs: ${formatNumber(totals.iosInstalls)}`} size="small" />
        </Stack>

        {!isLoading && filtered.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No stats available yet. Run the script above to generate the JSON/CSV.
          </Typography>
        )}

        {filtered.length > 0 && (
          <TableContainer component={Paper} variant="outlined" sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>URL</TableCell>
                  <TableCell align="right">Overall clicks</TableCell>
                  <TableCell align="right">iOS link clicks</TableCell>
                  <TableCell align="right">iOS install</TableCell>
                  <TableCell align="right">iOS reopen</TableCell>
                  <TableCell align="right">Android link clicks</TableCell>
                  <TableCell align="right">Android install</TableCell>
                  <TableCell align="right">Android reopen</TableCell>
                  <TableCell align="right">Desktop link clicks</TableCell>
                  <TableCell align="right">Desktop texts sent</TableCell>
                  <TableCell align="right">Desktop iOS install</TableCell>
                  <TableCell align="right">Desktop iOS reopen</TableCell>
                  <TableCell align="right">Desktop Android install</TableCell>
                  <TableCell align="right">Desktop Android reopen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((row, idx) => (
                  <TableRow key={`${row.url || row.name || "row"}-${idx}`}>
                    <TableCell>{row.name || "-"}</TableCell>
                    <TableCell>
                      {row.url ? (
                        <Link href={row.url} target="_blank" rel="noopener noreferrer" underline="hover">
                          {row.url}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell align="right">{formatNumber(row.stats?.overallClicks)}</TableCell>
                    <TableCell align="right">{formatNumber(row.stats?.ios?.linkClicks)}</TableCell>
                    <TableCell align="right">{formatNumber(row.stats?.ios?.install)}</TableCell>
                    <TableCell align="right">{formatNumber(row.stats?.ios?.reopen)}</TableCell>
                    <TableCell align="right">{formatNumber(row.stats?.android?.linkClicks)}</TableCell>
                    <TableCell align="right">{formatNumber(row.stats?.android?.install)}</TableCell>
                    <TableCell align="right">{formatNumber(row.stats?.android?.reopen)}</TableCell>
                    <TableCell align="right">{formatNumber(row.stats?.desktop?.linkClicks)}</TableCell>
                    <TableCell align="right">{formatNumber(row.stats?.desktop?.textsSent)}</TableCell>
                    <TableCell align="right">{formatNumber(row.stats?.desktop?.iosSms?.install)}</TableCell>
                    <TableCell align="right">{formatNumber(row.stats?.desktop?.iosSms?.reopen)}</TableCell>
                    <TableCell align="right">{formatNumber(row.stats?.desktop?.androidSms?.install)}</TableCell>
                    <TableCell align="right">{formatNumber(row.stats?.desktop?.androidSms?.reopen)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>
    </Box>
  );
}
