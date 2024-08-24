import { connectRedisClient } from "../../connections/redisClient";
import { supabaseClient } from "../../connections/supabaseClient";
import { createIcal } from "./helpers/ical";

exports.handler = async function (event, context) {
  const cacheKey = 'events';
  let redisClient;

  try {
    redisClient = await connectRedisClient();
    console.log('Connected to Redis');

    const cacheData = await redisClient.get(cacheKey);
    console.log('Cache data');

    let responseData;
    let jsonData;

    if (cacheData) {
      // Return cached data
      responseData = cacheData;
      jsonData = JSON.parse(cacheData);
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

      console.log('Fetched data from Supabase');

      jsonData = data.map(event => ({
        ...event,
        organizer: event.organizer.name,
        organizer_url: event.organizer.url,
      }));

      const responseData = JSON.stringify(jsonData);

      // Cache the new data in Redis
      await redisClient.setEx(cacheKey, 600, responseData); // Cache for 10 minutes
    }

    if (event.queryStringParameters && event.queryStringParameters.format === 'ical') {
      // Handle the request for iCal format
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/calendar',
        },
        body: createIcal(jsonData),
      }
    };

    return {
      statusCode: 200,
      body: responseData,
    };

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
