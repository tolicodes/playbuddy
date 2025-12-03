import axios from 'axios';
import Bottleneck from 'bottleneck';

const TIMEOUT = 60000;
const GLOBAL_CONCURRENCY = Number(process.env.SCRAPE_MAX_CONCURRENCY || 5);
const IDLE_REPORT_MS = 10_000;

const proxyLimiter = new Bottleneck({
    maxConcurrent: GLOBAL_CONCURRENCY,
});

// Simple stats tracker
const stats = {
    total: 0,
    success: 0,
    failed: 0,
    active: 0,
    lastFinished: 0,
};
let idleTimer: NodeJS.Timeout | null = null;

const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        if (stats.active === 0 && Date.now() - stats.lastFinished >= IDLE_REPORT_MS) {
            console.log('\n📊 Proxy queue stats');
            console.table({
                total: stats.total,
                success: stats.success,
                failed: stats.failed,
                active: stats.active,
            });
        }
    }, IDLE_REPORT_MS);
};

// Priority: 1 (highest) .. 10 (lowest) -> Bottleneck priority (higher number runs first)
const mapPriority = (p: number | undefined) => {
    const base = typeof p === 'number' ? p : 5;
    const clamped = Math.min(Math.max(base, 1), 10);
    return 20 - clamped;
};

async function scrapeWithScrapeDo(url: string): Promise<string> {
    const res = await axios
        .get(`http://api.scrape.do/`, {
            params: {
                url,
                token: process.env.SCRAPE_DO_TOKEN,
            },
            responseType: 'text',
            timeout: TIMEOUT,
        })
        .then(res => res.data);
    return res;
}

export async function getUsingProxy({
    url,
    json = true,
    label = url,
    priority,
}: {
    url: string;
    json?: boolean;
    label?: string;
    priority?: number; // 1=highest, 10=lowest
}): Promise<any> {
    const mapped = mapPriority(priority);
    stats.total += 1;
    console.log(`🔄 [proxy] queued | ${label}`);

    try {
        const res = await proxyLimiter.schedule({ priority: mapped }, async () => {
            stats.active += 1;
            console.log(`▶️ [proxy] start (active ${stats.active}/${GLOBAL_CONCURRENCY}) | ${label}`);
            try {
                const raw = await scrapeWithScrapeDo(url);
                const parsed = json ? JSON.parse(raw) : raw;
                stats.success += 1;
                console.log(`✅ [proxy] done | ${label}`);
                return parsed;
            } catch (err) {
                stats.failed += 1;
                console.error(`❌ [proxy] error | ${label} | ${(err as any)?.message || err}`);
                throw err;
            } finally {
                stats.active -= 1;
                stats.lastFinished = Date.now();
                resetIdleTimer();
            }
        });
        return res;
    } catch (err: any) {
        throw new Error(err?.message || `Scrape failed for ${label}`);
    }
}

// Backward-compatible helper
export function addURLToQueue({ url, json = true, label, priority }: { url: string; json?: boolean; label?: string; priority?: number }) {
    return getUsingProxy({ url, json, label, priority });
}
