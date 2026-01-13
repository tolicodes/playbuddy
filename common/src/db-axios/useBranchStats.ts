import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";

export type BranchStatsRow = {
  name: string | null;
  url: string | null;
  stats: {
    overallClicks: number | null;
    desktop?: {
      linkClicks?: number | null;
      textsSent?: number | null;
      iosSms?: { install?: number | null; reopen?: number | null };
      androidSms?: { install?: number | null; reopen?: number | null };
    };
    android?: { linkClicks?: number | null; install?: number | null; reopen?: number | null };
    ios?: { linkClicks?: number | null; install?: number | null; reopen?: number | null };
  };
};

export type BranchStatsMeta = {
  generatedAt?: string | null;
  updatedAt?: string | null;
  source?: string | null;
  range?: {
    startDate?: string | null;
    endDate?: string | null;
    days?: number | null;
    label?: string | null;
  } | null;
};

export type BranchStatsResponse = {
  meta: BranchStatsMeta;
  rows: BranchStatsRow[];
};

export type BranchStatsScrapeProgress = {
  processed: number;
  total?: number | null;
};

export type BranchStatsScrapeDebug = {
  apiRoot: string;
  dataDir: string;
  scriptPath: string;
  scriptRunner: "tsx" | "node";
  scriptExists: boolean;
  cwd: string;
  nodeVersion: string;
  hasBranchEmail: boolean;
  hasBranchPassword: boolean;
};

export type BranchStatsScrapeStatus = {
  status: "idle" | "running" | "completed" | "failed";
  startedAt?: string | null;
  finishedAt?: string | null;
  pid?: number | null;
  progress?: BranchStatsScrapeProgress | null;
  lastLog?: string | null;
  logs?: string[];
  error?: string | null;
  command?: string | null;
  debug?: BranchStatsScrapeDebug | null;
};

export const useFetchBranchStats = () =>
  useQuery<BranchStatsResponse>({
    queryKey: ["branch-stats"],
    queryFn: async () => {
      const res = await axios.get<BranchStatsResponse>(`${API_BASE_URL}/branch_stats`);
      return res.data;
    },
    staleTime: 30_000,
  });

export const useFetchBranchStatsScrapeStatus = () =>
  useQuery<BranchStatsScrapeStatus>({
    queryKey: ["branch-stats-scrape-status"],
    queryFn: async () => {
      const res = await axios.get<BranchStatsScrapeStatus>(`${API_BASE_URL}/branch_stats/scrape/status`);
      return res.data;
    },
    staleTime: 2_000,
  });

export const useCreateBranchStatsScrape = () =>
  useMutation({
    mutationFn: async () => {
      const res = await axios.post<BranchStatsScrapeStatus>(`${API_BASE_URL}/branch_stats/scrape`);
      return res.data;
    },
  });
