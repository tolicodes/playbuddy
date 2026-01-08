import { connectRedisClient } from "../connections/redisClient.js";

export const flushEvents = async () => {
    try {
        const redisClient = await connectRedisClient();
        await redisClient.del("events", "events:includeHidden"); // Clear event caches
    } catch (err) {
        console.error('[flushEvents] redis unavailable, skipping cache flush', err);
    }
}
