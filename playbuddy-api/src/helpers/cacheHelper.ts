export const fetchAndCacheData = async (
    redisClient: any,
    cacheKey: string,
    supabaseQuery: () => any,
    flushCache: boolean = false // Default to false if not provided
): Promise<string> => {
    if (flushCache) {
        console.log(`Flushing cache for key: ${cacheKey}`);
        await redisClient.del(cacheKey); // Clear cache if flush is requested
    } else {
        const cacheData = await redisClient.get(cacheKey);
        if (cacheData) return cacheData;
    }

    const { data, error } = await supabaseQuery();
    if (error) throw new Error(error.message);

    const responseData = JSON.stringify(data);
    await redisClient.set(cacheKey, responseData, "EX", 600); // Cache for 10 minutes

    return responseData;
};
