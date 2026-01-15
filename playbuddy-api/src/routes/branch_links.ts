import { Router, type Response } from "express";
import { authenticateAdminRequest, type AuthenticatedRequest } from "../middleware/authenticateRequest.js";
import asyncHandler from "./helpers/asyncHandler.js";
import { createBranchLink, buildWeeklyPicksFields } from "../branch/createBranchLink.js";

type WeeklyPicksBranchLinkResponse = {
  link: string | null;
  title: string;
  socialTitle: string;
  socialDescription: string;
  weekLabel: string;
  logs?: string[];
};

type WeeklyPicksBranchLinkStatus = {
  status: "idle" | "running" | "completed" | "failed";
  startedAt?: string | null;
  finishedAt?: string | null;
  error?: string | null;
  logs?: string[];
  link?: string | null;
  title?: string;
  socialTitle?: string;
  socialDescription?: string;
  weekLabel?: string;
};

const router = Router();
const DEFAULT_WEEK_OFFSET = 1;
const MAX_WEEKLY_PICKS_LOGS = 500;

const weeklyPicksStatus: WeeklyPicksBranchLinkStatus = {
  status: "idle",
  logs: [],
  error: null,
};

const parseOptionalNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseOptionalBoolean = (value: unknown) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(lowered)) return true;
    if (["false", "0", "no", "n"].includes(lowered)) return false;
  }
  return undefined;
};

const parseOptionalString = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const nowIso = () => new Date().toISOString();

const resetWeeklyPicksStatus = (payload: {
  title: string;
  socialTitle: string;
  socialDescription: string;
  weekLabel: string;
}) => {
  weeklyPicksStatus.status = "running";
  weeklyPicksStatus.startedAt = nowIso();
  weeklyPicksStatus.finishedAt = null;
  weeklyPicksStatus.error = null;
  weeklyPicksStatus.logs = [];
  weeklyPicksStatus.link = null;
  weeklyPicksStatus.title = payload.title;
  weeklyPicksStatus.socialTitle = payload.socialTitle;
  weeklyPicksStatus.socialDescription = payload.socialDescription;
  weeklyPicksStatus.weekLabel = payload.weekLabel;
};

const pushWeeklyPicksLog = (line: string) => {
  if (!weeklyPicksStatus.logs) weeklyPicksStatus.logs = [];
  weeklyPicksStatus.logs.push(line);
  if (weeklyPicksStatus.logs.length > MAX_WEEKLY_PICKS_LOGS) {
    weeklyPicksStatus.logs.splice(0, weeklyPicksStatus.logs.length - MAX_WEEKLY_PICKS_LOGS);
  }
};

router.get(
  "/weekly_picks/status",
  authenticateAdminRequest,
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    return res.json(weeklyPicksStatus);
  })
);

router.post(
  "/weekly_picks",
  authenticateAdminRequest,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (weeklyPicksStatus.status === "running") {
      return res.status(409).json({
        error: "Branch quick link creation already running.",
        ...weeklyPicksStatus,
      });
    }
    const logs: string[] = [];
    const body = req.body ?? {};
    const weekOffset = parseOptionalNumber(body.weekOffset);
    const defaults = buildWeeklyPicksFields(
      Number.isFinite(weekOffset) ? (weekOffset as number) : DEFAULT_WEEK_OFFSET
    );

    const title = parseOptionalString(body.title) ?? defaults.title;
    const socialTitle = parseOptionalString(body.socialTitle) ?? defaults.socialTitle;
    const socialDescription =
      parseOptionalString(body.socialDescription) ?? defaults.socialDescription;
    const headless = parseOptionalBoolean(body.headless);

    resetWeeklyPicksStatus({
      title,
      socialTitle,
      socialDescription,
      weekLabel: defaults.weekLabel,
    });

    try {
      const link = await createBranchLink({
        title,
        socialTitle,
        socialDescription,
        headless: headless ?? true,
        logSink: (line) => {
          logs.push(line);
          pushWeeklyPicksLog(line);
        },
      });

      weeklyPicksStatus.status = "completed";
      weeklyPicksStatus.finishedAt = nowIso();
      weeklyPicksStatus.error = null;
      weeklyPicksStatus.link = link || null;

      const payload: WeeklyPicksBranchLinkResponse = {
        link: link || null,
        title,
        socialTitle,
        socialDescription,
        weekLabel: defaults.weekLabel,
        logs: logs.length ? logs : undefined,
      };

      return res.json(payload);
    } catch (err) {
      console.error("[branch_links] Failed to create Branch link", err);
      const message = err instanceof Error ? err.message : "Failed to create Branch link";
      weeklyPicksStatus.status = "failed";
      weeklyPicksStatus.finishedAt = nowIso();
      weeklyPicksStatus.error = message;
      return res.status(500).json({
        error: message,
        logs: logs.length ? logs : undefined,
      });
    }
  })
);

export default router;
