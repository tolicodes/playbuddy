import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";
import type { Event } from "../types/commonTypes";

type UseEventsByIdsOptions = {
  ids?: Array<string | number>;
  enabled?: boolean;
};

const normalizeIds = (ids?: Array<string | number>) => {
  if (!ids || ids.length === 0) return [];
  const out = new Set<string>();
  ids.forEach((id) => {
    if (id === null || id === undefined) return;
    const num = Number(String(id).trim());
    if (!Number.isFinite(num)) return;
    out.add(String(Math.trunc(num)));
  });
  return Array.from(out);
};

export const useFetchEventsByIds = (options: UseEventsByIdsOptions = {}) => {
  const ids = useMemo(() => normalizeIds(options.ids), [options.ids]);
  const enabled = (options.enabled ?? true) && ids.length > 0;
  const idsKey = ids.slice().sort().join(",");

  return useQuery<Event[]>({
    queryKey: ["events-by-ids", idsKey],
    enabled,
    queryFn: async () => {
      if (!ids.length) return [];
      const params = new URLSearchParams();
      params.set("ids", ids.join(","));
      const res = await axios.get<{ events: Event[] }>(
        `${API_BASE_URL}/events/by-ids?${params.toString()}`
      );
      return res.data.events || [];
    },
  });
};
