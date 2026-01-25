import React, { useMemo } from "react";
import { Box, Button, Chip, LinearProgress, Stack, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { useScrapeJobs, type ScrapeJobWithTasks } from "../common/db-axios/useScrapeJobs";

type ScrapeJobsStatusBarProps = {
  limit?: number;
  title?: string;
  showWhenIdle?: boolean;
  sx?: SxProps<Theme>;
};

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

const getProgress = (job: ScrapeJobWithTasks) => {
  const total = job.total_tasks || job.tasks?.length || 0;
  const done = (job.completed_tasks || 0) + (job.failed_tasks || 0);
  const pct = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return { total, done, pct };
};

const resolveSourceLabel = (job: ScrapeJobWithTasks) => {
  if (typeof job.source === "string" && job.source.trim()) return job.source;
  if (typeof job.metadata?.source === "string" && job.metadata.source.trim()) return job.metadata.source;
  return "scrape";
};

const ScrapeJobsStatusBar: React.FC<ScrapeJobsStatusBarProps> = ({
  limit = 3,
  title = "Live scrape jobs",
  showWhenIdle = false,
  sx,
}) => {
  const { data: jobs = [] } = useScrapeJobs({ stream: true, streamLimit: limit });
  const navigate = useNavigate();

  const { activeJobs, displayJobs } = useMemo(() => {
    const isActive = (job: ScrapeJobWithTasks) => {
      const { total, done } = getProgress(job);
      if (job.status === "pending") return true;
      if (job.status === "running") {
        if (total === 0) return true;
        return done < total;
      }
      return false;
    };
    const active = jobs.filter(isActive);
    const display = (active.length ? active : jobs).slice(0, limit);
    return { activeJobs: active, displayJobs: display };
  }, [jobs, limit]);

  if (!displayJobs.length) return null;
  if (!showWhenIdle && activeJobs.length === 0) return null;

  return (
    <Box
      sx={{
        border: "1px solid #e5e7eb",
        borderRadius: 2,
        bgcolor: "#ffffff",
        px: 2,
        py: 1.5,
        my: 1.5,
        ...sx,
      }}
    >
      <Stack spacing={1.25}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">
            {title}
          </Typography>
          <Button
            size="small"
            onClick={() => navigate("/jobs")}
            sx={{ textTransform: "none", fontSize: 12 }}
          >
            View jobs
          </Button>
        </Stack>
        {displayJobs.map((job) => {
          const { total, done, pct } = getProgress(job);
          const pending = Math.max(total - done, 0);
          const result = (job.result || {}) as { inserted?: number; updated?: number; failed?: number };
          const summaryParts = [
            typeof result.inserted === "number" ? `Inserted ${result.inserted}` : null,
            typeof result.updated === "number" ? `Updated ${result.updated}` : null,
            typeof result.failed === "number" ? `Failed ${result.failed}` : null,
          ].filter(Boolean) as string[];

          return (
            <Box key={job.id}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  size="small"
                  label={job.status}
                  color={statusColor(job.status) as any}
                />
                <Typography variant="body2" sx={{ flex: 1 }}>
                  {resolveSourceLabel(job)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {total ? `${done}/${total}` : "—"}
                </Typography>
                <Button
                  size="small"
                  onClick={() => navigate(`/jobs?jobId=${encodeURIComponent(job.id)}`)}
                  sx={{ textTransform: "none", fontSize: 11, minWidth: 0, px: 1 }}
                >
                  Open
                </Button>
              </Stack>
              {total > 0 && (
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  sx={{ height: 6, borderRadius: 999, mt: 0.75 }}
                />
              )}
              {pending > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                  Pending {pending}
                </Typography>
              )}
              {summaryParts.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                  {summaryParts.join(" • ")}
                </Typography>
              )}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

export default ScrapeJobsStatusBar;
