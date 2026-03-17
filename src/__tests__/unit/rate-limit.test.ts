/**
 * Unit: checkRateLimit — src/lib/rate-limit.ts
 *
 * Strategy:
 *  - Mock @upstash/ratelimit and @upstash/redis at module level
 *  - Use vi.resetModules() + dynamic import() in each test to reset the
 *    module-level `let ratelimit = null` singleton between tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock before any imports of the module under test.
// vi.mock is hoisted by Vitest so these run before the dynamic imports below.
vi.mock('@upstash/ratelimit', () => {
  const RatelimitMock = vi.fn().mockImplementation(function () {
    return { limit: vi.fn() };
  });
  // slidingWindow is a static method used in rate-limit.ts line 17
  (RatelimitMock as unknown as Record<string, unknown>).slidingWindow = vi
    .fn()
    .mockReturnValue({});
  return { Ratelimit: RatelimitMock };
});
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(function () {
    return {};
  }),
}));

beforeEach(() => {
  vi.resetModules();
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

// ─────────────────────────────────────────────────────────────────────────────
describe('checkRateLimit', () => {
  it('returns true when limit() resolves { success: true }', async () => {
    const { Ratelimit } = await import('@upstash/ratelimit');
    vi.mocked(Ratelimit).mockImplementation(function () {
      return { limit: vi.fn().mockResolvedValue({ success: true }) };
    } as never);

    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';

    const { checkRateLimit } = await import('@/lib/rate-limit');
    expect(await checkRateLimit('test-ip')).toBe(true);
  });

  it('returns false when limit() resolves { success: false }', async () => {
    const { Ratelimit } = await import('@upstash/ratelimit');
    vi.mocked(Ratelimit).mockImplementation(function () {
      return { limit: vi.fn().mockResolvedValue({ success: false }) };
    } as never);

    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';

    const { checkRateLimit } = await import('@/lib/rate-limit');
    expect(await checkRateLimit('test-ip')).toBe(false);
  });

  it('returns true (graceful fallback) when UPSTASH env vars are NOT set', async () => {
    // env vars already deleted in beforeEach
    const { checkRateLimit } = await import('@/lib/rate-limit');
    expect(await checkRateLimit('test-ip')).toBe(true);
  });

  it('returns true (graceful fallback) when limit() throws', async () => {
    const { Ratelimit } = await import('@upstash/ratelimit');
    vi.mocked(Ratelimit).mockImplementation(function () {
      return { limit: vi.fn().mockRejectedValue(new Error('Redis connection refused')) };
    } as never);

    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';

    const { checkRateLimit } = await import('@/lib/rate-limit');
    expect(await checkRateLimit('test-ip')).toBe(true);
  });
});
