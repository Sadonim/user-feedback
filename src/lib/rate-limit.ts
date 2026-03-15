/**
 * Simple in-memory rate limiter for development / single-instance use.
 * Phase 4: Replace with Upstash Redis for production multi-instance support.
 *
 * Limit: 5 submissions per IP per 10 minutes.
 */

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS = 5;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 15 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) {
        store.delete(key);
      }
    }
  }, 15 * 60 * 1000);
}

export async function checkRateLimit(key: string): Promise<boolean> {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_REQUESTS) {
    return false;
  }

  store.set(key, { ...entry, count: entry.count + 1 });
  return true;
}
