import { createClient } from 'redis';
import { env } from './env';

export const redisClient = createClient({
  url: env.REDIS_URL,
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Redis connected');
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    process.exit(1);
  }
};

export const disconnectRedis = async () => {
  await redisClient.quit();
};
