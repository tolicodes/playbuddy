import * as fs from "node:fs/promises";
import * as path from "node:path";
import OpenAI from "openai";
import pLimit from "p-limit";
import * as dotenv from "dotenv";
dotenv.config();

// ---------- Types ----------
type HeuristicRow = {
    username: string;
    name?: string;
    label: string;
    score: number;
    reasons: string[];
    details?: {
        playParty: number;
        workshop: number;
        attendee: number;
        publicFigure: number;
        hasTicketLink: boolean;
        linkHubCount: number;
        rsvpWordCount: number;
    };
};

type CorpusRow = { username: string; collapsedText: string };

type ReclassifiedRow = {
    username: string;
    name?: string;
    oldLabel: string;
    newLabel: string;
    oldScore: number;
    newScore: number;
    oldReasons: string[];
    newReasons: string[];
    deltas: { scoreDelta: number };
};

// ---------- Args ----------
const argv = Object.fromEntries(
    process.argv.slice(2).map((a) => {
        const m = a.match(/^--([^=]+)(?:=(.*))?$/);
        if (!m) return [a, true];
        const k = m[1];
        const v = m[2] ?? true;
        return [k, /^\d+$/.test(String(v)) ? Number(v) : v];
    })
);

const DEBUG = Boolean(argv.debug);
const dbg = (...args: any[]) => { if (DEBUG) console.log("[DBG]", ...args); };

const MODEL_RECLASS = "gpt-4o-mini";
const MODEL_RULES = "gpt-5"; // better reasoning for summarization

const BATCH_SIZE = typeof argv.batch === "number" ? (argv.batch as number) : 2;
const LIMIT = typeof argv.limit === "number" ? (argv.limit as number) : 4;

const MAX_ITEM_CHARS = 2000;
const MAX_PROMPT_CHARS = 120_000;
const TIMEOUT_MS = 90_000;

// ---------- Paths ----------
const OUT_DIR = "./output";
const HEURISTICS_FILE = path.join(OUT_DIR, "heuristics_default.json");
const CORPUS_FILE = path.join(OUT_DIR, "llm_corpus.json");
const OUT_RECLASSIFIED = path.join(OUT_DIR, "reclassified.json");
const OUT_RULES_RAW = path.join(OUT_DIR, "rule_suggestions_raw.json");
const OUT_RULES_SUM = path.join(OUT_DIR, "new_rules.txt");

// ---------- Helpers ----------
function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)); }
function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}
function trimText(s: string, max: number) {
    if (s.length <= max) return s;
    const head = Math.floor(max * 0.6);
    const tail = max - head;
    return s.slice(0, head) + "\n...\n" + s.slice(-tail);
}

// ---------- Prompts ----------
const SYSTEM_PROMPT_RECLASS = `
You are refining heuristics for classifying social accounts.
Return JSON ONLY as an object: { "items": [ ... ] }

Each element must be:
{
  "username": "...",
  "new_label": "Facilitator | Play Party | Facilitator / Play Party | Attendee | Non-Kink (filtered)",
  "new_score": 12.34,
  "new_reasons": ["...", "..."],
  "rule_suggestions": ["...", "..."]
}
`.trim();

const SYSTEM_PROMPT_RULES = `
You are summarizing rule suggestions for classifying kinky vs non-kink accounts.

Input: a large JSON array of raw rule strings.
Task:
- Deduplicate semantically similar items.
- Merge variations into one clean rule.
- Remove brand/org/venue names, @handles, URLs, and proper nouns.
- Output as plain text, one rule per line.

Return plain text only.
`.trim();

function buildPayload(items: (HeuristicRow & { collapsedText: string })[]) {
    const minimal = items.map((it) => ({
        username: it.username,
        name: it.name ?? "",
        old_label: it.label,
        old_score: it.score,
        old_reasons: (it.reasons ?? []).slice(0, 4),
        cats: it.details ? {
            pp: it.details.playParty,
            ws: it.details.workshop,
            at: it.details.attendee,
            pf: it.details.publicFigure,
            t: it.details.hasTicketLink,
            lh: it.details.linkHubCount,
            rv: it.details.rsvpWordCount,
        } : undefined,
        text: trimText(it.collapsedText ?? "", MAX_ITEM_CHARS),
    }));
    return JSON.stringify({ items: minimal });
}

// ---------- LLM Calls ----------
async function callLLM(client: OpenAI, items: (HeuristicRow & { collapsedText: string })[]) {
    const userContent = buildPayload(items);
    if (userContent.length > MAX_PROMPT_CHARS && items.length > 1) {
        const mid = Math.floor(items.length / 2);
        const left = await callLLM(client, items.slice(0, mid));
        const right = await callLLM(client, items.slice(mid));
        return [...left, ...right];
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const resp = await client.chat.completions.create({
            model: MODEL_RECLASS,
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: SYSTEM_PROMPT_RECLASS },
                { role: "user", content: userContent }
            ],
        });
        clearTimeout(timer);

        const content = resp.choices[0]?.message?.content ?? "";
        dbg("LLM raw content:", content);

        const parsed = JSON.parse(content);
        return Array.isArray(parsed.items) ? parsed.items as any[] : [];
    } catch (e: any) {
        clearTimeout(timer);
        console.error("❌ LLM error:", e?.message || e);
        return [];
    }
}

async function callSummarizer(client: OpenAI, rules: string[]) {
    const text = JSON.stringify(rules);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const resp = await client.chat.completions.create({
            model: MODEL_RULES,
            messages: [
                { role: "system", content: SYSTEM_PROMPT_RULES },
                { role: "user", content: text }
            ],
        });
        clearTimeout(timer);
        return resp.choices[0]?.message?.content ?? "";
    } catch (e: any) {
        clearTimeout(timer);
        console.error("❌ Summarizer error:", e?.message || e);
        return "";
    }
}

// ---------- Main ----------
(async function main() {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    if (!client.apiKey) {
        console.error("Missing OPENAI_API_KEY");
        process.exit(1);
    }

    const [heurRaw, corpusRaw] = await Promise.all([
        fs.readFile(HEURISTICS_FILE, "utf8"),
        fs.readFile(CORPUS_FILE, "utf8"),
    ]);
    const heur: HeuristicRow[] = JSON.parse(heurRaw);
    const corpus: CorpusRow[] = JSON.parse(corpusRaw);

    const textByUser = new Map<string, string>(
        corpus.map((r) => [r.username.toLowerCase(), r.collapsedText || ""])
    );

    const top = heur
        .slice()
        .sort((a, b) => b.score - a.score)
        .slice(100, LIMIT)
        .map((r) => ({ ...r, collapsedText: textByUser.get(r.username.toLowerCase()) || "" }));

    const batches = chunk(top, BATCH_SIZE);
    const limit = pLimit(2);

    const allResults: any[] = [];
    for (let i = 0; i < batches.length; i++) {
        dbg(`Batch ${i + 1}/${batches.length}, size=${batches[i].length}`);
        const res = await limit(() => callLLM(client, batches[i]));
        allResults.push(...res);
    }

    const byUser = new Map(top.map((r) => [r.username.toLowerCase(), r]));
    const reclassified: ReclassifiedRow[] = [];
    const rulePool: string[] = [];

    for (const r of allResults) {
        const u = String(r.username || "").toLowerCase();
        const base = byUser.get(u);
        if (!base) continue;

        const oldScore = base.score;
        const raw = Number(r.new_score);
        const bounded = Number.isFinite(raw) ? raw : oldScore;
        const newScore = clamp(bounded, oldScore - 4, oldScore + 4);

        reclassified.push({
            username: base.username,
            name: base.name,
            oldLabel: base.label,
            newLabel: String(r.new_label || base.label),
            oldScore,
            newScore,
            oldReasons: base.reasons || [],
            newReasons: Array.isArray(r.new_reasons) ? r.new_reasons.slice(0, 4) : [],
            deltas: { scoreDelta: Number((newScore - oldScore).toFixed(2)) },
        });

        if (Array.isArray(r.rule_suggestions)) {
            for (const s of r.rule_suggestions) if (typeof s === "string") rulePool.push(s);
        }
    }

    await fs.mkdir(OUT_DIR, { recursive: true });
    await fs.writeFile(OUT_RECLASSIFIED, JSON.stringify(reclassified, null, 2), "utf8");
    await fs.writeFile(OUT_RULES_RAW, JSON.stringify(rulePool, null, 2), "utf8");

    console.log("✅ Wrote:", OUT_RECLASSIFIED, "and", OUT_RULES_RAW,
        "| Reclassified:", reclassified.length, "| Raw rules:", rulePool.length);

    // --- Summarization phase ---
    if (rulePool.length > 0) {
        console.log("🔎 Summarizing rules with", MODEL_RULES, "…");
        const summary = await callSummarizer(client, rulePool);
        await fs.writeFile(OUT_RULES_SUM, summary, "utf8");
        console.log("✅ Wrote summarized rules:", OUT_RULES_SUM);
    }
})();
