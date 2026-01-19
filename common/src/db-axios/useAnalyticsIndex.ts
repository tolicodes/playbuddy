import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";

export type AnalyticsChartDefinition = {
  id: string;
  dashboardId: string;
  title: string;
  type: "line" | "bar" | "table" | "sankey";
  description?: string;
};

export type AnalyticsDashboardDefinition = {
  id: string;
  title: string;
  description?: string;
  chartIds: string[];
};

export type AnalyticsIndexResponse = {
  dashboards: AnalyticsDashboardDefinition[];
  charts: AnalyticsChartDefinition[];
};

export const useFetchAnalyticsIndex = () =>
  useQuery<AnalyticsIndexResponse>({
    queryKey: ["analytics-index"],
    queryFn: async () => {
      const res = await axios.get<AnalyticsIndexResponse>(`${API_BASE_URL}/analytics/index`);
      return res.data;
    },
    staleTime: 60_000,
  });
