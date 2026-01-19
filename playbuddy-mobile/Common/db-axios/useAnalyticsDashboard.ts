import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";

export type UsersOverTimeRow = {
  date: string;
  newUsers: number;
  totalUsers: number;
};

export type UsersOverTimeSummary = {
  rows: UsersOverTimeRow[];
  totalUsers: number;
  rangeDays: number;
};

export type WeeklyActiveUsersRow = {
  weekStart: string;
  activeUsers: number;
};

export type TopUserRow = {
  authUserId: string | null;
  name: string | null;
  actions: number;
};

export type TopUserTicketClicksRow = {
  authUserId: string | null;
  name: string | null;
  ticketClicks: number;
};

export type EventClicksRow = {
  eventId: number;
  eventName: string | null;
  organizerId: number | null;
  organizerName: string | null;
  totalClicks: number;
  uniqueUsers: number;
};

export type OrganizerClicksRow = {
  organizerId: number | null;
  organizerName: string | null;
  totalClicks: number;
  uniqueUsers: number;
};

export type TicketClicksRow = {
  eventId: number;
  eventName: string | null;
  organizerId: number | null;
  organizerName: string | null;
  ticketClicks: number;
  uniqueUsers: number;
};

export type OrganizerTicketClicksRow = {
  organizerId: number | null;
  organizerName: string | null;
  ticketClicks: number;
  uniqueUsers: number;
};

export type DeepLinkStatsRow = {
  id: string;
  slug: string | null;
  type: string | null;
  campaign: string | null;
  channel: string | null;
  organizerId: number | null;
  organizerName: string | null;
  featuredEventId: number | null;
  featuredEventName: string | null;
  featuredPromoCodeId: string | null;
  featuredPromoCode: string | null;
  detectedUsers: number;
  attributedUsers: number;
  attributedCount: number;
  eventClickUsers: number;
  ticketClickUsers: number;
  ticketClicks: number;
};

export type DeepLinkFunnelRow = {
  id: string;
  slug: string | null;
  detectedUsers: number;
  attributedUsers: number;
  eventClickUsers: number;
  ticketClickUsers: number;
};

export type FeatureUsageRow = {
  eventName: string;
  total: number;
};

export type AnalyticsDashboardMeta = {
  startDate: string;
  endDate: string;
  generatedAt: string;
};

export type AnalyticsDashboardResponse = {
  meta: AnalyticsDashboardMeta;
  usersOverTime: UsersOverTimeSummary;
  weeklyActiveUsers: WeeklyActiveUsersRow[];
  users: {
    mostActive: TopUserRow[];
    mostTicketClicks: TopUserTicketClicksRow[];
  };
  events: {
    topEvents: EventClicksRow[];
    eventClicksPerOrganizer: OrganizerClicksRow[];
    ticketClicksPerEvent: TicketClicksRow[];
    ticketClicksPerOrganizer: OrganizerTicketClicksRow[];
  };
  deepLinks: {
    rows: DeepLinkStatsRow[];
    funnel: DeepLinkFunnelRow[];
  };
  featureUsage: FeatureUsageRow[];
};

export const useFetchAnalyticsDashboard = ({
  startDate,
  endDate,
}: {
  startDate?: string;
  endDate?: string;
} = {}) =>
  useQuery<AnalyticsDashboardResponse>({
    queryKey: ["analytics-dashboard", startDate ?? null, endDate ?? null],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await axios.get<AnalyticsDashboardResponse>(`${API_BASE_URL}/analytics/dashboard`, { params });
      return res.data;
    },
    staleTime: 30_000,
  });
