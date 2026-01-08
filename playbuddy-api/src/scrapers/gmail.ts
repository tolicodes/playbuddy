import { OAuth2Client } from 'google-auth-library';
import type { NormalizedEventInput } from '../commonTypes.js';
import { ScraperParams } from './types.js';
import scrapeURLs from './helpers/scrapeURLs.js';
import { canonicalUrlKey } from './ai/normalize.js';
import { extractEventLinksAIOnly } from './ai/discovery.js';
import { extractEventAIOnly } from './ai/single.js';

export type GmailSourceConfig = {
    source_email: string;
    event_status?: 'pending' | 'approved';
};

type GmailMessageHeader = { name?: string; value?: string };
type GmailMessagePart = {
    mimeType?: string;
    body?: { data?: string };
    parts?: GmailMessagePart[];
    headers?: GmailMessageHeader[];
};
type GmailMessage = {
    id?: string;
    snippet?: string;
    payload?: GmailMessagePart;
};

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
const MAX_RESULTS_DEFAULT = Number(process.env.GMAIL_MAX_RESULTS || 1);
const MAX_BODY_CHARS = Number(process.env.GMAIL_MAX_BODY_CHARS || 50_000);
const DEBUG = true;

const logDebug = (...args: unknown[]) => {
    if (DEBUG) console.log('[gmail]', ...args);
};

const truncate = (value: string, max = 160) => {
    if (!value) return '';
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
};

let authPromise: Promise<OAuth2Client> | null = null;

async function authorizeGmailFromToken(): Promise<OAuth2Client> {
    if (authPromise) return authPromise;
    authPromise = (async () => {
        const token = loadGmailTokenFromEnv();
        const clientId = token.client_id || token.clientId;
        const clientSecret = token.client_secret || token.clientSecret;
        if (!clientId || !clientSecret) {
            throw new Error('GMAIL_TOKEN_JSON must include client_id and client_secret');
        }
        const refreshToken = token.refresh_token || token.refreshToken;
        if (!refreshToken) {
            throw new Error('GMAIL_TOKEN_JSON must include refresh_token for server automation');
        }
        const oAuth2Client = new OAuth2Client(clientId, clientSecret);
        oAuth2Client.setCredentials({
            access_token: token.access_token || token.accessToken,
            refresh_token: refreshToken,
            scope: token.scope,
            token_type: token.token_type || token.tokenType,
            expiry_date: token.expiry_date || token.expiryDate,
        });
        return oAuth2Client;
    })();
    return authPromise;
}

function loadGmailTokenFromEnv(): Record<string, any> {
    const raw = process.env.GMAIL_TOKEN_JSON;
    if (!raw) {
        throw new Error('Missing GMAIL_TOKEN_JSON env var');
    }
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
    } catch {
        // fall through
    }
    throw new Error('GMAIL_TOKEN_JSON must be valid JSON');
}

function decodeBase64(raw: string): string {
    const normalized = raw.replace(/-/g, '+').replace(/_/g, '/');
    const pad = normalized.length % 4;
    const padded = pad ? normalized + '='.repeat(4 - pad) : normalized;
    return Buffer.from(padded, 'base64').toString('utf-8');
}

function decodeQuotedPrintable(value: string): string {
    if (!value) return value;
    const withoutSoftBreaks = value.replace(/=\r?\n/g, '');
    const bytes: number[] = [];
    for (let i = 0; i < withoutSoftBreaks.length; i += 1) {
        const ch = withoutSoftBreaks[i];
        if (ch === '=' && i + 2 < withoutSoftBreaks.length) {
            const hex = withoutSoftBreaks.slice(i + 1, i + 3);
            if (/^[0-9a-fA-F]{2}$/.test(hex)) {
                bytes.push(parseInt(hex, 16));
                i += 2;
                continue;
            }
        }
        bytes.push(withoutSoftBreaks.charCodeAt(i));
    }
    return Buffer.from(bytes).toString('utf-8');
}

function getHeader(headers: GmailMessageHeader[] | undefined, name: string): string | undefined {
    if (!headers) return undefined;
    const found = headers.find(h => h?.name?.toLowerCase() === name.toLowerCase());
    return found?.value;
}

function extractParts(part: GmailMessagePart | undefined, out: { text?: string; html?: string }) {
    if (!part) return;
    if (part.mimeType === 'text/plain' && part.body?.data && !out.text) {
        out.text = decodeBase64(part.body.data);
    }
    if (part.mimeType === 'text/html' && part.body?.data && !out.html) {
        out.html = decodeBase64(part.body.data);
    }
    if (part.parts) {
        for (const child of part.parts) extractParts(child, out);
    }
}

function stripHtmlToText(html: string): string {
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeDiscoveredUrl(raw: string): string | null {
    try {
        return new URL(raw).toString();
    } catch {
        return null;
    }
}

function dedupeUrls(urls: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const url of urls) {
        const key = canonicalUrlKey(url);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(url);
    }
    return out;
}

async function extractEventUrlsWithDiscoveryAI(args: {
    body: string;
    html: string;
    messageId: string;
    nowISO: string;
}) {
    const { body, html, messageId, nowISO } = args;
    const htmlInput = (html || body || '').trim();
    if (!htmlInput) return { type: 'single' as const, urls: [] as string[] };

    const baseUrl = `https://email.local/${encodeURIComponent(messageId)}`;
    try {
        const discovered = await extractEventLinksAIOnly(htmlInput, baseUrl, nowISO);
        const out: string[] = [];
        for (const item of discovered?.items || []) {
            const resolved = normalizeDiscoveredUrl(item.url);
            if (resolved) out.push(resolved);
        }
        return {
            type: discovered?.type === 'single' ? 'single' : 'list',
            urls: dedupeUrls(out),
        };
    } catch (err) {
        console.error(`[gmail] AI discovery failed message=${messageId}`, err);
        return { type: 'single' as const, urls: [] as string[] };
    }
}

async function extractEventUrls(args: {
    body: string;
    html: string;
    messageId: string;
    nowISO: string;
}) {
    const { body, html, messageId, nowISO } = args;
    return extractEventUrlsWithDiscoveryAI({
        body,
        html,
        messageId,
        nowISO,
    });
}

async function listGmailMessages(auth: OAuth2Client, query: string, maxResults: number): Promise<string[]> {
    const url = new URL(`${GMAIL_API_BASE}/messages`);
    url.searchParams.set('q', query);
    url.searchParams.set('maxResults', String(maxResults));

    const res = await auth.request({ url: url.toString() });
    const data = res.data as { messages?: { id?: string }[] };
    logDebug('list messages', { query, maxResults, count: data.messages?.length || 0 });
    return (data.messages || []).map(m => m.id).filter((id): id is string => Boolean(id));
}

async function getGmailMessage(auth: OAuth2Client, messageId: string): Promise<{
    subject: string;
    from: string;
    body: string;
    html: string;
    messageId: string;
}> {
    const url = new URL(`${GMAIL_API_BASE}/messages/${messageId}`);
    url.searchParams.set('format', 'full');
    const res = await auth.request({ url: url.toString() });
    const message = res.data as GmailMessage;
    const payload = message.payload;
    const headers = payload?.headers || [];
    const subject = getHeader(headers, 'Subject') || '';
    const from = getHeader(headers, 'From') || '';

    const out: { text?: string; html?: string } = {};
    extractParts(payload, out);
    const rawText = out.text?.trim() || '';
    const rawHtml = out.html?.trim() || '';
    const text = rawText ? decodeQuotedPrintable(rawText) : '';
    const html = rawHtml ? decodeQuotedPrintable(rawHtml) : '';
    let body = text || (html ? stripHtmlToText(html) : '');
    if (!body) body = (message.snippet || '').trim();
    if (body.length > MAX_BODY_CHARS) body = body.slice(0, MAX_BODY_CHARS);

    return { subject, from, body, html, messageId };
}

async function scrapeGmailSourceWithAuth(
    auth: OAuth2Client,
    sourceEmail: string,
    eventDefaults: Partial<NormalizedEventInput>,
    maxResults?: number
): Promise<NormalizedEventInput[]> {
    const query = `from:${sourceEmail}`;
    const max = maxResults || MAX_RESULTS_DEFAULT;
    console.log(`[gmail] start source=${sourceEmail} maxResults=${max}`);
    const messageIds = await listGmailMessages(auth, query, max);
    console.log(`[gmail] source=${sourceEmail} messages=${messageIds.length}`);
    if (messageIds.length === 0) return [];

    const collectedUrls = new Set<string>();
    const directEvents: NormalizedEventInput[] = [];
    const nowISO = new Date().toISOString();
    let discoveredCount = 0;

    for (const messageId of messageIds) {
        try {
            const msg = await getGmailMessage(auth, messageId);
            logDebug('message', {
                id: messageId,
                subject: truncate(msg.subject),
                from: truncate(msg.from),
                bodyChars: msg.body.length,
                htmlChars: msg.html.length,
            });

            const { type, urls } = await extractEventUrls({
                body: msg.body,
                html: msg.html,
                messageId,
                nowISO,
            });
            discoveredCount += urls.length;
            logDebug('event urls', { messageId, type, urls: urls.length });
            if (type === 'single' || urls.length === 0) {
                const htmlInput = (msg.html || msg.body || '').trim();
                if (htmlInput) {
                    const single = await extractEventAIOnly(htmlInput, `https://email.local/${encodeURIComponent(messageId)}`, eventDefaults);
                    if (single) directEvents.push(single);
                }
            } else {
                for (const url of urls) collectedUrls.add(url);
            }
        } catch (err) {
            console.error(`[gmail] Failed to process message ${messageId} from ${sourceEmail}`, err);
        }
    }

    const uniqueUrls = Array.from(collectedUrls);
    console.log(`[gmail] source=${sourceEmail} discovered=${discoveredCount} urls=${uniqueUrls.length} direct=${directEvents.length}`);
    const scraped = uniqueUrls.length ? await scrapeURLs(uniqueUrls, eventDefaults) : [];
    const combined = [...directEvents, ...scraped];
    if (combined.length === 0) return [];

    const withDates = combined.filter(ev => !!ev.start_date);
    const dropped = combined.length - withDates.length;
    if (dropped > 0) {
        logDebug('drop events without dates', { dropped, total: combined.length });
    }
    console.log(`[gmail] source=${sourceEmail} scraped=${scraped.length} direct=${directEvents.length} withDates=${withDates.length}`);

    return withDates;
}

export async function scrapeGmailSource(
    { url, eventDefaults, maxResults }: ScraperParams & { maxResults?: number }
): Promise<NormalizedEventInput[]> {
    const sourceEmail = url?.trim();
    if (!sourceEmail) return [];
    const auth = await authorizeGmailFromToken();
    return scrapeGmailSourceWithAuth(auth, sourceEmail, eventDefaults, maxResults);
}

export async function scrapeGmailSources(
    sources: GmailSourceConfig[],
    opts: { maxResults?: number } = {}
): Promise<NormalizedEventInput[]> {
    if (!sources?.length) return [];
    console.log(`[gmail] sources=${sources.length} maxResults=${opts.maxResults || MAX_RESULTS_DEFAULT}`);
    const auth = await authorizeGmailFromToken();
    const out: NormalizedEventInput[] = [];

    for (const source of sources) {
        const sourceEmail = source.source_email?.trim();
        if (!sourceEmail) continue;
        const status = (source.event_status || '').toLowerCase();
        const approval_status = status === 'approved' || status === 'pending' ? status : undefined;
        logDebug('source config', { sourceEmail, approval_status });
        const eventDefaults: Partial<NormalizedEventInput> = {
            ...(approval_status ? { approval_status } : {}),
            source_origination_group_name: sourceEmail,
        };

        const events = await scrapeGmailSourceWithAuth(auth, sourceEmail, eventDefaults, opts.maxResults);
        out.push(...events);
    }

    return out;
}
