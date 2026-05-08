import Redis from 'ioredis';

export const redis = new Redis(
  process.env.REDIS_URL ?? 'redis://localhost:6379',
  {db: process.env.NODE_ENV === 'test' ? 1 : 0},
);
