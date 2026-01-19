import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";

export type UsersOverTimeRow = {
  date: string;
  newUsers: number;
  totalUsers: number;
};

export type UsersOverTimeMeta = {
  startDate: string;
  endDate: string;
  generatedAt: string;
  totalUsers: number;
  rangeDays: number;
};

export type UsersOverTimeResponse = {
  meta: UsersOverTimeMeta;
  rows: UsersOverTimeRow[];
};

export const useFetchUsersOverTime = ({
  startDate,
  endDate,
}: {
  startDate?: string;
  endDate?: string;
} = {}) =>
  useQuery<UsersOverTimeResponse>({
    queryKey: ["analytics-users-over-time", startDate ?? null, endDate ?? null],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await axios.get<UsersOverTimeResponse>(`${API_BASE_URL}/analytics/users-over-time`, { params });
      return res.data;
    },
    staleTime: 30_000,
  });
