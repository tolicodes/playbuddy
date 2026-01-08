import { connectRedisClient } from "../connections/redisClient.js";

export const flushEvents = async () => {
    try {
        const redisClient = await connectRedisClient();
        await redisClient.del("events"); // Clear cache if flush is requested
    } catch (err) {
        console.error('[flushEvents] redis unavailable, skipping cache flush', err);
    }
}
