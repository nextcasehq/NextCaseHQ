import { getRedisClient } from '@/lib/security/redis-client';

// Each test file that (directly or via a route handler) calls
// checkDistributedRateLimit() lazily opens a real ioredis TCP connection
// when REDIS_URL is set. Nothing else in the app ever needs to close it
// (a real server keeps it open for its whole lifetime), but Jest workers
// need every handle closed to exit cleanly.
afterAll(() => {
  getRedisClient()?.disconnect();
});
