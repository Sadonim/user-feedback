import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Lazily initialized — avoids crashing at module load when env vars are absent
let ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (ratelimit) return ratelimit;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn('[RateLimit] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set — rate limiting disabled');
    return null;
  }
  ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(5, '10 m'),
    analytics: false,
    prefix: 'uf:rl',
  });
  return ratelimit;
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
