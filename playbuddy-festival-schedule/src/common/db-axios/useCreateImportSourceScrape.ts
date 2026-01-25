import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
import type { Event } from "../types/commonTypes";

export type ImportSourceScrapeResult = {
  result: "inserted" | "updated" | "failed" | "skipped";
  event: Event | null;
  error?: string;
  skip?: {
    reason: string;
    detail?: string;
    code?: "organizer_hidden" | "event_frozen" | "existing_event";
    eventId?: string;
  };
};

export type ImportSourceScrapeSkipped = {
  url: string;
  reason: string;
  detail?: string;
  source?: string;
  stage?: "scrape" | "upsert";
  eventName?: string;
  eventId?: string;
};

export type ImportSourceScrapeCounts = {
  inserted: number;
  updated: number;
  failed: number;
  skipped?: number;
  total: number;
  upserted: number;
};

export type ImportSourceScrapeResponse = {
  mode?: "sync" | "async";
  jobId?: string;
  enqueued?: number;
  sourceId: string;
  url?: string | null;
  scraped?: number;
  counts?: ImportSourceScrapeCounts;
  events?: ImportSourceScrapeResult[];
  finalEvents?: Event[];
  skipped?: ImportSourceScrapeSkipped[];
};

export const useCreateImportSourceScrape = () => {
  const qc = useQueryClient();
  return useMutation<
    ImportSourceScrapeResponse,
    unknown,
    { id: string | number; mode?: "sync" | "async" }
  >({
    mutationFn: async ({ id, mode }) => {
      const res = await axios.post<ImportSourceScrapeResponse>(
        `${API_BASE_URL}/events/scrape-import-source/${id}`,
        mode ? { mode } : {}
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scrape-jobs"] });
    },
  });
};
