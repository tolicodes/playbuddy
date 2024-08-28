import { Redis } from "ioredis";

import dotenv from "dotenv";
dotenv.config();

const redisPassword = process.env.REDIS_PASSWORD;

const redisClient = new Redis(
  `redis://default:${redisPassword}@redis-19131.c239.us-east-1-2.ec2.redns.redis-cloud.com:19131`,
);

export const connectRedisClient = async () => {
  return redisClient;
};
