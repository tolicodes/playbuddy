import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";

export type ScrapeJob = {
  id: string;
  status: string;
  priority: number;
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  created_at: string;
  created_by_auth_user_id?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  source?: string | null;
  mode?: string | null;
  metadata?: any;
  result?: {
    inserted: number;
    updated: number;
    failed: number;
  };
};

export type ScrapeTask = {
  id: string;
  job_id: string;
  url: string;
  source?: string | null;
  status: string;
  priority: number;
  attempts: number;
  event_id?: string | null;
  result?: {
    inserted?: boolean;
    updated?: boolean;
    failed?: boolean;
    errorMessage?: string;
    scrapedCount?: number;
    insertedCount?: number;
    updatedCount?: number;
    failedCount?: number;
    insertedIds?: string[];
    updatedIds?: string[];
    failedIds?: string[];
    skippedIds?: string[];
    skippedCount?: number;
    scrapeFailed?: boolean;
    scrapeErrorMessage?: string;
    eventResults?: any[];
    htmlFiles?: string[];
    skipped?: {
      url: string;
      reason: string;
      detail?: string;
      source?: string;
      stage?: "scrape" | "upsert";
      eventName?: string;
      eventId?: string;
    }[];
  } | any;
  last_error?: string | null;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
};

export type ScrapeJobWithTasks = {
  id: string;
  status: string;
  priority: number;
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  created_at: string;
  created_by_auth_user_id?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  source?: string | null;
  mode?: string | null;
  metadata?: any;
  tasks: ScrapeTask[];
  result?: {
    inserted: number;
    updated: number;
    failed: number;
  };
};

type UseScrapeJobsOptions = {
  stream?: boolean;
  streamLimit?: number;
};

const mergeDefined = <T extends Record<string, any>>(base: T, update: Partial<T>): T => {
  const next = { ...base } as T;
  Object.keys(update).forEach((key) => {
    const value = (update as any)[key];
    if (value !== undefined) {
      (next as any)[key] = value;
    }
  });
  return next;
};

const summarizeJobResult = (tasks: ScrapeTask[]) => {
  const summary = { inserted: 0, updated: 0, failed: 0 };
  tasks.forEach((t) => {
    if (t.result?.inserted) summary.inserted += 1;
    if (t.result?.updated) summary.updated += 1;
    if (t.result?.failed || t.status === "failed") summary.failed += 1;
  });
  return summary;
};

const summarizeTaskCounts = (tasks: ScrapeTask[]) => {
  let completed = 0;
  let failed = 0;
  tasks.forEach((t) => {
    if (t.status === "completed") completed += 1;
    if (t.status === "failed") failed += 1;
  });
  return { completed, failed };
};

const applyJobUpdate = (
  jobs: ScrapeJobWithTasks[],
  update: ScrapeJob,
  limit: number
) => {
  const idx = jobs.findIndex((j) => j.id === update.id);
  if (idx === -1) {
    const nextJob: ScrapeJobWithTasks = {
      ...update,
      tasks: [],
      result: summarizeJobResult([]),
    };
    return [nextJob, ...jobs].slice(0, limit);
  }
  const current = jobs[idx];
  const merged = mergeDefined(current as any, update as any) as ScrapeJobWithTasks;
  const result = summarizeJobResult(current.tasks || []);
  const nextJob = { ...merged, tasks: current.tasks || [], result };
  return jobs.map((job, i) => (i === idx ? nextJob : job));
};

const applyTaskUpdate = (
  jobs: ScrapeJobWithTasks[],
  update: ScrapeTask
) => {
  const idx = jobs.findIndex((j) => j.id === update.job_id);
  if (idx === -1) return jobs;
  const job = jobs[idx];
  const tasks = job.tasks ? [...job.tasks] : [];
  const taskIdx = tasks.findIndex((t) => t.id === update.id);
  if (taskIdx === -1) {
    tasks.push(update);
  } else {
    tasks[taskIdx] = mergeDefined(tasks[taskIdx] as any, update as any) as ScrapeTask;
  }
  const result = summarizeJobResult(tasks);
  const counts = summarizeTaskCounts(tasks);
  const nextJob: ScrapeJobWithTasks = {
    ...job,
    tasks,
    result,
    completed_tasks: counts.completed,
    failed_tasks: counts.failed,
  };
  return jobs.map((j, i) => (i === idx ? nextJob : j));
};

export const useScrapeJobs = (options?: UseScrapeJobsOptions) => {
  const queryClient = useQueryClient();
  const streamEnabled = options?.stream ?? false;
  const streamLimit = options?.streamLimit ?? 3;
  const defaultHeaders = axios.defaults?.headers as
    | { common?: { Authorization?: string; authorization?: string } }
    | undefined;
  const authHeader =
    defaultHeaders?.common?.Authorization ??
    defaultHeaders?.common?.authorization;
  const authToken =
    typeof authHeader === "string"
      ? authHeader.replace(/^Bearer\\s+/i, "").trim() || null
      : null;
  const canStream =
    streamEnabled &&
    typeof window !== "undefined" &&
    typeof EventSource !== "undefined" &&
    !!authToken;

  const query = useQuery({
    queryKey: ["scrape-jobs"],
    queryFn: async () => {
      const res = await axios.get<{ jobs: ScrapeJobWithTasks[] }>(
        `${API_BASE_URL}/events/scrape-jobs`
      );
      return res.data.jobs || [];
    },
    enabled: !canStream,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!canStream) return;

    const url = `${API_BASE_URL}/events/scrape-jobs/stream?token=${encodeURIComponent(
      authToken
    )}`;
    const source = new EventSource(url);

    const handleSnapshot = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data || "{}");
        const jobs = Array.isArray(payload.jobs) ? payload.jobs : [];
        queryClient.setQueryData(["scrape-jobs"], jobs);
      } catch {
        // ignore malformed payloads
      }
    };

    const handleJob = (event: MessageEvent) => {
      try {
        const job = JSON.parse(event.data || "{}") as ScrapeJob;
        queryClient.setQueryData<ScrapeJobWithTasks[]>(["scrape-jobs"], (current) =>
          applyJobUpdate(current || [], job, streamLimit)
        );
      } catch {
        // ignore malformed payloads
      }
    };

    const handleTask = (event: MessageEvent) => {
      try {
        const task = JSON.parse(event.data || "{}") as ScrapeTask;
        queryClient.setQueryData<ScrapeJobWithTasks[]>(["scrape-jobs"], (current) =>
          applyTaskUpdate(current || [], task)
        );
      } catch {
        // ignore malformed payloads
      }
    };

    source.addEventListener("snapshot", handleSnapshot);
    source.addEventListener("job", handleJob);
    source.addEventListener("task", handleTask);

    return () => {
      source.removeEventListener("snapshot", handleSnapshot);
      source.removeEventListener("job", handleJob);
      source.removeEventListener("task", handleTask);
      source.close();
    };
  }, [authToken, canStream, queryClient, streamLimit]);

  return query;
};
