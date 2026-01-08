#!/usr/bin/env ts-node

/**
 * Instagram Scene Classifier — v2.3 (single run, corpus kept)
 *
 * Key rules:
 * - Auto-DQ if unguarded "acro*" (prefix) or "dog" occurs (yoga NOT auto-DQ).
 * - Pass-2 override: re-include auto-DQ'd users if
 *     (mutualKnown + mentionsOutToKnown + inboundMentionsFromKnown) > 3
 * - Tickets/RSVP/Link Hubs only boost if kink-anchored.
 * - Heuristics JSON sorted by score desc. Influence/other lists exclude ['none'] rows.
 * - Writes usernames_desc.txt (usernames only, score-desc, one per line).
 * - Keeps corpus + 20k-chunks outputs.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// ---------------- CLI ----------------
function parseArgs(argv: string[]) {
    const out: Record<string, any> = {
        debug: false,
        limit: undefined as number | undefined,
        profile: undefined as string | undefined,
        preset: 'default',
    };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--debug') out.debug = true;
        else if (a.startsWith('--limit=')) out.limit = parseInt(a.split('=')[1], 10);
        else if (a.startsWith('--profile=')) out.profile = a.split('=')[1];
        else if (a.startsWith('--preset=')) out.preset = a.split('=')[1];
    }
    return out;
}

const ROOT = process.cwd();
const log = (...args: any[]) => console.log('[IG-CLS]', ...args);

// ---------------- Types ----------------
type ExternalUrl = { title?: string; url?: string; lynx_url?: string; link_type?: string; };
type MusicInfo = { artist_name?: string; song_name?: string; };
type Media = {
    caption?: string;
    alt?: string;
    hashtags?: string[];
    mentions?: string[];
    taggedUsers?: { username?: string; fullName?: string }[];
    musicInfo?: MusicInfo;
    likesCount?: number;
    videoViewCount?: number;
    childPosts?: Media[];
};
type Profile = {
    username?: string;
    fullName?: string;
    biography?: string;
    externalUrl?: string;
    externalUrls?: ExternalUrl[];
    followersCount?: number;
    followsCount?: number;
    postsCount?: number;
    latestPosts?: Media[];
    latestReels?: Media[];
    latestIgtvVideos?: Media[];
};
type FollowEdge = { username: string; following_of: string }; // B -> A

type Graph = { FollowsOut: Map<string, Set<string>>; FollowsIn: Map<string, Set<string>>; };

type ExtractedText = {
    collapsedText: string;
    ticketDomains: string[];
    linkHubDomains: string[];
    rsvpCount: number;
    outboundHandles: string[];
    mediaStats: { likes: number[]; views: number[] };
};

type SocialStats = {
    out_kinky: number;
    mutual_known: number;
    mentions_out_to_known: number;
    inbound_mentions_from_known: number;
    follow_precision: number;
};

type NodeRecord = {
    username: string;
    followers?: number;
    following?: number;
    followersList?: string[];
    followingList?: string[];
    totalConnections?: number;
};


// ---------------- Utils ----------------

async function maybeLoadJSON<T = any>(p: string): Promise<T | null> {
    try {
        const s = await fs.readFile(p, 'utf8');
        return JSON.parse(s) as T;
    } catch {
        return null;
    }
}

function normUser(u?: string): string { return u ? u.trim().replace(/^@+/, '').toLowerCase() : ''; }
function uniq<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }
function safe<T>(v: T | undefined | null, fallback: T): T { return v == null ? fallback : v; }
function take<T>(a: T[], n: number) { return a.slice(0, n); }
function boundedLog(x: number, d = 1.5) { return Math.min(1, Math.max(0, Math.log10(x + 1) / d)); }
function log1p(x: number) { return Math.log(1 + Math.max(0, x)); }
function chunkString(str: string, size: number): string[] {
    const out: string[] = [];
    for (let i = 0; i < str.length; i += size) out.push(str.slice(i, i + size));
    return out;
}
function normalizeHost(u: string): string {
    try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}
function toPercentileThreshold(values: number[], topFrac = 0.20): number {
    if (!values.length) return Number.POSITIVE_INFINITY;
    const s = [...values].sort((a, b) => a - b);
    const idx = Math.floor((1 - topFrac) * (s.length - 1));
    return s[Math.max(0, Math.min(s.length - 1, idx))];
}
function median(nums: number[]): number {
    if (!nums.length) return 0;
    const s = [...nums].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// ---------------- Spec constants ----------------
const TICKET_DOMAINS = [
    'eventbrite.com', 'forbiddentickets', 'tickettailor', 'withfriends.co', 'partiful.com', 'lu.ma', 'universe.com', 'splashthat.com', 'dice.fm', 'meetup.com'
];
const LINK_HUB_DOMAINS = ['linktr.ee', 'campsite.bio', 'beacons.ai', 'hoo.be', 'koji.to', 'withkoji.com'];
const RSVP_PHRASES = [
    'rsvp', 'tickets', 'ticket', 'apply', 'application', 'vetting form', 'dm for vetting',
    'dress code', 'get on list', 'join list', 'no phone', 'no phones', 'no photography',
    'consent form', 'code of conduct', 'refund'
];

const PP_VERY = [
    'playparty', 'play party', 'dungeon', 'dungeons', 'fetish party', 'leather party',
    'invite only', 'inviteonly', 'vetting', 'vetted', 'application', 'screening', 'references required',
    'dress code', 'no phone', 'no phones', 'phone free', 'aftercare', 'play space', 'safeword', 'dms on duty'
];
const PP_HIGH = ['kink social', 'sex positive social', 'sexpositive social', 'kink event', 'sex positive event', 'sexpositive event', 'play social'];

const WS_VERY = [
    'workshop', 'class', 'course', 'intensive', 'training', 'education', 'educator', 'instructor', 'teaching', 'facilitator',
    'bdsm', 'shibari', 'kinbaku', 'rope', 'rigging', 'impact play', 'flogging', 'caning', 'needle play', 'suspension',
    'ssc', 'rack', 'prick', 'consent workshop', 'consent training'
];
const WS_HIGH = ['munch', 'talk', 'panel', 'discussion', 'consent', 'class', 'workshop', 'training'];

const AT_HARD = ['bdsm', 'shibari', 'kinbaku', 'impact play', 'caning', 'flogging', 'needle play', 'suspension'];
const AT_SOFT = [
    'kink', 'fetish', 'leather', 'rope', 'dom', 'domme', 'mistress', 'master', 'sub', 'submissive', 'switch',
    'enm', 'poly', 'polyam', 'polyamory', 'non monogamy', 'ethical non monogamy', 'sexpositive', 'sex positive'
];
const AT_CONTEXT = [
    'consent', 'aftercare', 'dungeon', 'playparty', 'play space', 'vetting', 'screening', 'ssc', 'rack', 'prick',
    'safeword', 'impact play', 'flog', 'caning', 'needle', 'suspension', 'rigging', 'rope', 'shibari', 'kinbaku',
    'dominant', 'submissive', 'switch'
];

// Negatives (yoga stays as penalty only)
const NEGATIVE_FAMILIES: Record<string, { hits: string[], weight: number }> = {
    acrofit: {
        hits: ['acro', 'acrobat', 'acrobatic', 'acrobatics', 'acroyoga', 'aerial', 'aerialist', 'silks', 'lyra', 'trapeze',
            'handstand', 'handstands', 'handbalancing', 'parkour', 'circus', 'cirque', 'acrojam', 'l-base', 'baser', 'flyer', 'flying'],
        weight: 8
    },
    animal: { hits: ['dog', 'dogs', 'puppy', 'puppies', 'shepherd', 'gsd', 'malinois', 'k9'], weight: 8 },
    yoga: { hits: ['yoga', 'yogi', 'ashtanga', 'vinyasa', 'yin', 'hatha', 'kundalini', 'inversion', 'inversions'], weight: 7 },
    travel: {
        hits: ['travel', 'traveling', 'traveller', 'wanderlust', 'nomad', 'digital nomad', 'trip', 'trips', 'journey', 'vacation', 'holiday',
            'airport', 'airplane', 'flight', 'flights', 'miles', 'globetrotter', 'globetrotting', 'backpacking', 'travel blog', 'travel vlogger',
            'sup', 'stand up paddle', 'paddleboard', 'paddle board', 'surf', 'surfing', 'beach day'],
        weight: 6
    },
    crypto: { hits: ['crypto', 'bitcoin', 'web3'], weight: 3 },
};

// Auto-DQ core words: acro* (prefix) & dog
const CORE_DQ_PREFIXES = ['acro']; // yoga removed
const CORE_DQ_WORDS = ['dog'];
const STRONG_KINK_ANCHORS = ['bdsm', 'shibari', 'kinbaku', 'rope', 'fetish', 'dungeon', 'playparty', 'consent', 'impact play', 'flog', 'caning', 'needle', 'suspension', 'rigging', 'safeword', 'vetting', 'screening'];

// Re-include thresholds (sum override)
const REINCLUDE_SUM_MIN = 4; // strictly >3

// Seeds
const SEED_ALLOW = new Set(['suciaqueer', 'templenewyork', 'darkodyssey', 'ista', 'opensocial', 'eventbrite', 'tickettailor', 'withfriends', 'partiful', 'luma']);

// ---------------- Presets (single run) ----------------
type Knobs = {
    xrefAlphaPPWS: number; xrefBetaAT: number;
    kinkKeywordWeight: number; graphWeight: number;
    ticketBoostPP: number; ticketBoostWS: number; rsvpBoostPP: number; rsvpBoostWS: number; linkHubBump: number;
    penaltyCapTotal: number;
    BASELINE_KINK_THRESHOLD: number; SOCIAL_STRONG_THRESHOLD_FRAC: number;
    PP_MIN: number; FAC_MIN: number; ATT_MIN: number;
};
const PRESETS: Record<string, Knobs> = {
    default: {
        xrefAlphaPPWS: 1.0, xrefBetaAT: 1.0,
        kinkKeywordWeight: 1.2, graphWeight: 1.0,
        ticketBoostPP: 3.0, ticketBoostWS: 2.5, rsvpBoostPP: 1.0, rsvpBoostWS: 0.8, linkHubBump: 0.4,
        penaltyCapTotal: 20,
        BASELINE_KINK_THRESHOLD: 3.2,
        SOCIAL_STRONG_THRESHOLD_FRAC: 0.10, // top 10%
        PP_MIN: 3.6, FAC_MIN: 3.1, ATT_MIN: 2.4,
    },
    kink_heavy: {
        xrefAlphaPPWS: 1.0, xrefBetaAT: 1.2,
        kinkKeywordWeight: 1.4, graphWeight: 1.0,
        ticketBoostPP: 3.2, ticketBoostWS: 2.7, rsvpBoostPP: 1.0, rsvpBoostWS: 0.8, linkHubBump: 0.4,
        penaltyCapTotal: 20,
        BASELINE_KINK_THRESHOLD: 3.4,
        SOCIAL_STRONG_THRESHOLD_FRAC: 0.10,
        PP_MIN: 3.5, FAC_MIN: 3.0, ATT_MIN: 2.2,
    },
    penalty_heavy: {
        xrefAlphaPPWS: 1.0, xrefBetaAT: 1.0,
        kinkKeywordWeight: 1.1, graphWeight: 1.05,
        ticketBoostPP: 3.0, ticketBoostWS: 2.5, rsvpBoostPP: 1.0, rsvpBoostWS: 0.8, linkHubBump: 0.4,
        penaltyCapTotal: 22,
        BASELINE_KINK_THRESHOLD: 3.2,
        SOCIAL_STRONG_THRESHOLD_FRAC: 0.10,
        PP_MIN: 3.7, FAC_MIN: 3.2, ATT_MIN: 2.5,
    },
};

// ---------------- Load ----------------
async function loadJSON<T = any>(p: string): Promise<T> {
    const s = await fs.readFile(p, 'utf8');
    return JSON.parse(s);
}
async function loadInputs() {
    const profilesPath = path.resolve(ROOT, 'input', 'profiles.json');
    const nodesPath = path.resolve(ROOT, 'input', 'nodes.json');

    const profiles: Profile[] = await loadJSON(profilesPath);
    if (!Array.isArray(profiles) || profiles.length === 0) {
        throw new Error('profiles.json missing or empty');
    }

    const nodeRecords: NodeRecord[] = await loadJSON(nodesPath);
    if (!Array.isArray(nodeRecords) || nodeRecords.length === 0) {
        throw new Error('nodes.json missing or empty');
    }

    // Convert nodes -> FollowEdge list (B -> A means: { username: A, following_of: B })
    const following: FollowEdge[] = [];
    for (const n of nodeRecords) {
        const u = normUser(n.username);
        if (!u) continue;

        // Accounts "u" follows
        for (const x of n.followingList ?? []) {
            const a = normUser(x);
            if (a && a !== u) following.push({ username: a, following_of: u });
        }

        // Accounts that follow "u"
        for (const f of n.followersList ?? []) {
            const b = normUser(f);
            if (b && b !== u) following.push({ username: u, following_of: b });
        }
    }

    // De-dupe edges
    const key = (e: FollowEdge) => `${normUser(e.username)}<-${normUser(e.following_of)}`;
    const merged = new Map<string, FollowEdge>();
    for (const e of following) {
        const k = key(e);
        if (!merged.has(k)) merged.set(k, e);
    }

    return { profiles, following: Array.from(merged.values()) };
}


// ---------------- Graph ----------------
function buildGraph(following: FollowEdge[]): Graph {
    const FollowsOut = new Map<string, Set<string>>();
    const FollowsIn = new Map<string, Set<string>>();
    for (const e of following) {
        const A = normUser(e.username);      // A is followed
        const B = normUser(e.following_of);  // B follows A  (B -> A)
        if (!A || !B || A === B) continue;
        if (!FollowsOut.has(B)) FollowsOut.set(B, new Set());
        if (!FollowsIn.has(A)) FollowsIn.set(A, new Set());
        FollowsOut.get(B)!.add(A);
        FollowsIn.get(A)!.add(B);
    }
    return { FollowsOut, FollowsIn };
}

// ---------------- Text extraction ----------------
function normalizeTextBlob(s: string): string {
    let t = (s || '').toLowerCase();
    t = t.replace(/k!nk/g, 'kink')
        .replace(/s\*x/g, 'sex')
        .replace(/non[-\s]?monogamy/g, 'non monogamy')
        .replace(/[^\w@\.\s]/g, ' ')
        .replace(/\bsex\s*positive\b/g, 'sexpositive')
        .replace(/\bplay\s*party\b/g, 'playparty')
        .replace(/\binvite\s*only\b/g, 'inviteonly')
        .replace(/\bpower\s*exchange\b/g, 'powerexchange')
        .replace(/\bhouse\s*of\s*yes\b/g, 'houseofyes')
        .replace(/\s+/g, ' ')
        .trim();
    return t;
}

function collectMediaText(m?: Media): { textParts: string[]; handles: string[]; likes: number[]; views: number[] } {
    if (!m) return { textParts: [], handles: [], likes: [], views: [] };
    const parts: string[] = [];
    const handles: string[] = [];
    const likes: number[] = [];
    const views: number[] = [];
    const push = (v?: string) => { if (v) parts.push(v); };

    push(m.caption); push(m.alt);
    if (Array.isArray(m.hashtags)) push(m.hashtags.join(' '));
    if (Array.isArray(m.mentions)) push(m.mentions.join(' '));
    if (m.musicInfo) { push(m.musicInfo.artist_name); push(m.musicInfo.song_name); }

    if (Array.isArray(m.taggedUsers)) {
        for (const t of m.taggedUsers) {
            const u = normUser(t?.username);
            if (u) { handles.push(u); parts.push('@' + u); }
            if (t?.fullName) parts.push(t.fullName);
        }
    }

    const textForHandles = [m.caption || '', m.alt || ''].join(' ');
    const handleMatches = textForHandles.match(/@([a-z0-9._]{2,30})/gi) || [];
    for (const h of handleMatches) {
        const u = normUser(h);
        if (u) handles.push(u);
    }

    if (typeof m.likesCount === 'number') likes.push(m.likesCount);
    if (typeof m.videoViewCount === 'number') views.push(m.videoViewCount);

    if (Array.isArray(m.childPosts)) {
        for (const c of m.childPosts) {
            const r = collectMediaText(c);
            parts.push(...r.textParts);
            handles.push(...r.handles);
            likes.push(...r.likes);
            views.push(...r.views);
        }
    }
    return { textParts: parts, handles: uniq(handles), likes, views };
}

function collectProfileText(p: Profile): ExtractedText {
    const parts: string[] = [];
    const handles: string[] = [];
    const ticketDomains: string[] = [];
    const linkHubDomains: string[] = [];
    let rsvpCount = 0;
    const likes: number[] = [];
    const views: number[] = [];

    const push = (v?: string) => { if (v) parts.push(v); };
    push(p.fullName); push(p.biography); push(p.externalUrl);

    if (Array.isArray(p.externalUrls)) {
        for (const e of p.externalUrls) {
            if (e?.title) push(e.title);
            if (e?.url) push(e.url);
            if (e?.lynx_url) push(e.lynx_url);
            for (const maybe of [e?.url, e?.lynx_url]) {
                if (!maybe) continue;
                const host = normalizeHost(maybe);
                if (host) {
                    if (TICKET_DOMAINS.some(d => host.includes(d))) ticketDomains.push(host);
                    if (LINK_HUB_DOMAINS.some(d => host.includes(d))) linkHubDomains.push(host);
                }
            }
        }
    }

    const buckets: (Media[] | undefined)[] = [p.latestPosts, p.latestReels, p.latestIgtvVideos];
    for (const arr of buckets) {
        if (!Array.isArray(arr)) continue;
        for (const m of arr) {
            const r = collectMediaText(m);
            parts.push(...r.textParts);
            handles.push(...r.handles);
            likes.push(...r.likes);
            views.push(...r.views);
        }
    }

    const collapsed = normalizeTextBlob(parts.join(' '));
    for (const phrase of RSVP_PHRASES) {
        const re = new RegExp(`\\b${phrase.replace(/\s+/g, '\\s+')}\\b`, 'g');
        const found = collapsed.match(re);
        if (found) rsvpCount += found.length;
    }

    return {
        collapsedText: collapsed,
        ticketDomains: uniq(ticketDomains),
        linkHubDomains: uniq(linkHubDomains),
        rsvpCount,
        outboundHandles: uniq(handles.map(normUser).filter(Boolean)),
        mediaStats: { likes, views },
    };
}

function buildMentionMaps(profiles: Profile[], extracted: Map<string, ExtractedText>) {
    const MentionsOut = new Map<string, Set<string>>();
    const MentionsIn = new Map<string, Set<string>>();
    for (const p of profiles) {
        const u = normUser(p.username);
        if (!u) continue;
        const ex = extracted.get(u);
        const out = new Set<string>();
        if (ex) for (const h of ex.outboundHandles) { const v = normUser(h); if (v && v !== u) out.add(v); }
        MentionsOut.set(u, out);
        for (const v of out) {
            if (!MentionsIn.has(v)) MentionsIn.set(v, new Set());
            MentionsIn.get(v)!.add(u);
        }
    }
    return { MentionsOut, MentionsIn };
}

// ---------------- Keyword hits, penalties, auto-DQ ----------------
function countOccurrences(text: string, phrase: string): number {
    const re = new RegExp(`\\b${phrase.replace(/\s+/g, '\\s+')}\\b`, 'g');
    return (text.match(re) || []).length;
}
function anyNear(text: string, center: string, anchors: string[], win = 120): boolean {
    const idx = text.indexOf(center);
    if (idx < 0) return false;
    const s = Math.max(0, idx - win), e = Math.max(idx + center.length, idx) + win;
    const span = text.slice(s, Math.min(text.length, e));
    return anchors.some(a => span.includes(a));
}
type KeywordHits = {
    ppVery: string[]; ppHigh: string[]; wsVery: string[]; wsHigh: string[];
    atHard: string[]; atSoft: string[]; atContextHits: string[];
    negatives: Record<string, number>;
};

function computeKeywordHits(text: string): KeywordHits {
    const WS_GENERIC = ['workshop', 'class', 'course', 'intensive', 'training', 'education', 'educator', 'instructor', 'teaching', 'facilitator'];
    const KINK_ANCHORS = [...AT_HARD, ...AT_SOFT, ...AT_CONTEXT, 'bdsm', 'shibari', 'kinbaku', 'rope', 'kink', 'fetish', 'dungeon', 'playparty'];

    const ppVery = PP_VERY.filter(ph => countOccurrences(text, ph) > 0);
    const ppHigh = PP_HIGH.filter(ph => countOccurrences(text, ph) > 0);

    const wsVeryRaw = WS_VERY.filter(ph => countOccurrences(text, ph) > 0);
    const wsVery: string[] = [];
    const wsHigh: string[] = [];
    for (const term of wsVeryRaw) {
        const isGeneric = WS_GENERIC.includes(term);
        if (!isGeneric) wsVery.push(term);
        else if (anyNear(text, term, KINK_ANCHORS, 120)) wsVery.push(term);
        else wsHigh.push(term);
    }
    if (countOccurrences(text, 'munch') && ['talk', 'panel', 'discussion'].some(k => anyNear(text, 'munch', [k], 80))) {
        wsHigh.push('munch (near talk/panel/discussion)');
    }
    if (countOccurrences(text, 'consent') && ['class', 'workshop', 'training'].some(k => anyNear(text, 'consent', [k], 80))) {
        wsHigh.push('consent (near class/workshop/training)');
    }

    const atHard = AT_HARD.filter(ph => countOccurrences(text, ph) > 0);
    const atSoft = AT_SOFT.filter(ph => countOccurrences(text, ph) > 0);
    const atContextHits = AT_CONTEXT.filter(ph => countOccurrences(text, ph) > 0);

    const negatives: Record<string, number> = {};
    for (const fam of Object.keys(NEGATIVE_FAMILIES)) {
        negatives[fam] = NEGATIVE_FAMILIES[fam].hits.reduce((sum, h) => sum + countOccurrences(text, h), 0);
    }

    return { ppVery, ppHigh, wsVery, wsHigh, atHard, atSoft, atContextHits, negatives };
}

// Auto-DQ detection: unguarded acro* or dog
function hasUnguardedAutoDQ(text: string): boolean {
    // acro* prefix
    for (const pref of CORE_DQ_PREFIXES) {
        const re = new RegExp(`\\b${pref}[a-z0-9._]*\\b`, 'g');
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
            const span = text.slice(Math.max(0, m.index - 120), Math.min(text.length, m.index + m[0].length + 120));
            if (!STRONG_KINK_ANCHORS.some(a => span.includes(a))) return true;
        }
    }
    // dog exact word
    for (const w of CORE_DQ_WORDS) {
        const re = new RegExp(`\\b${w}\\b`, 'g');
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
            const span = text.slice(Math.max(0, m.index - 120), Math.min(text.length, m.index + w.length + 120));
            if (!STRONG_KINK_ANCHORS.some(a => span.includes(a))) return true;
        }
    }
    return false;
}

function computePenalties(h: KeywordHits, cap: number) {
    let total = 0;
    const reasons: string[] = [];
    for (const fam of Object.keys(NEGATIVE_FAMILIES)) {
        const occ = h.negatives[fam] || 0;
        if (occ > 0) {
            total += NEGATIVE_FAMILIES[fam].weight;
            reasons.push(`Negatives: ${fam} x${occ}`);
            total += Math.min(occ - 1, 4) * 0.75;
        }
    }
    total = Math.min(total, cap);
    return { penalty: total, reasons };
}

// ---------------- Social stats & scores ----------------
function computeSocialStats(
    u: string,
    followsCount: number,
    graph: Graph,
    MentionsOut: Map<string, Set<string>>,
    MentionsIn: Map<string, Set<string>>,
    KnownKinky: Set<string>
): SocialStats {
    const out = graph.FollowsOut.get(u) || new Set<string>();
    const inn = graph.FollowsIn.get(u) || new Set<string>();
    const mOut = MentionsOut.get(u) || new Set<string>();
    const mIn = MentionsIn.get(u) || new Set<string>();

    const out_kinky = Array.from(out).filter(x => KnownKinky.has(x)).length;
    const mutual_known = Array.from(out).filter(x => KnownKinky.has(x) && inn.has(x)).length;
    const mentions_out_to_known = Array.from(mOut).filter(x => KnownKinky.has(x)).length;
    const inbound_mentions_from_known = Array.from(mIn).filter(x => KnownKinky.has(x)).length;
    const follow_precision = followsCount > 0 ? (out_kinky / followsCount) : 0;

    return { out_kinky, mutual_known, mentions_out_to_known, inbound_mentions_from_known, follow_precision };
}

function socialScore(stat: SocialStats, denom = 1.5): number {
    const f = (x: number) => boundedLog(x, denom);
    return (
        0.35 * f(stat.out_kinky) +
        0.20 * f(stat.mutual_known) +
        0.20 * f(stat.mentions_out_to_known) +
        0.15 * f(stat.inbound_mentions_from_known) +
        0.10 * Math.min(1, Math.sqrt(Math.max(0, stat.follow_precision)))
    );
}

// ---------------- Passes (KnownKinky) ----------------
type BaselineScore = {
    baseKinkScore: number;
    hasStrongKink: boolean;
    kinkTopKeywords: string[];
    ticket: boolean;
    rsvpCount: number;
    linkHubCount: number;
    autoDQ: boolean;
};

function baselineKink(ex: ExtractedText, knobs: Knobs): BaselineScore {
    const hits = computeKeywordHits(ex.collapsedText);
    const hard_hits = hits.atHard.length + hits.ppVery.length + hits.wsVery.length;
    const soft_context_hits = Math.min(hits.atSoft.length, Math.max(1, hits.atContextHits.length)) + hits.ppHigh.length + hits.wsHigh.length;
    const soft_light_hits = Math.max(0, hits.atSoft.length - soft_context_hits) + Math.max(0, hits.atContextHits.length - 1);

    const A = 4, B = 2, C = 1;
    let score = knobs.kinkKeywordWeight * (
        A * Math.log2(1 + hard_hits) +
        B * Math.log2(1 + soft_context_hits) +
        C * Math.log2(1 + soft_light_hits)
    );

    // Mild hints here; boosts later require kink-anchored
    if (ex.linkHubDomains.length > 0) score += 0.3;
    if (ex.rsvpCount > 0) score += 0.3 * Math.min(3, ex.rsvpCount);

    const kinkTopKeywords = uniq([
        ...take(hits.ppVery, 3),
        ...take(hits.wsVery, 3),
        ...take(hits.atHard, 3),
        ...take(hits.ppHigh, 2),
        ...take(hits.wsHigh, 2),
        ...take(hits.atSoft, 2),
    ]).slice(0, 3);

    return {
        baseKinkScore: score,
        hasStrongKink: (hits.ppVery.length + hits.wsVery.length + hits.atHard.length) > 0,
        kinkTopKeywords,
        ticket: ex.ticketDomains.length > 0,
        rsvpCount: ex.rsvpCount,
        linkHubCount: ex.linkHubDomains.length,
        autoDQ: hasUnguardedAutoDQ(ex.collapsedText),
    };
}

function passKnownKinky(
    profiles: Profile[],
    extracted: Map<string, ExtractedText>,
    graph: Graph,
    mentions: { MentionsOut: Map<string, Set<string>>, MentionsIn: Map<string, Set<string>> },
    knobs: Knobs,
    debug: boolean
) {
    const usernames = profiles.map(p => normUser(p.username)).filter(Boolean);
    const KnownKinky = new Set<string>();
    for (const u of usernames) if (SEED_ALLOW.has(u)) KnownKinky.add(u);

    const baselineMap = new Map<string, BaselineScore>();
    for (const p of profiles) {
        const u = normUser(p.username); if (!u) continue;
        baselineMap.set(u, baselineKink(extracted.get(u)!, knobs));
    }

    // Stage-1 social scores (vs current KnownKinky seeds)
    const socStage1 = new Map<string, { s: number; stats: SocialStats }>();
    for (const p of profiles) {
        const u = normUser(p.username); if (!u) continue;
        const st = computeSocialStats(u, safe(p.followsCount, 0), graph, mentions.MentionsOut, mentions.MentionsIn, KnownKinky);
        socStage1.set(u, { s: socialScore(st), stats: st });
    }
    const pass1Cut = toPercentileThreshold(Array.from(socStage1.values()).map(v => v.s), knobs.SOCIAL_STRONG_THRESHOLD_FRAC);

    // Pass 1: baseline >= threshold && s >= pass1Cut; autoDQ blocks
    for (const p of profiles) {
        const u = normUser(p.username); if (!u) continue;
        const base = baselineMap.get(u)!; const s = socStage1.get(u)!.s;
        if (!base.autoDQ && (base.baseKinkScore >= knobs.BASELINE_KINK_THRESHOLD) && (s >= pass1Cut)) KnownKinky.add(u);
    }

    // Pass 2: Social proximity / REINCLUDE override
    for (const p of profiles) {
        const u = normUser(p.username); if (!u || KnownKinky.has(u)) continue;
        const base = baselineMap.get(u)!;
        const st = computeSocialStats(u, safe(p.followsCount, 0), graph, mentions.MentionsOut, mentions.MentionsIn, KnownKinky);

        if (base.autoDQ) {
            const sum = st.mutual_known + st.mentions_out_to_known + st.inbound_mentions_from_known;
            if (sum > REINCLUDE_SUM_MIN) {
                KnownKinky.add(u); // re-include via vouching
            }
        } else {
            // Regular backdoor
            const s = socialScore(st);
            const pass2Cut = toPercentileThreshold(Array.from(socStage1.values()).map(v => v.s), Math.min(0.10, knobs.SOCIAL_STRONG_THRESHOLD_FRAC));
            if (st.out_kinky >= 5 || st.mutual_known >= 3 || st.mentions_out_to_known >= 3 || s >= pass2Cut) KnownKinky.add(u);
        }
    }

    if (debug) {
        let edges = 0, nodes = new Set<string>();
        for (const [src, dsts] of graph.FollowsOut) { nodes.add(src); for (const d of dsts) { nodes.add(d); edges++; } }
        log('DIAG Graph:', { edges, nodes: nodes.size, profiles: usernames.length, knownKinky: KnownKinky.size });
    }

    return { KnownKinky, baselineMap };
}

// ---------------- Scoring & classification ----------------
type DetailRow = {
    playParty: number; workshop: number; attendee: number; penalties: number;
    followers: number; follows: number; avgLikes: number; mediaCount: number;
    hasTicketLink: boolean; linkHubCount: number; rsvpWordCount: number;
    socialScore: number; outKinky: number; mutualKnown: number; mentionsOutToKnown: number; inboundMentionsFromKnown: number;
};
type RowOut = { username: string; name?: string; classified: string[]; score: number; details: DetailRow; reasons: string[]; };

function classifyAll(
    profiles: Profile[],
    extracted: Map<string, ExtractedText>,
    graph: Graph,
    mentions: { MentionsOut: Map<string, Set<string>>, MentionsIn: Map<string, Set<string>> },
    KnownKinky: Set<string>,
    baselineMap: Map<string, BaselineScore>,
    knobs: Knobs,
    debug: boolean,
    limit?: number,
    onlyProfile?: string
): RowOut[] {
    const rows: RowOut[] = [];

    for (const p of profiles) {
        const u = normUser(p.username);
        if (!u) continue;
        if (onlyProfile && !u.includes(normUser(onlyProfile))) continue;

        const ex = extracted.get(u)!;
        const base = baselineMap.get(u)!;
        const hits = computeKeywordHits(ex.collapsedText);

        const st = computeSocialStats(u, safe(p.followsCount, 0), graph, mentions.MentionsOut, mentions.MentionsIn, KnownKinky);
        const sScore = socialScore(st);
        const gprox = st.out_kinky + st.mutual_known + st.mentions_out_to_known + st.inbound_mentions_from_known;
        const kinkAnchored = base.hasStrongKink || base.baseKinkScore >= knobs.BASELINE_KINK_THRESHOLD;

        // If still autoDQ and NOT KnownKinky -> force none
        if (base.autoDQ && !KnownKinky.has(u)) {
            rows.push({
                username: u,
                name: p.fullName || undefined,
                classified: ['none'],
                score: 0.001,
                details: {
                    playParty: 0, workshop: 0, attendee: 0,
                    penalties: computePenalties(hits, knobs.penaltyCapTotal).penalty,
                    followers: safe(p.followersCount, 0),
                    follows: safe(p.followsCount, 0),
                    avgLikes: median(ex.mediaStats.likes),
                    mediaCount: safe(p.postsCount, 0),
                    hasTicketLink: ex.ticketDomains.length > 0,
                    linkHubCount: ex.linkHubDomains.length,
                    rsvpWordCount: base.rsvpCount,
                    socialScore: +sScore.toFixed(5),
                    outKinky: st.out_kinky,
                    mutualKnown: st.mutual_known,
                    mentionsOutToKnown: st.mentions_out_to_known,
                    inboundMentionsFromKnown: st.inbound_mentions_from_known,
                },
                reasons: ['Auto-disqualified: unguarded "acro*|dog"'],
            });
            continue;
        }

        // Category scores
        const XREF_PPWS_PER = 0.6;
        const XREF_AT_PER = 0.5;

        let pp = knobs.kinkKeywordWeight * (
            4 * Math.log2(1 + hits.ppVery.length) + 2 * Math.log2(1 + hits.ppHigh.length)
        );
        if (kinkAnchored && ex.ticketDomains.length) pp += knobs.ticketBoostPP;
        if (kinkAnchored && base.rsvpCount > 0) pp += knobs.rsvpBoostPP;
        if (kinkAnchored && ex.linkHubDomains.length) pp += knobs.linkHubBump;
        pp += knobs.xrefAlphaPPWS * (XREF_PPWS_PER * log1p(gprox));

        let ws = knobs.kinkKeywordWeight * (
            4 * Math.log2(1 + hits.wsVery.length) + 2 * Math.log2(1 + hits.wsHigh.length)
        );
        if (kinkAnchored && ex.ticketDomains.length) ws += knobs.ticketBoostWS;
        if (kinkAnchored && base.rsvpCount > 0) ws += knobs.rsvpBoostWS;
        if (kinkAnchored && ex.linkHubDomains.length) ws += knobs.linkHubBump;
        ws += knobs.xrefAlphaPPWS * (XREF_PPWS_PER * log1p(gprox));

        const A = 4, B = 2, C = 1;
        let at = knobs.kinkKeywordWeight * (
            A * Math.log2(1 + (hits.atHard.length + hits.ppVery.length + hits.wsVery.length)) +
            B * Math.log2(1 + (hits.atSoft.length + hits.ppHigh.length + hits.wsHigh.length)) +
            C * Math.log2(1 + hits.atContextHits.length)
        );
        at += knobs.xrefBetaAT * (XREF_AT_PER * log1p(gprox));

        const { penalty, reasons: negReasons } = computePenalties(hits, knobs.penaltyCapTotal);

        // size nudges
        const followers = safe(p.followersCount, 0);
        const follows = safe(p.followsCount, 0);
        const mediaCount = safe(p.postsCount, 0);
        const avgLikes = median(ex.mediaStats.likes);
        let sizeAdj = 0;
        if (followers > 20000) sizeAdj += 0.3; else if (followers < 200) sizeAdj -= 0.1;
        if (mediaCount > 200) sizeAdj += 0.2;
        if (avgLikes > 1000) sizeAdj += 0.2;
        pp += sizeAdj * 0.5; ws += sizeAdj * 0.4; at += sizeAdj * 0.3;

        let total = pp + ws + at - penalty;

        const classified: string[] = [];
        if (!KnownKinky.has(u)) { classified.push('none'); total *= 0.75; }
        else {
            if (pp >= knobs.PP_MIN) classified.push('play_party');
            if (ws >= knobs.FAC_MIN) classified.push('facilitator');
            if (!classified.length && at >= knobs.ATT_MIN) classified.push('attendee');
            if (!classified.length) classified.push('attendee');
        }

        // Reasons
        const reasons: string[] = [];
        if (kinkAnchored && ex.ticketDomains.length) reasons.push(`Ticket domains: ${take(ex.ticketDomains, 3).join(', ')}`);
        if (kinkAnchored && base.rsvpCount > 0) reasons.push(`RSVP phrases: ${Math.min(3, base.rsvpCount)} hit(s)`);
        if (hits.ppVery.length || hits.ppHigh.length) {
            const ppKw = uniq([...take(hits.ppVery, 3), ...take(hits.ppHigh, 3)]).slice(0, 3);
            if (ppKw.length) reasons.push(`Play party keywords: ${ppKw.map(x => `"${x}"`).join(', ')}`);
        }
        if (hits.wsVery.length || hits.wsHigh.length) {
            const wsKw = uniq([...take(hits.wsVery, 3), ...take(hits.wsHigh, 3)]).slice(0, 3);
            if (wsKw.length) reasons.push(`Workshop keywords: ${wsKw.map(x => `"${x}"`).join(', ')}`);
        }
        const graphUsers: string[] = [];
        const out = graph.FollowsOut.get(u) || new Set<string>();
        const inn = graph.FollowsIn.get(u) || new Set<string>();
        const mOut = mentions.MentionsOut.get(u) || new Set<string>();
        const mIn = mentions.MentionsIn.get(u) || new Set<string>();
        for (const x of out) if (KnownKinky.has(x)) graphUsers.push('@' + x);
        for (const x of out) if (KnownKinky.has(x) && inn.has(x)) graphUsers.push('@' + x);
        for (const x of mOut) if (KnownKinky.has(x)) graphUsers.push('@' + x);
        for (const x of mIn) if (KnownKinky.has(x)) graphUsers.push('@' + x);
        const gTop = uniq(graphUsers).slice(0, 3);
        if (gTop.length) reasons.push(`Graph proximity: ${gTop.join(', ')}`);
        if (negReasons.length) reasons.push(...take(negReasons, 2));

        rows.push({
            username: u,
            name: p.fullName || undefined,
            classified,
            score: +total.toFixed(3),
            details: {
                playParty: +pp.toFixed(3),
                workshop: +ws.toFixed(3),
                attendee: +at.toFixed(3),
                penalties: penalty,
                followers, follows, avgLikes, mediaCount,
                hasTicketLink: ex.ticketDomains.length > 0,
                linkHubCount: ex.linkHubDomains.length,
                rsvpWordCount: base.rsvpCount,
                socialScore: +sScore.toFixed(5),
                outKinky: st.out_kinky,
                mutualKnown: st.mutual_known,
                mentionsOutToKnown: st.mentions_out_to_known,
                inboundMentionsFromKnown: st.inbound_mentions_from_known,
            },
            reasons: take(reasons, 8),
        });
    }

    const final = typeof limit === 'number' ? rows.slice(0, limit) : rows;

    if (debug && final.length >= 3) {
        const sorted = [...final].sort((a, b) => b.score - a.score);
        const top = sorted[0];
        const mid = sorted[Math.floor(sorted.length / 2)];
        const bot = sorted[sorted.length - 1];
        for (const s of [top, mid, bot]) log('DEBUG SAMPLE', s.username, { classified: s.classified, score: s.score, details: s.details, reasons: s.reasons });
    }
    return final;
}

// ---------------- Influence, lists ----------------
function influenceScore(row: RowOut): number {
    const s = row.details;
    const f = (x: number) => boundedLog(x, 1.5);
    return (
        0.35 * f(s.followers) +
        0.10 * f(s.mediaCount) +
        0.10 * f(s.avgLikes) +
        0.15 * f(s.outKinky) +
        0.15 * f(s.inboundMentionsFromKnown) +
        0.10 * f(s.mentionsOutToKnown) +
        0.05 * f(s.mutualKnown)
    );
}

// ---------------- Corpus ----------------
type CorpusRow = {
    username: string; fullName?: string; classified: string[]; totalScore: number;
    playPartyScore: number; workshopScore: number; attendeeScore: number; penalties: number;
    hasTicketLink: boolean; linkHubCount: number; rsvpWordCount: number;
    followers: number; follows: number; avgLikes: number; mediaCount: number;
    collapsedText: string;
};

function buildCorpus(rows: RowOut[], extracted: Map<string, ExtractedText>, profMap: Map<string, Profile>): CorpusRow[] {
    const out: CorpusRow[] = [];
    for (const r of rows) {
        const ex = extracted.get(r.username)!;
        const p = profMap.get(r.username);
        out.push({
            username: r.username,
            fullName: p?.fullName || undefined,
            classified: r.classified,
            totalScore: r.score,
            playPartyScore: r.details.playParty,
            workshopScore: r.details.workshop,
            attendeeScore: r.details.attendee,
            penalties: r.details.penalties,
            hasTicketLink: r.details.hasTicketLink,
            linkHubCount: r.details.linkHubCount,
            rsvpWordCount: r.details.rsvpWordCount,
            followers: r.details.followers,
            follows: r.details.follows,
            avgLikes: r.details.avgLikes,
            mediaCount: r.details.mediaCount,
            collapsedText: ex.collapsedText,
        });
    }
    return out.sort((a, b) => b.totalScore - a.totalScore);
}

async function writeChunksFromCorpus(corpus: CorpusRow[], outDir: string) {
    const mega = corpus.map(c => [
        `@${c.username}`, c.fullName ? `(${c.fullName})` : '',
        `| classified=[${c.classified.join(',')}]`, `| score=${c.totalScore.toFixed(3)}`,
        `| PP=${c.playPartyScore.toFixed(2)} WS=${c.workshopScore.toFixed(2)} AT=${c.attendeeScore.toFixed(2)} PEN=${c.penalties}`,
        `| TICKET=${c.hasTicketLink} linkHubs=${c.linkHubCount} RSVP=${c.rsvpWordCount}`,
        `| FOL=${c.followers} FOLLOWS=${c.follows} AVG_LIKES=${c.avgLikes} MEDIA=${c.mediaCount}`,
        `\n${c.collapsedText}\n\n---\n`
    ].join(' ')).join('');

    const slices = chunkString(mega, 20000);
    const tiers = { top: [] as string[], mid: [] as string[], bottom: [] as string[] };
    tiers.top = take(slices, 5);
    const midStart = Math.max(0, Math.floor(slices.length / 2) - 2);
    tiers.mid = take(slices.slice(midStart), 5);
    const botStart = Math.max(0, slices.length - 5);
    tiers.bottom = slices.slice(botStart);
    for (const key of Object.keys(tiers) as (keyof typeof tiers)[]) while (tiers[key].length < 5) tiers[key].push('');

    const chunkDir = path.join(outDir, 'chunks');
    await fs.mkdir(chunkDir, { recursive: true });
    for (const tier of ['top', 'mid', 'bottom'] as const) {
        for (let i = 0; i < 5; i++) {
            const fname = `${tier}-chunk-${String(i + 1).padStart(4, '0')}.txt`;
            await fs.writeFile(path.join(chunkDir, fname), tiers[tier][i] ?? '', 'utf8');
        }
    }
}

// ---------------- Main ----------------
async function main() {
    const args = parseArgs(process.argv);
    const presetName = PRESETS[args.preset] ? args.preset : 'default';
    const knobs = PRESETS[presetName];
    const outDir = path.resolve(ROOT, 'output');

    const { profiles, following } = await loadInputs();

    // build graph, extract, mentions
    const graph = buildGraph(following);
    const extracted = new Map<string, ExtractedText>();
    for (const p of profiles) { const u = normUser(p.username); if (!u) continue; extracted.set(u, collectProfileText(p)); }
    const mentions = buildMentionMaps(profiles, extracted);

    // passes
    const { KnownKinky, baselineMap } = passKnownKinky(profiles, extracted, graph, mentions, knobs, !!args.debug);

    // classify
    let rows = classifyAll(profiles, extracted, graph, mentions, KnownKinky, baselineMap, knobs, !!args.debug, args.limit, args.profile);

    // sort by score desc (global)
    rows = rows.sort((a, b) => b.score - a.score);

    // write heuristics_<preset>.json (sorted)
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(path.join(outDir, `heuristics_${presetName}.json`), JSON.stringify(rows, null, 2), 'utf8');

    // Build filtered rows for influence/other lists (exclude ['none'])
    const keep = rows.filter(r => !(r.classified.length === 1 && r.classified[0] === 'none'));

    // influence + lists
    const byInfluence = keep.map(r => ({ username: r.username, influence: +influenceScore(r).toFixed(5), row: r }))
        .sort((a, b) => b.influence - a.influence);
    await fs.writeFile(path.join(outDir, `heuristics_by_influence_${presetName}.json`), JSON.stringify(byInfluence, null, 2), 'utf8');

    const attendees = keep
        .filter(r => r.classified.includes('attendee') || (!r.classified.includes('play_party') && !r.classified.includes('facilitator')))
        .map(r => ({
            username: r.username,
            out_kinky: r.details.outKinky,
            mentions_out_to_known: r.details.mentionsOutToKnown,
            mediaCount: r.details.mediaCount,
            score: (r.details.outKinky * 1.0) + (r.details.mentionsOutToKnown * 0.8) + (r.details.mediaCount * 0.01)
        }))
        .sort((a, b) => b.score - a.score);
    await fs.writeFile(path.join(outDir, `most-active-attendees_${presetName}.json`), JSON.stringify(attendees, null, 2), 'utf8');

    const influentialFac = byInfluence
        .filter(x =>
            (x.row.classified.includes('facilitator') || x.row.classified.includes('play_party')) &&
            (x.row.details.workshop >= knobs.FAC_MIN || x.row.details.playParty >= knobs.PP_MIN)
        )
        .map(x => ({ username: x.username, influence: x.influence, classified: x.row.classified, details: x.row.details }));
    await fs.writeFile(path.join(outDir, `most-influential-facilitators_${presetName}.json`), JSON.stringify(influentialFac, null, 2), 'utf8');

    // corpus + chunks (built from sorted rows; include everyone to match spec, or use `keep` if you only want non-none)
    const profMap = new Map<string, Profile>();
    for (const p of profiles) { const u = normUser(p.username); if (u) profMap.set(u, p); }
    const corpus = buildCorpus(rows, extracted, profMap);
    await fs.writeFile(path.join(outDir, 'llm_corpus.json'), JSON.stringify(corpus, null, 2), 'utf8');
    await writeChunksFromCorpus(corpus, outDir);

    // usernames only (reverse score order = score-desc)
    const usernamesDesc = rows.map(r => r.username);
    await fs.writeFile(path.join(outDir, 'usernames_desc.txt'), usernamesDesc.join('\n'), 'utf8');

    if (args.debug) log('Done. Files written to /output');
}

main().catch(err => {
    console.error('[IG-CLS:ERROR]', err?.stack || err?.message || err);
    process.exit(1);
});
