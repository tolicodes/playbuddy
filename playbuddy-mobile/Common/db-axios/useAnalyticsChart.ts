import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";

export type AnalyticsChartMeta = {
  startDate: string;
  endDate: string;
  generatedAt: string;
  totalUsers?: number;
  rangeDays?: number;
};

export type AnalyticsChartResponse<T = unknown> = {
  chartId: string;
  meta: AnalyticsChartMeta;
  data: T;
};

export const useFetchAnalyticsChart = <T = unknown>({
  chartId,
  startDate,
  endDate,
  preset,
  limit,
  enabled = true,
}: {
  chartId: string;
  startDate?: string;
  endDate?: string;
  preset?: string;
  limit?: number;
  enabled?: boolean;
}) =>
  useQuery<AnalyticsChartResponse<T>>({
    queryKey: ["analytics-chart", chartId, startDate ?? null, endDate ?? null, preset ?? null, limit ?? null],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (preset) params.preset = preset;
      if (limit) params.limit = String(limit);
      const res = await axios.get<AnalyticsChartResponse<T>>(
        `${API_BASE_URL}/analytics/charts/${chartId}`,
        { params }
      );
      return res.data;
    },
    enabled: Boolean(chartId) && enabled,
    staleTime: 30_000,
  });
