import PQueue from 'p-queue';
import axios from 'axios';

const TIMEOUT = 60000;
const MAX_RETRIES = 3;
const RETRY_PAUSE = 10000;
const CONCURRENCY = 5;

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
let pauseUntil: Promise<void> | null = null;

const status = {
    total: 0,
    completed: 0,
    failed: 0,
    success: 0,

    // Temp stats
    retries: 0,

    // ERRORS
    functionTimeout: 0,

    // SCRAPE.DO ERRORS
    scrapeDoOtherError: 0,
};

function logStatsIfDone() {
    if (status.completed === status.total) {
        console.log('\n📊 Final Stats:');
        console.table(status);
    }
}

async function scrapeWithScrapeDo(url: string): Promise<string> {
    const res = await axios.get(`http://api.scrape.do/`, {
        params: {
            url,
            token: process.env.SCRAPE_DO_TOKEN,
        },
        responseType: 'text', // ensure we get raw HTML/text
        timeout: TIMEOUT, // native axios timeout as a backup
    }).then(res => res.data);
    return res;

}

async function handlePause(ms: number, reason: string) {
    if (!pauseUntil) {
        console.warn(`⏸ Pausing queue for ${ms}ms due to ${reason}`);
        queue.pause();
        pauseUntil = sleep(ms).then(() => {
            pauseUntil = null;
            queue.start();
            console.log('▶️ Queue resumed');
        });
    }
    await pauseUntil;
}

function classifyError(err: Error): keyof typeof status {
    const msg = err.message.toLowerCase();
    if (msg.includes('function timeout')) return 'functionTimeout';
    return 'scrapeDoOtherError';
}

export async function getUsingProxy({
    url,
    json = true,
    label = url,
}: {
    url: string;
    json?: boolean;
    label?: string;
}): Promise<any> {
    status.total++;
    const start = Date.now();
    console.log(`[${status.completed}/${status.total}] 🔄 Queued | ${label}`);

    try {
        const res = await scrapeWithScrapeDo(url);
        const duration = Date.now() - start;
        status.success++;
        status.completed++;
        console.log(`✅ [${status.completed}/${status.total}] Done in ${duration}ms | ${label}`);
        logStatsIfDone();
        return json ? JSON.parse(res) : res;
    } catch (err: any) {
        const type = classifyError(err);
        status[type]++;
        status.failed++;
        console.error(`❌ ${label} | ${err.message}`);

        await handlePause(RETRY_PAUSE, type);

        status.completed++;
        logStatsIfDone();
        return null; // resolve null to avoid hanging in Promise.all
    }
}

const queue = new PQueue({ concurrency: CONCURRENCY });

export function addURLToQueue({ url, json = true, label }: { url: string; json?: boolean; label?: string }) {
    queue.start(); // no-op if already started
    return queue.add(() => getUsingProxy({ url, json, label }));
}
