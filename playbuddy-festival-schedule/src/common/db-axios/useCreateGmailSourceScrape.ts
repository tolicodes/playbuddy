import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
import type { Event } from "../types/commonTypes";

export type GmailSourceScrapeResult = {
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

export type GmailSourceScrapeCounts = {
  inserted: number;
  updated: number;
  failed: number;
  skipped?: number;
  total: number;
  upserted: number;
};

export type GmailSourceScrapeResponse = {
  mode?: "sync" | "async";
  jobId?: string;
  enqueued?: number;
  sourceId: string;
  scraped?: number;
  counts?: GmailSourceScrapeCounts;
  events?: GmailSourceScrapeResult[];
  finalEvents?: Event[];
  skipped?: {
    url: string;
    reason: string;
    detail?: string;
    source?: string;
    stage?: "scrape" | "upsert";
    eventName?: string;
    eventId?: string;
  }[];
};

export const useCreateGmailSourceScrape = () => {
  const qc = useQueryClient();
  return useMutation<
    GmailSourceScrapeResponse,
    unknown,
    { id: string | number; mode?: "sync" | "async"; maxResults?: number }
  >({
    mutationFn: async ({ id, mode, maxResults }) => {
      const res = await axios.post<GmailSourceScrapeResponse>(
        `${API_BASE_URL}/events/scrape-gmail-source/${id}`,
        {
          ...(mode ? { mode } : {}),
          ...(maxResults ? { maxResults } : {}),
        }
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scrape-jobs"] });
    },
  });
};
