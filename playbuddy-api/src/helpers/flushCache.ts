import { connectRedisClient } from "../connections/redisClient.js";

const EVENT_CACHE_PATTERN = "events*";
const FALLBACK_EVENT_KEYS = ["events", "events:includeHidden"];

const collectEventCacheKeys = async (redisClient: any) => {
    const keys = new Set<string>(FALLBACK_EVENT_KEYS);
    let cursor = "0";
    do {
        const [nextCursor, batch] = await redisClient.scan(
            cursor,
            "MATCH",
            EVENT_CACHE_PATTERN,
            "COUNT",
            200
        );
        cursor = nextCursor;
        (batch || []).forEach((key: string) => keys.add(key));
    } while (cursor !== "0");
    return Array.from(keys);
};

export const flushEvents = async () => {
    try {
        const redisClient = await connectRedisClient();
        const keys = await collectEventCacheKeys(redisClient);
        if (keys.length) {
            const chunkSize = 500;
            for (let i = 0; i < keys.length; i += chunkSize) {
                await redisClient.del(...keys.slice(i, i + chunkSize));
            }
        }
    } catch (err) {
        console.error('[flushEvents] redis unavailable, skipping cache flush', err);
    }
};
