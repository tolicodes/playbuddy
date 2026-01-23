import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Divider,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import CampaignIcon from "@mui/icons-material/Campaign";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CategoryIcon from "@mui/icons-material/Category";
import EventIcon from "@mui/icons-material/Event";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExploreIcon from "@mui/icons-material/Explore";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import FlagIcon from "@mui/icons-material/Flag";
import GroupsIcon from "@mui/icons-material/Groups";
import LinkIcon from "@mui/icons-material/Link";
import ListAltIcon from "@mui/icons-material/ListAlt";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import LockIcon from "@mui/icons-material/Lock";
import NavigationIcon from "@mui/icons-material/Navigation";
import PeopleIcon from "@mui/icons-material/People";
import PermMediaIcon from "@mui/icons-material/PermMedia";
import PersonIcon from "@mui/icons-material/Person";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import SchoolIcon from "@mui/icons-material/School";
import StarIcon from "@mui/icons-material/Star";
import SwipeIcon from "@mui/icons-material/Swipe";
import { useQueryClient } from "@tanstack/react-query";
import * as d3 from "d3";
import { sankey as d3Sankey, sankeyLinkHorizontal } from "d3-sankey";
import type { SankeyLink, SankeyNode } from "d3-sankey";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { DEEP_LINK_BASE } from "../../common/config";
import {
  getUserEventCategory,
  getUserEventDisplayName,
  getUserEventMeta,
  getUserEventStateLabel,
} from "../../common/analytics/userEventCatalog";
import { useFetchAnalyticsChart } from "../../common/db-axios/useAnalyticsChart";
import { useFetchAnalyticsIndex, type AnalyticsChartDefinition } from "../../common/db-axios/useAnalyticsIndex";
import type { BranchStatsMeta, BranchStatsRow } from "../../common/db-axios/useBranchStats";

type RangePreset = "month" | "quarter" | "year" | "all";

type RangeConfig = {
  preset: RangePreset;
  startDate: string;
  endDate: string;
  label: string;
};

type UsersOverTimeRow = {
  date: string;
  newUsers: number;
  totalUsers: number;
};

type WeeklyActiveRow = {
  weekStart: string;
  activeUsers: number;
};

type UniqueDeviceRow = {
  date: string;
  withUser: number;
  withoutUser: number;
};

type UserActionsRow = {
  authUserId: string | null;
  name: string | null;
  actions: number;
};

type UserTicketClicksRow = {
  authUserId: string | null;
  name: string | null;
  ticketClicks: number;
};

type AuthMethodRow = {
  id: string;
  label: string;
  total: number;
  uniqueUsers: number;
};

type UserProfileRow = {
  authUserId: string;
  name: string | null;
  createdAt: string | null;
  totalEvents: number;
  uniqueEvents: number;
  lastEventAt: string | null;
  eventCounts: Array<{ eventName: string; total: number }>;
  likedEvents: Array<{
    eventId: number;
    eventName: string | null;
    eventDate: string | null;
    organizerId: number | null;
    organizerName: string | null;
  }>;
};

type EventClicksRow = {
  eventId: number;
  eventName: string | null;
  eventDate: string | null;
  organizerId: number | null;
  organizerName: string | null;
  totalClicks: number;
  uniqueUsers: number;
};

type TicketClicksRow = {
  eventId: number;
  eventName: string | null;
  eventDate: string | null;
  organizerId: number | null;
  organizerName: string | null;
  ticketClicks: number;
  uniqueUsers: number;
};

type OrganizerClicksRow = {
  organizerId: number | null;
  organizerName: string | null;
  totalClicks: number;
  uniqueUsers: number;
};

type OrganizerTicketClicksRow = {
  organizerId: number | null;
  organizerName: string | null;
  ticketClicks: number;
  uniqueUsers: number;
};

type DeepLinkRow = {
  id: string;
  slug: string | null;
  type: string | null;
  campaign: string | null;
  channel: string | null;
  organizerId: number | null;
  organizerName: string | null;
  featuredEventId: number | null;
  featuredEventName: string | null;
  featuredEventDate: string | null;
  featuredPromoCodeId: string | null;
  featuredPromoCode: string | null;
  detectedUsers: number;
  attributedUsers: number;
  attributedCount: number;
  eventClickUsers: number;
  ticketClickUsers: number;
  ticketClicks: number;
};

type TopUserEventRow = {
  eventName: string;
  total: number;
  uniqueUsers: number;
};

type ModalClickSummaryRow = {
  modalId: string;
  modalLabel: string;
  primaryUsers: number;
  skipUsers: number;
};

type FeatureUsageCategoryRow = {
  category: string;
  total: number;
  uniqueUsers: number;
};

type FeatureUsageEventRow = {
  eventName: string;
  total: number;
  uniqueUsers: number;
};

type FeatureUsageStateRow = {
  eventName: string;
  stateValue: string | null;
  total: number;
  uniqueUsers: number;
};

type FeatureUsagePayload = {
  categories: FeatureUsageCategoryRow[];
  events: FeatureUsageEventRow[];
  states: FeatureUsageStateRow[];
};

type BranchStatsPayload = {
  meta: BranchStatsMeta;
  rows: BranchStatsRow[];
};

type TimePoint = { date: string; value: number };

type OnboardingSankeyNode = {
  id: string;
  label: string;
  stage: number;
  value: number;
  order?: number;
};

type OnboardingSankeyLink = {
  source: string;
  target: string;
  value: number;
};

type OnboardingSankeyPayload = {
  nodes: OnboardingSankeyNode[];
  links: OnboardingSankeyLink[];
};

type MultiLinePoint = { date: string } & Record<string, number | string | null | undefined>;
type SharedTooltipContext = Highcharts.Point & {
  points?: Highcharts.Point[];
  point?: Highcharts.Point;
  x?: number;
};
type SankeyNodeDatum = {
  id: string;
  name: string;
  stage: number;
  color: string;
  count: number;
  fixedValue?: number;
  order?: number;
};

type SankeyLinkDatum = {
  source: string;
  target: string;
  value: number;
  layoutOnly?: boolean;
};

const PRESET_OPTIONS: Array<{ value: RangePreset; label: string }> = [
  { value: "month", label: "Past month" },
  { value: "quarter", label: "Past 3 months" },
  { value: "year", label: "Past year" },
  { value: "all", label: "All time" },
];

const CATEGORY_ICON_MAP: Record<string, { icon: React.ReactNode; color: string }> = {
  Auth: { icon: <LockIcon fontSize="small" />, color: "#0f172a" },
  Profile: { icon: <PersonIcon fontSize="small" />, color: "#1d4ed8" },
  Onboarding: { icon: <FlagIcon fontSize="small" />, color: "#be123c" },
  Calendar: { icon: <CalendarMonthIcon fontSize="small" />, color: "#0f766e" },
  Filters: { icon: <FilterAltIcon fontSize="small" />, color: "#7c2d12" },
  "Event Detail": { icon: <EventIcon fontSize="small" />, color: "#4338ca" },
  "Event List": { icon: <ListAltIcon fontSize="small" />, color: "#0e7490" },
  Communities: { icon: <GroupsIcon fontSize="small" />, color: "#0f766e" },
  "Deep Links": { icon: <LinkIcon fontSize="small" />, color: "#2563eb" },
  Navigation: { icon: <NavigationIcon fontSize="small" />, color: "#7c3aed" },
  "Promo & Marketing": { icon: <CampaignIcon fontSize="small" />, color: "#b45309" },
  "Swipe Mode": { icon: <SwipeIcon fontSize="small" />, color: "#a21caf" },
  Media: { icon: <PermMediaIcon fontSize="small" />, color: "#475569" },
  Facilitators: { icon: <SchoolIcon fontSize="small" />, color: "#0f172a" },
  "Weekly Picks": { icon: <StarIcon fontSize="small" />, color: "#ca8a04" },
  Munches: { icon: <RestaurantIcon fontSize="small" />, color: "#92400e" },
  Discover: { icon: <ExploreIcon fontSize="small" />, color: "#1d4ed8" },
  Tags: { icon: <LocalOfferIcon fontSize="small" />, color: "#be123c" },
  Attendees: { icon: <PeopleIcon fontSize="small" />, color: "#0f172a" },
  Buddies: { icon: <FavoriteIcon fontSize="small" />, color: "#e11d48" },
};

const getCategoryIcon = (category: string) =>
  CATEGORY_ICON_MAP[category] ?? { icon: <CategoryIcon fontSize="small" />, color: "#64748b" };

const formatNumber = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return Number(value).toLocaleString();
};

const formatDuration = (seconds?: number | null) => {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return "-";
  const totalSeconds = Math.max(0, Number(seconds));
  const totalHours = totalSeconds / 3600;
  if (totalHours < 24) {
    return `${totalHours.toFixed(1)}h`;
  }
  const totalDays = totalHours / 24;
  return `${totalDays.toFixed(1)}d`;
};

const CHART_SPACING: number[] = [16, 40, 16, 24];

Highcharts.setOptions({ time: { timezone: "UTC" } });

const formatDateInput = (date: Date) => date.toISOString().slice(0, 10);

const buildRangeFromPreset = (preset: RangePreset): RangeConfig => {
  const end = new Date();
  const endDate = formatDateInput(end);
  if (preset === "all") {
    return { preset, startDate: "2000-01-01", endDate, label: "All time" };
  }
  const start = new Date(end);
  if (preset === "year") start.setUTCDate(start.getUTCDate() - 365);
  if (preset === "quarter") start.setUTCDate(start.getUTCDate() - 90);
  if (preset === "month") start.setUTCDate(start.getUTCDate() - 30);
  return {
    preset,
    startDate: formatDateInput(start),
    endDate,
    label: `${formatDateInput(start)} to ${endDate}`,
  };
};

const buildDeepLinkUrl = (slug?: string | null) => (slug ? `${DEEP_LINK_BASE}${slug}` : null);

const toUtcTimestamp = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return Date.parse(date);
  return Date.UTC(year, month - 1, day);
};

const buildYAxisRange = (values: number[]) => {
  const minValue = d3.min(values) ?? 0;
  const maxValue = d3.max(values) ?? minValue + 1;
  let min = minValue;
  let max = maxValue;
  if (min === max) {
    min -= 1;
    max += 1;
  }
  return { min, max };
};

const LineChart = ({
  points,
  height = 220,
  color = "#2563eb",
  valueFormatter = formatNumber,
  seriesLabel = "Value",
}: {
  points: TimePoint[];
  height?: number;
  color?: string;
  valueFormatter?: (value: number) => string;
  seriesLabel?: string;
}) => {
  const options = useMemo<Highcharts.Options | null>(() => {
    if (!points.length) return null;
    const data = points.map((point) => [toUtcTimestamp(point.date), point.value] as [number, number]);
    const { min, max } = buildYAxisRange(points.map((point) => point.value));

    return {
      chart: { type: "line", height, backgroundColor: "transparent", spacing: CHART_SPACING },
      title: { text: undefined },
      credits: { enabled: false },
      legend: { enabled: false },
      xAxis: {
        type: "datetime",
        maxPadding: 0.04,
        lineColor: "#e5e7eb",
        tickColor: "#cbd5f5",
        labels: { style: { color: "#6b7280", fontSize: "11px" } },
      },
      yAxis: {
        title: { text: undefined },
        min,
        max,
        gridLineColor: "#eef2f7",
        labels: { style: { color: "#6b7280", fontSize: "11px" } },
      },
      tooltip: {
        shared: true,
        useHTML: true,
        backgroundColor: "#111827",
        borderColor: "#111827",
        borderRadius: 8,
        formatter: function (this: SharedTooltipContext) {
          const timestamp = this.x ?? 0;
          const header = Highcharts.dateFormat("%b %e, %Y", timestamp);
          const points = this.points ?? (this.point ? [this.point] : []);
          const rows = points
            .map((point: Highcharts.Point) => {
              const seriesName = point.series?.name ?? "Value";
              const value = valueFormatter(Number(point.y ?? 0));
              const colorValue = typeof point.color === "string" ? point.color : color;
              return `<div style="font-size:11px;"><span style="color:${colorValue};">●</span> ${seriesName}: <b>${value}</b></div>`;
            })
            .join("");
          return `<div style="padding:4px 2px;"><div style="font-size:11px;color:#e5e7eb;margin-bottom:4px;">${header}</div>${rows}</div>`;
        },
      },
      plotOptions: {
        series: {
          marker: { radius: 3 },
          lineWidth: 2.5,
          states: { hover: { lineWidth: 3 } },
          animation: false,
        },
      },
      series: [
        {
          type: "line",
          name: seriesLabel,
          data,
          color,
        },
      ],
    };
  }, [points, height, color, valueFormatter, seriesLabel]);

  if (!options) {
    return <Typography variant="body2" color="text.secondary">No data.</Typography>;
  }

  return (
    <Box sx={{ width: "100%", overflowX: "auto" }}>
      <HighchartsReact highcharts={Highcharts} options={options} />
    </Box>
  );
};

const MultiLineChart = ({
  points,
  series,
  height = 220,
  valueFormatter = formatNumber,
}: {
  points: MultiLinePoint[];
  series: Array<{ key: string; label: string; color: string }>;
  height?: number;
  valueFormatter?: (value: number) => string;
}) => {
  const options = useMemo<Highcharts.Options | null>(() => {
    if (!points.length || !series.length) return null;
    const seriesData = series.map((serie) => ({
      type: "line",
      name: serie.label,
      color: serie.color,
      data: points.map((point) => [toUtcTimestamp(point.date), Number(point[serie.key] ?? 0)] as [number, number]),
    }));
    const values = seriesData.flatMap((serie) => serie.data.map((datum) => Number(datum[1] ?? 0)));
    const { min, max } = buildYAxisRange(values);

    return {
      chart: { type: "line", height, backgroundColor: "transparent", spacing: CHART_SPACING },
      title: { text: undefined },
      credits: { enabled: false },
      legend: { enabled: false },
      xAxis: {
        type: "datetime",
        maxPadding: 0.04,
        lineColor: "#e5e7eb",
        tickColor: "#cbd5f5",
        labels: { style: { color: "#6b7280", fontSize: "11px" } },
      },
      yAxis: {
        title: { text: undefined },
        min,
        max,
        gridLineColor: "#eef2f7",
        labels: { style: { color: "#6b7280", fontSize: "11px" } },
      },
      tooltip: {
        shared: true,
        useHTML: true,
        backgroundColor: "#111827",
        borderColor: "#111827",
        borderRadius: 8,
        formatter: function (this: SharedTooltipContext) {
          const timestamp = this.x ?? 0;
          const header = Highcharts.dateFormat("%b %e, %Y", timestamp);
          const points = this.points ?? (this.point ? [this.point] : []);
          const rows = points
            .map((point: Highcharts.Point) => {
              const seriesName = point.series?.name ?? "Value";
              const value = valueFormatter(Number(point.y ?? 0));
              const colorValue = typeof point.color === "string" ? point.color : "#2563eb";
              return `<div style="font-size:11px;"><span style="color:${colorValue};">●</span> ${seriesName}: <b>${value}</b></div>`;
            })
            .join("");
          return `<div style="padding:4px 2px;"><div style="font-size:11px;color:#e5e7eb;margin-bottom:4px;">${header}</div>${rows}</div>`;
        },
      },
      plotOptions: {
        series: {
          marker: { radius: 3 },
          lineWidth: 2.5,
          states: { hover: { lineWidth: 3 } },
          animation: false,
        },
      },
      series: seriesData,
    };
  }, [points, series, height, valueFormatter]);

  if (!options) {
    return <Typography variant="body2" color="text.secondary">No data.</Typography>;
  }

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={2} flexWrap="wrap">
        {series.map((serie) => (
          <Stack key={`legend-${serie.key}`} direction="row" spacing={0.5} alignItems="center">
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: serie.color }} />
            <Typography variant="caption" color="text.secondary">
              {serie.label}
            </Typography>
          </Stack>
        ))}
      </Stack>
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <HighchartsReact highcharts={Highcharts} options={options} />
      </Box>
    </Stack>
  );
};

const BarChart = ({
  points,
  height = 220,
  color = "#0ea5e9",
  valueFormatter = formatNumber,
  seriesLabel = "Value",
}: {
  points: Array<{ label: string; value: number }>;
  height?: number;
  color?: string;
  valueFormatter?: (value: number) => string;
  seriesLabel?: string;
}) => {
  const options = useMemo<Highcharts.Options | null>(() => {
    if (!points.length) return null;
    const data = points.map((point) => [toUtcTimestamp(point.label), point.value] as [number, number]);
    return {
      chart: {
        type: "column",
        height,
        backgroundColor: "transparent",
        spacing: CHART_SPACING,
      },
      title: { text: undefined },
      credits: { enabled: false },
      legend: { enabled: false },
      xAxis: {
        type: "datetime",
        maxPadding: 0.04,
        lineColor: "#e5e7eb",
        tickColor: "#cbd5f5",
        crosshair: { color: "#cbd5f5", width: 1 },
        labels: { style: { color: "#6b7280", fontSize: "11px" } },
      },
      yAxis: {
        title: { text: undefined },
        min: 0,
        gridLineColor: "#eef2f7",
        labels: {
          style: { color: "#6b7280", fontSize: "11px" },
          formatter: function (this: Highcharts.AxisLabelsFormatterContextObject) {
            return valueFormatter(Number(this.value ?? 0));
          },
        },
      },
      tooltip: {
        useHTML: true,
        backgroundColor: "#111827",
        borderColor: "#111827",
        borderRadius: 8,
        formatter: function (this: SharedTooltipContext) {
          const timestamp = this.x ?? 0;
          const label = Highcharts.dateFormat("%b %e, %Y", timestamp);
          const value = valueFormatter(Number(this.y ?? 0));
          return `<div style="padding:4px 2px;"><div style="font-size:11px;color:#e5e7eb;margin-bottom:4px;">${label}</div><div style="font-size:12px;color:#fff;font-weight:600;">${value}</div></div>`;
        },
      },
      plotOptions: {
        column: {
          borderRadius: 4,
          pointPadding: 0.15,
          groupPadding: 0.08,
        },
        series: {
          animation: false,
        },
      },
      series: [
        {
          type: "column",
          name: seriesLabel,
          data,
          color,
        },
      ],
    };
  }, [points, height, color, valueFormatter, seriesLabel]);

  if (!options) {
    return <Typography variant="body2" color="text.secondary">No data.</Typography>;
  }

  return (
    <Box sx={{ width: "100%", overflowX: "auto" }}>
      <HighchartsReact
        highcharts={Highcharts}
        options={options}
        containerProps={{ style: { width: "100%" } }}
      />
    </Box>
  );
};

const CategoryBarChart = ({
  points,
  height = 220,
  color = "#0ea5e9",
  valueFormatter = formatNumber,
  seriesLabel = "Value",
}: {
  points: Array<{ label: string; value: number }>;
  height?: number;
  color?: string;
  valueFormatter?: (value: number) => string;
  seriesLabel?: string;
}) => {
  const options = useMemo<Highcharts.Options | null>(() => {
    if (!points.length) return null;
    const data = points.map((point) => ({ name: point.label, y: point.value }));
    return {
      chart: {
        type: "column",
        height,
        backgroundColor: "transparent",
        spacing: CHART_SPACING,
      },
      title: { text: undefined },
      credits: { enabled: false },
      legend: { enabled: false },
      xAxis: {
        type: "category",
        maxPadding: 0.04,
        lineColor: "#e5e7eb",
        tickColor: "#cbd5f5",
        labels: { style: { color: "#6b7280", fontSize: "11px" } },
      },
      yAxis: {
        title: { text: undefined },
        min: 0,
        gridLineColor: "#eef2f7",
        labels: {
          style: { color: "#6b7280", fontSize: "11px" },
          formatter: function (this: Highcharts.AxisLabelsFormatterContextObject) {
            return valueFormatter(Number(this.value ?? 0));
          },
        },
      },
      tooltip: {
        useHTML: true,
        backgroundColor: "#111827",
        borderColor: "#111827",
        borderRadius: 8,
        formatter: function (this: SharedTooltipContext) {
          const label = this.name ?? String(this.category ?? "");
          const value = valueFormatter(Number(this.y ?? 0));
          return `<div style="padding:4px 2px;"><div style="font-size:11px;color:#e5e7eb;margin-bottom:4px;">${label}</div><div style="font-size:12px;color:#fff;font-weight:600;">${value}</div></div>`;
        },
      },
      plotOptions: {
        column: {
          borderRadius: 4,
          pointPadding: 0.2,
          groupPadding: 0.1,
        },
        series: {
          animation: false,
        },
      },
      series: [
        {
          type: "column",
          name: seriesLabel,
          data,
          color,
        },
      ],
    };
  }, [points, height, color, valueFormatter, seriesLabel]);

  if (!options) {
    return <Typography variant="body2" color="text.secondary">No data.</Typography>;
  }

  return (
    <Box sx={{ width: "100%", overflowX: "auto" }}>
      <HighchartsReact
        highcharts={Highcharts}
        options={options}
        containerProps={{ style: { width: "100%" } }}
      />
    </Box>
  );
};

const SankeyChart = ({
  data,
  height = 360,
}: {
  data: OnboardingSankeyPayload;
  height?: number;
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState<{
    x: number;
    y: number;
    title: string;
    value: string;
  } | null>(null);

  const chart = useMemo(() => {
    if (!data?.nodes?.length) return null;
    const activeLinks = (data.links ?? []).filter((link) => link.value > 0);
    const linkNodeIds = new Set<string>();
    activeLinks.forEach((link) => {
      linkNodeIds.add(link.source);
      linkNodeIds.add(link.target);
    });

    const width = 960;
    const margin = { top: 16, right: 220, bottom: 24, left: 32 };
    const nodePalette = ["#1e3a8a", "#4338ca", "#2563eb", "#0891b2", "#0f766e", "#16a34a", "#ca8a04"];

    const layoutNodes: SankeyNodeDatum[] = data.nodes.map((node) => ({
      id: node.id,
      name: node.label,
      stage: node.stage,
      color: nodePalette[node.stage % nodePalette.length],
      count: node.value,
      fixedValue: node.value,
      order: node.order,
    }));

    const displayNodes = layoutNodes.filter((node) => node.count > 0 || linkNodeIds.has(node.id));
    if (!displayNodes.length) return null;

    const stageGroups = new Map<number, SankeyNodeDatum[]>();
    layoutNodes.forEach((node) => {
      const group = stageGroups.get(node.stage) ?? [];
      group.push(node);
      stageGroups.set(node.stage, group);
    });
    const stageOrder = Array.from(stageGroups.keys()).sort((a, b) => a - b);
    const activeLinkKeys = new Set(activeLinks.map((link) => `${link.source}::${link.target}`));
    const layoutLinks: SankeyLinkDatum[] = activeLinks.map((link) => ({
      source: link.source,
      target: link.target,
      value: link.value,
    }));
    for (let i = 0; i < stageOrder.length - 1; i += 1) {
      const sourceNodes = stageGroups.get(stageOrder[i]) ?? [];
      const targetNodes = stageGroups.get(stageOrder[i + 1]) ?? [];
      if (!sourceNodes.length || !targetNodes.length) continue;
      const sourceNode = sourceNodes.reduce((best, node) => (node.count > best.count ? node : best), sourceNodes[0]);
      const targetNode = targetNodes.reduce((best, node) => (node.count > best.count ? node : best), targetNodes[0]);
      const linkKey = `${sourceNode.id}::${targetNode.id}`;
      if (activeLinkKeys.has(linkKey)) continue;
      layoutLinks.push({
        source: sourceNode.id,
        target: targetNode.id,
        value: 0,
        layoutOnly: true,
      });
    }

    const sankeyGenerator = d3Sankey<SankeyNodeDatum, SankeyLinkDatum>()
      .nodeId((node: SankeyNode<SankeyNodeDatum, SankeyLinkDatum>) => node.id)
      .nodeWidth(24)
      .nodePadding(24)
      .nodeSort(
        (
          a: SankeyNode<SankeyNodeDatum, SankeyLinkDatum>,
          b: SankeyNode<SankeyNodeDatum, SankeyLinkDatum>
        ) => {
          if (a.stage === b.stage) {
            const aOrder = typeof a.order === "number" ? a.order : null;
            const bOrder = typeof b.order === "number" ? b.order : null;
            if (aOrder !== null && bOrder !== null) {
              return aOrder - bOrder;
            }
            if (aOrder !== null) return -1;
            if (bOrder !== null) return 1;
          }
          return (b.count ?? 0) - (a.count ?? 0);
        }
      )
      .nodeAlign((node: SankeyNode<SankeyNodeDatum, SankeyLinkDatum>) => node.stage)
      .extent([
        [margin.left, margin.top],
        [width - margin.right, height - margin.bottom],
      ]);

    const graph = sankeyGenerator({
      nodes: layoutNodes.map((node) => ({ ...node })),
      links: layoutLinks.map((link) => ({ ...link })),
    });
    const displayNodeIds = new Set(displayNodes.map((node) => node.id));
    const visibleNodes = graph.nodes.filter((node) => displayNodeIds.has(node.id));
    const visibleLinks = graph.links.filter((link) => {
      if (link.layoutOnly) return false;
      const source = link.source as SankeyNode<SankeyNodeDatum, SankeyLinkDatum>;
      const target = link.target as SankeyNode<SankeyNodeDatum, SankeyLinkDatum>;
      return displayNodeIds.has(source.id) && displayNodeIds.has(target.id);
    });

    return {
      width,
      height,
      margin,
      nodes: visibleNodes as Array<SankeyNode<SankeyNodeDatum, SankeyLinkDatum>>,
      links: visibleLinks as Array<SankeyLink<SankeyNodeDatum, SankeyLinkDatum>>,
      linkPath: sankeyLinkHorizontal<SankeyNodeDatum, SankeyLinkDatum>(),
    };
  }, [data, height]);

  const handleHover = (event: React.MouseEvent<SVGElement>, title: string, value: string) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setHovered({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      title,
      value,
    });
  };

  if (!chart) {
    return <Typography variant="body2" color="text.secondary">No data.</Typography>;
  }

  return (
    <Box sx={{ width: "100%", overflowX: "auto" }}>
      <Box ref={containerRef} sx={{ position: "relative", minWidth: chart.width }}>
        {hovered && (
          <Box
            sx={{
              position: "absolute",
              left: Math.min(hovered.x + 12, chart.width - 200),
              top: Math.max(hovered.y - 12, 8),
              bgcolor: "#111827",
              color: "#fff",
              borderRadius: 2,
              px: 1.5,
              py: 1,
              fontSize: 12,
              pointerEvents: "none",
              zIndex: 2,
              boxShadow: "0 10px 30px rgba(15, 23, 42, 0.25)",
              width: 190,
            }}
          >
            <Typography variant="caption" sx={{ color: "#e5e7eb", display: "block" }}>
              {hovered.title}
            </Typography>
            <Typography variant="subtitle2" sx={{ color: "#fff" }}>
              {hovered.value}
            </Typography>
          </Box>
        )}
        <svg
          width={chart.width}
          height={chart.height}
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          style={{ display: "block" }}
          onMouseLeave={() => setHovered(null)}
        >
          <rect
            x={chart.margin.left - 16}
            y={chart.margin.top - 10}
            width={chart.width - chart.margin.left - chart.margin.right + 32}
            height={chart.height - chart.margin.top - chart.margin.bottom + 20}
            fill="#f8fafc"
            stroke="#e2e8f0"
            rx={14}
          />
          <g>
            {chart.links.map((link, idx) => {
              const path = chart.linkPath(link);
              if (!path) return null;
              const source = link.source as SankeyNode<SankeyNodeDatum, SankeyLinkDatum>;
              const target = link.target as SankeyNode<SankeyNodeDatum, SankeyLinkDatum>;
              const stroke = source.color ?? "#94a3b8";
              const title = `${source.name ?? ""} → ${target.name ?? ""}`;
              const value = `${formatNumber(link.value ?? 0)} users`;
              return (
                <path
                  key={`sankey-link-${idx}`}
                  d={path}
                  fill="none"
                  stroke={stroke}
                  strokeOpacity={0.35}
                  strokeWidth={Math.max(1.5, link.width ?? 1)}
                  strokeLinecap="round"
                  onMouseMove={(event) => handleHover(event, title, value)}
                  onMouseLeave={() => setHovered(null)}
                />
              );
            })}
          </g>
          <g>
            {chart.nodes.map((node) => {
              const nodeX0 = node.x0 ?? 0;
              const nodeX1 = node.x1 ?? nodeX0 + 1;
              const nodeY0 = node.y0 ?? 0;
              const nodeY1 = node.y1 ?? nodeY0 + 1;
              const nodeHeight = nodeY1 - nodeY0;
              const labelOnRight = nodeX1 + 160 < chart.width - 8;
              const labelX = labelOnRight ? nodeX1 + 10 : nodeX0 - 10;
              const labelAnchor = labelOnRight ? "start" : "end";
              const labelY = nodeY0 + 14;
              const title = node.name ?? "";
              const value = `${formatNumber(node.count ?? 0)} users`;
              return (
                <g key={`sankey-node-${node.id}`}>
                  <rect
                    x={nodeX0}
                    y={nodeY0}
                    width={nodeX1 - nodeX0}
                    height={Math.max(8, nodeHeight)}
                    rx={10}
                    fill={node.color}
                    fillOpacity={0.9}
                    stroke="#0f172a1a"
                    onMouseMove={(event) => handleHover(event, title, value)}
                    onMouseLeave={() => setHovered(null)}
                  />
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor={labelAnchor}
                    fontSize="11"
                    fontWeight={600}
                    fill="#0f172a"
                    pointerEvents="none"
                  >
                    {node.name}
                    <tspan x={labelX} dy={14} fontWeight={500} fill="#475569">
                      {formatNumber(node.count ?? 0)} users
                    </tspan>
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </Box>
    </Box>
  );
};

const ChartCard = ({
  chart,
  range,
  focusRef,
}: {
  chart: AnalyticsChartDefinition;
  range: RangeConfig;
  focusRef?: (el: HTMLDivElement | null) => void;
}) => {
  const { data, isLoading, error } = useFetchAnalyticsChart<any>({
    chartId: chart.id,
    startDate: range.startDate,
    endDate: range.endDate,
    preset: range.preset,
  });

  const content = () => {
    if (isLoading) return <Typography variant="body2">Loading...</Typography>;
    if (error) return <Alert severity="error">Failed to load chart.</Alert>;
    if (!data) return <Typography variant="body2" color="text.secondary">No data.</Typography>;

    if (chart.id === "users_over_time") {
      const rows = data.data as UsersOverTimeRow[];
      const points = rows.map((row) => ({ date: row.date, value: row.totalUsers }));
      const latest = rows.length ? rows[rows.length - 1] : null;
      return (
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="h4">{formatNumber(latest?.totalUsers)}</Typography>
            <Typography variant="body2" color="text.secondary">Current total users</Typography>
          </Box>
          <LineChart points={points} seriesLabel="Total users" />
        </Stack>
      );
    }

    if (chart.id === "new_users_per_day") {
      const rows = data.data as UsersOverTimeRow[];
      const points = rows.map((row) => ({ label: row.date, value: row.newUsers }));
      return <BarChart points={points} seriesLabel="New users" />;
    }

    if (chart.id === "weekly_active_users") {
      const rows = data.data as WeeklyActiveRow[];
      const points = rows.map((row) => ({ date: row.weekStart, value: row.activeUsers }));
      return <LineChart points={points} color="#16a34a" seriesLabel="Active users" />;
    }

    if (chart.id === "unique_devices_over_time") {
      const rows = data.data as UniqueDeviceRow[];
      const latest = rows.length ? rows[rows.length - 1] : null;
      const totalDevices = (latest?.withUser ?? 0) + (latest?.withoutUser ?? 0);
      const points = rows.map((row) => ({
        date: row.date,
        withUser: row.withUser,
        withoutUser: row.withoutUser,
      }));
      return (
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="h4">{formatNumber(totalDevices)}</Typography>
            <Typography variant="body2" color="text.secondary">
              Current unique devices
            </Typography>
            <Stack direction="row" spacing={2}>
              <Typography variant="caption" color="text.secondary">
                With user: {formatNumber(latest?.withUser)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Device only: {formatNumber(latest?.withoutUser)}
              </Typography>
            </Stack>
          </Box>
          <MultiLineChart
            points={points}
            series={[
              { key: "withUser", label: "With user", color: "#2563eb" },
              { key: "withoutUser", label: "Device only", color: "#f97316" },
            ]}
          />
        </Stack>
      );
    }

    if (chart.id === "anonymous_devices_summary") {
      const summary = data.data as {
        deviceCount: number;
        avgSeconds: number;
        medianSeconds: number;
        maxSeconds: number;
      };
      return (
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="h4">{formatNumber(summary.deviceCount)}</Typography>
            <Typography variant="body2" color="text.secondary">
              Devices without users in range
            </Typography>
          </Box>
          <Stack direction="row" spacing={3} flexWrap="wrap">
            <Box>
              <Typography variant="caption" color="text.secondary">Avg lifespan</Typography>
              <Typography variant="subtitle1">{formatDuration(summary.avgSeconds)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Median lifespan</Typography>
              <Typography variant="subtitle1">{formatDuration(summary.medianSeconds)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Max lifespan</Typography>
              <Typography variant="subtitle1">{formatDuration(summary.maxSeconds)}</Typography>
            </Box>
          </Stack>
        </Stack>
      );
    }

    if (chart.id === "most_active_users") {
      const rows = data.data as UserActionsRow[];
      return (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={`most-active-${row.authUserId ?? "unknown"}-${idx}`}>
                  <TableCell>{row.name || row.authUserId || "-"}</TableCell>
                  <TableCell align="right">{formatNumber(row.actions)}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2}>No data.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      );
    }

    if (chart.id === "users_most_ticket_clicks") {
      const rows = data.data as UserTicketClicksRow[];
      return (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell align="right">Ticket clicks</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={`ticket-user-${row.authUserId ?? "unknown"}-${idx}`}>
                  <TableCell>{row.name || row.authUserId || "-"}</TableCell>
                  <TableCell align="right">{formatNumber(row.ticketClicks)}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2}>No data.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      );
    }

    if (chart.id === "auth_method_breakdown") {
      const rows = data.data as AuthMethodRow[];
      const points = rows.map((row) => ({ label: row.label, value: row.uniqueUsers }));
      return (
        <Stack spacing={1}>
          <CategoryBarChart points={points} color="#6366f1" seriesLabel="Unique users" />
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Method</TableCell>
                  <TableCell align="right">Unique users</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={`auth-${row.id}`}>
                    <TableCell>{row.label}</TableCell>
                    <TableCell align="right">{formatNumber(row.uniqueUsers)}</TableCell>
                    <TableCell align="right">{formatNumber(row.total)}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3}>No data.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      );
    }

    if (chart.id === "user_profiles") {
      const rows = data.data as UserProfileRow[];
      return (
        <Stack spacing={1.5}>
          {rows.map((row) => (
            <Accordion key={`profile-${row.authUserId}`} variant="outlined">
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack spacing={0.5} sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {row.name || row.authUserId}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {row.authUserId}
                    {row.createdAt ? ` · Joined ${row.createdAt}` : ""}
                    {row.lastEventAt ? ` · Last active ${row.lastEventAt}` : ""}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box textAlign="right">
                    <Typography variant="subtitle2">{formatNumber(row.uniqueEvents)}</Typography>
                    <Typography variant="caption" color="text.secondary">Unique events</Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="subtitle2">{formatNumber(row.totalEvents)}</Typography>
                    <Typography variant="caption" color="text.secondary">Total events</Typography>
                  </Box>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>Event activity</Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Event</TableCell>
                            <TableCell>Category</TableCell>
                            <TableCell align="right">Count</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {row.eventCounts.map((eventRow, idx) => (
                            <TableRow key={`profile-event-${row.authUserId}-${eventRow.eventName}-${idx}`}>
                              <TableCell>{getUserEventDisplayName(eventRow.eventName)}</TableCell>
                              <TableCell>{getUserEventCategory(eventRow.eventName)}</TableCell>
                              <TableCell align="right">{formatNumber(eventRow.total)}</TableCell>
                            </TableRow>
                          ))}
                          {row.eventCounts.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={3}>No events in range.</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>Liked events</Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ overflowX: "auto" }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Event</TableCell>
                            <TableCell>Event date</TableCell>
                            <TableCell>Organizer</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {row.likedEvents.map((liked) => (
                            <TableRow key={`liked-${row.authUserId}-${liked.eventId}`}>
                              <TableCell>{liked.eventName || "-"}</TableCell>
                              <TableCell>{liked.eventDate || "-"}</TableCell>
                              <TableCell>{liked.organizerName || "-"}</TableCell>
                            </TableRow>
                          ))}
                          {row.likedEvents.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={3}>No likes in range.</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
          {rows.length === 0 && (
            <Typography variant="body2" color="text.secondary">No users found.</Typography>
          )}
        </Stack>
      );
    }

    if (chart.id === "top_user_events") {
      const rows = data.data as TopUserEventRow[];
      return (
        <TableContainer component={Paper} variant="outlined" sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Category</TableCell>
                <TableCell>Event</TableCell>
                <TableCell align="right">Unique users</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={`top-user-event-${row.eventName}-${idx}`}>
                  <TableCell>{getUserEventCategory(row.eventName)}</TableCell>
                  <TableCell>{getUserEventDisplayName(row.eventName)}</TableCell>
                  <TableCell align="right">{formatNumber(row.uniqueUsers)}</TableCell>
                  <TableCell align="right">{formatNumber(row.total)}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>No data.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      );
    }

    if (chart.id === "top_events_clicks") {
      const rows = data.data as EventClicksRow[];
      return (
        <TableContainer component={Paper} variant="outlined" sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Event</TableCell>
                <TableCell>Event date</TableCell>
                <TableCell>Organizer</TableCell>
                <TableCell align="right">Clicks</TableCell>
                <TableCell align="right">Unique users</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`event-click-${row.eventId}`}>
                  <TableCell>{row.eventName || "-"}</TableCell>
                  <TableCell>{row.eventDate || "-"}</TableCell>
                  <TableCell>{row.organizerName || "-"}</TableCell>
                  <TableCell align="right">{formatNumber(row.totalClicks)}</TableCell>
                  <TableCell align="right">{formatNumber(row.uniqueUsers)}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>No data.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      );
    }

    if (chart.id === "event_clicks_per_organizer") {
      const rows = data.data as OrganizerClicksRow[];
      return (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Organizer</TableCell>
                <TableCell align="right">Clicks</TableCell>
                <TableCell align="right">Unique users</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={`org-click-${row.organizerId ?? "unknown"}-${idx}`}>
                  <TableCell>{row.organizerName || "-"}</TableCell>
                  <TableCell align="right">{formatNumber(row.totalClicks)}</TableCell>
                  <TableCell align="right">{formatNumber(row.uniqueUsers)}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3}>No data.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      );
    }

    if (chart.id === "ticket_clicks_per_event") {
      const rows = data.data as TicketClicksRow[];
      return (
        <TableContainer component={Paper} variant="outlined" sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Event</TableCell>
                <TableCell>Event date</TableCell>
                <TableCell>Organizer</TableCell>
                <TableCell align="right">Ticket clicks</TableCell>
                <TableCell align="right">Unique users</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`ticket-event-${row.eventId}`}>
                  <TableCell>{row.eventName || "-"}</TableCell>
                  <TableCell>{row.eventDate || "-"}</TableCell>
                  <TableCell>{row.organizerName || "-"}</TableCell>
                  <TableCell align="right">{formatNumber(row.ticketClicks)}</TableCell>
                  <TableCell align="right">{formatNumber(row.uniqueUsers)}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>No data.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      );
    }

    if (chart.id === "ticket_clicks_per_organizer") {
      const rows = data.data as OrganizerTicketClicksRow[];
      return (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Organizer</TableCell>
                <TableCell align="right">Ticket clicks</TableCell>
                <TableCell align="right">Unique users</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={`ticket-org-${row.organizerId ?? "unknown"}-${idx}`}>
                  <TableCell>{row.organizerName || "-"}</TableCell>
                  <TableCell align="right">{formatNumber(row.ticketClicks)}</TableCell>
                  <TableCell align="right">{formatNumber(row.uniqueUsers)}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3}>No data.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      );
    }

    if (chart.id === "deep_link_sankey") {
      const payload = data.data as OnboardingSankeyPayload;
      return <SankeyChart data={payload} />;
    }

    if (chart.id === "branch_stats") {
      const payload = data.data as BranchStatsPayload;
      const rows = (payload?.rows ?? []).slice();
      rows.sort((a, b) => (b.stats?.overallClicks ?? 0) - (a.stats?.overallClicks ?? 0));
      const meta = payload?.meta;
      const rangeLabel = meta?.range?.label ||
        (meta?.range?.startDate && meta?.range?.endDate
          ? `${meta.range.startDate} to ${meta.range.endDate}`
          : "Range unavailable");
      const generatedAt = meta?.generatedAt ? new Date(meta.generatedAt).toLocaleString() : null;
      const updatedAt = meta?.updatedAt ? new Date(meta.updatedAt).toLocaleString() : null;
      return (
        <Stack spacing={1.5}>
          <Stack spacing={0.25}>
            <Typography variant="caption" color="text.secondary">
              Range: {rangeLabel}
            </Typography>
            {(generatedAt || updatedAt || meta?.source) && (
              <Typography variant="caption" color="text.secondary">
                {generatedAt ? `Generated ${generatedAt}` : ""}
                {generatedAt && updatedAt ? " · " : ""}
                {updatedAt ? `Updated ${updatedAt}` : ""}
                {(generatedAt || updatedAt) && meta?.source ? " · " : ""}
                {meta?.source ? `Source ${meta.source}` : ""}
              </Typography>
            )}
          </Stack>
          <TableContainer component={Paper} variant="outlined" sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>URL</TableCell>
                  <TableCell align="right">Overall clicks</TableCell>
                  <TableCell align="right">iOS link clicks</TableCell>
                  <TableCell align="right">iOS install</TableCell>
                  <TableCell align="right">iOS reopen</TableCell>
                  <TableCell align="right">Android link clicks</TableCell>
                  <TableCell align="right">Android install</TableCell>
                  <TableCell align="right">Android reopen</TableCell>
                  <TableCell align="right">Desktop link clicks</TableCell>
                  <TableCell align="right">Desktop texts sent</TableCell>
                  <TableCell align="right">Desktop iOS install</TableCell>
                  <TableCell align="right">Desktop iOS reopen</TableCell>
                  <TableCell align="right">Desktop Android install</TableCell>
                  <TableCell align="right">Desktop Android reopen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={`${row.url || row.name || "row"}-${idx}`}>
                    <TableCell>{row.name || "-"}</TableCell>
                    <TableCell>
                      {row.url ? (
                        <Link href={row.url} target="_blank" rel="noopener noreferrer" underline="hover">
                          {row.url}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell align="right">{formatNumber(row.stats?.overallClicks)}</TableCell>
                    <TableCell align="right">{formatNumber(row.stats?.ios?.linkClicks)}</TableCell>
                    <TableCell align="right">{formatNumber(row.stats?.ios?.install)}</TableCell>
                    <TableCell align="right">{formatNumber(row.stats?.ios?.reopen)}</TableCell>
                    <TableCell align="right">{formatNumber(row.stats?.android?.linkClicks)}</TableCell>
                    <TableCell align="right">{formatNumber(row.stats?.android?.install)}</TableCell>
                    <TableCell align="right">{formatNumber(row.stats?.android?.reopen)}</TableCell>
                    <TableCell align="right">{formatNumber(row.stats?.desktop?.linkClicks)}</TableCell>
                    <TableCell align="right">{formatNumber(row.stats?.desktop?.textsSent)}</TableCell>
                    <TableCell align="right">{formatNumber(row.stats?.desktop?.iosSms?.install)}</TableCell>
                    <TableCell align="right">{formatNumber(row.stats?.desktop?.iosSms?.reopen)}</TableCell>
                    <TableCell align="right">{formatNumber(row.stats?.desktop?.androidSms?.install)}</TableCell>
                    <TableCell align="right">{formatNumber(row.stats?.desktop?.androidSms?.reopen)}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={15}>No data.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      );
    }

    if (chart.id === "deep_link_performance") {
      const rows = data.data as DeepLinkRow[];
      return (
        <TableContainer component={Paper} variant="outlined" sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Slug</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Campaign</TableCell>
                <TableCell>Channel</TableCell>
                <TableCell>Link</TableCell>
                <TableCell>Featured event</TableCell>
                <TableCell>Event date</TableCell>
                <TableCell>Organizer</TableCell>
                <TableCell>Promo code</TableCell>
                <TableCell align="right">Detected (unique)</TableCell>
                <TableCell align="right">Attributed (unique)</TableCell>
                <TableCell align="right">Event clicked (unique)</TableCell>
                <TableCell align="right">Ticket clicked (unique)</TableCell>
                <TableCell align="right">Ticket clicks</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const deepLinkUrl = buildDeepLinkUrl(row.slug);
                return (
                  <TableRow key={`deep-link-${row.id}`}>
                    <TableCell>{row.slug || "-"}</TableCell>
                    <TableCell>{row.type || "-"}</TableCell>
                    <TableCell>{row.campaign || "-"}</TableCell>
                    <TableCell>{row.channel || "-"}</TableCell>
                    <TableCell>
                      {deepLinkUrl ? (
                        <Link href={deepLinkUrl} target="_blank" rel="noopener noreferrer" underline="hover">
                          {deepLinkUrl}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{row.featuredEventName || "-"}</TableCell>
                    <TableCell>{row.featuredEventDate || "-"}</TableCell>
                    <TableCell>{row.organizerName || "-"}</TableCell>
                    <TableCell>{row.featuredPromoCode || "-"}</TableCell>
                    <TableCell align="right">{formatNumber(row.detectedUsers)}</TableCell>
                    <TableCell align="right">{formatNumber(row.attributedUsers)}</TableCell>
                    <TableCell align="right">{formatNumber(row.eventClickUsers)}</TableCell>
                    <TableCell align="right">{formatNumber(row.ticketClickUsers)}</TableCell>
                    <TableCell align="right">{formatNumber(row.ticketClicks)}</TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={14}>No data.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      );
    }

    if (chart.id === "modal_sankey") {
      const payload = data.data as OnboardingSankeyPayload;
      return <SankeyChart data={payload} />;
    }

    if (chart.id === "modal_click_summary") {
      const rows = data.data as ModalClickSummaryRow[];
      return (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Modal</TableCell>
                <TableCell align="right">Primary click</TableCell>
                <TableCell align="right">Skip</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`modal-summary-${row.modalId}`}>
                  <TableCell>{row.modalLabel}</TableCell>
                  <TableCell align="right">{formatNumber(row.primaryUsers)}</TableCell>
                  <TableCell align="right">{formatNumber(row.skipUsers)}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3}>No data.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      );
    }

    if (chart.id === "onboarding_sankey") {
      const payload = data.data as OnboardingSankeyPayload;
      return <SankeyChart data={payload} />;
    }

    if (chart.id === "skip_to_signup") {
      const summary = data.data as {
        userCount: number;
        avgSeconds: number;
        medianSeconds: number;
        neverSignedUp: number;
      };
      return (
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="h4">{formatNumber(summary.userCount)}</Typography>
            <Typography variant="body2" color="text.secondary">
              Users who skipped welcome and signed up
            </Typography>
          </Box>
          <Stack direction="row" spacing={3} flexWrap="wrap">
            <Box>
              <Typography variant="caption" color="text.secondary">Avg time to signup</Typography>
              <Typography variant="subtitle1">{formatDuration(summary.avgSeconds)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Median time to signup</Typography>
              <Typography variant="subtitle1">{formatDuration(summary.medianSeconds)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Never signed up</Typography>
              <Typography variant="subtitle1">{formatNumber(summary.neverSignedUp)}</Typography>
            </Box>
          </Stack>
        </Stack>
      );
    }

    if (chart.id === "feature_usage_table") {
      const payload = data.data as FeatureUsagePayload;
      const categories = payload?.categories ?? [];
      const events = payload?.events ?? [];
      const states = payload?.states ?? [];

      const stateMap = new Map<string, FeatureUsageStateRow[]>();
      states.forEach((row) => {
        const group = stateMap.get(row.eventName) ?? [];
        group.push(row);
        stateMap.set(row.eventName, group);
      });

      const eventsByCategory = new Map<string, FeatureUsageEventRow[]>();
      events.forEach((row) => {
        const category = getUserEventCategory(row.eventName);
        const group = eventsByCategory.get(category) ?? [];
        group.push(row);
        eventsByCategory.set(category, group);
      });

      const sortedCategories = categories.slice().sort((a, b) => b.uniqueUsers - a.uniqueUsers);

      return (
        <Stack spacing={2}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 1.5,
            }}
          >
            {sortedCategories.map((category) => {
              const iconMeta = getCategoryIcon(category.category);
              return (
                <Paper key={`cat-card-${category.category}`} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack spacing={1}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 2,
                        bgcolor: `${iconMeta.color}15`,
                        color: iconMeta.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {iconMeta.icon}
                    </Box>
                    <Box>
                      <Typography variant="subtitle2">{category.category}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatNumber(category.uniqueUsers)} unique · {formatNumber(category.total)} total
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              );
            })}
            {sortedCategories.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No data.
              </Typography>
            )}
          </Box>

          <Stack spacing={1}>
            {sortedCategories.map((category) => {
              const iconMeta = getCategoryIcon(category.category);
              const rows = (eventsByCategory.get(category.category) ?? []).slice();
              rows.sort((a, b) => b.uniqueUsers - a.uniqueUsers);

              return (
                <Accordion key={`cat-${category.category}`} variant="outlined">
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1 }}>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: 1.5,
                          bgcolor: `${iconMeta.color}15`,
                          color: iconMeta.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {iconMeta.icon}
                      </Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {category.category}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box textAlign="right">
                        <Typography variant="subtitle2">{formatNumber(category.uniqueUsers)}</Typography>
                        <Typography variant="caption" color="text.secondary">Unique</Typography>
                      </Box>
                      <Box textAlign="right">
                        <Typography variant="subtitle2">{formatNumber(category.total)}</Typography>
                        <Typography variant="caption" color="text.secondary">Total</Typography>
                      </Box>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={1}>
                      {rows.map((row) => {
                        const stateRows = (stateMap.get(row.eventName) ?? []).slice();
                        stateRows.sort((a, b) => b.uniqueUsers - a.uniqueUsers);
                        const hasStates = stateRows.length > 0;

                        if (hasStates) {
                          return (
                            <Accordion
                              key={`feature-${row.eventName}`}
                              disableGutters
                              elevation={0}
                              sx={{ "&::before": { display: "none" } }}
                            >
                              <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />}>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1 }}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {getUserEventDisplayName(row.eventName)}
                                  </Typography>
                                </Stack>
                                <Stack direction="row" spacing={2} alignItems="center">
                                  <Box textAlign="right">
                                    <Typography variant="body2">{formatNumber(row.uniqueUsers)}</Typography>
                                    <Typography variant="caption" color="text.secondary">Unique</Typography>
                                  </Box>
                                  <Box textAlign="right">
                                    <Typography variant="body2">{formatNumber(row.total)}</Typography>
                                    <Typography variant="caption" color="text.secondary">Total</Typography>
                                  </Box>
                                </Stack>
                              </AccordionSummary>
                              <AccordionDetails sx={{ pt: 0 }}>
                                <Stack spacing={0.75}>
                                  {stateRows.map((stateRow, idx) => {
                                    const meta = getUserEventMeta(stateRow.eventName);
                                    const stateKey = meta?.state?.key;
                                    const stateLabel = stateKey
                                      ? getUserEventStateLabel(stateRow.eventName, { [stateKey]: stateRow.stateValue })
                                      : "-";
                                    return (
                                      <Box
                                        key={`state-${stateRow.eventName}-${stateRow.stateValue ?? "none"}-${idx}`}
                                        sx={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          alignItems: "center",
                                          px: 1,
                                          py: 0.75,
                                          borderRadius: 1,
                                          bgcolor: "#f8fafc",
                                        }}
                                      >
                                        <Typography variant="body2" color="text.secondary">
                                          {stateLabel}
                                        </Typography>
                                        <Stack direction="row" spacing={2} alignItems="center">
                                          <Typography variant="caption" color="text.secondary">
                                            {formatNumber(stateRow.uniqueUsers)} unique
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            {formatNumber(stateRow.total)} total
                                          </Typography>
                                        </Stack>
                                      </Box>
                                    );
                                  })}
                                </Stack>
                              </AccordionDetails>
                            </Accordion>
                          );
                        }

                        return (
                          <Box
                            key={`feature-${row.eventName}`}
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              px: 1,
                              py: 0.75,
                              borderRadius: 1,
                              bgcolor: "#f8fafc",
                            }}
                          >
                            <Typography variant="body2" fontWeight={500}>
                              {getUserEventDisplayName(row.eventName)}
                            </Typography>
                            <Stack direction="row" spacing={2} alignItems="center">
                              <Typography variant="caption" color="text.secondary">
                                {formatNumber(row.uniqueUsers)} unique
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatNumber(row.total)} total
                              </Typography>
                            </Stack>
                          </Box>
                        );
                      })}
                      {rows.length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                          No events yet.
                        </Typography>
                      )}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>
        </Stack>
      );
    }

    return <Typography variant="body2" color="text.secondary">Chart not implemented.</Typography>;
  };

  return (
    <Paper ref={focusRef} variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack spacing={0.25}>
          <Typography variant="subtitle1" fontWeight={600}>
            {chart.title}
          </Typography>
          {chart.description && (
            <Typography variant="body2" color="text.secondary">
              {chart.description}
            </Typography>
          )}
        </Stack>
        {content()}
      </Stack>
    </Paper>
  );
};

export default function AnalyticsScreen() {
  const queryClient = useQueryClient();
  const { data: indexData, isLoading, error } = useFetchAnalyticsIndex();
  const [preset, setPreset] = useState<RangePreset>("month");
  const [search, setSearch] = useState("");
  const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null);
  const [focusedChartId, setFocusedChartId] = useState<string | null>(null);
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const range = useMemo(() => buildRangeFromPreset(preset), [preset]);
  const dashboards = useMemo(() => indexData?.dashboards ?? [], [indexData?.dashboards]);
  const charts = useMemo(() => indexData?.charts ?? [], [indexData?.charts]);

  const chartMap = useMemo(() => new Map(charts.map((chart) => [chart.id, chart])), [charts]);
  const selectedDashboard = dashboards.find((d) => d.id === selectedDashboardId) ?? dashboards[0] ?? null;

  useEffect(() => {
    if (!selectedDashboardId && dashboards.length) {
      setSelectedDashboardId(dashboards[0].id);
    }
  }, [dashboards, selectedDashboardId]);

  useEffect(() => {
    if (focusedChartId) {
      chartRefs.current[focusedChartId]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [focusedChartId]);

  const searchTerm = search.trim().toLowerCase();
  const chartsForDashboard = selectedDashboard
    ? selectedDashboard.chartIds.map((id) => chartMap.get(id)).filter(Boolean) as AnalyticsChartDefinition[]
    : [];

  const searchMatches = searchTerm
    ? charts.filter((chart) => {
        const dashboardTitle = dashboards.find((d) => d.id === chart.dashboardId)?.title ?? "";
        const haystack = `${chart.title} ${chart.id} ${dashboardTitle}`.toLowerCase();
        return haystack.includes(searchTerm);
      })
    : [];

  const visibleCharts = searchTerm ? searchMatches : chartsForDashboard;

  return (
    <Box p={2}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Typography variant="h5">Analytics</Typography>
          <Button
            variant="outlined"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["analytics-chart"] })}
            disabled={isLoading}
          >
            Refresh charts
          </Button>
        </Stack>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Typography variant="subtitle2">Date range</Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={preset}
              onChange={(_event, value) => {
                if (value === "month" || value === "quarter" || value === "year" || value === "all") {
                  setPreset(value);
                }
              }}
            >
              {PRESET_OPTIONS.map((option) => (
                <ToggleButton key={option.value} value={option.value}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="body2" color="text.secondary">
              {range.label}
            </Typography>
          </Stack>
        </Paper>

        {error && <Alert severity="error">Failed to load analytics index.</Alert>}
        {isLoading && <Typography variant="body2">Loading dashboards...</Typography>}

        {!isLoading && (
          <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems="flex-start">
            <Paper variant="outlined" sx={{ p: 2, width: { xs: "100%", lg: 300 }, flexShrink: 0 }}>
              <Stack spacing={2}>
                <TextField
                  size="small"
                  label="Search charts"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <Divider />
                <Stack spacing={1}>
                  <Typography variant="subtitle2">Dashboards</Typography>
                  {dashboards.map((dashboard) => (
                    <Button
                      key={dashboard.id}
                      variant={dashboard.id === selectedDashboard?.id ? "contained" : "outlined"}
                      onClick={() => {
                        setSelectedDashboardId(dashboard.id);
                        setSearch("");
                      }}
                      fullWidth
                      sx={{ justifyContent: "flex-start" }}
                    >
                      {dashboard.title}
                    </Button>
                  ))}
                </Stack>
                <Divider />
                <Stack spacing={1}>
                  <Typography variant="subtitle2">
                    {searchTerm ? "Matching charts" : "Charts"}
                  </Typography>
                  {(searchTerm ? searchMatches : chartsForDashboard).map((chart) => (
                    <Button
                      key={`chart-nav-${chart.id}`}
                      variant="text"
                      onClick={() => {
                        setFocusedChartId(chart.id);
                        if (chart.dashboardId !== selectedDashboard?.id) {
                          setSelectedDashboardId(chart.dashboardId);
                        }
                      }}
                      sx={{ justifyContent: "flex-start" }}
                      fullWidth
                    >
                      {chart.title}
                    </Button>
                  ))}
                  {visibleCharts.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No charts found.
                    </Typography>
                  )}
                </Stack>
              </Stack>
            </Paper>

            <Stack spacing={2} flex={1}>
              <Typography variant="h6">
                {searchTerm ? "Search results" : selectedDashboard?.title}
              </Typography>
              {visibleCharts.map((chart) => (
                <ChartCard
                  key={`chart-${chart.id}`}
                  chart={chart}
                  range={range}
                  focusRef={(el) => {
                    chartRefs.current[chart.id] = el;
                  }}
                />
              ))}
            </Stack>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
