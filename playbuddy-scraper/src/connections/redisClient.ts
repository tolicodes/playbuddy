import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

const redisPassword = process.env.REDIS_PASSWORD;
const redisHost = process.env.REDIS_HOST;
const redisClient = createClient({
  url: `redis://default:${redisPassword}@${redisHost}`,
});

export const connectRedisClient = async () => {
  try {
    return redisClient.connect();
  } catch (err) {
    console.log(`Something went wrong connecting to redis ${err}`);
    throw err;
  }
};
