import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

const redisPassword = process.env.REDIS_PASSWORD;
const redisClient = createClient({
  url: `redis://default:${redisPassword}@redis-19131.c239.us-east-1-2.ec2.redns.redis-cloud.com:19131`,
});

export const connectRedisClient = async () => {
  try {
    return redisClient.connect();
  } catch (err) {
    console.log(`Something went wrong connecting to redis ${err}`);
    throw err;
  }
};
