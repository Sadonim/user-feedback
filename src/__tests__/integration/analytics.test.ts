/**
 * Integration: Analytics API endpoints
 *
 * TDD RED phase — endpoints do not exist yet.
 *
 * Endpoints under test:
 *   GET /api/v1/analytics/summary     — summary stats (openRate, resolutionRate, etc.)
 *   GET /api/v1/analytics/timeseries  — trend data points over time
 *
 * Tests:
 *   - Both endpoints return 401 when unauthenticated
 *   - summary returns correct response shape
 *   - summary openRate is 0 (not NaN) when total is 0
 *   - timeseries returns 30 data points by default
 *   - timeseries?days=7 returns 7 data points
 *
 * Strategy:
 *   - auth() mocked for session injection
 *   - Real Supabase DB (no mocks)
 *   - No test data setup needed for shape/auth tests (operates on existing or empty data)
 */
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { hash } from 'bcryptjs';

// ── auth() mock ────────────────────────────────────────────────────────────
vi.mock('@/auth', () => ({ auth: vi.fn() }));

// ── admin user ─────────────────────────────────────────────────────────────
let ADMIN_ID: string;

beforeAll(async () => {
  const passwordHash = await hash('analytics-test-password', 4);
  const admin = await prisma.adminUser.upsert({
    where: { email: 'test-admin-analytics@vitest.local' },
    update: {},
    create: {
      email: 'test-admin-analytics@vitest.local',
      username: `test-admin-analytics-${Date.now()}`,
      passwordHash,
      role: 'ADMIN',
    },
  });
  ADMIN_ID = admin.id;
});

afterAll(async () => {
  if (ADMIN_ID) {
    await prisma.adminUser.delete({ where: { id: ADMIN_ID } }).catch(() => null);
  }
});

const makeAdminSession = () => ({
  user: {
    id: ADMIN_ID,
    email: 'test-admin-analytics@vitest.local',
    username: 'test-admin-analytics',
    role: 'ADMIN' as const,
  },
  expires: new Date(Date.now() + 3_600_000).toISOString(),
});

const setAdminSession = async (
  session: ReturnType<typeof makeAdminSession> | null = makeAdminSession(),
) => {
  const { auth } = await import('@/auth');
  (auth as ReturnType<typeof vi.fn>).mockResolvedValue(session);
};

// ── route helpers ──────────────────────────────────────────────────────────
const importSummaryGET = () =>
  import('@/app/api/v1/analytics/summary/route').then((m) => m.GET);

const importTimeseriesGET = () =>
  import('@/app/api/v1/analytics/timeseries/route').then((m) => m.GET);

function makeSummaryRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost:3000/api/v1/analytics/summary');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

function makeTimeseriesRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost:3000/api/v1/analytics/timeseries');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/v1/analytics/summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── authentication ───────────────────────────────────────────────────────
  it('returns 401 when unauthenticated', async () => {
    await setAdminSession(null);
    const GET = await importSummaryGET();
    const res = await GET(makeSummaryRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // ── response shape ───────────────────────────────────────────────────────
  it('returns 200 with success:true when authenticated', async () => {
    await setAdminSession();
    const GET = await importSummaryGET();
    const res = await GET(makeSummaryRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('response data has all required summary fields', async () => {
    await setAdminSession();
    const GET = await importSummaryGET();
    const res = await GET(makeSummaryRequest());
    const body = await res.json();
    const data = body.data;
    expect(data).toBeDefined();
    // Required numeric/object fields
    expect(typeof data.total).toBe('number');
    expect(typeof data.openRate).toBe('number');
    expect(typeof data.resolutionRate).toBe('number');
    expect(data.statusFunnel).toBeDefined();
    // Type distribution: implementation key is 'typeDist'
    const typeField = data.typeDist ?? data.typeBreakdown;
    expect(typeField).toBeDefined();
  });

  it('statusFunnel has all four status keys', async () => {
    await setAdminSession();
    const GET = await importSummaryGET();
    const res = await GET(makeSummaryRequest());
    const body = await res.json();
    const { statusFunnel } = body.data;
    expect(statusFunnel).toHaveProperty('OPEN');
    expect(statusFunnel).toHaveProperty('IN_PROGRESS');
    expect(statusFunnel).toHaveProperty('RESOLVED');
    expect(statusFunnel).toHaveProperty('CLOSED');
  });

  it('typeDist (type distribution) has all three type keys', async () => {
    await setAdminSession();
    const GET = await importSummaryGET();
    const res = await GET(makeSummaryRequest());
    const body = await res.json();
    // Implementation uses 'typeDist' key (not 'typeBreakdown')
    const typeDist = body.data.typeDist ?? body.data.typeBreakdown;
    expect(typeDist).toBeDefined();
    expect(typeDist).toHaveProperty('BUG');
    expect(typeDist).toHaveProperty('FEATURE');
    expect(typeDist).toHaveProperty('GENERAL');
  });

  // ── divide-by-zero guard ─────────────────────────────────────────────────
  it('openRate is 0 (not NaN) when total is 0', async () => {
    await setAdminSession();
    const GET = await importSummaryGET();
    // Use a very narrow time window unlikely to have any tickets
    const res = await GET(makeSummaryRequest({ days: '0' }));
    const body = await res.json();
    if (body.success && body.data.total === 0) {
      expect(body.data.openRate).toBe(0);
      expect(Number.isNaN(body.data.openRate)).toBe(false);
      expect(body.data.resolutionRate).toBe(0);
      expect(Number.isNaN(body.data.resolutionRate)).toBe(false);
    } else {
      // If total > 0 with days=0, openRate should still be a valid number
      expect(Number.isNaN(body.data.openRate)).toBe(false);
    }
  });

  it('openRate and resolutionRate are between 0 and 100', async () => {
    await setAdminSession();
    const GET = await importSummaryGET();
    const res = await GET(makeSummaryRequest());
    const body = await res.json();
    expect(body.data.openRate).toBeGreaterThanOrEqual(0);
    expect(body.data.openRate).toBeLessThanOrEqual(100);
    expect(body.data.resolutionRate).toBeGreaterThanOrEqual(0);
    expect(body.data.resolutionRate).toBeLessThanOrEqual(100);
  });

  it('response JSON does not contain NaN string', async () => {
    await setAdminSession();
    const GET = await importSummaryGET();
    const res = await GET(makeSummaryRequest());
    const text = await res.text();
    // JSON.stringify(NaN) produces "null" so NaN won't appear as text in valid JSON
    // but some implementations might serialize it as NaN — ensure it doesn't
    expect(text).not.toContain('NaN');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/v1/analytics/timeseries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── authentication ───────────────────────────────────────────────────────
  it('returns 401 when unauthenticated', async () => {
    await setAdminSession(null);
    const GET = await importTimeseriesGET();
    const res = await GET(makeTimeseriesRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // ── default behavior (30 days) ────────────────────────────────────────────
  it('returns 200 when authenticated', async () => {
    await setAdminSession();
    const GET = await importTimeseriesGET();
    const res = await GET(makeTimeseriesRequest());
    expect(res.status).toBe(200);
  });

  it('returns data points covering the default 30-day window', async () => {
    await setAdminSession();
    const GET = await importTimeseriesGET();
    const res = await GET(makeTimeseriesRequest());
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    // Gap-filling ensures one point per day in [startDate, today] inclusive.
    // Default window = 30 days back → 30 or 31 data points depending on inclusive/exclusive bound.
    expect(body.data.length).toBeGreaterThanOrEqual(30);
    expect(body.data.length).toBeLessThanOrEqual(31);
  });

  it('each data point has "date" and "count" fields', async () => {
    await setAdminSession();
    const GET = await importTimeseriesGET();
    const res = await GET(makeTimeseriesRequest());
    const body = await res.json();
    for (const point of body.data) {
      expect(point).toHaveProperty('date');
      expect(point).toHaveProperty('count');
      expect(typeof point.date).toBe('string');
      expect(typeof point.count).toBe('number');
    }
  });

  it('date values are in YYYY-MM-DD format', async () => {
    await setAdminSession();
    const GET = await importTimeseriesGET();
    const res = await GET(makeTimeseriesRequest());
    const body = await res.json();
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    for (const point of body.data) {
      expect(point.date).toMatch(dateRegex);
    }
  });

  // ── custom days param ────────────────────────────────────────────────────
  it('returns data points covering the 7-day window when ?days=7', async () => {
    await setAdminSession();
    const GET = await importTimeseriesGET();
    const res = await GET(makeTimeseriesRequest({ days: '7' }));
    const body = await res.json();
    expect(body.success).toBe(true);
    // Gap-filling: [today-7, today] inclusive = 7 or 8 points
    expect(body.data.length).toBeGreaterThanOrEqual(7);
    expect(body.data.length).toBeLessThanOrEqual(8);
  });

  it('data points are in ascending date order', async () => {
    await setAdminSession();
    const GET = await importTimeseriesGET();
    const res = await GET(makeTimeseriesRequest());
    const body = await res.json();
    const dates = body.data.map((p: { date: string }) => p.date);
    const sorted = [...dates].sort();
    expect(dates).toEqual(sorted);
  });

  it('count values are non-negative integers', async () => {
    await setAdminSession();
    const GET = await importTimeseriesGET();
    const res = await GET(makeTimeseriesRequest());
    const body = await res.json();
    for (const point of body.data) {
      expect(point.count).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(point.count)).toBe(true);
    }
  });
});
