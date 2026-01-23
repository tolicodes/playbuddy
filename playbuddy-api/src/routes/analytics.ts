import { Router, type Response } from "express";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { parse as parseCsv } from "csv-parse/sync";
import { authenticateAdminRequest, type AuthenticatedRequest } from "../middleware/authenticateRequest.js";
import { replayToLargeInstance } from "../middleware/replayToLargeInstance.js";
import { pgQuery } from "../connections/postgres.js";
import { USER_EVENT_CATALOG } from "../common/analytics/userEventCatalog.js";
import { UE } from "../common/types/userEventTypes.js";

type UsersOverTimeRow = {
  date: string;
  newUsers: number;
  totalUsers: number;
};

type UsersOverTimeMeta = {
  startDate: string;
  endDate: string;
  generatedAt: string;
  totalUsers: number;
  rangeDays: number;
};

type UsersOverTimeResponse = {
  meta: UsersOverTimeMeta;
  rows: UsersOverTimeRow[];
};

type ChartMeta = {
  startDate: string;
  endDate: string;
  generatedAt: string;
};

type ChartDefinition = {
  id: string;
  dashboardId: string;
  title: string;
  type: "line" | "bar" | "table" | "sankey";
  description?: string;
};

type DashboardDefinition = {
  id: string;
  title: string;
  description?: string;
  chartIds: string[];
};

type BranchStatsRow = {
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

type BranchStatsMeta = {
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

type BranchStatsPayload = {
  meta: BranchStatsMeta;
  rows: BranchStatsRow[];
};

type ModalActionRole = "primary" | "secondary" | "skip";

type ModalActionDefinition = {
  id: string;
  label: string;
  role: ModalActionRole;
  events: string[];
};

type ModalDefinition = {
  id: string;
  label: string;
  shownEvents: string[];
  actions: ModalActionDefinition[];
};

type ModalEventRow = {
  modalId: string;
  modalLabel: string;
  eventName: string;
  actionId: string;
  actionLabel: string;
  actionRole: "shown" | ModalActionRole;
};

const router = Router();

const DEFAULT_RANGE_DAYS = 30;
const ALL_START_DATE = "2000-01-01";
const DEFAULT_TOP_LIMIT = 20;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolveApiRoot = () => {
  const cwd = path.resolve(process.cwd());
  if (existsSync(path.resolve(cwd, "src"))) return cwd;
  const nested = path.resolve(cwd, "playbuddy-api");
  if (existsSync(path.resolve(nested, "src"))) return nested;
  const byDist = path.resolve(__dirname, "..", "..");
  return byDist;
};

const BRANCH_STATS_BASE_DIR = resolveApiRoot();
const BRANCH_STATS_DATA_DIR = path.resolve(BRANCH_STATS_BASE_DIR, "data", "branch");
const BRANCH_STATS_JSON_PATH = path.resolve(BRANCH_STATS_DATA_DIR, "branch_stats.json");
const BRANCH_STATS_CSV_PATH = path.resolve(BRANCH_STATS_DATA_DIR, "branch_stats.csv");

const toBranchNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const normalizeBranchCsvRows = (raw: string): BranchStatsRow[] => {
  const records = parseCsv(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  return records.map((row) => ({
    name: row.name ? String(row.name) : null,
    url: row.url ? String(row.url) : null,
    stats: {
      overallClicks: toBranchNumber(row.overallClicks),
      desktop: {
        linkClicks: toBranchNumber(row.desktop_linkClicks),
        textsSent: toBranchNumber(row.desktop_textsSent),
        iosSms: {
          install: toBranchNumber(row.desktop_iosSms_install),
          reopen: toBranchNumber(row.desktop_iosSms_reopen),
        },
        androidSms: {
          install: toBranchNumber(row.desktop_androidSms_install),
          reopen: toBranchNumber(row.desktop_androidSms_reopen),
        },
      },
      android: {
        linkClicks: toBranchNumber(row.android_linkClicks),
        install: toBranchNumber(row.android_install),
        reopen: toBranchNumber(row.android_reopen),
      },
      ios: {
        linkClicks: toBranchNumber(row.ios_linkClicks),
        install: toBranchNumber(row.ios_install),
        reopen: toBranchNumber(row.ios_reopen),
      },
    },
  }));
};

const loadBranchStats = async (): Promise<BranchStatsPayload> => {
  if (existsSync(BRANCH_STATS_JSON_PATH)) {
    const raw = await fs.readFile(BRANCH_STATS_JSON_PATH, "utf8");
    const parsed = JSON.parse(raw);
    const rows = Array.isArray(parsed) ? parsed : parsed?.rows || [];
    const stat = await fs.stat(BRANCH_STATS_JSON_PATH);
    const meta: BranchStatsMeta = {
      ...(parsed?.meta ?? {}),
      updatedAt: parsed?.meta?.updatedAt ?? stat.mtime.toISOString(),
      source: parsed?.meta?.source ?? path.basename(BRANCH_STATS_JSON_PATH),
    };
    return { meta, rows };
  }

  if (existsSync(BRANCH_STATS_CSV_PATH)) {
    const rawCsv = await fs.readFile(BRANCH_STATS_CSV_PATH, "utf8");
    const rows = normalizeBranchCsvRows(rawCsv);
    const stat = await fs.stat(BRANCH_STATS_CSV_PATH);
    const meta: BranchStatsMeta = {
      updatedAt: stat.mtime.toISOString(),
      source: path.basename(BRANCH_STATS_CSV_PATH),
    };
    return { meta, rows };
  }

  return { meta: { generatedAt: null, range: null }, rows: [] };
};

const EVENT_CLICK_EVENTS: string[] = [
  "event_list_item_clicked",
  "weekly_picks_event_details_clicked",
  "promo_screen_event_details_clicked",
  "discover_events_more_info_clicked",
  "event_detail_header_title_clicked",
];

const TICKET_CLICK_EVENTS: string[] = [
  "event_detail_ticket_pressed",
  "event_detail_get_tickets_clicked",
  "event_list_item_ticket_pressed",
  "event_list_item_promo_modal_ticket_pressed",
  "event_detail_link_clicked",
];

const COMMUNITY_CLICK_EVENTS: string[] = [
  UE.CommunityEventsCommunityJoined,
  UE.CommunityListCommunityJoined,
  UE.CommunityListCommunityLeft,
  UE.CommunityListNavigateToCommunityEvents,
  UE.CommunityListNavigateToJoinCommunityButtonPressed,
];

const escapeSqlLiteral = (value: string) => value.replace(/'/g, "''");

const FEATURE_CATALOG = USER_EVENT_CATALOG.filter(
  (entry): entry is (typeof USER_EVENT_CATALOG)[number] & { event: string; category: string } =>
    typeof entry?.event === "string" &&
    entry.event.length > 0 &&
    typeof entry?.category === "string" &&
    entry.category.length > 0
);

if (FEATURE_CATALOG.length !== USER_EVENT_CATALOG.length) {
  console.warn(
    `[analytics] Skipping ${USER_EVENT_CATALOG.length - FEATURE_CATALOG.length} user event catalog entries missing event/category.`
  );
}

const FEATURE_USAGE_EVENTS: string[] = FEATURE_CATALOG.map((entry) => entry.event);
const FEATURE_STATE_EVENTS = FEATURE_CATALOG.filter((entry) => entry.state);
const FEATURE_CATEGORY_CASES = FEATURE_CATALOG
  .map((entry) => `WHEN '${escapeSqlLiteral(entry.event)}' THEN '${escapeSqlLiteral(entry.category)}'`)
  .join(" ");

const ONBOARDING_EVENTS = {
  welcomeRegister: UE.WelcomeScreenRegisterClicked,
  welcomeSkipped: UE.WelcomeScreenSkipped,
  authSignupEmail: UE.AuthEmailLoginPressSignupWithEmail,
  authLoginEmail: UE.AuthEmailLoginPressLoginWithEmail,
  authGoogle: UE.LoginFormPressLoginWithGoogle,
  authApple: UE.LoginFormPressLoginWithApple,
  authPhone: UE.LoginFormPressLoginWithPhone,
  profileSave: UE.AccountProfileDetailsFormPressSave,
  profileDetailsSave: UE.ProfileDetailsPressSave,
  personalization: UE.PersonalizationModalConfirmed,
} as const;

const ONBOARDING_EVENT_NAMES = Object.values(ONBOARDING_EVENTS);
const ONBOARDING_DEEP_LINK_EVENTS = [UE.DeepLinkDetected, UE.DeepLinkAttributed];
const ONBOARDING_EVENT_CLICK_EVENTS = EVENT_CLICK_EVENTS;
const ONBOARDING_TICKET_CLICK_EVENTS = TICKET_CLICK_EVENTS;
const ONBOARDING_WISHLIST_EVENTS = [UE.EventDetailWishlistToggled, UE.EventListItemWishlistToggled];
const ONBOARDING_CALENDAR_EVENTS = [UE.EventDetailGoogleCalendarClicked, UE.EventCalendarViewGoogleCalendar];
const ONBOARDING_ORGANIZER_FOLLOW_EVENTS = [UE.OrganizerFirstFollowed, UE.OrganizerFollowPressed];
const ONBOARDING_ACTION_EVENT_NAMES = Array.from(
  new Set([
    ...ONBOARDING_EVENT_CLICK_EVENTS,
    ...ONBOARDING_TICKET_CLICK_EVENTS,
    ...ONBOARDING_WISHLIST_EVENTS,
    ...ONBOARDING_CALENDAR_EVENTS,
    ...ONBOARDING_ORGANIZER_FOLLOW_EVENTS,
  ])
);
const ONBOARDING_FLOW_EVENT_NAMES = Array.from(
  new Set([
    ...ONBOARDING_EVENT_NAMES,
    ...ONBOARDING_DEEP_LINK_EVENTS,
    ...ONBOARDING_ACTION_EVENT_NAMES,
  ])
);

const AUTH_METHOD_GROUPS = [
  { id: "email_signup", label: "Email signup", events: [UE.AuthEmailLoginPressSignupWithEmail] },
  { id: "email_login", label: "Email login", events: [UE.AuthEmailLoginPressLoginWithEmail] },
  { id: "google", label: "Google", events: [UE.LoginFormPressLoginWithGoogle] },
  { id: "apple", label: "Apple", events: [UE.LoginFormPressLoginWithApple] },
  { id: "phone", label: "Phone", events: [UE.LoginFormPressLoginWithPhone] },
];

const AUTH_EVENT_NAMES = AUTH_METHOD_GROUPS.flatMap((group) => group.events);

const DEEP_LINK_FLOW_EVENT_NAMES = Array.from(
  new Set([UE.DeepLinkDetected, UE.DeepLinkAttributed, ...EVENT_CLICK_EVENTS, ...TICKET_CLICK_EVENTS])
);

const MODAL_ANALYTICS_DEFINITIONS: ModalDefinition[] = [
  {
    id: "event_list_promo",
    label: "Event list promo",
    shownEvents: [UE.EventListItemDiscountModalOpened],
    actions: [
      {
        id: "ticket_pressed",
        label: "Ticket pressed",
        role: "primary",
        events: [UE.EventListItemPromoModalTicketPressed],
      },
      {
        id: "promo_copied",
        label: "Promo code copied",
        role: "secondary",
        events: [UE.EventListItemPromoModalPromoCopied],
      },
    ],
  },
  {
    id: "guest_save",
    label: "Guest save",
    shownEvents: [UE.GuestSaveModalShown],
    actions: [
      {
        id: "create_account",
        label: "Create account",
        role: "primary",
        events: [UE.GuestSaveModalCreateAccountPressed],
      },
      {
        id: "dismissed",
        label: "Dismissed",
        role: "skip",
        events: [UE.GuestSaveModalDismissed],
      },
    ],
  },
  {
    id: "calendar_month_picker",
    label: "Calendar month picker",
    shownEvents: [UE.CalendarMonthModalShown],
    actions: [
      {
        id: "day_selected",
        label: "Day selected",
        role: "primary",
        events: [UE.CalendarMonthModalDaySelected],
      },
      {
        id: "dismissed",
        label: "Dismissed",
        role: "skip",
        events: [UE.CalendarMonthModalDismissed],
      },
    ],
  },
  {
    id: "calendar_add_coach",
    label: "Calendar add coach",
    shownEvents: [UE.CalendarAddCoachShown],
    actions: [
      {
        id: "save_pressed",
        label: "Save pressed",
        role: "primary",
        events: [UE.CalendarAddCoachSavePressed],
      },
      {
        id: "dismissed",
        label: "Dismissed",
        role: "skip",
        events: [UE.CalendarAddCoachDismissed],
      },
    ],
  },
  {
    id: "buddy_list_coach",
    label: "Buddy list coach",
    shownEvents: [UE.BuddyListCoachShown],
    actions: [
      {
        id: "share_calendar",
        label: "Share calendar",
        role: "primary",
        events: [UE.BuddyListCoachSharePressed],
      },
      {
        id: "dismissed",
        label: "Dismissed",
        role: "skip",
        events: [UE.BuddyListCoachDismissed],
      },
    ],
  },
  {
    id: "buddy_share_toast",
    label: "Buddy share toast",
    shownEvents: [UE.BuddyShareToastShown],
    actions: [
      {
        id: "share_calendar",
        label: "Share calendar",
        role: "primary",
        events: [UE.BuddyShareToastSharePressed],
      },
      {
        id: "dismissed",
        label: "Dismissed",
        role: "skip",
        events: [UE.BuddyShareToastDismissed],
      },
    ],
  },
  {
    id: "event_popup",
    label: "Event popup",
    shownEvents: [UE.EventPopupModalShown],
    actions: [
      {
        id: "primary_action",
        label: "Primary action",
        role: "primary",
        events: [UE.EventPopupModalPrimaryAction],
      },
      {
        id: "skipped",
        label: "Skipped",
        role: "skip",
        events: [UE.EventPopupModalSkipped],
      },
    ],
  },
  {
    id: "personalization",
    label: "Personalization",
    shownEvents: [],
    actions: [
      {
        id: "confirmed",
        label: "Confirmed",
        role: "primary",
        events: [UE.PersonalizationModalConfirmed],
      },
    ],
  },
  {
    id: "edgeplay_group",
    label: "EdgePlay group",
    shownEvents: [UE.EdgePlayGroupModalShown],
    actions: [
      {
        id: "open_whatsapp",
        label: "Open WhatsApp",
        role: "primary",
        events: [UE.EdgePlayGroupModalOpenWhatsapp],
      },
      {
        id: "dismissed",
        label: "Dismissed",
        role: "skip",
        events: [UE.EdgePlayGroupModalDismissed],
      },
    ],
  },
  {
    id: "newsletter_signup",
    label: "Newsletter signup",
    shownEvents: [UE.NewsletterSignupModalShown],
    actions: [
      {
        id: "open_signup",
        label: "Open signup",
        role: "primary",
        events: [UE.NewsletterSignupModalOpenSignup],
      },
      {
        id: "dismissed",
        label: "Dismissed",
        role: "skip",
        events: [UE.NewsletterSignupModalDismissed],
      },
    ],
  },
  {
    id: "rate_app",
    label: "Rate app",
    shownEvents: [UE.RateAppModalShown],
    actions: [
      {
        id: "open_store",
        label: "Open store",
        role: "primary",
        events: [UE.RateAppModalOpenStore],
      },
      {
        id: "skipped",
        label: "Skipped",
        role: "skip",
        events: [UE.RateAppModalSkipped],
      },
    ],
  },
  {
    id: "discover_game",
    label: "Discover game",
    shownEvents: [UE.DiscoverGameModalShown],
    actions: [
      {
        id: "play_now",
        label: "Play now",
        role: "primary",
        events: [UE.DiscoverGameModalPlayNow],
      },
      {
        id: "skipped",
        label: "Skipped",
        role: "skip",
        events: [UE.DiscoverGameModalSkipped],
      },
    ],
  },
  {
    id: "media_carousel",
    label: "Media carousel",
    shownEvents: [UE.MediaCarouselOpenMedia],
    actions: [
      {
        id: "toggle_mute",
        label: "Toggle mute",
        role: "secondary",
        events: [UE.MediaCarouselToggleMute],
      },
      {
        id: "closed",
        label: "Closed",
        role: "skip",
        events: [UE.MediaCarouselClose],
      },
    ],
  },
  {
    id: "facilitator_intro_video",
    label: "Facilitator intro video",
    shownEvents: [UE.FacilitatorsProfileIntroVideoPressed],
    actions: [
      {
        id: "closed",
        label: "Closed",
        role: "skip",
        events: [UE.FacilitatorsProfileIntroVideoClosed],
      },
    ],
  },
  {
    id: "event_list_view_intro",
    label: "Event list view intro",
    shownEvents: [UE.EventListViewIntroModalShown],
    actions: [
      {
        id: "keep_new",
        label: "Keep new view",
        role: "primary",
        events: [UE.EventListViewIntroModalKeepNew],
      },
      {
        id: "switch_classic",
        label: "Switch to classic",
        role: "secondary",
        events: [UE.EventListViewIntroModalSwitchClassic],
      },
    ],
  },
  {
    id: "share_calendar",
    label: "Share calendar",
    shownEvents: [UE.ShareCalendarModalShown],
    actions: [
      {
        id: "share_calendar",
        label: "Share calendar",
        role: "primary",
        events: [UE.BuddyShareCalendarPressed],
      },
      {
        id: "skipped",
        label: "Skipped",
        role: "skip",
        events: [UE.ShareCalendarModalSkipped],
      },
    ],
  },
];

const MODAL_EVENT_ROWS: ModalEventRow[] = MODAL_ANALYTICS_DEFINITIONS.flatMap((modal) => {
  const rows: ModalEventRow[] = [];
  modal.shownEvents.forEach((eventName) => {
    rows.push({
      modalId: modal.id,
      modalLabel: modal.label,
      eventName,
      actionId: "shown",
      actionLabel: "Shown",
      actionRole: "shown",
    });
  });
  modal.actions.forEach((action) => {
    action.events.forEach((eventName) => {
      rows.push({
        modalId: modal.id,
        modalLabel: modal.label,
        eventName,
        actionId: action.id,
        actionLabel: action.label,
        actionRole: action.role,
      });
    });
  });
  return rows;
});

const MODAL_EVENT_NAMES = Array.from(new Set(MODAL_EVENT_ROWS.map((row) => row.eventName)));
const MODAL_EVENT_VALUES = MODAL_EVENT_ROWS.map(
  (row) =>
    `('${escapeSqlLiteral(row.modalId)}', ` +
    `'${escapeSqlLiteral(row.modalLabel)}', ` +
    `'${escapeSqlLiteral(row.eventName)}', ` +
    `'${escapeSqlLiteral(row.actionId)}', ` +
    `'${escapeSqlLiteral(row.actionLabel)}', ` +
    `'${escapeSqlLiteral(row.actionRole)}')`
).join(",\n");

const DASHBOARDS: DashboardDefinition[] = [
  {
    id: "users",
    title: "Users",
    description: "Acquisition and engagement trends.",
    chartIds: [
      "users_over_time",
      "new_users_per_day",
      "weekly_active_users",
      "unique_devices_over_time",
      "anonymous_devices_summary",
      "most_active_users",
      "users_most_ticket_clicks",
    ],
  },
  {
    id: "auth",
    title: "Auth",
    description: "Login method preferences.",
    chartIds: ["auth_method_breakdown"],
  },
  {
    id: "profiles",
    title: "User Profiles",
    description: "Per-user event activity and liked events.",
    chartIds: ["user_profiles"],
  },
  {
    id: "events",
    title: "Events",
    description: "Event and organizer performance.",
    chartIds: [
      "top_events_clicks",
      "event_clicks_per_organizer",
      "ticket_clicks_per_event",
      "ticket_clicks_per_organizer",
    ],
  },
  {
    id: "deep_links",
    title: "Deep Links",
    description: "Attribution and funnel performance.",
    chartIds: ["deep_link_sankey", "deep_link_performance"],
  },
  {
    id: "branch",
    title: "Branch",
    description: "Branch link performance snapshots.",
    chartIds: ["branch_stats"],
  },
  {
    id: "feature_usage",
    title: "Feature Usage",
    description: "User events grouped into readable categories.",
    chartIds: ["top_user_events", "feature_usage_table"],
  },
  {
    id: "modals",
    title: "Modals",
    description: "Modal impressions and actions.",
    chartIds: ["modal_sankey", "modal_click_summary"],
  },
  {
    id: "onboarding",
    title: "Onboarding",
    description: "Signup flow and completion funnel.",
    chartIds: ["onboarding_sankey", "skip_to_signup"],
  },
];

const CHARTS: ChartDefinition[] = [
  { id: "users_over_time", dashboardId: "users", title: "Users over time", type: "line" },
  { id: "new_users_per_day", dashboardId: "users", title: "New users per day", type: "bar" },
  { id: "weekly_active_users", dashboardId: "users", title: "Weekly active users", type: "line" },
  {
    id: "unique_devices_over_time",
    dashboardId: "users",
    title: "Unique devices over time",
    type: "line",
    description: "Distinct device IDs with and without an attached user.",
  },
  {
    id: "anonymous_devices_summary",
    dashboardId: "users",
    title: "Anonymous devices summary",
    type: "table",
    description: "Devices without a user and their in-range lifespan.",
  },
  { id: "most_active_users", dashboardId: "users", title: "Most active users", type: "table" },
  { id: "users_most_ticket_clicks", dashboardId: "users", title: "Users with most ticket clicks", type: "table" },
  {
    id: "auth_method_breakdown",
    dashboardId: "auth",
    title: "Login methods",
    type: "bar",
    description: "Unique users by login method.",
  },
  {
    id: "user_profiles",
    dashboardId: "profiles",
    title: "User profiles",
    type: "table",
    description: "User activity counts and liked events.",
  },
  { id: "top_events_clicks", dashboardId: "events", title: "Top events (clicks)", type: "table" },
  { id: "event_clicks_per_organizer", dashboardId: "events", title: "Event clicks per organizer", type: "table" },
  { id: "ticket_clicks_per_event", dashboardId: "events", title: "Ticket button clicks per event", type: "table" },
  { id: "ticket_clicks_per_organizer", dashboardId: "events", title: "Ticket clicks per organizer", type: "table" },
  {
    id: "deep_link_sankey",
    dashboardId: "deep_links",
    title: "Deep link flow",
    type: "sankey",
    description: "Detected → attributed → event clicked → ticket clicked.",
  },
  { id: "deep_link_performance", dashboardId: "deep_links", title: "Deep link performance", type: "table" },
  {
    id: "branch_stats",
    dashboardId: "branch",
    title: "Branch stats",
    type: "table",
    description: "Snapshot of Branch link clicks and installs.",
  },
  { id: "top_user_events", dashboardId: "feature_usage", title: "Top user events", type: "table" },
  { id: "feature_usage_table", dashboardId: "feature_usage", title: "Feature usage", type: "table" },
  {
    id: "modal_sankey",
    dashboardId: "modals",
    title: "Modal flow",
    type: "sankey",
    description: "Unique users by modal and action.",
  },
  {
    id: "modal_click_summary",
    dashboardId: "modals",
    title: "Modal click summary",
    type: "table",
    description: "Primary vs skip actions (unique users).",
  },
  { id: "onboarding_sankey", dashboardId: "onboarding", title: "Onboarding flow", type: "sankey" },
  {
    id: "skip_to_signup",
    dashboardId: "onboarding",
    title: "Skip to signup",
    type: "table",
    description: "Users who skipped welcome and later signed up.",
  },
];

const isIsoDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime());
};

const parseDateParam = (value: unknown) => {
  if (typeof value !== "string") return null;
  return isIsoDate(value) ? value : null;
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

const formatDateValue = (value: unknown) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const getDateRange = (query: Record<string, unknown>) => {
  const preset = typeof query.preset === "string" ? query.preset : null;
  const endDateParam = parseDateParam(query.endDate);
  const startDateParam = parseDateParam(query.startDate);
  const endDate = endDateParam ?? formatDate(new Date());
  const endDateObj = new Date(`${endDate}T00:00:00Z`);

  let startDate = startDateParam;
    if (!startDate) {
      if (preset === "all") {
        startDate = ALL_START_DATE;
      } else if (preset === "week") {
        startDate = formatDate(addDays(endDateObj, -7));
      } else if (preset === "year") {
        startDate = formatDate(addDays(endDateObj, -365));
      } else if (preset === "quarter") {
        startDate = formatDate(addDays(endDateObj, -90));
      } else if (preset === "month") {
      startDate = formatDate(addDays(endDateObj, -30));
    } else {
      startDate = formatDate(addDays(endDateObj, -DEFAULT_RANGE_DAYS));
    }
  }

  const startDateObj = new Date(`${startDate}T00:00:00Z`);

  return {
    startDate,
    endDate,
    startDateObj,
    endDateObj,
    error: startDateObj > endDateObj ? "startDate must be on or before endDate." : null,
  };
};

const buildChartMeta = (startDate: string, endDate: string): ChartMeta => ({
  startDate,
  endDate,
  generatedAt: new Date().toISOString(),
});

const fetchUsersOverTime = async (startDate: string, endDate: string) => {
  const sql = `
    WITH bounds AS (
      SELECT $1::date AS start_date, $2::date AS end_date
    ),
    days AS (
      SELECT generate_series(
        (SELECT start_date FROM bounds),
        (SELECT end_date FROM bounds),
        interval '1 day'
      )::date AS day
    ),
    daily AS (
      SELECT created_at::date AS day, count(*)::int AS new_users
      FROM public.users
      WHERE created_at::date BETWEEN (SELECT start_date FROM bounds) AND (SELECT end_date FROM bounds)
      GROUP BY 1
    ),
    total_before AS (
      SELECT count(*)::int AS total_users
      FROM public.users
      WHERE created_at::date < (SELECT start_date FROM bounds)
    )
    SELECT
      d.day,
      COALESCE(daily.new_users, 0)::int AS new_users,
      (SELECT total_users FROM total_before)
        + SUM(COALESCE(daily.new_users, 0)) OVER (ORDER BY d.day) AS total_users
    FROM days d
    LEFT JOIN daily ON daily.day = d.day
    ORDER BY d.day;
  `;

  const result = await pgQuery(sql, [startDate, endDate]);
  const rows: UsersOverTimeRow[] = result.rows.map((row: any) => ({
    date: row.day instanceof Date ? formatDate(row.day) : String(row.day),
    newUsers: Number(row.new_users ?? 0),
    totalUsers: Number(row.total_users ?? 0),
  }));

  return {
    rows,
    totalUsers: rows.length ? rows[rows.length - 1].totalUsers : 0,
    rangeDays: rows.length,
  };
};

const fetchOnboardingSankey = async (startDate: string, endDate: string) => {
  const sql = `
    WITH actors AS (
      SELECT
        COALESCE(auth_user_id::text, device_id) AS actor_id,
        MIN(created_at) FILTER (WHERE user_event_name = '${escapeSqlLiteral(ONBOARDING_EVENTS.welcomeRegister)}')
          AS welcome_register_at,
        MIN(created_at) FILTER (WHERE user_event_name = '${escapeSqlLiteral(ONBOARDING_EVENTS.welcomeSkipped)}')
          AS welcome_skipped_at,
        MIN(created_at) FILTER (WHERE user_event_name = '${escapeSqlLiteral(ONBOARDING_EVENTS.authSignupEmail)}')
          AS auth_signup_email_at,
        MIN(created_at) FILTER (WHERE user_event_name = '${escapeSqlLiteral(ONBOARDING_EVENTS.authLoginEmail)}')
          AS auth_login_email_at,
        MIN(created_at) FILTER (WHERE user_event_name = '${escapeSqlLiteral(ONBOARDING_EVENTS.authGoogle)}')
          AS auth_google_at,
        MIN(created_at) FILTER (WHERE user_event_name = '${escapeSqlLiteral(ONBOARDING_EVENTS.authApple)}')
          AS auth_apple_at,
        MIN(created_at) FILTER (WHERE user_event_name = '${escapeSqlLiteral(ONBOARDING_EVENTS.authPhone)}')
          AS auth_phone_at,
        MIN(created_at) FILTER (WHERE user_event_name = '${escapeSqlLiteral(ONBOARDING_EVENTS.profileSave)}')
          AS profile_save_at,
        MIN(created_at) FILTER (WHERE user_event_name = '${escapeSqlLiteral(ONBOARDING_EVENTS.profileDetailsSave)}')
          AS profile_details_at,
        MIN(created_at) FILTER (WHERE user_event_name = '${escapeSqlLiteral(ONBOARDING_EVENTS.personalization)}')
          AS personalization_at,
        MIN(created_at) FILTER (WHERE user_event_name = ANY($4)) AS deep_link_at
      FROM public.user_events
      WHERE created_at::date BETWEEN $1 AND $2
        AND user_event_name = ANY($3)
        AND (auth_user_id IS NOT NULL OR device_id IS NOT NULL)
      GROUP BY 1
    ),
    normalized AS (
      SELECT
        actor_id,
        CASE
          WHEN welcome_register_at IS NULL AND welcome_skipped_at IS NULL THEN NULL
          WHEN welcome_register_at IS NULL THEN 'welcome_skipped'
          WHEN welcome_skipped_at IS NULL THEN 'welcome_register'
          WHEN welcome_register_at <= welcome_skipped_at THEN 'welcome_register'
          ELSE 'welcome_skipped'
        END AS welcome_node,
        CASE
          WHEN welcome_register_at IS NULL AND welcome_skipped_at IS NULL THEN NULL
          WHEN welcome_register_at IS NULL THEN welcome_skipped_at
          WHEN welcome_skipped_at IS NULL THEN welcome_register_at
          WHEN welcome_register_at <= welcome_skipped_at THEN welcome_register_at
          ELSE welcome_skipped_at
        END AS welcome_time,
        NULLIF(
          LEAST(
            COALESCE(auth_signup_email_at, 'infinity'::timestamp),
            COALESCE(auth_login_email_at, 'infinity'::timestamp),
            COALESCE(auth_google_at, 'infinity'::timestamp),
            COALESCE(auth_apple_at, 'infinity'::timestamp),
            COALESCE(auth_phone_at, 'infinity'::timestamp)
          ),
          'infinity'::timestamp
        ) AS auth_time,
        CASE
          WHEN auth_signup_email_at IS NOT NULL AND auth_signup_email_at = LEAST(
            COALESCE(auth_signup_email_at, 'infinity'::timestamp),
            COALESCE(auth_login_email_at, 'infinity'::timestamp),
            COALESCE(auth_google_at, 'infinity'::timestamp),
            COALESCE(auth_apple_at, 'infinity'::timestamp),
            COALESCE(auth_phone_at, 'infinity'::timestamp)
          ) THEN 'auth_signup_email'
          WHEN auth_login_email_at IS NOT NULL AND auth_login_email_at = LEAST(
            COALESCE(auth_signup_email_at, 'infinity'::timestamp),
            COALESCE(auth_login_email_at, 'infinity'::timestamp),
            COALESCE(auth_google_at, 'infinity'::timestamp),
            COALESCE(auth_apple_at, 'infinity'::timestamp),
            COALESCE(auth_phone_at, 'infinity'::timestamp)
          ) THEN 'auth_login_email'
          WHEN auth_google_at IS NOT NULL AND auth_google_at = LEAST(
            COALESCE(auth_signup_email_at, 'infinity'::timestamp),
            COALESCE(auth_login_email_at, 'infinity'::timestamp),
            COALESCE(auth_google_at, 'infinity'::timestamp),
            COALESCE(auth_apple_at, 'infinity'::timestamp),
            COALESCE(auth_phone_at, 'infinity'::timestamp)
          ) THEN 'auth_google'
          WHEN auth_apple_at IS NOT NULL AND auth_apple_at = LEAST(
            COALESCE(auth_signup_email_at, 'infinity'::timestamp),
            COALESCE(auth_login_email_at, 'infinity'::timestamp),
            COALESCE(auth_google_at, 'infinity'::timestamp),
            COALESCE(auth_apple_at, 'infinity'::timestamp),
            COALESCE(auth_phone_at, 'infinity'::timestamp)
          ) THEN 'auth_apple'
          WHEN auth_phone_at IS NOT NULL AND auth_phone_at = LEAST(
            COALESCE(auth_signup_email_at, 'infinity'::timestamp),
            COALESCE(auth_login_email_at, 'infinity'::timestamp),
            COALESCE(auth_google_at, 'infinity'::timestamp),
            COALESCE(auth_apple_at, 'infinity'::timestamp),
            COALESCE(auth_phone_at, 'infinity'::timestamp)
          ) THEN 'auth_phone'
          ELSE NULL
        END AS auth_node,
        NULLIF(
          LEAST(
            COALESCE(profile_save_at, 'infinity'::timestamp),
            COALESCE(profile_details_at, 'infinity'::timestamp)
          ),
          'infinity'::timestamp
        ) AS profile_time,
        personalization_at,
        deep_link_at
      FROM actors
    ),
    post_auth_events AS (
      SELECT
        n.actor_id,
        MIN(ue.created_at) FILTER (
          WHERE ue.user_event_name = ANY($5)
            AND n.auth_time IS NOT NULL
            AND ue.created_at >= n.auth_time
        ) AS event_click_at,
        MIN(ue.created_at) FILTER (
          WHERE ue.user_event_name = ANY($6)
            AND n.auth_time IS NOT NULL
            AND ue.created_at >= n.auth_time
        ) AS ticket_click_at,
        MIN(ue.created_at) FILTER (
          WHERE ue.user_event_name = ANY($7)
            AND n.auth_time IS NOT NULL
            AND ue.created_at >= n.auth_time
            AND COALESCE(ue.user_event_props->>'is_on_wishlist', 'false') = 'true'
        ) AS wishlist_add_at,
        MIN(ue.created_at) FILTER (
          WHERE ue.user_event_name = ANY($8)
            AND n.auth_time IS NOT NULL
            AND ue.created_at >= n.auth_time
        ) AS calendar_add_at,
        MIN(ue.created_at) FILTER (
          WHERE ue.user_event_name = ANY($9)
            AND n.auth_time IS NOT NULL
            AND ue.created_at >= n.auth_time
        ) AS organizer_follow_at
      FROM normalized n
      LEFT JOIN public.user_events ue
        ON COALESCE(ue.auth_user_id::text, ue.device_id) = n.actor_id
       AND ue.created_at::date BETWEEN $1 AND $2
       AND ue.user_event_name = ANY($10)
      GROUP BY n.actor_id
    ),
    enriched AS (
      SELECT
        n.*,
        p.event_click_at,
        p.ticket_click_at,
        p.wishlist_add_at,
        p.calendar_add_at,
        p.organizer_follow_at
      FROM normalized n
      LEFT JOIN post_auth_events p ON p.actor_id = n.actor_id
    ),
    start_links AS (
      SELECT
        CASE WHEN deep_link_at IS NOT NULL THEN 'start_deeplink' ELSE 'start_organic' END AS source,
        welcome_node AS target,
        COUNT(*)::int AS value
      FROM enriched
      WHERE welcome_node IS NOT NULL
      GROUP BY source, welcome_node
    ),
    start_auth AS (
      SELECT
        CASE WHEN deep_link_at IS NOT NULL THEN 'start_deeplink' ELSE 'start_organic' END AS source,
        auth_node AS target,
        COUNT(*)::int AS value
      FROM enriched
      WHERE welcome_node IS NULL
        AND auth_node IS NOT NULL
      GROUP BY source, auth_node
    ),
    welcome_auth AS (
      SELECT welcome_node AS source, auth_node AS target, COUNT(*)::int AS value
      FROM enriched
      WHERE welcome_node IS NOT NULL
        AND auth_node IS NOT NULL
        AND auth_time >= welcome_time
      GROUP BY welcome_node, auth_node
    ),
    auth_profile AS (
      SELECT auth_node AS source, 'profile_saved' AS target, COUNT(*)::int AS value
      FROM enriched
      WHERE auth_node IS NOT NULL
        AND profile_time IS NOT NULL
        AND profile_time >= auth_time
      GROUP BY auth_node
    ),
    profile_personalization AS (
      SELECT 'profile_saved' AS source, 'personalization_confirmed' AS target, COUNT(*)::int AS value
      FROM enriched
      WHERE profile_time IS NOT NULL
        AND personalization_at IS NOT NULL
        AND personalization_at >= profile_time
    ),
    personalization_event_click AS (
      SELECT 'personalization_confirmed' AS source, 'event_clicked' AS target, COUNT(*)::int AS value
      FROM enriched
      WHERE personalization_at IS NOT NULL
        AND event_click_at IS NOT NULL
        AND event_click_at >= personalization_at
    ),
    event_ticket_click AS (
      SELECT 'event_clicked' AS source, 'ticket_clicked' AS target, COUNT(*)::int AS value
      FROM enriched
      WHERE event_click_at IS NOT NULL
        AND ticket_click_at IS NOT NULL
        AND ticket_click_at >= event_click_at
    ),
    event_wishlist AS (
      SELECT 'event_clicked' AS source, 'wishlist_added' AS target, COUNT(*)::int AS value
      FROM enriched
      WHERE event_click_at IS NOT NULL
        AND wishlist_add_at IS NOT NULL
        AND wishlist_add_at >= event_click_at
    ),
    event_calendar AS (
      SELECT 'event_clicked' AS source, 'calendar_added' AS target, COUNT(*)::int AS value
      FROM enriched
      WHERE event_click_at IS NOT NULL
        AND calendar_add_at IS NOT NULL
        AND calendar_add_at >= event_click_at
    ),
    event_follow AS (
      SELECT 'event_clicked' AS source, 'organizer_followed' AS target, COUNT(*)::int AS value
      FROM enriched
      WHERE event_click_at IS NOT NULL
        AND organizer_follow_at IS NOT NULL
        AND organizer_follow_at >= event_click_at
    ),
    links AS (
      SELECT * FROM start_links
      UNION ALL
      SELECT * FROM start_auth
      UNION ALL
      SELECT * FROM welcome_auth
      UNION ALL
      SELECT * FROM auth_profile
      UNION ALL
      SELECT * FROM profile_personalization
      UNION ALL
      SELECT * FROM personalization_event_click
      UNION ALL
      SELECT * FROM event_ticket_click
      UNION ALL
      SELECT * FROM event_wishlist
      UNION ALL
      SELECT * FROM event_calendar
      UNION ALL
      SELECT * FROM event_follow
    )
    SELECT
      json_build_object(
        'start_organic', COUNT(*) FILTER (WHERE deep_link_at IS NULL),
        'start_deeplink', COUNT(*) FILTER (WHERE deep_link_at IS NOT NULL),
        'welcome_register', COUNT(*) FILTER (WHERE welcome_node = 'welcome_register'),
        'welcome_skipped', COUNT(*) FILTER (WHERE welcome_node = 'welcome_skipped'),
        'auth_signup_email', COUNT(*) FILTER (WHERE auth_node = 'auth_signup_email'),
        'auth_login_email', COUNT(*) FILTER (WHERE auth_node = 'auth_login_email'),
        'auth_google', COUNT(*) FILTER (WHERE auth_node = 'auth_google'),
        'auth_apple', COUNT(*) FILTER (WHERE auth_node = 'auth_apple'),
        'auth_phone', COUNT(*) FILTER (WHERE auth_node = 'auth_phone'),
        'profile_saved', COUNT(*) FILTER (WHERE profile_time IS NOT NULL),
        'personalization_confirmed', COUNT(*) FILTER (WHERE personalization_at IS NOT NULL),
        'event_clicked', COUNT(*) FILTER (WHERE event_click_at IS NOT NULL),
        'ticket_clicked', COUNT(*) FILTER (WHERE ticket_click_at IS NOT NULL),
        'wishlist_added', COUNT(*) FILTER (WHERE wishlist_add_at IS NOT NULL),
        'calendar_added', COUNT(*) FILTER (WHERE calendar_add_at IS NOT NULL),
        'organizer_followed', COUNT(*) FILTER (WHERE organizer_follow_at IS NOT NULL)
      ) AS node_counts,
      COALESCE(
        (SELECT json_agg(json_build_object('source', source, 'target', target, 'value', value)) FROM links),
        '[]'::json
      ) AS links
    FROM enriched;
  `;

  const result = await pgQuery(sql, [
    startDate,
    endDate,
    ONBOARDING_FLOW_EVENT_NAMES,
    ONBOARDING_DEEP_LINK_EVENTS,
    ONBOARDING_EVENT_CLICK_EVENTS,
    ONBOARDING_TICKET_CLICK_EVENTS,
    ONBOARDING_WISHLIST_EVENTS,
    ONBOARDING_CALENDAR_EVENTS,
    ONBOARDING_ORGANIZER_FOLLOW_EVENTS,
    ONBOARDING_ACTION_EVENT_NAMES,
  ]);
  const row = result.rows[0] ?? {};
  const nodeCounts =
    typeof row.node_counts === "string" ? JSON.parse(row.node_counts) : (row.node_counts ?? {});
  const linksRaw =
    typeof row.links === "string" ? JSON.parse(row.links) : (row.links ?? []);

  const nodes = [
    { id: "start_organic", label: "Start (organic)", stage: 0 },
    { id: "start_deeplink", label: "Start (deep link)", stage: 0 },
    { id: "welcome_register", label: "Register clicked", stage: 1 },
    { id: "welcome_skipped", label: "Welcome skipped", stage: 1 },
    { id: "auth_signup_email", label: "Signup with email", stage: 2 },
    { id: "auth_login_email", label: "Login with email", stage: 2 },
    { id: "auth_google", label: "Login with Google", stage: 2 },
    { id: "auth_apple", label: "Login with Apple", stage: 2 },
    { id: "auth_phone", label: "Login with phone", stage: 2 },
    { id: "profile_saved", label: "Profile details saved", stage: 3 },
    { id: "personalization_confirmed", label: "Personalization confirmed", stage: 4 },
    { id: "event_clicked", label: "Event clicked", stage: 5 },
    { id: "ticket_clicked", label: "Ticket clicked", stage: 6 },
    { id: "wishlist_added", label: "First wishlist added", stage: 6 },
    { id: "calendar_added", label: "Calendar added", stage: 6 },
    { id: "organizer_followed", label: "Organizer followed", stage: 6 },
  ].map((node) => ({
    ...node,
    value: Number(nodeCounts?.[node.id] ?? 0),
  }));

  const links = Array.isArray(linksRaw)
    ? linksRaw
        .map((link: any) => ({
          source: String(link.source),
          target: String(link.target),
          value: Number(link.value ?? 0),
        }))
        .filter((link: any) => Number.isFinite(link.value) && link.value > 0)
    : [];

  return { nodes, links };
};

const fetchDeepLinkSankey = async (startDate: string, endDate: string) => {
  const sql = `
    WITH actors AS (
      SELECT
        COALESCE(auth_user_id::text, device_id) AS actor_id,
        MIN(created_at) FILTER (WHERE user_event_name = '${escapeSqlLiteral(UE.DeepLinkDetected)}')
          AS detected_at,
        MIN(created_at) FILTER (WHERE user_event_name = '${escapeSqlLiteral(UE.DeepLinkAttributed)}')
          AS attributed_at,
        MIN(created_at) FILTER (
          WHERE user_event_name = ANY($3)
            AND NULLIF(COALESCE(user_event_props->>'deep_link_id', user_event_props->>'deepLinkId'), '') IS NOT NULL
        ) AS event_click_at,
        MIN(created_at) FILTER (
          WHERE user_event_name = ANY($4)
            AND NULLIF(COALESCE(user_event_props->>'deep_link_id', user_event_props->>'deepLinkId'), '') IS NOT NULL
        ) AS ticket_click_at
      FROM public.user_events
      WHERE created_at::date BETWEEN $1 AND $2
        AND user_event_name = ANY($5)
        AND (auth_user_id IS NOT NULL OR device_id IS NOT NULL)
      GROUP BY 1
    ),
    links AS (
      SELECT 'detected' AS source, 'attributed' AS target, COUNT(*)::int AS value
      FROM actors
      WHERE detected_at IS NOT NULL
        AND attributed_at IS NOT NULL
        AND attributed_at >= detected_at
      UNION ALL
      SELECT 'attributed' AS source, 'event_clicked' AS target, COUNT(*)::int AS value
      FROM actors
      WHERE attributed_at IS NOT NULL
        AND event_click_at IS NOT NULL
        AND event_click_at >= attributed_at
      UNION ALL
      SELECT 'event_clicked' AS source, 'ticket_clicked' AS target, COUNT(*)::int AS value
      FROM actors
      WHERE event_click_at IS NOT NULL
        AND ticket_click_at IS NOT NULL
        AND ticket_click_at >= event_click_at
    )
    SELECT
      json_build_object(
        'detected', COUNT(*) FILTER (WHERE detected_at IS NOT NULL),
        'attributed', COUNT(*) FILTER (WHERE attributed_at IS NOT NULL),
        'event_clicked', COUNT(*) FILTER (WHERE event_click_at IS NOT NULL),
        'ticket_clicked', COUNT(*) FILTER (WHERE ticket_click_at IS NOT NULL)
      ) AS node_counts,
      COALESCE(
        (SELECT json_agg(json_build_object('source', source, 'target', target, 'value', value)) FROM links),
        '[]'::json
      ) AS links
    FROM actors;
  `;

  const result = await pgQuery(sql, [
    startDate,
    endDate,
    EVENT_CLICK_EVENTS,
    TICKET_CLICK_EVENTS,
    DEEP_LINK_FLOW_EVENT_NAMES,
  ]);

  const row = result.rows[0] ?? {};
  const nodeCounts =
    typeof row.node_counts === "string" ? JSON.parse(row.node_counts) : (row.node_counts ?? {});
  const linksRaw =
    typeof row.links === "string" ? JSON.parse(row.links) : (row.links ?? []);

  const nodes = [
    { id: "detected", label: "Detected", stage: 0 },
    { id: "attributed", label: "Attributed", stage: 1 },
    { id: "event_clicked", label: "Event clicked", stage: 2 },
    { id: "ticket_clicked", label: "Ticket clicked", stage: 3 },
  ].map((node) => ({
    ...node,
    value: Number(nodeCounts?.[node.id] ?? 0),
  }));

  const links = Array.isArray(linksRaw)
    ? linksRaw
        .map((link: any) => ({
          source: String(link.source),
          target: String(link.target),
          value: Number(link.value ?? 0),
        }))
        .filter((link: any) => Number.isFinite(link.value) && link.value > 0)
    : [];

  return { nodes, links };
};

const fetchModalAnalytics = async (startDate: string, endDate: string) => {
  if (!MODAL_EVENT_ROWS.length || !MODAL_EVENT_VALUES) {
    return {
      nodes: [],
      links: [],
      summary: [],
    };
  }

  const modalEventCte = `
    WITH modal_events (modal_id, modal_label, event_name, action_id, action_label, action_role) AS (
      VALUES ${MODAL_EVENT_VALUES}
    ),
    base AS (
      SELECT COALESCE(auth_user_id::text, device_id) AS actor_id,
             user_event_name,
             created_at
      FROM public.user_events
      WHERE created_at::date BETWEEN $1 AND $2
        AND user_event_name = ANY($3)
        AND (auth_user_id IS NOT NULL OR device_id IS NOT NULL)
    ),
    joined AS (
      SELECT base.actor_id,
             base.created_at,
             me.modal_id,
             me.modal_label,
             me.action_id,
             me.action_label,
             me.action_role
      FROM base
      JOIN modal_events me ON me.event_name = base.user_event_name
    )
  `;

  const shownResult = await pgQuery(
    `
      ${modalEventCte}
      SELECT modal_id,
             modal_label,
             COUNT(DISTINCT actor_id)::int AS unique_users
      FROM joined
      GROUP BY modal_id, modal_label;
    `,
    [startDate, endDate, MODAL_EVENT_NAMES]
  );

  const actionResult = await pgQuery(
    `
      ${modalEventCte}
      SELECT modal_id,
             modal_label,
             action_id,
             action_label,
             action_role,
             COUNT(DISTINCT actor_id)::int AS unique_users
      FROM joined
      WHERE action_role <> 'shown'
      GROUP BY modal_id, modal_label, action_id, action_label, action_role;
    `,
    [startDate, endDate, MODAL_EVENT_NAMES]
  );

  const roleResult = await pgQuery(
    `
      ${modalEventCte}
      SELECT modal_id,
             action_role,
             COUNT(DISTINCT actor_id)::int AS unique_users
      FROM joined
      WHERE action_role <> 'shown'
      GROUP BY modal_id, action_role;
    `,
    [startDate, endDate, MODAL_EVENT_NAMES]
  );

  const dayResult = await pgQuery(
    `
      ${modalEventCte}
      SELECT modal_id,
             COUNT(DISTINCT created_at::date)::int AS day_count
      FROM joined
      GROUP BY modal_id;
    `,
    [startDate, endDate, MODAL_EVENT_NAMES]
  );

  const firstSeenResult = await pgQuery(
    `
      ${modalEventCte}
      SELECT modal_id,
             MIN(created_at) AS first_seen
      FROM joined
      GROUP BY modal_id;
    `,
    [startDate, endDate, MODAL_EVENT_NAMES]
  );

  const shownByModal = new Map<string, { label: string; uniqueUsers: number }>();
  shownResult.rows.forEach((row: any) => {
    shownByModal.set(String(row.modal_id), {
      label: String(row.modal_label ?? ""),
      uniqueUsers: Number(row.unique_users ?? 0),
    });
  });

  const actionCountMap = new Map<string, number>();
  actionResult.rows.forEach((row: any) => {
    const key = `${row.modal_id}:${row.action_id}`;
    actionCountMap.set(key, Number(row.unique_users ?? 0));
  });

  const roleCountMap = new Map<string, { primary: number; skip: number }>();
  roleResult.rows.forEach((row: any) => {
    const key = String(row.modal_id);
    const entry = roleCountMap.get(key) ?? { primary: 0, skip: 0 };
    if (row.action_role === "primary") {
      entry.primary = Number(row.unique_users ?? 0);
    }
    if (row.action_role === "skip") {
      entry.skip = Number(row.unique_users ?? 0);
    }
    roleCountMap.set(key, entry);
  });

  const dayCountMap = new Map<string, number>();
  dayResult.rows.forEach((row: any) => {
    dayCountMap.set(String(row.modal_id), Number(row.day_count ?? 0));
  });

  const firstSeenMap = new Map<string, Date>();
  firstSeenResult.rows.forEach((row: any) => {
    if (!row.first_seen) return;
    const seenDate = row.first_seen instanceof Date ? row.first_seen : new Date(String(row.first_seen));
    if (!Number.isNaN(seenDate.getTime())) {
      firstSeenMap.set(String(row.modal_id), seenDate);
    }
  });

  const formatModalLabel = (modalId: string, label: string) => {
    const dayCount = dayCountMap.get(modalId) ?? 0;
    if (dayCount <= 0) return label;
    return `${label} (+${dayCount}d)`;
  };

  const orderedModals = MODAL_ANALYTICS_DEFINITIONS.map((modal, index) => ({
    id: modal.id,
    index,
    dayCount: dayCountMap.get(modal.id) ?? 0,
    firstSeen: firstSeenMap.get(modal.id) ?? null,
  })).sort((a, b) => {
    if (a.dayCount !== b.dayCount) {
      return b.dayCount - a.dayCount;
    }
    if (a.firstSeen && b.firstSeen) {
      return a.firstSeen.getTime() - b.firstSeen.getTime();
    }
    if (a.firstSeen) return -1;
    if (b.firstSeen) return 1;
    return a.index - b.index;
  });
  const modalOrderMap = new Map<string, number>();
  orderedModals.forEach((item, idx) => {
    modalOrderMap.set(item.id, idx);
  });

  const nodes: Array<{ id: string; label: string; stage: number; value: number; order?: number }> = [];
  const links: Array<{ source: string; target: string; value: number }> = [];

  MODAL_ANALYTICS_DEFINITIONS.forEach((modal) => {
    const shownCount = shownByModal.get(modal.id)?.uniqueUsers ?? 0;
    const modalNodeId = `modal:${modal.id}`;
    const modalOrder = modalOrderMap.get(modal.id) ?? 0;
    nodes.push({
      id: modalNodeId,
      label: formatModalLabel(modal.id, modal.label),
      stage: 0,
      value: shownCount,
      order: modalOrder,
    });

    modal.actions.forEach((action, actionIndex) => {
      const actionCount = actionCountMap.get(`${modal.id}:${action.id}`) ?? 0;
      const actionNodeId = `action:${modal.id}:${action.id}`;
      nodes.push({
        id: actionNodeId,
        label: `${modal.label} · ${action.label}`,
        stage: 1,
        value: actionCount,
        order: modalOrder * 10 + actionIndex,
      });
      if (actionCount > 0) {
        links.push({
          source: modalNodeId,
          target: actionNodeId,
          value: actionCount,
        });
      }
    });
  });

  const summary = MODAL_ANALYTICS_DEFINITIONS.map((modal) => {
    const shownCount = shownByModal.get(modal.id)?.uniqueUsers ?? 0;
    const roleCounts = roleCountMap.get(modal.id) ?? { primary: 0, skip: 0 };
    const hasSkipEvents = modal.actions.some((action) => action.role === "skip");
    const skipCount = hasSkipEvents ? roleCounts.skip : Math.max(0, shownCount - roleCounts.primary);
    const dayCount = dayCountMap.get(modal.id) ?? 0;
    return {
      modalId: modal.id,
      modalLabel: formatModalLabel(modal.id, modal.label),
      primaryUsers: roleCounts.primary,
      skipUsers: skipCount,
      shownUsers: shownCount,
      dayCount,
    };
  })
    .filter((row) => row.shownUsers > 0 || row.primaryUsers > 0 || row.skipUsers > 0)
    .sort((a, b) => b.dayCount - a.dayCount || b.primaryUsers - a.primaryUsers || b.skipUsers - a.skipUsers)
    .map(({ dayCount, ...row }) => row);

  return { nodes, links, summary };
};

router.get("/index", authenticateAdminRequest, async (_req: AuthenticatedRequest, res: Response) => {
  if (replayToLargeInstance(_req, res)) {
    return;
  }
  res.json({ dashboards: DASHBOARDS, charts: CHARTS });
});

router.get("/users-over-time", authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
  if (replayToLargeInstance(req, res)) {
    return;
  }
  try {
    const { startDate, endDate, error } = getDateRange(req.query);
    if (error) {
      res.status(400).json({ error });
      return;
    }

    const { rows, totalUsers, rangeDays } = await fetchUsersOverTime(startDate, endDate);
    res.json({
      meta: {
        startDate,
        endDate,
        generatedAt: new Date().toISOString(),
        totalUsers,
        rangeDays,
      },
      rows,
    } satisfies UsersOverTimeResponse);
  } catch (err: any) {
    console.error("[analytics] users-over-time failed", err);
    res.status(500).json({ error: err?.message || "Failed to load analytics." });
  }
});

router.get("/charts/:chartId", authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
  if (replayToLargeInstance(req, res)) {
    return;
  }
  try {
    const chartId = String(req.params.chartId || "");
    const chart = CHARTS.find((item) => item.id === chartId);
    if (!chart) {
      res.status(404).json({ error: "Unknown chart." });
      return;
    }

    const { startDate, endDate, error } = getDateRange(req.query);
    if (error) {
      res.status(400).json({ error });
      return;
    }

    const meta = buildChartMeta(startDate, endDate);
    const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : DEFAULT_TOP_LIMIT;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : DEFAULT_TOP_LIMIT;

    if (chartId === "users_over_time" || chartId === "new_users_per_day") {
      const { rows, totalUsers, rangeDays } = await fetchUsersOverTime(startDate, endDate);
      res.json({
        chartId,
        meta: { ...meta, totalUsers, rangeDays },
        data: rows,
      });
      return;
    }

    if (chartId === "weekly_active_users") {
      const weeklyActiveResult = await pgQuery(
        `
          WITH weeks AS (
            SELECT generate_series(
              date_trunc('week', $1::date),
              date_trunc('week', $2::date),
              interval '1 week'
            )::date AS week_start
          ),
          counts AS (
            SELECT date_trunc('week', created_at AT TIME ZONE 'UTC')::date AS week_start,
                   COUNT(DISTINCT COALESCE(auth_user_id::text, device_id))::int AS active_users
            FROM public.user_events
            WHERE created_at::date BETWEEN $1 AND $2
            GROUP BY 1
          )
          SELECT weeks.week_start,
                 COALESCE(counts.active_users, 0)::int AS active_users
          FROM weeks
          LEFT JOIN counts ON counts.week_start = weeks.week_start
          ORDER BY weeks.week_start;
        `,
        [startDate, endDate]
      );
      const rows = weeklyActiveResult.rows.map((row: any) => ({
        weekStart: row.week_start instanceof Date ? formatDate(row.week_start) : String(row.week_start),
        activeUsers: Number(row.active_users ?? 0),
      }));
      res.json({ chartId, meta, data: rows });
      return;
    }

    if (chartId === "unique_devices_over_time") {
      const devicesResult = await pgQuery(
        `
          WITH bounds AS (
            SELECT $1::date AS start_date, $2::date AS end_date
          ),
          days AS (
            SELECT generate_series(
              (SELECT start_date FROM bounds),
              (SELECT end_date FROM bounds),
              interval '1 day'
            )::date AS day
          ),
          daily AS (
            SELECT created_at::date AS day,
                   COUNT(DISTINCT device_id) FILTER (WHERE auth_user_id IS NOT NULL)::int AS with_user,
                   COUNT(DISTINCT device_id) FILTER (WHERE auth_user_id IS NULL)::int AS without_user
            FROM public.user_events
            WHERE created_at::date BETWEEN $1 AND $2
              AND device_id IS NOT NULL
            GROUP BY 1
          )
          SELECT days.day,
                 COALESCE(daily.with_user, 0)::int AS with_user,
                 COALESCE(daily.without_user, 0)::int AS without_user
          FROM days
          LEFT JOIN daily ON daily.day = days.day
          ORDER BY days.day;
        `,
        [startDate, endDate]
      );
      const rows = devicesResult.rows.map((row: any) => ({
        date: row.day instanceof Date ? formatDate(row.day) : String(row.day),
        withUser: Number(row.with_user ?? 0),
        withoutUser: Number(row.without_user ?? 0),
      }));
      res.json({ chartId, meta, data: rows });
      return;
    }

    if (chartId === "anonymous_devices_summary") {
      const devicesResult = await pgQuery(
        `
          WITH device_stats AS (
            SELECT device_id,
                   MIN(created_at) AS first_seen,
                   MAX(created_at) AS last_seen,
                   COUNT(*) FILTER (WHERE auth_user_id IS NOT NULL)::int AS signed_events
            FROM public.user_events
            WHERE created_at::date BETWEEN $1 AND $2
              AND device_id IS NOT NULL
            GROUP BY device_id
          ),
          anonymous AS (
            SELECT device_id,
                   EXTRACT(EPOCH FROM (last_seen - first_seen)) AS duration_seconds
            FROM device_stats
            WHERE signed_events = 0
          )
          SELECT COUNT(*)::int AS device_count,
                 COALESCE(AVG(duration_seconds), 0)::float AS avg_seconds,
                 COALESCE(
                   PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_seconds),
                   0
                 )::float AS median_seconds,
                 COALESCE(MAX(duration_seconds), 0)::float AS max_seconds
          FROM anonymous;
        `,
        [startDate, endDate]
      );
      const row = devicesResult.rows[0] ?? {};
      res.json({
        chartId,
        meta,
        data: {
          deviceCount: Number(row.device_count ?? 0),
          avgSeconds: Number(row.avg_seconds ?? 0),
          medianSeconds: Number(row.median_seconds ?? 0),
          maxSeconds: Number(row.max_seconds ?? 0),
        },
      });
      return;
    }

    if (chartId === "most_active_users") {
      const result = await pgQuery(
        `
          SELECT ue.auth_user_id,
                 u.name,
                 COUNT(*)::int AS actions
          FROM public.user_events ue
          LEFT JOIN public.users u ON u.user_id = ue.auth_user_id
          WHERE ue.created_at::date BETWEEN $1 AND $2
            AND ue.auth_user_id IS NOT NULL
          GROUP BY ue.auth_user_id, u.name
          ORDER BY actions DESC
          LIMIT $3;
        `,
        [startDate, endDate, limit]
      );
      const rows = result.rows.map((row: any) => ({
        authUserId: row.auth_user_id,
        name: row.name,
        actions: Number(row.actions ?? 0),
      }));
      res.json({ chartId, meta, data: rows });
      return;
    }

    if (chartId === "users_most_ticket_clicks") {
      const result = await pgQuery(
        `
          SELECT ue.auth_user_id,
                 u.name,
                 COUNT(*)::int AS ticket_clicks
          FROM public.user_events ue
          LEFT JOIN public.users u ON u.user_id = ue.auth_user_id
          WHERE ue.created_at::date BETWEEN $1 AND $2
            AND ue.auth_user_id IS NOT NULL
            AND ue.user_event_name = ANY($3)
          GROUP BY ue.auth_user_id, u.name
          ORDER BY ticket_clicks DESC
          LIMIT $4;
        `,
        [startDate, endDate, TICKET_CLICK_EVENTS, limit]
      );
      const rows = result.rows.map((row: any) => ({
        authUserId: row.auth_user_id,
        name: row.name,
        ticketClicks: Number(row.ticket_clicks ?? 0),
      }));
      res.json({ chartId, meta, data: rows });
      return;
    }

    if (chartId === "top_user_events") {
      const result = await pgQuery(
        `
          SELECT user_event_name,
                 COUNT(*)::int AS total,
                 COUNT(DISTINCT COALESCE(auth_user_id::text, device_id))::int AS unique_users
          FROM public.user_events
          WHERE created_at::date BETWEEN $1 AND $2
            AND user_event_name = ANY($3)
          GROUP BY user_event_name
          ORDER BY unique_users DESC
          LIMIT $4;
        `,
        [startDate, endDate, FEATURE_USAGE_EVENTS, limit]
      );
      const rows = result.rows.map((row: any) => ({
        eventName: row.user_event_name,
        total: Number(row.total ?? 0),
        uniqueUsers: Number(row.unique_users ?? 0),
      }));
      res.json({ chartId, meta, data: rows });
      return;
    }

    if (chartId === "auth_method_breakdown") {
      const result = await pgQuery(
        `
          SELECT user_event_name,
                 COUNT(*)::int AS total,
                 COUNT(DISTINCT COALESCE(auth_user_id::text, device_id))::int AS unique_users
          FROM public.user_events
          WHERE created_at::date BETWEEN $1 AND $2
            AND user_event_name = ANY($3)
          GROUP BY user_event_name;
        `,
        [startDate, endDate, AUTH_EVENT_NAMES]
      );

      const counts = new Map<string, { total: number; uniqueUsers: number }>();
      result.rows.forEach((row: any) => {
        counts.set(row.user_event_name, {
          total: Number(row.total ?? 0),
          uniqueUsers: Number(row.unique_users ?? 0),
        });
      });

      const rows = AUTH_METHOD_GROUPS.map((group) => {
        const totals = group.events.reduce(
          (acc, eventName) => {
            const entry = counts.get(eventName) ?? { total: 0, uniqueUsers: 0 };
            acc.total += entry.total;
            acc.uniqueUsers += entry.uniqueUsers;
            return acc;
          },
          { total: 0, uniqueUsers: 0 }
        );
        return {
          id: group.id,
          label: group.label,
          total: totals.total,
          uniqueUsers: totals.uniqueUsers,
        };
      }).sort((a, b) => b.uniqueUsers - a.uniqueUsers || b.total - a.total);

      res.json({ chartId, meta, data: rows });
      return;
    }

    if (chartId === "user_profiles") {
      const profileResult = await pgQuery(
        `
          SELECT ue.auth_user_id,
                 u.name,
                 u.created_at AS user_created_at,
                 COUNT(*)::int AS total_events,
                 COUNT(DISTINCT ue.user_event_name)::int AS unique_events,
                 MAX(ue.created_at) AS last_event_at
          FROM public.user_events ue
          LEFT JOIN public.users u ON u.user_id = ue.auth_user_id
          WHERE ue.created_at::date BETWEEN $1 AND $2
            AND ue.auth_user_id IS NOT NULL
            AND ue.user_event_name = ANY($3)
          GROUP BY ue.auth_user_id, u.name, u.created_at
          ORDER BY unique_events DESC, total_events DESC
          LIMIT $4;
        `,
        [startDate, endDate, FEATURE_USAGE_EVENTS, limit]
      );

      const userIds = profileResult.rows.map((row: any) => row.auth_user_id).filter(Boolean);
      if (!userIds.length) {
        res.json({ chartId, meta, data: [] });
        return;
      }

      const eventCountsResult = await pgQuery(
        `
          SELECT ue.auth_user_id,
                 ue.user_event_name,
                 COUNT(*)::int AS total
          FROM public.user_events ue
          WHERE ue.created_at::date BETWEEN $1 AND $2
            AND ue.auth_user_id = ANY($3)
            AND ue.user_event_name = ANY($4)
          GROUP BY ue.auth_user_id, ue.user_event_name
          ORDER BY ue.auth_user_id, total DESC;
        `,
        [startDate, endDate, userIds, FEATURE_USAGE_EVENTS]
      );

      const likedResult = await pgQuery(
        `
          SELECT ew.user_id,
                 e.id AS event_id,
                 e.name AS event_name,
                 e.start_date AS event_start_date,
                 e.organizer_id,
                 o.name AS organizer_name,
                 MAX(ew.created_at) AS saved_at
          FROM public.event_wishlist ew
          JOIN public.events e ON e.id = ew.event_id
          LEFT JOIN public.organizers o ON o.id = e.organizer_id
          WHERE ew.created_at::date BETWEEN $1 AND $2
            AND ew.user_id = ANY($3)
          GROUP BY ew.user_id, e.id, e.name, e.start_date, e.organizer_id, o.name
          ORDER BY ew.user_id, saved_at DESC;
        `,
        [startDate, endDate, userIds]
      );

      const activeDaysResult = await pgQuery(
        `
          SELECT ue.auth_user_id,
                 ue.created_at::date AS active_date,
                 COUNT(*)::int AS total_events
          FROM public.user_events ue
          WHERE ue.created_at::date BETWEEN $1 AND $2
            AND ue.auth_user_id = ANY($3)
            AND ue.user_event_name = ANY($4)
          GROUP BY ue.auth_user_id, active_date
          ORDER BY ue.auth_user_id, active_date;
        `,
        [startDate, endDate, userIds, FEATURE_USAGE_EVENTS]
      );

      const lastActiveResult = await pgQuery(
        `
          SELECT ue.auth_user_id,
                 MAX(ue.created_at) AS last_active_at
          FROM public.user_events ue
          WHERE ue.auth_user_id = ANY($1)
          GROUP BY ue.auth_user_id;
        `,
        [userIds]
      );

      const ticketClicksResult = await pgQuery(
        `
          WITH ticket_actions AS (
            SELECT ue.auth_user_id,
                   CASE
                     WHEN (COALESCE(ue.user_event_props->>'event_id', ue.user_event_props->>'eventId')) ~ '^[0-9]+$'
                       THEN (COALESCE(ue.user_event_props->>'event_id', ue.user_event_props->>'eventId'))::int
                     ELSE NULL
                   END AS event_id,
                   ue.created_at
            FROM public.user_events ue
            WHERE ue.created_at::date BETWEEN $1 AND $2
              AND ue.auth_user_id = ANY($3)
              AND ue.user_event_name = ANY($4)
          )
          SELECT ta.auth_user_id,
                 e.id AS event_id,
                 e.name AS event_name,
                 e.start_date AS event_start_date,
                 e.organizer_id,
                 o.name AS organizer_name,
                 COUNT(*)::int AS total_clicks,
                 MAX(ta.created_at) AS last_clicked_at
          FROM ticket_actions ta
          JOIN public.events e ON e.id = ta.event_id
          LEFT JOIN public.organizers o ON o.id = e.organizer_id
          GROUP BY ta.auth_user_id, e.id, e.name, e.start_date, e.organizer_id, o.name
          ORDER BY ta.auth_user_id, total_clicks DESC, last_clicked_at DESC;
        `,
        [startDate, endDate, userIds, TICKET_CLICK_EVENTS]
      );

      const communityClicksResult = await pgQuery(
        `
          WITH community_actions AS (
            SELECT ue.auth_user_id,
                   CASE
                     WHEN (ue.user_event_props->>'community_id') ~* '^[0-9a-f-]{36}$'
                       THEN (ue.user_event_props->>'community_id')::uuid
                     ELSE NULL
                   END AS community_id,
                   ue.created_at
            FROM public.user_events ue
            WHERE ue.created_at::date BETWEEN $1 AND $2
              AND ue.auth_user_id = ANY($3)
              AND ue.user_event_name = ANY($4)
          )
          SELECT ca.auth_user_id,
                 c.id AS community_id,
                 c.name AS community_name,
                 COUNT(*)::int AS total_clicks,
                 MAX(ca.created_at) AS last_clicked_at
          FROM community_actions ca
          LEFT JOIN public.communities c ON c.id = ca.community_id
          WHERE ca.community_id IS NOT NULL
          GROUP BY ca.auth_user_id, c.id, c.name
          ORDER BY ca.auth_user_id, total_clicks DESC, last_clicked_at DESC;
        `,
        [startDate, endDate, userIds, COMMUNITY_CLICK_EVENTS]
      );

      const eventCountsByUser = new Map<string, Array<{ eventName: string; total: number }>>();
      eventCountsResult.rows.forEach((row: any) => {
        const key = String(row.auth_user_id);
        const list = eventCountsByUser.get(key) ?? [];
        list.push({ eventName: row.user_event_name, total: Number(row.total ?? 0) });
        eventCountsByUser.set(key, list);
      });

      const likedByUser = new Map<
        string,
        Array<{
          eventId: number;
          eventName: string | null;
          eventDate: string | null;
          organizerId: number | null;
          organizerName: string | null;
          savedAt: string | null;
        }>
      >();
      likedResult.rows.forEach((row: any) => {
        const key = String(row.user_id);
        const list = likedByUser.get(key) ?? [];
        list.push({
          eventId: row.event_id,
          eventName: row.event_name,
          eventDate: formatDateValue(row.event_start_date),
          organizerId: row.organizer_id,
          organizerName: row.organizer_name,
          savedAt: formatDateValue(row.saved_at),
        });
        likedByUser.set(key, list);
      });

      const activeDaysByUser = new Map<string, Array<{ date: string; totalEvents: number }>>();
      const activeDaysCountByUser = new Map<string, number>();
      const mostActiveDayByUser = new Map<string, { date: string; totalEvents: number }>();
      activeDaysResult.rows.forEach((row: any) => {
        const key = String(row.auth_user_id);
        const dateValue = formatDateValue(row.active_date);
        if (!dateValue) return;
        const entry = { date: dateValue, totalEvents: Number(row.total_events ?? 0) };
        const list = activeDaysByUser.get(key) ?? [];
        list.push(entry);
        activeDaysByUser.set(key, list);
        activeDaysCountByUser.set(key, (activeDaysCountByUser.get(key) ?? 0) + 1);
        const current = mostActiveDayByUser.get(key);
        if (!current || entry.totalEvents > current.totalEvents) {
          mostActiveDayByUser.set(key, entry);
        }
      });

      const lastActiveByUser = new Map<string, string | null>();
      lastActiveResult.rows.forEach((row: any) => {
        lastActiveByUser.set(String(row.auth_user_id), formatDateValue(row.last_active_at));
      });

      const ticketClicksByUser = new Map<
        string,
        Array<{
          eventId: number;
          eventName: string | null;
          eventDate: string | null;
          organizerId: number | null;
          organizerName: string | null;
          totalClicks: number;
          lastClickedAt: string | null;
        }>
      >();
      ticketClicksResult.rows.forEach((row: any) => {
        const key = String(row.auth_user_id);
        const list = ticketClicksByUser.get(key) ?? [];
        list.push({
          eventId: row.event_id,
          eventName: row.event_name,
          eventDate: formatDateValue(row.event_start_date),
          organizerId: row.organizer_id,
          organizerName: row.organizer_name,
          totalClicks: Number(row.total_clicks ?? 0),
          lastClickedAt: formatDateValue(row.last_clicked_at),
        });
        ticketClicksByUser.set(key, list);
      });

      const communityClicksByUser = new Map<
        string,
        Array<{
          communityId: string | null;
          communityName: string | null;
          totalClicks: number;
          lastClickedAt: string | null;
        }>
      >();
      communityClicksResult.rows.forEach((row: any) => {
        const key = String(row.auth_user_id);
        const list = communityClicksByUser.get(key) ?? [];
        list.push({
          communityId: row.community_id ?? null,
          communityName: row.community_name ?? null,
          totalClicks: Number(row.total_clicks ?? 0),
          lastClickedAt: formatDateValue(row.last_clicked_at),
        });
        communityClicksByUser.set(key, list);
      });

      const rows = profileResult.rows.map((row: any) => ({
        authUserId: row.auth_user_id,
        name: row.name,
        createdAt: formatDateValue(row.user_created_at),
        totalEvents: Number(row.total_events ?? 0),
        uniqueEvents: Number(row.unique_events ?? 0),
        lastEventAt: formatDateValue(row.last_event_at),
        lastActiveAt: lastActiveByUser.get(String(row.auth_user_id)) ?? null,
        activeDays: activeDaysByUser.get(String(row.auth_user_id)) ?? [],
        activeDaysCount: activeDaysCountByUser.get(String(row.auth_user_id)) ?? 0,
        mostActiveDay: mostActiveDayByUser.get(String(row.auth_user_id))?.date ?? null,
        mostActiveDayCount: mostActiveDayByUser.get(String(row.auth_user_id))?.totalEvents ?? null,
        eventCounts: eventCountsByUser.get(String(row.auth_user_id)) ?? [],
        likedEvents: likedByUser.get(String(row.auth_user_id)) ?? [],
        ticketClicks: ticketClicksByUser.get(String(row.auth_user_id)) ?? [],
        communityClicks: communityClicksByUser.get(String(row.auth_user_id)) ?? [],
      }));

      res.json({ chartId, meta, data: rows });
      return;
    }

    if (chartId === "top_events_clicks") {
      const result = await pgQuery(
        `
          WITH event_actions AS (
            SELECT
              CASE
                WHEN (COALESCE(user_event_props->>'event_id', user_event_props->>'eventId')) ~ '^[0-9]+$'
                  THEN (COALESCE(user_event_props->>'event_id', user_event_props->>'eventId'))::int
                ELSE NULL
              END AS event_id,
              COALESCE(auth_user_id::text, device_id) AS actor_id
            FROM public.user_events
            WHERE created_at::date BETWEEN $1 AND $2
              AND user_event_name = ANY($3)
          )
          SELECT e.id AS event_id,
                 e.name AS event_name,
                 e.start_date AS event_start_date,
                 e.organizer_id,
                 o.name AS organizer_name,
                 COUNT(*)::int AS total_clicks,
                 COUNT(DISTINCT actor_id)::int AS unique_users
          FROM event_actions ea
          JOIN public.events e ON e.id = ea.event_id
          LEFT JOIN public.organizers o ON o.id = e.organizer_id
          GROUP BY e.id, e.name, e.start_date, e.organizer_id, o.name
          ORDER BY unique_users DESC, total_clicks DESC
          LIMIT $4;
        `,
        [startDate, endDate, EVENT_CLICK_EVENTS, limit]
      );
      const rows = result.rows.map((row: any) => ({
        eventId: row.event_id,
        eventName: row.event_name,
        eventDate: formatDateValue(row.event_start_date),
        organizerId: row.organizer_id,
        organizerName: row.organizer_name,
        totalClicks: Number(row.total_clicks ?? 0),
        uniqueUsers: Number(row.unique_users ?? 0),
      }));
      res.json({ chartId, meta, data: rows });
      return;
    }

    if (chartId === "event_clicks_per_organizer") {
      const result = await pgQuery(
        `
          WITH event_actions AS (
            SELECT
              CASE
                WHEN (COALESCE(user_event_props->>'event_id', user_event_props->>'eventId')) ~ '^[0-9]+$'
                  THEN (COALESCE(user_event_props->>'event_id', user_event_props->>'eventId'))::int
                ELSE NULL
              END AS event_id,
              COALESCE(auth_user_id::text, device_id) AS actor_id
            FROM public.user_events
            WHERE created_at::date BETWEEN $1 AND $2
              AND user_event_name = ANY($3)
          )
          SELECT e.organizer_id,
                 o.name AS organizer_name,
                 COUNT(*)::int AS total_clicks,
                 COUNT(DISTINCT actor_id)::int AS unique_users
          FROM event_actions ea
          JOIN public.events e ON e.id = ea.event_id
          LEFT JOIN public.organizers o ON o.id = e.organizer_id
          GROUP BY e.organizer_id, o.name
          ORDER BY unique_users DESC, total_clicks DESC
          LIMIT $4;
        `,
        [startDate, endDate, EVENT_CLICK_EVENTS, limit]
      );
      const rows = result.rows.map((row: any) => ({
        organizerId: row.organizer_id,
        organizerName: row.organizer_name,
        totalClicks: Number(row.total_clicks ?? 0),
        uniqueUsers: Number(row.unique_users ?? 0),
      }));
      res.json({ chartId, meta, data: rows });
      return;
    }

    if (chartId === "ticket_clicks_per_event") {
      const result = await pgQuery(
        `
          WITH ticket_actions AS (
            SELECT
              CASE
                WHEN (COALESCE(user_event_props->>'event_id', user_event_props->>'eventId')) ~ '^[0-9]+$'
                  THEN (COALESCE(user_event_props->>'event_id', user_event_props->>'eventId'))::int
                ELSE NULL
              END AS event_id,
              COALESCE(auth_user_id::text, device_id) AS actor_id
            FROM public.user_events
            WHERE created_at::date BETWEEN $1 AND $2
              AND user_event_name = ANY($3)
          )
          SELECT e.id AS event_id,
                 e.name AS event_name,
                 e.start_date AS event_start_date,
                 e.organizer_id,
                 o.name AS organizer_name,
                 COUNT(*)::int AS ticket_clicks,
                 COUNT(DISTINCT actor_id)::int AS unique_users
          FROM ticket_actions ta
          JOIN public.events e ON e.id = ta.event_id
          LEFT JOIN public.organizers o ON o.id = e.organizer_id
          GROUP BY e.id, e.name, e.start_date, e.organizer_id, o.name
          ORDER BY unique_users DESC, ticket_clicks DESC
          LIMIT $4;
        `,
        [startDate, endDate, TICKET_CLICK_EVENTS, limit]
      );
      const rows = result.rows.map((row: any) => ({
        eventId: row.event_id,
        eventName: row.event_name,
        eventDate: formatDateValue(row.event_start_date),
        organizerId: row.organizer_id,
        organizerName: row.organizer_name,
        ticketClicks: Number(row.ticket_clicks ?? 0),
        uniqueUsers: Number(row.unique_users ?? 0),
      }));
      res.json({ chartId, meta, data: rows });
      return;
    }

    if (chartId === "ticket_clicks_per_organizer") {
      const result = await pgQuery(
        `
          WITH ticket_actions AS (
            SELECT
              CASE
                WHEN (COALESCE(user_event_props->>'event_id', user_event_props->>'eventId')) ~ '^[0-9]+$'
                  THEN (COALESCE(user_event_props->>'event_id', user_event_props->>'eventId'))::int
                ELSE NULL
              END AS event_id,
              COALESCE(auth_user_id::text, device_id) AS actor_id
            FROM public.user_events
            WHERE created_at::date BETWEEN $1 AND $2
              AND user_event_name = ANY($3)
          )
          SELECT e.organizer_id,
                 o.name AS organizer_name,
                 COUNT(*)::int AS ticket_clicks,
                 COUNT(DISTINCT actor_id)::int AS unique_users
          FROM ticket_actions ta
          JOIN public.events e ON e.id = ta.event_id
          LEFT JOIN public.organizers o ON o.id = e.organizer_id
          GROUP BY e.organizer_id, o.name
          ORDER BY unique_users DESC, ticket_clicks DESC
          LIMIT $4;
        `,
        [startDate, endDate, TICKET_CLICK_EVENTS, limit]
      );
      const rows = result.rows.map((row: any) => ({
        organizerId: row.organizer_id,
        organizerName: row.organizer_name,
        ticketClicks: Number(row.ticket_clicks ?? 0),
        uniqueUsers: Number(row.unique_users ?? 0),
      }));
      res.json({ chartId, meta, data: rows });
      return;
    }

    if (chartId === "deep_link_sankey") {
      const data = await fetchDeepLinkSankey(startDate, endDate);
      res.json({ chartId, meta, data });
      return;
    }

    if (chartId === "branch_stats") {
      const branchStats = await loadBranchStats();
      const rows = (branchStats.rows ?? []).slice();
      rows.sort(
        (a, b) =>
          (b.stats?.overallClicks ?? 0) -
          (a.stats?.overallClicks ?? 0)
      );
      res.json({
        chartId,
        meta,
        data: {
          meta: branchStats.meta,
          rows,
        },
      });
      return;
    }

    if (chartId === "deep_link_performance") {
      const result = await pgQuery(
        `
          WITH base AS (
            SELECT
              NULLIF(COALESCE(user_event_props->>'deep_link_id', user_event_props->>'deepLinkId'), '') AS deep_link_id,
              user_event_name,
              COALESCE(auth_user_id::text, device_id) AS actor_id
            FROM public.user_events
            WHERE created_at::date BETWEEN $1 AND $2
          ),
          metrics AS (
            SELECT
              deep_link_id,
              COUNT(*) FILTER (WHERE user_event_name = 'deep_link_detected')::int AS detected_count,
              COUNT(DISTINCT actor_id) FILTER (WHERE user_event_name = 'deep_link_detected')::int AS detected_users,
              COUNT(*) FILTER (WHERE user_event_name = 'deep_link_attributed')::int AS attributed_count,
              COUNT(DISTINCT actor_id) FILTER (WHERE user_event_name = 'deep_link_attributed')::int AS attributed_users,
              COUNT(*) FILTER (WHERE user_event_name = ANY($3))::int AS event_clicks,
              COUNT(DISTINCT actor_id) FILTER (WHERE user_event_name = ANY($3))::int AS event_click_users,
              COUNT(*) FILTER (WHERE user_event_name = ANY($4))::int AS ticket_clicks,
              COUNT(DISTINCT actor_id) FILTER (WHERE user_event_name = ANY($4))::int AS ticket_click_users
            FROM base
            WHERE deep_link_id IS NOT NULL
            GROUP BY deep_link_id
          )
          SELECT
            dl.id,
            dl.slug,
            dl.type,
            dl.campaign,
            dl.channel,
            dl.organizer_id,
            o.name AS organizer_name,
            dl.featured_event_id,
            e.name AS featured_event_name,
            e.start_date AS featured_event_start_date,
            dl.featured_promo_code_id,
            pc.promo_code AS featured_promo_code,
            COALESCE(metrics.detected_users, 0)::int AS detected_users,
            COALESCE(metrics.attributed_users, 0)::int AS attributed_users,
            COALESCE(metrics.attributed_count, 0)::int AS attributed_count,
            COALESCE(metrics.event_click_users, 0)::int AS event_click_users,
            COALESCE(metrics.ticket_click_users, 0)::int AS ticket_click_users,
            COALESCE(metrics.ticket_clicks, 0)::int AS ticket_clicks
          FROM public.deep_links dl
          LEFT JOIN metrics ON metrics.deep_link_id = dl.id::text
          LEFT JOIN public.organizers o ON o.id = dl.organizer_id
          LEFT JOIN public.events e ON e.id = dl.featured_event_id
          LEFT JOIN public.promo_codes pc ON pc.id = dl.featured_promo_code_id
          ORDER BY event_click_users DESC NULLS LAST,
                   ticket_click_users DESC NULLS LAST,
                   attributed_users DESC NULLS LAST,
                   dl.created_at DESC;
        `,
        [startDate, endDate, EVENT_CLICK_EVENTS, TICKET_CLICK_EVENTS]
      );

      const rows = result.rows.map((row: any) => ({
        id: row.id,
        slug: row.slug,
        type: row.type,
        campaign: row.campaign,
        channel: row.channel,
        organizerId: row.organizer_id,
        organizerName: row.organizer_name,
        featuredEventId: row.featured_event_id,
        featuredEventName: row.featured_event_name,
        featuredEventDate: formatDateValue(row.featured_event_start_date),
        featuredPromoCodeId: row.featured_promo_code_id,
        featuredPromoCode: row.featured_promo_code,
        detectedUsers: Number(row.detected_users ?? 0),
        attributedUsers: Number(row.attributed_users ?? 0),
        attributedCount: Number(row.attributed_count ?? 0),
        eventClickUsers: Number(row.event_click_users ?? 0),
        ticketClickUsers: Number(row.ticket_click_users ?? 0),
        ticketClicks: Number(row.ticket_clicks ?? 0),
      }));

      res.json({ chartId, meta, data: rows });
      return;
    }

    if (chartId === "modal_sankey") {
      const modalData = await fetchModalAnalytics(startDate, endDate);
      res.json({
        chartId,
        meta,
        data: {
          nodes: modalData.nodes,
          links: modalData.links,
        },
      });
      return;
    }

    if (chartId === "modal_click_summary") {
      const modalData = await fetchModalAnalytics(startDate, endDate);
      const rows = modalData.summary.map((row) => ({
        modalId: row.modalId,
        modalLabel: row.modalLabel,
        primaryUsers: row.primaryUsers,
        skipUsers: row.skipUsers,
      }));
      res.json({ chartId, meta, data: rows });
      return;
    }

    if (chartId === "onboarding_sankey") {
      const data = await fetchOnboardingSankey(startDate, endDate);
      res.json({ chartId, meta, data });
      return;
    }

    if (chartId === "skip_to_signup") {
      const skipResult = await pgQuery(
        `
          WITH skip_actors AS (
            SELECT
              COALESCE(auth_user_id::text, device_id) AS actor_id,
              MIN(created_at) AS welcome_skipped_at
            FROM public.user_events
            WHERE created_at::date BETWEEN $1 AND $2
              AND user_event_name = '${escapeSqlLiteral(ONBOARDING_EVENTS.welcomeSkipped)}'
              AND (auth_user_id IS NOT NULL OR device_id IS NOT NULL)
            GROUP BY 1
          ),
          auth_events AS (
            SELECT
              sa.actor_id,
              MIN(ue.created_at) AS auth_time
            FROM skip_actors sa
            LEFT JOIN public.user_events ue
              ON COALESCE(ue.auth_user_id::text, ue.device_id) = sa.actor_id
             AND ue.user_event_name = ANY($3)
             AND ue.created_at >= sa.welcome_skipped_at
            GROUP BY sa.actor_id
          ),
          durations AS (
            SELECT
              sa.actor_id,
              sa.welcome_skipped_at,
              ae.auth_time,
              CASE
                WHEN ae.auth_time IS NOT NULL AND ae.auth_time >= sa.welcome_skipped_at
                  THEN EXTRACT(EPOCH FROM (ae.auth_time - sa.welcome_skipped_at))
                ELSE NULL
              END AS duration_seconds
            FROM skip_actors sa
            LEFT JOIN auth_events ae ON ae.actor_id = sa.actor_id
          )
          SELECT COUNT(*) FILTER (WHERE duration_seconds IS NOT NULL)::int AS user_count,
                 COALESCE(AVG(duration_seconds), 0)::float AS avg_seconds,
                 COALESCE(
                   PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_seconds),
                   0
                 )::float AS median_seconds,
                 COUNT(*) FILTER (WHERE duration_seconds IS NULL)::int AS never_signed_up
          FROM durations;
        `,
        [startDate, endDate, AUTH_EVENT_NAMES]
      );
      const row = skipResult.rows[0] ?? {};
      res.json({
        chartId,
        meta,
        data: {
          userCount: Number(row.user_count ?? 0),
          avgSeconds: Number(row.avg_seconds ?? 0),
          medianSeconds: Number(row.median_seconds ?? 0),
          neverSignedUp: Number(row.never_signed_up ?? 0),
        },
      });
      return;
    }

    if (chartId === "feature_usage_table") {
      const totalsResult = await pgQuery(
        `
          SELECT user_event_name,
                 COUNT(*)::int AS total,
                 COUNT(DISTINCT COALESCE(auth_user_id::text, device_id))::int AS unique_users
          FROM public.user_events
          WHERE created_at::date BETWEEN $1 AND $2
            AND user_event_name = ANY($3)
          GROUP BY user_event_name
          ORDER BY unique_users DESC;
        `,
        [startDate, endDate, FEATURE_USAGE_EVENTS]
      );

      const categoriesResult = await pgQuery(
        `
          SELECT CASE user_event_name
                   ${FEATURE_CATEGORY_CASES}
                   ELSE 'Other'
                 END AS category,
                 COUNT(*)::int AS total,
                 COUNT(DISTINCT COALESCE(auth_user_id::text, device_id))::int AS unique_users
          FROM public.user_events
          WHERE created_at::date BETWEEN $1 AND $2
            AND user_event_name = ANY($3)
          GROUP BY category
          ORDER BY unique_users DESC;
        `,
        [startDate, endDate, FEATURE_USAGE_EVENTS]
      );

      const stateEventNames = FEATURE_STATE_EVENTS.map((entry) => entry.event);
      let stateRows: Array<{ eventName: string; stateValue: string | null; total: number; uniqueUsers: number }> = [];
      if (stateEventNames.length) {
        const cases = FEATURE_STATE_EVENTS.map((entry) => {
          const key = entry.state?.key || "";
          return `WHEN '${escapeSqlLiteral(entry.event)}' THEN user_event_props->>'${escapeSqlLiteral(key)}'`;
        }).join(" ");
        const stateResult = await pgQuery(
          `
            SELECT user_event_name,
                   CASE user_event_name
                     ${cases}
                     ELSE NULL
                   END AS state_value,
                   COUNT(*)::int AS total,
                   COUNT(DISTINCT COALESCE(auth_user_id::text, device_id))::int AS unique_users
            FROM public.user_events
            WHERE created_at::date BETWEEN $1 AND $2
              AND user_event_name = ANY($3)
            GROUP BY user_event_name, state_value
            ORDER BY unique_users DESC;
          `,
          [startDate, endDate, stateEventNames]
        );
        stateRows = stateResult.rows.map((row: any) => ({
          eventName: row.user_event_name,
          stateValue: row.state_value ?? null,
          total: Number(row.total ?? 0),
          uniqueUsers: Number(row.unique_users ?? 0),
        }));
      }

      const events = totalsResult.rows.map((row: any) => ({
        eventName: row.user_event_name,
        total: Number(row.total ?? 0),
        uniqueUsers: Number(row.unique_users ?? 0),
      }));

      const categories = categoriesResult.rows.map((row: any) => ({
        category: row.category,
        total: Number(row.total ?? 0),
        uniqueUsers: Number(row.unique_users ?? 0),
      }));

      res.json({
        chartId,
        meta,
        data: {
          categories,
          events,
          states: stateRows,
        },
      });
      return;
    }

    res.status(404).json({ error: "Chart not implemented." });
  } catch (err: any) {
    console.error("[analytics] chart failed", err);
    res.status(500).json({ error: err?.message || "Failed to load chart." });
  }
});

export default router;
