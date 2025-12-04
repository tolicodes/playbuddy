import { useQuery } from "@tanstack/react-query";
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
    insertedIds?: string[];
    updatedIds?: string[];
    failedIds?: string[];
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

export const useScrapeJobs = () =>
  useQuery({
    queryKey: ["scrape-jobs"],
    queryFn: async () => {
      const res = await axios.get<{ jobs: ScrapeJobWithTasks[] }>(
        `${API_BASE_URL}/events/scrape-jobs`
      );
      return res.data.jobs || [];
    },
    staleTime: 30_000,
  });
