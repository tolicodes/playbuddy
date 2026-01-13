import { Router, type Response } from "express";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { parse as parseCsv } from "csv-parse/sync";
import { authenticateAdminRequest, type AuthenticatedRequest } from "../middleware/authenticateRequest.js";

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

type BranchStatsResponse = {
  meta: BranchStatsMeta;
  rows: BranchStatsRow[];
};

const router = Router();
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

const BASE_DIR = resolveApiRoot();
const DATA_DIR = path.resolve(BASE_DIR, "data", "branch");
const JSON_PATH = path.resolve(DATA_DIR, "branch_stats.json");
const CSV_PATH = path.resolve(DATA_DIR, "branch_stats.csv");
const SCRIPT_PATH_TS = path.resolve(BASE_DIR, "src/scripts/branch/getBranchStats.ts");
const SCRIPT_PATH_JS = path.resolve(BASE_DIR, "dist/scripts/branch/getBranchStats.js");

const SCRAPE_PROGRESS_PREFIX = "__BRANCH_STATS_PROGRESS__";
const MAX_LOG_LINES = 200;
const DEBUG_ENABLED = !/^(0|false|no)$/i.test(process.env.BRANCH_STATS_DEBUG || "");

type ScriptInfo = {
  path: string;
  runner: "tsx" | "node";
  exists: boolean;
};

const resolveScript = (): ScriptInfo => {
  if (existsSync(SCRIPT_PATH_TS)) return { path: SCRIPT_PATH_TS, runner: "tsx", exists: true };
  if (existsSync(SCRIPT_PATH_JS)) return { path: SCRIPT_PATH_JS, runner: "node", exists: true };
  return { path: SCRIPT_PATH_TS, runner: "tsx", exists: false };
};

const shouldUseChrome = () => /^(1|true|yes)$/i.test(process.env.BRANCH_STATS_USE_CHROME || "");
const shouldOpenDevtools = () => /^(1|true|yes)$/i.test(process.env.BRANCH_STATS_DEVTOOLS || "");
const shouldRunHeadless = () => !/^(0|false|no)$/i.test(process.env.BRANCH_STATS_HEADLESS || "");

type BranchStatsScrapeProgress = {
  processed: number;
  total?: number | null;
};

type BranchStatsScrapeDebug = {
  apiRoot: string;
  dataDir: string;
  scriptPath: string;
  scriptRunner: "tsx" | "node";
  scriptExists: boolean;
  cwd: string;
  nodeVersion: string;
  hasBranchEmail: boolean;
  hasBranchPassword: boolean;
};

type BranchStatsFetchDebug = {
  apiRoot: string;
  dataDir: string;
  jsonPath: string;
  csvPath: string;
  jsonExists: boolean;
  csvExists: boolean;
  cwd: string;
  nodeVersion: string;
};

type BranchStatsScrapeStatus = {
  status: "idle" | "running" | "completed" | "failed";
  startedAt?: string | null;
  finishedAt?: string | null;
  pid?: number | null;
  progress?: BranchStatsScrapeProgress | null;
  lastLog?: string | null;
  logs?: string[];
  error?: string | null;
  command?: string | null;
  debug?: BranchStatsScrapeDebug | null;
};

export type BranchStatsScrapeStartResult = {
  ok: boolean;
  statusCode?: number;
  error?: string | null;
  debug?: BranchStatsScrapeDebug | null;
  state: BranchStatsScrapeStatus;
};

let scrapeState: BranchStatsScrapeStatus = { status: "idle" };
let runningProcess: ChildProcessWithoutNullStreams | null = null;

const toNumber = (value: any) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const normalizeCsvRows = (raw: string): BranchStatsRow[] => {
  const records = parseCsv(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  return records.map((row) => ({
    name: row.name ? String(row.name) : null,
    url: row.url ? String(row.url) : null,
    stats: {
      overallClicks: toNumber(row.overallClicks),
      desktop: {
        linkClicks: toNumber(row.desktop_linkClicks),
        textsSent: toNumber(row.desktop_textsSent),
        iosSms: {
          install: toNumber(row.desktop_iosSms_install),
          reopen: toNumber(row.desktop_iosSms_reopen),
        },
        androidSms: {
          install: toNumber(row.desktop_androidSms_install),
          reopen: toNumber(row.desktop_androidSms_reopen),
        },
      },
      android: {
        linkClicks: toNumber(row.android_linkClicks),
        install: toNumber(row.android_install),
        reopen: toNumber(row.android_reopen),
      },
      ios: {
        linkClicks: toNumber(row.ios_linkClicks),
        install: toNumber(row.ios_install),
        reopen: toNumber(row.ios_reopen),
      },
    },
  }));
};

const buildMeta = (meta: BranchStatsMeta | null | undefined, updatedAt: string, source: string): BranchStatsMeta => {
  return {
    ...meta,
    updatedAt: meta?.updatedAt ?? updatedAt,
    source: meta?.source ?? source,
  };
};

router.get("/", authenticateAdminRequest, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    if (existsSync(JSON_PATH)) {
      const raw = await fs.readFile(JSON_PATH, "utf8");
      const parsed = JSON.parse(raw);
      const rows = Array.isArray(parsed) ? parsed : parsed?.rows || [];
      const meta = buildMeta(parsed?.meta, (await fs.stat(JSON_PATH)).mtime.toISOString(), path.basename(JSON_PATH));
      res.json({ meta, rows } as BranchStatsResponse);
      return;
    }

    if (!existsSync(CSV_PATH)) {
      const debug = buildFetchDebug();
      debugLog("branch stats files missing; creating empty json", debug);
      await fs.mkdir(DATA_DIR, { recursive: true });
      const emptyPayload = { meta: { generatedAt: null, range: null }, rows: [] };
      await fs.writeFile(JSON_PATH, JSON.stringify(emptyPayload, null, 2), "utf8");
      const stat = await fs.stat(JSON_PATH);
      const meta = buildMeta(emptyPayload.meta, stat.mtime.toISOString(), path.basename(JSON_PATH));
      res.json({ meta, rows: [] } as BranchStatsResponse);
      return;
    }

    const rawCsv = await fs.readFile(CSV_PATH, "utf8");
    const rows = normalizeCsvRows(rawCsv);
    const stat = await fs.stat(CSV_PATH);
    const meta = buildMeta({}, stat.mtime.toISOString(), path.basename(CSV_PATH));
    res.json({ meta, rows } as BranchStatsResponse);
  } catch (err: any) {
    const debug = buildFetchDebug();
    debugLog("branch stats read failed", { error: err?.message || String(err), ...debug });
    res.status(500).json({
      error: err?.message || "Failed to load branch stats",
      debug: DEBUG_ENABLED ? debug : null,
    });
  }
});

const pushLogLine = (line: string) => {
  if (!line) return;
  const logs = scrapeState.logs || [];
  logs.push(line);
  while (logs.length > MAX_LOG_LINES) logs.shift();
  scrapeState.logs = logs;
  scrapeState.lastLog = line;
};

const debugLog = (message: string, data?: Record<string, unknown>) => {
  if (!DEBUG_ENABLED) return;
  const suffix = data ? ` ${JSON.stringify(data)}` : "";
  const line = `DEBUG ${message}${suffix}`;
  console.log(`[branch-stats] ${line}`);
  pushLogLine(line);
};

const buildDebug = (script: ScriptInfo): BranchStatsScrapeDebug => ({
  apiRoot: BASE_DIR,
  dataDir: DATA_DIR,
  scriptPath: script.path,
  scriptRunner: script.runner,
  scriptExists: script.exists,
  cwd: process.cwd(),
  nodeVersion: process.version,
  hasBranchEmail: !!process.env.BRANCH_EMAIL,
  hasBranchPassword: !!process.env.BRANCH_PASSWORD,
});

const buildFetchDebug = (): BranchStatsFetchDebug => ({
  apiRoot: BASE_DIR,
  dataDir: DATA_DIR,
  jsonPath: JSON_PATH,
  csvPath: CSV_PATH,
  jsonExists: existsSync(JSON_PATH),
  csvExists: existsSync(CSV_PATH),
  cwd: process.cwd(),
  nodeVersion: process.version,
});

const parseProgressLine = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed.startsWith(SCRAPE_PROGRESS_PREFIX)) return false;
  const payload = trimmed.slice(SCRAPE_PROGRESS_PREFIX.length).trim();
  try {
    const parsed = JSON.parse(payload);
    if (typeof parsed?.processed === "number") {
      scrapeState.progress = {
        processed: parsed.processed,
        total: typeof parsed.total === "number" ? parsed.total : null,
      };
    }
  } catch {
    // ignore malformed progress lines
  }
  return true;
};

const wireProcessOutput = (proc: ChildProcessWithoutNullStreams) => {
  const stdoutBuffer: string[] = [];
  const stderrBuffer: string[] = [];

  const flush = (line: string, isError: boolean) => {
    if (!line) return;
    if (parseProgressLine(line)) return;
    const prefix = isError ? "[stderr] " : "";
    pushLogLine(`${prefix}${line}`);
  };

  const handleChunk = (chunk: Buffer, buffer: string[], isError: boolean) => {
    buffer.push(chunk.toString("utf8"));
    const joined = buffer.join("");
    const lines = joined.split(/\r?\n/);
    buffer.length = 0;
    const tail = lines.pop();
    if (tail) buffer.push(tail);
    lines.forEach((line) => flush(line.trim(), isError));
  };

  proc.stdout.on("data", (chunk: Buffer) => handleChunk(chunk, stdoutBuffer, false));
  proc.stderr.on("data", (chunk: Buffer) => handleChunk(chunk, stderrBuffer, true));
};

export const startBranchStatsScrape = (): BranchStatsScrapeStartResult => {
  const scriptInfo = resolveScript();
  if (scrapeState.status === "running" && runningProcess) {
    debugLog("scrape already running", { pid: scrapeState.pid });
    return { ok: false, statusCode: 409, state: scrapeState };
  }

  if (!process.env.BRANCH_EMAIL || !process.env.BRANCH_PASSWORD) {
    const debug = buildDebug(scriptInfo);
    debugLog("missing Branch credentials", debug);
    return {
      ok: false,
      statusCode: 400,
      error: "Missing BRANCH_EMAIL or BRANCH_PASSWORD environment variables.",
      debug: DEBUG_ENABLED ? debug : null,
      state: scrapeState,
    };
  }

  if (!scriptInfo.exists) {
    const debug = buildDebug(scriptInfo);
    debugLog("script not found", debug);
    return {
      ok: false,
      statusCode: 500,
      error: "Branch stats script not found on the API host.",
      debug: DEBUG_ENABLED ? debug : null,
      state: scrapeState,
    };
  }

  const scriptArgs = [
    scriptInfo.path,
    "--days=14",
    shouldRunHeadless() ? "--headless" : null,
    shouldUseChrome() ? "--use-chrome" : null,
    shouldOpenDevtools() ? "--devtools" : null,
    "--quiet",
    `--out-dir=${DATA_DIR}`,
  ].filter(Boolean) as string[];
  const runner = scriptInfo.runner;
  const spawnCmd = runner === "tsx" ? "npx" : "node";
  const spawnArgs = runner === "tsx" ? ["tsx", ...scriptArgs] : scriptArgs;
  const command = runner === "tsx"
    ? `npx ${["tsx", ...scriptArgs].join(" ")}`
    : `node ${scriptArgs.join(" ")}`;

  scrapeState = {
    status: "running",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    pid: null,
    progress: { processed: 0, total: null },
    lastLog: null,
    logs: [],
    error: null,
    command,
    debug: DEBUG_ENABLED ? buildDebug(scriptInfo) : null,
  };

  debugLog("spawning branch stats", { command, cwd: BASE_DIR, runner });
  runningProcess = spawn(spawnCmd, spawnArgs, {
    cwd: BASE_DIR,
    env: { ...process.env },
  });

  scrapeState.pid = runningProcess.pid ?? null;
  debugLog("spawned process", { pid: scrapeState.pid });
  wireProcessOutput(runningProcess);

  runningProcess.on("exit", (code, signal) => {
    const finishedAt = new Date().toISOString();
    debugLog("process exit", { code, signal });
    if (code === 0) {
      scrapeState = {
        ...scrapeState,
        status: "completed",
        finishedAt,
        error: null,
      };
    } else {
      const reason = code !== null ? `Exited with code ${code}` : `Exited with signal ${signal ?? "unknown"}`;
      scrapeState = {
        ...scrapeState,
        status: "failed",
        finishedAt,
        error: reason,
      };
      pushLogLine(reason);
    }
    runningProcess = null;
  });

  runningProcess.on("error", (err) => {
    const finishedAt = new Date().toISOString();
    debugLog("process error", { message: err instanceof Error ? err.message : String(err) });
    scrapeState = {
      ...scrapeState,
      status: "failed",
      finishedAt,
      error: err instanceof Error ? err.message : "Failed to start process",
    };
    pushLogLine(scrapeState.error || "Process error");
    runningProcess = null;
  });

  return { ok: true, state: scrapeState };
};

router.post("/scrape", authenticateAdminRequest, async (_req: AuthenticatedRequest, res: Response) => {
  const result = startBranchStatsScrape();
  if (!result.ok) {
    if (result.statusCode === 409) {
      res.status(409).json(result.state);
      return;
    }
    res.status(result.statusCode ?? 500).json({
      error: result.error || "Failed to start branch stats scrape.",
      debug: result.debug ?? null,
    });
    return;
  }

  res.json(result.state);
});

router.get("/scrape/status", authenticateAdminRequest, (_req: AuthenticatedRequest, res: Response) => {
  res.json(scrapeState);
});

export default router;
