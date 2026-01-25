import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";

export type TicketingSourceKind = "eventbrite_organizer" | "extra_url";

export type TicketingSource = {
  id: string;
  kind: TicketingSourceKind;
  url: string;
  multipleEvents?: boolean;
  extractFromListPage?: boolean;
  metadata?: Record<string, any>;
};

export type TicketingSourcesResponse = {
  sources: TicketingSource[];
};

export const useTicketingSources = () =>
  useQuery<TicketingSource[]>({
    queryKey: ["ticketing-sources"],
    queryFn: async () => {
      const res = await axios.get<TicketingSourcesResponse>(
        `${API_BASE_URL}/events/ticketing-sources`
      );
      return res.data.sources || [];
    },
    staleTime: 30_000,
  });
