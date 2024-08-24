import { connectRedisClient } from "../../connections/redisClient";
import { supabaseClient } from "../../connections/supabaseClient";

exports.handler = async function (event, context) {
  const cacheKey = 'events';
  let redisClient;

  try {
    redisClient = await connectRedisClient();
    console.log('Connected to Redis');

    const cacheData = await redisClient.get(cacheKey);
    console.log('Cache data:', cacheData);

    if (cacheData) {
      // Return cached data
      return {
        statusCode: 200,
        body: cacheData,
      };
    } else {
      // Fetch data from Supabase if not in cache
      const { data, error } = await supabaseClient
        .from('events')
        .select(`
          *,
          organizer:organizers(name, url)
        `);

      if (error) {
        throw new Error(error.message);
      }

      console.log('Fetched data from Supabase:', data);

      const formattedData = data.map(event => ({
        ...event,
        organizer: event.organizer.name,
        organizer_url: event.organizer.url,
      }));

      const responseData = JSON.stringify(formattedData);

      // Cache the new data in Redis
      await redisClient.setEx(cacheKey, 600, responseData); // Cache for 10 minutes

      return {
        statusCode: 200,
        body: responseData,
      };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  } finally {
    redisClient?.quit();
  }
};
