/**
 * Integration: GET /api/v1/tickets
 *
 * TDD RED phase — src/app/api/v1/tickets/route.ts 아직 미구현
 *
 * 전략:
 *  - `auth()` 모킹으로 세션 주입 (auth 레이어 분리)
 *  - Prisma는 실제 DB 사용 (DB mock 금지)
 *  - 각 테스트는 독립 실행 가능 — beforeEach/afterEach로 데이터 정리
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/server/db/prisma';

// ── auth() 모킹 ───────────────────────────────────────────────────────────
vi.mock('@/auth', () => ({ auth: vi.fn() }));

const makeAdminSession = () => ({
  user: { id: 'admin-test-id', email: 'admin@test.com', username: 'testadmin', role: 'ADMIN' as const },
  expires: new Date(Date.now() + 3_600_000).toISOString(),
});

const setAdminSession = async (session: ReturnType<typeof makeAdminSession> | null = makeAdminSession()) => {
  const { auth } = await import('@/auth');
  (auth as ReturnType<typeof vi.fn>).mockResolvedValue(session);
};

// ── 테스트 픽스처 헬퍼 ───────────────────────────────────────────────────
const TEST_TAG = `test-tickets-list-${Date.now()}`;

async function createTestFeedback(overrides: Partial<{
  type: 'BUG' | 'FEATURE' | 'GENERAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
  title: string;
  nickname: string;
}> = {}) {
  return prisma.feedback.create({
    data: {
      type: overrides.type ?? 'BUG',
      title: overrides.title ?? `[${TEST_TAG}] Test Feedback`,
      description: 'Integration test description — minimum 10 chars',
      nickname: overrides.nickname ?? 'test-user',
      trackingId: `FB-${Math.random().toString(36).slice(2, 10)}`,
      status: overrides.status ?? 'OPEN',
      priority: overrides.priority ?? null,
      statusHistory: { create: { toStatus: overrides.status ?? 'OPEN' } },
    },
  });
}

async function cleanTestData() {
  // trackingId 패턴으로 직접 삭제할 수 없으므로 title로 식별
  const feedbacks = await prisma.feedback.findMany({
    where: { title: { contains: TEST_TAG } },
    select: { id: true },
  });
  if (feedbacks.length === 0) return;
  const ids = feedbacks.map((f) => f.id);
  await prisma.statusHistory.deleteMany({ where: { feedbackId: { in: ids } } });
  await prisma.feedback.deleteMany({ where: { id: { in: ids } } });
}

// ── 요청 헬퍼 ────────────────────────────────────────────────────────────
function makeGetRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost:3000/api/v1/tickets');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

// ── 테스트 대상 임포트 (미구현 → RED) ─────────────────────────────────────
const importGET = () =>
  import('@/app/api/v1/tickets/route').then((m) => m.GET);

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/v1/tickets', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanTestData();
  });

  // ── 인증 ──────────────────────────────────────────────────────────────
  describe('인증 검사', () => {
    it('세션 없이 요청하면 401을 반환해야 한다', async () => {
      await setAdminSession(null);
      const GET = await importGET();

      const res = await GET(makeGetRequest());
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Unauthorized');
    });
  });

  // ── 정상 조회 ──────────────────────────────────────────────────────────
  describe('정상 응답', () => {
    it('인증된 요청은 200과 data 배열을 반환해야 한다', async () => {
      await setAdminSession();
      await createTestFeedback();
      const GET = await importGET();

      const res = await GET(makeGetRequest());
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('응답에 meta (total, page, limit, hasNextPage) 가 포함되어야 한다', async () => {
      await setAdminSession();
      const GET = await importGET();

      const res = await GET(makeGetRequest());
      const body = await res.json();
      expect(body.meta).toBeDefined();
      expect(typeof body.meta.total).toBe('number');
      expect(typeof body.meta.page).toBe('number');
      expect(typeof body.meta.limit).toBe('number');
      expect(typeof body.meta.hasNextPage).toBe('boolean');
    });

    it('기본 page=1, limit=20 이 적용되어야 한다', async () => {
      await setAdminSession();
      const GET = await importGET();

      const res = await GET(makeGetRequest());
      const body = await res.json();
      expect(body.meta.page).toBe(1);
      expect(body.meta.limit).toBe(20);
    });

    it('data 각 항목은 TicketListItem 형태여야 한다', async () => {
      await setAdminSession();
      const ticket = await createTestFeedback({ type: 'BUG', status: 'OPEN' });
      const GET = await importGET();

      const res = await GET(makeGetRequest());
      const body = await res.json();
      const found = body.data.find((d: { id: string }) => d.id === ticket.id);
      expect(found).toBeDefined();
      expect(found).toMatchObject({
        id: expect.any(String),
        trackingId: expect.any(String),
        type: 'BUG',
        status: 'OPEN',
        title: expect.any(String),
        nickname: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      // description, email, statusHistory 는 목록에 포함되면 안 됨 (admin detail only)
      expect(found.description).toBeUndefined();
      expect(found.statusHistory).toBeUndefined();
    });
  });

  // ── 필터링 ─────────────────────────────────────────────────────────────
  describe('필터링', () => {
    it('status=OPEN 필터는 OPEN 티켓만 반환해야 한다', async () => {
      await setAdminSession();
      await createTestFeedback({ status: 'OPEN' });
      await createTestFeedback({ status: 'RESOLVED' });
      const GET = await importGET();

      const res = await GET(makeGetRequest({ status: 'OPEN' }));
      const body = await res.json();
      const testTickets = body.data.filter((d: { title: string }) => d.title.includes(TEST_TAG));
      expect(testTickets.length).toBeGreaterThan(0);
      expect(testTickets.every((d: { status: string }) => d.status === 'OPEN')).toBe(true);
    });

    it('type=FEATURE 필터는 FEATURE 티켓만 반환해야 한다', async () => {
      await setAdminSession();
      await createTestFeedback({ type: 'FEATURE' });
      await createTestFeedback({ type: 'BUG' });
      const GET = await importGET();

      const res = await GET(makeGetRequest({ type: 'FEATURE' }));
      const body = await res.json();
      const testTickets = body.data.filter((d: { title: string }) => d.title.includes(TEST_TAG));
      expect(testTickets.every((d: { type: string }) => d.type === 'FEATURE')).toBe(true);
    });

    it('priority=HIGH 필터가 동작해야 한다', async () => {
      await setAdminSession();
      await createTestFeedback({ priority: 'HIGH' });
      await createTestFeedback({ priority: null });
      const GET = await importGET();

      const res = await GET(makeGetRequest({ priority: 'HIGH' }));
      const body = await res.json();
      const testTickets = body.data.filter((d: { title: string }) => d.title.includes(TEST_TAG));
      expect(testTickets.every((d: { priority: string }) => d.priority === 'HIGH')).toBe(true);
    });
  });

  // ── 페이지네이션 ────────────────────────────────────────────────────────
  describe('페이지네이션', () => {
    it('limit=1 이면 데이터가 1개만 반환되어야 한다', async () => {
      await setAdminSession();
      await createTestFeedback();
      await createTestFeedback();
      const GET = await importGET();

      const res = await GET(makeGetRequest({ limit: '1' }));
      const body = await res.json();
      expect(body.data.length).toBeLessThanOrEqual(1);
      expect(body.meta.limit).toBe(1);
    });

    it('total > page * limit 이면 hasNextPage=true 여야 한다', async () => {
      await setAdminSession();
      // 최소 2개의 데이터 필요
      await createTestFeedback();
      await createTestFeedback();
      const GET = await importGET();

      // 전체 티켓 수 확인
      const totalRes = await GET(makeGetRequest());
      const totalBody = await totalRes.json();
      const total = totalBody.meta.total;

      if (total > 1) {
        const res = await GET(makeGetRequest({ limit: '1', page: '1' }));
        const body = await res.json();
        expect(body.meta.hasNextPage).toBe(true);
      }
    });
  });

  // ── 정렬 ───────────────────────────────────────────────────────────────
  describe('정렬', () => {
    it('sort=createdAt&order=asc 는 오래된 것 먼저 반환해야 한다', async () => {
      await setAdminSession();
      const first = await createTestFeedback({ title: `[${TEST_TAG}] AAA` });
      // 1ms 이상 차이를 두기 위해 다시 생성
      await new Promise((r) => setTimeout(r, 10));
      await createTestFeedback({ title: `[${TEST_TAG}] BBB` });
      const GET = await importGET();

      const res = await GET(makeGetRequest({ sort: 'createdAt', order: 'asc' }));
      const body = await res.json();
      const testTickets = body.data.filter((d: { title: string }) => d.title.includes(TEST_TAG));
      if (testTickets.length >= 2) {
        expect(testTickets[0].id).toBe(first.id);
      }
    });
  });

  // ── 잘못된 파라미터 ─────────────────────────────────────────────────────
  describe('유효성 검사 오류', () => {
    it('유효하지 않은 status 파라미터는 400을 반환해야 한다', async () => {
      await setAdminSession();
      const GET = await importGET();

      const res = await GET(makeGetRequest({ status: 'INVALID' }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
    });

    it('유효하지 않은 sort 파라미터는 400을 반환해야 한다', async () => {
      await setAdminSession();
      const GET = await importGET();

      const res = await GET(makeGetRequest({ sort: 'title' }));
      expect(res.status).toBe(400);
    });

    it('limit=101 은 400을 반환해야 한다', async () => {
      await setAdminSession();
      const GET = await importGET();

      const res = await GET(makeGetRequest({ limit: '101' }));
      expect(res.status).toBe(400);
    });
  });
});
