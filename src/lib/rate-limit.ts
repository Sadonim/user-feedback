import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Lazily initialized — avoids crashing at module load when env vars are absent
let ratelimit: Ratelimit | null = null;
let trackRatelimit: Ratelimit | null = null;
let adminRatelimit: Ratelimit | null = null;

function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function getRatelimit(): Ratelimit | null {
  if (ratelimit) return ratelimit;
  const redis = getRedisClient();
  if (!redis) {
    console.warn('[RateLimit] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set — rate limiting disabled');
    return null;
  }
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '10 m'),
    analytics: false,
    prefix: 'uf:rl',
  });
  return ratelimit;
}

function getTrackRatelimit(): Ratelimit | null {
  if (trackRatelimit) return trackRatelimit;
  const redis = getRedisClient();
  if (!redis) return null;
  // Tracking lookup: 30 requests per 10 minutes per IP (브루트포스 방지)
  trackRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '10 m'),
    analytics: false,
    prefix: 'uf:rl:track',
  });
  return trackRatelimit;
}

function getAdminRatelimit(): Ratelimit | null {
  if (adminRatelimit) return adminRatelimit;
  const redis = getRedisClient();
  if (!redis) return null;
  // Admin users: 120 requests per minute per user ID
  adminRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(120, '1 m'),
    analytics: false,
    prefix: 'uf:rl:admin',
  });
  return adminRatelimit;
}

export async function checkRateLimit(key: string): Promise<boolean> {
  const rl = getRatelimit();
  if (!rl) return true; // disabled in dev

  try {
    const { success } = await rl.limit(key);
    return success;
  } catch (err) {
    console.error('[RateLimit] Redis error — allowing request', err);
    return true;
  }
}

/**
 * Rate limit for public ticket tracking endpoint.
 * Key should be the client IP address.
 * Limit: 30 requests per 10 minutes (브루트포스 스캔 방지).
 */
export async function checkTrackRateLimit(key: string): Promise<boolean> {
  const rl = getTrackRatelimit();
  if (!rl) return true;

  try {
    const { success } = await rl.limit(key);
    return success;
  } catch (err) {
    console.error('[RateLimit] Track Redis error — allowing request', err);
    return true;
  }
}

/**
 * Per-user rate limit for admin endpoints.
 * Key should be the authenticated admin user's ID.
 * Limit: 120 requests per minute (gracious for dashboard usage).
 */
export async function checkAdminRateLimit(userId: string): Promise<boolean> {
  const rl = getAdminRatelimit();
  if (!rl) return true; // disabled when Redis is not configured

  try {
    const { success } = await rl.limit(userId);
    return success;
  } catch (err) {
    console.error('[RateLimit] Admin Redis error — allowing request', err);
    return true;
  }
}
