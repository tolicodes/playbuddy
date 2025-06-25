import { connectRedisClient } from "../connections/redisClient.js";

export const flushEvents = async () => {
    const redisClient = await connectRedisClient();
    await redisClient.del("events"); // Clear cache if flush is requested
}
