// scripts/doSchedule.ts
// Full rewrite w/ CSV/TSV + plain-text ION parser, header canonicalization, Fuse fuzzy merge, rich debugging

import fs from "fs";
import { parse as parseCsv } from "csv-parse/sync";
import { DateTime } from "luxon";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import Fuse from "fuse.js";

/** ---------- Types ---------- */
type OutputItem = {
    startDate: string;   // ISO
    endDate: string;     // keep user's exact casing request
    name: string;
    location: string;
    organizers: string[];
    description?: string;
};
type AnyRow = Record<string, string | undefined>;

type DescEntry = {
    key: string;          // normalized title
    rawTitle: string;     // original title text
    normalized: string;   // normalized for Fuse
    description: string;
    organizers: string[];
};

/** ---------- Logger ---------- */
const log = {
    info: (...a: any[]) => console.log(...a),
    dbg: (enabled: boolean, ...a: any[]) => { if (enabled) console.log(...a); },
    warn: (...a: any[]) => console.warn(...a),
};

/** ---------- Utils ---------- */

const WEEKDAYS = new Set(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);

// "26th" -> 26
function parseOrdinalDay(s: string | undefined): number | null {
    if (!s) return null;
    const m = s.trim().match(/^(\d{1,2})(st|nd|rd|th)$/i);
    return m ? parseInt(m[1], 10) : null;
}

// "8:30 to 10:00 am", "10:30 am to 12:00 pm", "12:30 am to 2:00 am"
function parseTimeRange(s: string): { startLabel: string; endLabel: string } | null {
    if (!s) return null;
    const clean = s.replace(/\s+/g, " ").trim().toLowerCase();
    const m = clean.match(/^([0-9]{1,2}(:[0-9]{2})?\s*(am|pm)?)\s*to\s*([0-9]{1,2}(:[0-9]{2})?\s*(am|pm)?)$/);
    if (!m) return null;
    const startLabel = m[1].trim();
    const endLabel = m[4].trim();
    return { startLabel, endLabel };
}

// Infer AM/PM for left side using right side if needed
function normalizeMeridiem(startLabel: string, endLabel: string): { start: string; end: string } {
    const endHasMeridiem = /(am|pm)\b/i.test(endLabel);
    const startHasMeridiem = /(am|pm)\b/i.test(startLabel);
    let start = startLabel;
    let end = endLabel;

    if (!startHasMeridiem && endHasMeridiem) {
        const endMer = endLabel.match(/(am|pm)\b/i)![1];
        start = `${startLabel} ${endMer}`;
    }
    if (!/(am|pm)\b/i.test(start)) {
        const hour = parseInt(start.split(":")[0], 10);
        start += hour >= 12 ? " pm" : " am";
    }
    if (!/(am|pm)\b/i.test(end)) {
        const hour = parseInt(end.split(":")[0], 10);
        end += hour >= 12 ? " pm" : " am";
    }
    return { start, end };
}

// Extract title + organizers from a cell
function extractNameAndOrganizers(raw: string): { name: string; organizers: string[] } {
    let s = (raw || "").toString().replace(/\s+/g, " ").trim();

    // Drop bracket tags like [ION]
    s = s.replace(/\[[^\]]+\]/g, "").trim();

    // Remove trailing location-only parentheses (Dungeon, Tent, Deck, etc.)
    s = s.replace(
        /\((?:[^()]*?(Tent|Deck|Poolside|Wasteland|Suspension|Floor|Side|Lounge|Dungeon|Temple|Pavilion|Maypole)[^()]*)\)\s*$/i,
        ""
    ).trim();

    // Keep time-in-parens attached to title
    const timeParen = /\(\s*\d{1,2}(:[0-9]{2})?\s*(am|pm)?\s*(?:-|–|to)\s*\d{1,2}(:[0-9]{2})?\s*(am|pm)?\s*\)\s*$/i;
    if (timeParen.test(s)) return { name: s, organizers: [] };

    // Hosted by:
    const hostedBy = s.match(/^(.*?)(?:[-–—]\s*)?Hosted by:?\s*(.+)$/i);
    if (hostedBy) {
        const name = hostedBy[1].trim().replace(/[–—-]\s*$/, "").trim();
        return { name, organizers: splitOrganizers(hostedBy[2]) };
    }

    // "Title - Host A & Host B"
    const dashMatch = s.match(/^(.*?)[–—-]\s+(.+)$/);
    if (dashMatch) {
        const name = dashMatch[1].trim();
        const right = dashMatch[2].trim();
        if (/[0-9]{1,2}(:[0-9]{2})?\s*(am|pm)/i.test(right)) {
            return { name: `${name} — ${right}`, organizers: [] };
        }
        return { name, organizers: splitOrganizers(right) };
    }
    return { name: s, organizers: [] };
}

function splitOrganizers(s: string): string[] {
    const rough = s
        .split(/(?:\s*&\s*|\s+and\s+|,|\/|;|—|–)/i)
        .map(t => t.replace(/\([^)]*\)/g, "").trim())
        .filter(Boolean);

    return rough.filter(item => {
        if (!item) return false;
        if (item.length > 80) return false;
        if (item.split(/\s+/).length > 8) return false;
        if (/[.!?:]/.test(item)) return false;
        return true;
    });
}

function makeISO(baseDay: DateTime, timeLabel: string, tz: string): DateTime {
    const m = timeLabel.trim().match(/^([0-9]{1,2})(?::([0-9]{2}))?\s*(am|pm)$/i);
    if (!m) return baseDay;
    let hour = parseInt(m[1], 10);
    const minute = m[2] ? parseInt(m[2], 10) : 0;
    const mer = m[3].toLowerCase();
    if (mer === "pm" && hour !== 12) hour += 12;
    if (mer === "am" && hour === 12) hour = 0;
    return baseDay.set({ hour, minute }).setZone(tz, { keepLocalTime: true });
}

// Normalize names for cross-sheet matching
function normalizeName(s: string): string {
    return (s || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/["”“]/g, "")
        .replace(/\[[^\]]]+\]/g, "") // [ION]
        .replace(/\s*\((?:tent|deck|maypole|dungeon|pavilion|temple|poolside|class tent|class)\)\s*$/g, "")
        .replace(/\s*\(\s*\d{1,2}(:\d{2})?\s*(am|pm)?\s*(?:-|–|to)\s*\d{1,2}(:\d{2})?\s*(am|pm)?\s*\)\s*$/g, "")
        .replace(/\s*\d{1,2}(:\d{2})?\s*(am|pm)?\s*(?:-|–|to)\s*\d{1,2}(:\d{2})?\s*(am|pm)?\s*$/g, "")
        .replace(/\s*–\s*/g, " - ")
        .replace(/\s*—\s*/g, " - ")
        .replace(/\s*-\s*/g, " - ")
        .trim();
}

/** ---------- Robust CSV + plain-text helpers for description sheets ---------- */
function looksLikeHtml(s: string) {
    const head = s.slice(0, 2048).toLowerCase();
    return head.includes("<html") || head.includes("<!doctype html");
}

function detectDelimiter(lines: string[]): string {
    const candidates = [",", "\t", ";", "|"];
    let best = ",";
    let bestScore = -1;
    for (const delim of candidates) {
        const counts = lines
            .filter(l => l.trim().length)
            .map(l => (l.match(new RegExp(`\\${delim}`, "g")) || []).length);
        const avg = counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
        if (avg > bestScore) { bestScore = avg; best = delim; }
    }
    return best;
}

// Scan for header row (first row that contains any of the known title header names)
function findHeaderRow(rows: string[][]): number {
    const CANDIDATE_KEYS = [
        "name", "title", "workshop", "class", "session", "event",
        "workshop title", "class title", "title of workshop", "title of class",
        "workshop/ event", "workshop / event", "workshop event"
    ];
    for (let i = 0; i < Math.min(rows.length, 50); i++) {
        const lower = rows[i].map(c => (c || "").toString().trim().toLowerCase());
        const hit = lower.some(h => CANDIDATE_KEYS.includes(h));
        if (hit) return i + 1; // csv-parse from_line is 1-based (data lines AFTER header)
    }
    return 1; // fallback: treat first row as header
}

// Canonicalize headers like "Workshop/ Event", "Presenter", "Description"
function canonHeader(h: string): string {
    if (!h) return "";
    let s = String(h)
        .replace(/\u00A0/g, " ") // NBSP
        .replace(/["”“]+/g, "")
        .toLowerCase()
        .trim();
    s = s.replace(/[\/|]+/g, " ").replace(/\s+/g, " ");

    if (/(^| )(workshop|class|session|event|title)( |$)/.test(s)
        || /^(workshop title|class title|title of workshop|title of class|workshop event)$/.test(s)) {
        return "title";
    }
    if (/^presenter?s?$/.test(s) || /^(hosts?|facilitator|instructor|lead|teachers?|speakers?)$/.test(s)) {
        return "organizers";
    }
    if (/^description$/.test(s) || /^(desc|summary|details|about|abstract|blurb)$/.test(s)) {
        return "description";
    }
    return s;
}

// Parse CSV/TSV description sheet with header detection + canonical headers
function parseDescCsvSmart(csvText: string, debug = false): AnyRow[] {
    if (!csvText || !csvText.trim()) return [];
    if (looksLikeHtml(csvText)) {
        throw new Error("Description URL returned HTML (not CSV). Use a direct CSV export link (Google Sheets: /export?format=csv&gid=...).");
    }

    // Detect delimiter from first few lines
    const firstLines = csvText.split(/\r?\n/).slice(0, 30);
    const delim = detectDelimiter(firstLines);
    log.dbg(debug, `[desc] detected delimiter "${delim === "\t" ? "\\t" : delim}"`);

    // First pass grid (to detect header line)
    const grid: string[][] = parseCsv(csvText, {
        delimiter: delim,
        relax_column_count: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
    });
    if (!grid.length) return [];

    const from_line = findHeaderRow(grid);
    log.dbg(debug, `[desc] detected header at line ${from_line}`);

    // Second pass with canonicalized columns
    const rows: AnyRow[] = parseCsv(csvText, {
        delimiter: delim,
        columns: (header: string[]) => header.map(x => canonHeader(String(x || ""))),
        skip_empty_lines: true,
        relax_column_count: true,
        trim: true,
        from_line,
        bom: true,
    });

    log.dbg(debug, `[desc] parsed rows=${rows.length}`);
    if (debug && rows.length) {
        const keys = Object.keys(rows[0]);
        log.dbg(true, `[desc] first row keys: ${keys.join(", ")}`);
    }
    return rows;
}

/** ---------- NEW: parse plain-text ION blocks ---------- */
function parseIonPlain(text: string, debug = false): AnyRow[] {
    if (!text || !text.trim()) return [];
    // Normalize newlines & trim BOM/NBSP
    const lines = text
        .replace(/^\uFEFF/, "")
        .replace(/\r\n?/g, "\n")
        .split("\n")
        .map(l => l.replace(/\u00A0/g, " "));

    const out: AnyRow[] = [];
    let i = 0;

    // Skip any leading banner lines (like "DO Summer Camp 2025 IONs")
    while (i < lines.length && !lines[i].trim()) i++;
    if (i < lines.length && /^do .*ion/i.test(lines[i].trim())) {
        i++;
    }

    while (i < lines.length) {
        // Skip blanks
        while (i < lines.length && !lines[i].trim()) i++;
        if (i >= lines.length) break;

        // Title
        const title = lines[i].trim();
        i++;

        // Optional Hosted by:
        let organizersRaw = "";
        while (i < lines.length && !lines[i].trim()) i++;
        if (i < lines.length && /^hosted by:/i.test(lines[i].trim())) {
            organizersRaw = lines[i].trim().replace(/^hosted by:\s*/i, "");
            i++;
        }

        // Description: gather until blank-blank boundary before next title
        const descLines: string[] = [];
        while (i < lines.length) {
            const cur = lines[i];
            const nextNonEmptyIdx = (() => {
                let k = i;
                while (k < lines.length && !lines[k].trim()) k++;
                return k;
            })();

            // boundary: we hit at least one blank and then a non-empty line that is NOT "Hosted by:"
            if (!cur.trim() && nextNonEmptyIdx > i) {
                const nn = lines[nextNonEmptyIdx]?.trim() || "";
                if (nn && !/^hosted by:/i.test(nn)) {
                    i = nextNonEmptyIdx; // move to next title
                    break;
                }
            }

            descLines.push(cur);
            i++;
        }

        const description = descLines
            .join("\n")
            // drop leading/trailing blank lines in description
            .replace(/^\s+|\s+$/g, "");

        out.push({
            title,
            organizers: organizersRaw,
            description,
        });
    }

    log.dbg(debug, `[ion-plain] parsed items=${out.length}`);
    if (debug && out.length) {
        log.dbg(true, `[ion-plain] sample 1:`, out[0]);
    }
    return out;
}

/** ---------- Matching helpers & normalization ---------- */

// generic items we should never fuzzy-merge
const BANNED_SINGLE_TITLES = new Set(["breakfast", "lunch", "dinner", "brunch"]);
const BANNED_TWO_WORD_TITLES = new Set(["happy hour"]);

// common leading venue/space labels that may prefix titles in the grid
const COMMON_LOCATIONS = [
    "wasteland", "dungeon", "temple", "pavilion", "upper pavilion", "lower pavilion",
    "barn class tent", "class tent", "poolside", "poolside tent", "camp-wide", "other spaces"
];

const STOPWORDS = new Set([
    "a", "an", "the", "and", "or", "of", "for", "to", "in", "on", "with", "by", "at", "from", "into", "your"
]);

function stripLeadingLocation(s: string): string {
    let t = s.trim();
    for (const loc of COMMON_LOCATIONS) {
        const re = new RegExp(`^\\s*${loc.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*[:\\-–—]?\\s*`, "i");
        if (re.test(t)) {
            t = t.replace(re, "");
            break;
        }
    }
    return t.trim();
}

// tokenize to content words (>=3 letters), drop stopwords
function contentTokens(s: string): string[] {
    return s
        .split(/[^a-z0-9’']+/i)
        .map(x => x.trim().toLowerCase())
        .filter(x => x && x.length >= 3 && !STOPWORDS.has(x));
}

function normalizedTokens(s: string): string[] {
    return contentTokens(s.toLowerCase());
}

function jaccard(a: string[], b: string[]): number {
    const A = new Set(a), B = new Set(b);
    let inter = 0;
    for (const x of A) if (B.has(x)) inter++;
    const uni = A.size + B.size - inter;
    return uni ? inter / uni : 0;
}

function allTokensBanned(tokens: string[]): boolean {
    if (tokens.length === 1) return BANNED_SINGLE_TITLES.has(tokens[0]);
    if (tokens.length === 2) return BANNED_TWO_WORD_TITLES.has(tokens.join(" "));
    return false;
}

function dropDashTail(s: string): string {
    return s.replace(/\s*-\s+[a-z0-9 .,'"&/@]+$/i, " ").replace(/\s+/g, " ").trim();
}
function dropColonTail(s: string): string {
    return s.replace(/\s*:\s+.+$/i, " ").replace(/\s+/g, " ").trim();
}

// stronger normalizer specifically for *matching*
function normalizeTitleForMatch(s: string): string {
    let t = s || "";

    // remove bracket tags like [ION] early
    t = t.replace(/\[[^\]]+\]/g, " ");

    // drop venue prefixes: "WASTELAND …", "Dungeon …", etc.
    t = stripLeadingLocation(t);

    // standardize dashes to " - "
    t = t.replace(/\s*[–—]\s*/g, " - ");

    // remove ALL (...) anywhere
    t = t.replace(/\([^)]*\)/g, " ");

    // remove explicit "hosted/presented by ..." trails
    t = t.replace(/\b(hosted|presented)\s+by:?.*$/i, " ");

    // normalize common spelling quirks
    t = t.replace(/\bwadsworth\b/gi, "wadworth");

    // collapse whitespace & lowercase
    t = t.replace(/\s+/g, " ").trim().toLowerCase();

    return t;
}

/** ---------- Build description entries ---------- */
function buildDescEntries(rows: AnyRow[], debug = false): DescEntry[] {
    const tmp = new Map<string, DescEntry>();
    for (const raw of rows) {
        const name = (raw.title || "").trim();
        if (!name) continue;

        const desc = (raw.description || "").trim();
        const orgStr = (raw.organizers || "").trim();
        const organizers = orgStr ? splitOrganizers(orgStr) : [];

        const key = normalizeTitleForMatch(name);
        const existing = tmp.get(key);
        if (!existing) {
            tmp.set(key, {
                key,
                rawTitle: name,
                normalized: key,
                description: desc,
                organizers
            });
        } else {
            if (!existing.description && desc) existing.description = desc;
            if (organizers.length) {
                const set = new Set([...existing.organizers, ...organizers]);
                existing.organizers = [...set];
            }
        }
    }

    const out = Array.from(tmp.values());
    log.dbg(debug, `[desc] built entries=${out.length}`);
    return out;
}

/** ---------- Main grid parser (no headers, sheet-like) ---------- */
function parseGridToJSON(
    matrix: string[][],
    opts: { year: number; month: number; tz: string }
): OutputItem[] {
    const { year, month, tz } = opts;
    let currentDayNum: number | null = null;
    let currentMonth = month;
    let lastDayNum: number | null = null;

    let currentHeaderRowIndex: number | null = null;
    let colLocations: Record<number, string> = {};

    const out: OutputItem[] = [];

    for (let r = 0; r < matrix.length; r++) {
        const row = matrix[r].map(c => (c || "").toString().replace(/\s+/g, " ").trim());
        const first = row[0] || "";
        const last = row[row.length - 1] || "";

        // Weekday row (e.g., "Wednesday ... 27th")
        if (WEEKDAYS.has(first)) {
            const ord = parseOrdinalDay(last);
            if (ord != null) {
                if (lastDayNum != null && ord < lastDayNum) currentMonth += 1;
                currentDayNum = ord;
                lastDayNum = ord;
            } else {
                currentDayNum = null;
            }
            currentHeaderRowIndex = null;
            colLocations = {};
            continue;
        }

        // Header row with locations across columns
        const looksLikeHeader =
            row.includes("Camp-Wide") ||
            row.includes("Pavilion") ||
            row.includes("Dungeon Class Tent") ||
            row.includes("Dungeon (Class Tent)") ||
            row.includes("Other Spaces") ||
            row.includes("Barn Class Tent") ||
            row.includes("Sex-O-Rama");

        if (looksLikeHeader) {
            currentHeaderRowIndex = r;
            colLocations = {};
            for (let c = 1; c < row.length - 1; c++) {
                const loc = row[c];
                if (loc) colLocations[c] = loc;
            }
            const ord = parseOrdinalDay(last);
            if (ord != null) {
                if (lastDayNum != null && ord < lastDayNum) currentMonth += 1;
                currentDayNum = ord;
                lastDayNum = ord;
            }
            continue;
        }

        const isolatedOrd = parseOrdinalDay(last);
        if (isolatedOrd != null) {
            if (lastDayNum != null && isolatedOrd < lastDayNum) currentMonth += 1;
            currentDayNum = isolatedOrd;
            lastDayNum = isolatedOrd;
        }

        const tr = parseTimeRange(first) || parseTimeRange(last);
        if (tr) {
            const { startLabel, endLabel } = tr;
            const { start, end } = normalizeMeridiem(startLabel, endLabel);
            if (currentDayNum == null) continue;

            const baseDate = DateTime.fromObject({ year, month: currentMonth, day: currentDayNum }, { zone: tz });

            const startDT = makeISO(baseDate, start, tz);
            let endDT = makeISO(baseDate, end, tz);
            if (endDT <= startDT) endDT = endDT.plus({ days: 1 });

            if (currentHeaderRowIndex != null) {
                for (const [cStr, loc] of Object.entries(colLocations)) {
                    const c = parseInt(cStr, 10);
                    const cell = (row[c] || "").trim();
                    if (!cell) continue;

                    const { name, organizers } = extractNameAndOrganizers(cell);
                    if (!name) continue;

                    out.push({
                        startDate: startDT.toISO()!,
                        endDate: endDT.toISO()!,
                        name,
                        location: loc,
                        organizers,
                    });
                }
            }
            continue;
        }
    }
    return out;
}

/** ---------- Fuse-based matcher ---------- */
function buildFuseIndex(entries: DescEntry[], threshold: number) {
    return new Fuse(entries, {
        includeScore: true,
        threshold,
        ignoreLocation: true,
        minMatchCharLength: 2,
        keys: [{ name: "normalized", weight: 1 }],
    });
}

function fuseFindDesc(
    queryName: string,
    fuse: Fuse<DescEntry>,
    dictByKey: Map<string, DescEntry>,
    { passScore = 0.4, debug = false }: { passScore?: number; debug?: boolean } = {}
): { hit?: DescEntry; bestScore?: number; kind: "exact" | "fuzzy" | "none" } {
    // normalized query key and tokens
    const qKeyRaw = normalizeTitleForMatch(queryName);
    const qKey = qKeyRaw.replace(/\s+/g, " ").trim();
    const qTokens = normalizedTokens(qKey);

    // guard out generic titles like "dinner", "happy hour"
    if (allTokensBanned(qTokens)) {
        log.dbg(debug, `[guard:GENERIC] "${queryName}" → skip fuzzy (tokens=${qTokens.join(",")})`);
        return { kind: "none" };
    }

    // fast exact
    const exact = dictByKey.get(qKey);
    if (exact) {
        log.dbg(debug, `[match:EXACT] "${queryName}" → "${exact.rawTitle}"`);
        return { hit: exact, bestScore: 0, kind: "exact" };
    }

    // primary fuzzy
    let best = fuse.search(qKey, { limit: 1 })[0];
    let score = best?.score ?? 1;

    // alt 1: drop dash-tail
    if (!best || score > passScore) {
        const q1 = dropDashTail(qKey);
        if (q1 !== qKey) {
            const r1 = fuse.search(q1, { limit: 1 })[0];
            const s1 = r1?.score ?? 1;
            if (r1 && s1 < score) { best = r1; score = s1; log.dbg(debug, `[match:ALT-dash] "${queryName}" q="${q1}" → "${r1.item.rawTitle}" score=${s1.toFixed(3)}`); }
        }
    }
    // alt 2: drop colon-tail
    if (!best || score > passScore) {
        const q2 = dropColonTail(qKey);
        if (q2 !== qKey) {
            const r2 = fuse.search(q2, { limit: 1 })[0];
            const s2 = r2?.score ?? 1;
            if (r2 && s2 < score) { best = r2; score = s2; log.dbg(debug, `[match:ALT-colon] "${queryName}" q="${q2}" → "${r2.item.rawTitle}" score=${s2.toFixed(3)}`); }
        }
    }

    // acceptance guard: require token overlap so "Dinner" ≠ "Beginner Juggling"
    if (best && score <= passScore) {
        const cand = best.item.normalized;
        const cTokens = normalizedTokens(cand);
        const jac = jaccard(qTokens, cTokens);
        const commonCount = new Set(qTokens.filter(t => cTokens.includes(t))).size;

        const ok =
            jac >= 0.4 ||
            (qTokens.length >= 3 && commonCount >= 2) ||
            (qTokens.length === 1 && cTokens.includes(qTokens[0]));

        if (!ok) {
            log.dbg(debug, `[guard:REJECT-overlap] q="${qKey}" vs cand="${cand}" jac=${jac.toFixed(3)} common=${commonCount}`);
            return { kind: "none" };
        }

        log.dbg(debug, `[match:FUZZY] "${queryName}" → "${best.item.rawTitle}" score=${score.toFixed(3)} (jac=${jac.toFixed(3)})`);
        return { hit: best.item, bestScore: score, kind: "fuzzy" };
    }

    if (best) {
        log.dbg(debug, `[match:REJECT] "${queryName}" best="${best.item.rawTitle}" score=${score.toFixed(3)} > threshold=${passScore}`);
    } else {
        log.dbg(debug, `[match:NONE ] "${queryName}" → (no candidates)`);
    }
    return { bestScore: score, kind: "none" };
}

/** ---------- ICS writer (UTC) ---------- */
function icsEscape(s: string): string {
    return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}
function fmtUtc(dtIso: string): string {
    const d = DateTime.fromISO(dtIso).toUTC();
    return d.toFormat("yyyyLLdd'T'HHmmss'Z'");
}

// --- add this helper near the ICS section ---
function foldIcsLine(raw: string): string[] {
    // RFC 5545: lines MUST be <=75 octets; continuations start with one space
    const out: string[] = [];
    let cur = "";

    for (const ch of raw) {
        const tryStr = cur + ch;
        if (Buffer.byteLength(tryStr, "utf8") > 75) {
            out.push(cur);
            cur = " " + ch; // continuation line begins with a single space
        } else {
            cur = tryStr;
        }
    }
    if (cur) out.push(cur);
    return out;
}
function pushFolded(lines: string[], line: string) {
    for (const part of foldIcsLine(line)) lines.push(part);
}

function buildICS(events: OutputItem[]): string {
    const now = DateTime.now().toUTC().toFormat("yyyyLLdd'T'HHmmss'Z'");
    const lines: string[] = [];

    const header = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Summer Camp//Schedule//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
    ];
    for (const h of header) pushFolded(lines, h);

    for (const ev of events) {
        const uid = `scamp-${Math.abs(
            (normalizeName(ev.name) + ev.startDate + ev.location).split("")
                .reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)
        )}@example`;

        const disclaimer =
            "This is an unofficial automatically generated calendar. Please see the official calendar to confirm details. " +
            "https://docs.google.com/spreadsheets/d/1xvrkhlpPKrBFE9PzLNqHGP3fZX2tAlnuaN5r0kze4uo/edit?gid=1774091174#gid=1774091174";

        const descParts: string[] = [];
        if (ev.description) descParts.push(icsEscape(ev.description));
        if (ev.organizers?.length) descParts.push(`Organizers: ${icsEscape(ev.organizers.join(", "))}`);
        descParts.push(icsEscape(disclaimer));

        pushFolded(lines, "BEGIN:VEVENT");
        pushFolded(lines, `UID:${uid}`);
        pushFolded(lines, `DTSTAMP:${now}`);
        pushFolded(lines, `DTSTART:${fmtUtc(ev.startDate)}`);
        pushFolded(lines, `DTEND:${fmtUtc(ev.endDate)}`);
        pushFolded(lines, `SUMMARY:${icsEscape(ev.name)}`);
        pushFolded(lines, `LOCATION:${icsEscape(ev.location)}`);
        pushFolded(lines, `DESCRIPTION:${descParts.join("\\n\\n")}`);
        pushFolded(lines, "END:VEVENT");
    }

    pushFolded(lines, "END:VCALENDAR");
    return lines.join("\r\n");
}


/** ---------- Fetch helpers ---------- */
async function fetchCsvText(url: string): Promise<string> {
    const res = await fetch(url as any, { headers: { "cache-control": "no-cache" } });
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    return await res.text();
}

/** ---------- MAIN ---------- */
async function main() {
    const argv = await yargs(hideBin(process.argv))
        .option("main", { type: "string", demandOption: true, desc: "Main schedule CSV URL" })
        .option("workshops", { type: "string", demandOption: true, desc: "Workshop Descriptions CSV/TSV URL" })
        .option("ion", { type: "string", demandOption: true, desc: "ION Descriptions (CSV/TSV or plain text blocks) URL" })
        .option("year", { type: "number", default: 2025 })
        .option("month", { type: "number", default: 8, desc: "1-12 (August=8)" })
        .option("tz", { type: "string", default: "America/New_York" })
        .option("jsonOut", { type: "string", default: "schedule.json" })
        .option("icsOut", { type: "string", default: "schedule.ics" })
        .option("fuzzyThreshold", { type: "number", default: 0.4, desc: "Fuse: accept if score ≤ threshold (0..1)" })
        .option("debugFuzzy", { type: "boolean", default: false, desc: "Verbose parsing/matching logs" })
        .help()
        .argv;

    const DEBUG = Boolean(argv.debugFuzzy);

    // 1) Fetch CSVs
    const [mainCsv, workshopTxt, ionTxt] = await Promise.all([
        fetchCsvText(argv.main as string),
        fetchCsvText(argv.workshops as string),
        fetchCsvText(argv.ion as string),
    ]);

    // 2) Parse main as raw grid (no headers)
    const mainMatrix: string[][] = parseCsv(mainCsv, {
        relax_column_count: true,
        skip_empty_lines: false,
    });

    // 3) Parse description sheets
    // Workshops: CSV/TSV with headers
    let workshopRows: AnyRow[] = [];
    try {
        workshopRows = parseDescCsvSmart(workshopTxt, DEBUG);
    } catch (e: any) {
        log.warn(`[workshops] ${e?.message || e}`);
    }

    // ION: try CSV/TSV first; if zero rows, try plain-text block parser
    let ionRows: AnyRow[] = [];
    let ionCsvRows: AnyRow[] = [];
    try {
        ionCsvRows = parseDescCsvSmart(ionTxt, DEBUG);
    } catch (e: any) {
        // ignore; we'll try plain text next
        log.dbg(DEBUG, `[ion] CSV/TSV parse failed, will try plain-text parser`);
    }
    if (ionCsvRows.length > 0) {
        ionRows = ionCsvRows;
    } else {
        ionRows = parseIonPlain(ionTxt, DEBUG);
    }

    log.dbg(DEBUG, `[desc] workshops=${workshopRows.length}, ion=${ionRows.length}`);

    // 4) Build description entries
    const descEntries = buildDescEntries([...workshopRows, ...ionRows], DEBUG);
    const descByKey = new Map(descEntries.map(e => [e.key, e]));

    if (DEBUG && descEntries.length === 0) {
        console.log("\n--- DEBUG: descEntries is EMPTY ---");
        const showSample = (label: string, text: string) => {
            const lines = text.split(/\r?\n/).slice(0, 20);
            console.log(`\n[${label}] first 20 lines:`);
            lines.forEach((ln, i) => console.log(String(i + 1).padStart(2, " "), ln));
        };
        showSample("workshops RAW", workshopTxt);
        showSample("ion RAW", ionTxt);
    }

    // 5) Build Fuse index
    const fuse = buildFuseIndex(descEntries, argv.fuzzyThreshold as number);

    if (DEBUG) {
        console.log(`\n--- Fuse Index (${descEntries.length} entries) ---`);
        for (const e of descEntries.slice(0, 200)) {
            console.log(`• rawTitle="${e.rawTitle}" normalized="${e.normalized}" descLen=${e.description.length}`);
        }
        if (descEntries.length > 200) console.log(`(… ${descEntries.length - 200} more)`);
        console.log('----------------------------------------------\n');
    }

    // 6) Build events from main grid
    const baseEvents = parseGridToJSON(mainMatrix, {
        year: argv.year as number,
        month: argv.month as number,
        tz: argv.tz as string,
    });

    // 7) Merge descriptions & organizers using Fuse
    let exactCount = 0, fuzzyCount = 0, noneCount = 0;
    const merged: OutputItem[] = baseEvents.map((e) => {
        const { hit: fromDesc, kind } = fuseFindDesc(
            e.name, fuse, descByKey,
            { passScore: argv.fuzzyThreshold as number, debug: DEBUG }
        );

        if (kind === "exact") exactCount++;
        else if (kind === "fuzzy") fuzzyCount++;
        else noneCount++;

        const mergedOrganizers = [
            ...(e.organizers || []),
            ...(fromDesc?.organizers || []),
        ];

        const cleanOrg = Array.from(
            new Set(
                (mergedOrganizers || []).filter(o =>
                    o && o.length <= 80 &&
                    o.split(/\s+/).length <= 8 &&
                    !/[.!?:]/.test(o)
                )
            )
        );

        return {
            ...e,
            organizers: cleanOrg,
            description: fromDesc?.description || undefined,
        };
    });

    log.dbg(DEBUG, `Merge summary: totalEvents=${merged.length} exact=${exactCount} fuzzy=${fuzzyCount} none=${noneCount}`);

    // 8) Write outputs
    fs.writeFileSync(argv.jsonOut as string, JSON.stringify(merged, null, 2), "utf8");
    log.info(`Wrote ${merged.length} events → ${argv.jsonOut}`);

    const ics = buildICS(merged);
    fs.writeFileSync(argv.icsOut as string, ics, "utf8");
    log.info(`Wrote iCalendar → ${argv.icsOut}`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
