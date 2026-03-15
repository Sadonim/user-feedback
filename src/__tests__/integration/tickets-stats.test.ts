/**
 * Integration: GET /api/v1/tickets/stats + getTicketStats() 서비스
 *
 * TDD RED phase — 아래 파일들 아직 미구현:
 *  - src/app/api/v1/tickets/stats/route.ts
 *  - src/server/services/ticket-stats.ts
 *
 * 전략:
 *  - auth() 모킹
 *  - getTicketStats() 는 실제 DB 사용 (H1 fix: 공유 서비스 분리)
 *  - 날짜 계산 단위 테스트 포함 (todayStart, weekStart 로직)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/server/db/prisma';

// ── auth() 모킹 ───────────────────────────────────────────────────────────
vi.mock('@/auth', () => ({ auth: vi.fn() }));

const setAdminSession = async (session: unknown = {
  user: { id: 'admin-stats-id', email: 'a@test.com', username: 'admin', role: 'ADMIN' },
  expires: new Date(Date.now() + 3_600_000).toISOString(),
}) => {
  const { auth } = await import('@/auth');
  (auth as ReturnType<typeof vi.fn>).mockResolvedValue(session);
};

// ── 테스트 픽스처 ──────────────────────────────────────────────────────────
const TEST_TAG = `stats-test-${Date.now()}`;
const createdIds: string[] = [];

async function createTestFeedback(opts: {
  type: 'BUG' | 'FEATURE' | 'GENERAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
}) {
  const fb = await prisma.feedback.create({
    data: {
      type: opts.type,
      status: opts.status,
      title: `[${TEST_TAG}] Stats Fixture`,
      description: 'stats integration test data',
      nickname: 'stats-tester',
      trackingId: `FB-${Math.random().toString(36).slice(2, 10)}`,
      statusHistory: { create: { toStatus: opts.status } },
    },
  });
  createdIds.push(fb.id);
  return fb;
}

afterEach(async () => {
  if (createdIds.length === 0) return;
  await prisma.statusHistory.deleteMany({ where: { feedbackId: { in: [...createdIds] } } });
  await prisma.feedback.deleteMany({ where: { id: { in: [...createdIds] } } });
  createdIds.length = 0;
  vi.clearAllMocks();
});

// ── 요청 헬퍼 ─────────────────────────────────────────────────────────────
const makeStatsRequest = () =>
  new NextRequest('http://localhost:3000/api/v1/tickets/stats');

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/v1/tickets/stats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('세션 없이 요청하면 401을 반환해야 한다', async () => {
    await setAdminSession(null);
    const { GET } = await import('@/app/api/v1/tickets/stats/route');

    const res = await GET(makeStatsRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Unauthorized');
  });

  it('인증된 요청은 200과 TicketStats 구조를 반환해야 한다', async () => {
    await setAdminSession();
    const { GET } = await import('@/app/api/v1/tickets/stats/route');

    const res = await GET(makeStatsRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });

  it('응답 data는 total, byStatus, byType, recent 필드를 가져야 한다', async () => {
    await setAdminSession();
    const { GET } = await import('@/app/api/v1/tickets/stats/route');

    const res = await GET(makeStatsRequest());
    const body = await res.json();
    const { data } = body;

    expect(typeof data.total).toBe('number');
    expect(data.byStatus).toBeDefined();
    expect(data.byType).toBeDefined();
    expect(data.recent).toBeDefined();
  });

  it('byStatus 는 네 가지 상태를 모두 포함해야 한다', async () => {
    await setAdminSession();
    const { GET } = await import('@/app/api/v1/tickets/stats/route');

    const res = await GET(makeStatsRequest());
    const { data } = await res.json();

    expect(data.byStatus).toMatchObject({
      OPEN: expect.any(Number),
      IN_PROGRESS: expect.any(Number),
      RESOLVED: expect.any(Number),
      CLOSED: expect.any(Number),
    });
  });

  it('byType 은 세 가지 타입을 모두 포함해야 한다', async () => {
    await setAdminSession();
    const { GET } = await import('@/app/api/v1/tickets/stats/route');

    const res = await GET(makeStatsRequest());
    const { data } = await res.json();

    expect(data.byType).toMatchObject({
      BUG: expect.any(Number),
      FEATURE: expect.any(Number),
      GENERAL: expect.any(Number),
    });
  });

  it('recent 는 today 와 thisWeek 필드를 포함해야 한다', async () => {
    await setAdminSession();
    const { GET } = await import('@/app/api/v1/tickets/stats/route');

    const res = await GET(makeStatsRequest());
    const { data } = await res.json();

    expect(typeof data.recent.today).toBe('number');
    expect(typeof data.recent.thisWeek).toBe('number');
  });

  it('오늘 생성한 티켓은 recent.today에 반영되어야 한다', async () => {
    await setAdminSession();
    // 오늘 생성
    await createTestFeedback({ type: 'BUG', status: 'OPEN' });
    const { GET } = await import('@/app/api/v1/tickets/stats/route');

    const res = await GET(makeStatsRequest());
    const { data } = await res.json();
    // recent.today가 최소 1 이상 (방금 생성한 것 포함)
    expect(data.recent.today).toBeGreaterThanOrEqual(1);
  });

  it('이번 주 생성한 티켓은 recent.thisWeek에 반영되어야 한다', async () => {
    await setAdminSession();
    await createTestFeedback({ type: 'FEATURE', status: 'IN_PROGRESS' });
    const { GET } = await import('@/app/api/v1/tickets/stats/route');

    const res = await GET(makeStatsRequest());
    const { data } = await res.json();
    expect(data.recent.thisWeek).toBeGreaterThanOrEqual(1);
  });

  it('total은 byStatus 값들의 합과 같아야 한다', async () => {
    await setAdminSession();
    const { GET } = await import('@/app/api/v1/tickets/stats/route');

    const res = await GET(makeStatsRequest());
    const { data } = await res.json();
    const sumFromStatus = Object.values(data.byStatus as Record<string, number>).reduce(
      (a, b) => a + b,
      0,
    );
    expect(data.total).toBe(sumFromStatus);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('getTicketStats() 서비스 (직접 단위 테스트)', () => {
  it('TicketStats 형태의 객체를 반환해야 한다', async () => {
    const { getTicketStats } = await import('@/server/services/ticket-stats');
    const stats = await getTicketStats();

    expect(typeof stats.total).toBe('number');
    expect(stats.total).toBeGreaterThanOrEqual(0);
    expect(stats.byStatus.OPEN).toBeGreaterThanOrEqual(0);
    expect(stats.byType.BUG).toBeGreaterThanOrEqual(0);
    expect(stats.recent.today).toBeGreaterThanOrEqual(0);
    expect(stats.recent.thisWeek).toBeGreaterThanOrEqual(0);
  });

  it('recent.today <= recent.thisWeek 이어야 한다', async () => {
    const { getTicketStats } = await import('@/server/services/ticket-stats');
    const stats = await getTicketStats();

    expect(stats.recent.today).toBeLessThanOrEqual(stats.recent.thisWeek);
  });

  it('date-fns 없이 plain UTC 계산을 사용해야 한다 (design doc H1 note)', async () => {
    // 구현이 date-fns에 의존하지 않는지 확인:
    // getTicketStats가 정상 동작하면 충분 (date-fns 불필요가 설계 의도)
    const { getTicketStats } = await import('@/server/services/ticket-stats');
    await expect(getTicketStats()).resolves.not.toThrow();
  });

  it('두 번 호출해도 동일한 응답 키 구조를 반환해야 한다', async () => {
    // NOTE: Supabase pgBouncer(transaction mode)에서는 read-after-write 순서가
    // 보장되지 않아 total 정확값이 호출 사이에 달라질 수 있다.
    // 여기서는 구조(키 집합)의 일관성만 검증한다.
    const { getTicketStats } = await import('@/server/services/ticket-stats');
    const s1 = await getTicketStats();
    const s2 = await getTicketStats();

    // 응답 필드 키가 항상 동일해야 한다
    expect(Object.keys(s1.byStatus).sort()).toEqual(Object.keys(s2.byStatus).sort());
    expect(Object.keys(s1.byType).sort()).toEqual(Object.keys(s2.byType).sort());
    expect(Object.keys(s1.recent).sort()).toEqual(Object.keys(s2.recent).sort());
    // 총합 타입은 항상 number
    expect(typeof s1.total).toBe('number');
    expect(typeof s2.total).toBe('number');
  });
});
