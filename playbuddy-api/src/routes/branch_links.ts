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
};

const router = Router();
const DEFAULT_WEEK_OFFSET = 1;

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

router.post(
  "/weekly_picks",
  authenticateAdminRequest,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

    const link = await createBranchLink({
      title,
      socialTitle,
      socialDescription,
      headless: headless ?? true,
    });

    const payload: WeeklyPicksBranchLinkResponse = {
      link: link || null,
      title,
      socialTitle,
      socialDescription,
      weekLabel: defaults.weekLabel,
    };

    return res.json(payload);
  })
);

export default router;
