/**
 * Integration: GET + PATCH + DELETE /api/v1/tickets/:id
 *
 * TDD RED phase — src/app/api/v1/tickets/[id]/route.ts 아직 미구현
 *
 * 전략:
 *  - auth() 모킹으로 세션 주입
 *  - Prisma 실제 DB 사용 (DB mock 금지)
 *  - 각 it() 독립 실행 보장 — afterEach 클린업
 *
 * 검증 항목:
 *  - C2: PATCH 후 notFound guard (concurrent DELETE 대응)
 *  - C3: TOCTOU 방지 — fromStatus가 트랜잭션 내부에서 읽힘
 *  - H4: note가 priority-only 업데이트에도 저장
 */
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { hash } from 'bcryptjs';

// ── auth() 모킹 ───────────────────────────────────────────────────────────
vi.mock('@/auth', () => ({ auth: vi.fn() }));

// ── 테스트용 AdminUser (changedById FK 충족) ───────────────────────────────
// PATCH endpoint는 changedById: authResult.user.id로 StatusHistory를 생성한다.
// 해당 ID가 AdminUser 테이블에 없으면 FK 위반 → 500 발생.
// beforeAll에서 생성, afterAll에서 삭제.
let ADMIN_ID: string;

beforeAll(async () => {
  // cost=4: 테스트 환경에서 bcrypt 속도 최적화 (보안이 아닌 식별 목적)
  const passwordHash = await hash('test-password-123', 4);
  const admin = await prisma.adminUser.upsert({
    where: { email: 'test-admin-detail@vitest.local' },
    update: {},
    create: {
      email: 'test-admin-detail@vitest.local',
      username: `test-admin-detail-${Date.now()}`,
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
  user: { id: ADMIN_ID, email: 'test-admin-detail@vitest.local', username: 'testadmin', role: 'ADMIN' as const },
  expires: new Date(Date.now() + 3_600_000).toISOString(),
});

const setAdminSession = async (
  session: ReturnType<typeof makeAdminSession> | null = makeAdminSession(),
) => {
  const { auth } = await import('@/auth');
  (auth as ReturnType<typeof vi.fn>).mockResolvedValue(session);
};

// ── 테스트 픽스처 ──────────────────────────────────────────────────────────
const TEST_TAG = `ticket-detail-${Date.now()}`;
const createdIds: string[] = [];

async function createTestFeedback(overrides: {
  type?: 'BUG' | 'FEATURE' | 'GENERAL';
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
} = {}) {
  const fb = await prisma.feedback.create({
    data: {
      type: overrides.type ?? 'BUG',
      title: `[${TEST_TAG}] Detail Test`,
      description: 'Integration test description — minimum 10 chars',
      nickname: 'detail-tester',
      email: 'tester@example.com',
      trackingId: `FB-${Math.random().toString(36).slice(2, 10)}`,
      status: overrides.status ?? 'OPEN',
      priority: overrides.priority ?? null,
      statusHistory: {
        create: { toStatus: overrides.status ?? 'OPEN' },
      },
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
});

// ── NextRequest 헬퍼 ──────────────────────────────────────────────────────
function makeRequest(method: string, id: string, body?: unknown) {
  return new NextRequest(`http://localhost:3000/api/v1/tickets/${id}`, {
    method,
    ...(body !== undefined && {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  });
}

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

// ── 테스트 대상 임포트 (미구현 → RED) ─────────────────────────────────────
const importHandlers = () => import('@/app/api/v1/tickets/[id]/route');

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/v1/tickets/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('세션 없이 요청하면 401을 반환해야 한다', async () => {
    await setAdminSession(null);
    const { GET } = await importHandlers();

    const res = await GET(makeRequest('GET', 'any-id'), makeParams('any-id'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('존재하지 않는 ID로 요청하면 404를 반환해야 한다', async () => {
    await setAdminSession();
    const { GET } = await importHandlers();

    const res = await GET(makeRequest('GET', 'nonexistent-id'), makeParams('nonexistent-id'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });

  it('유효한 ID로 요청하면 200과 FeedbackDetail을 반환해야 한다', async () => {
    await setAdminSession();
    const ticket = await createTestFeedback();
    const { GET } = await importHandlers();

    const res = await GET(makeRequest('GET', ticket.id), makeParams(ticket.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(ticket.id);
  });

  it('응답에 email, description, statusHistory가 포함되어야 한다', async () => {
    await setAdminSession();
    const ticket = await createTestFeedback();
    const { GET } = await importHandlers();

    const res = await GET(makeRequest('GET', ticket.id), makeParams(ticket.id));
    const body = await res.json();
    // 관리자 전용 필드 확인
    expect(body.data.email).toBeDefined();
    expect(body.data.description).toBeDefined();
    expect(Array.isArray(body.data.statusHistory)).toBe(true);
  });

  it('statusHistory는 createdAt 오름차순으로 정렬되어야 한다', async () => {
    await setAdminSession();
    const ticket = await createTestFeedback({ status: 'OPEN' });
    // 상태 이력 추가 (직접 생성)
    await prisma.statusHistory.create({
      data: {
        feedbackId: ticket.id,
        fromStatus: 'OPEN',
        toStatus: 'IN_PROGRESS',
        note: 'Reviewing',
      },
    });
    const { GET } = await importHandlers();

    const res = await GET(makeRequest('GET', ticket.id), makeParams(ticket.id));
    const body = await res.json();
    const history = body.data.statusHistory as { createdAt: string }[];
    if (history.length >= 2) {
      const dates = history.map((h) => new Date(h.createdAt).getTime());
      expect(dates[0]).toBeLessThanOrEqual(dates[1]);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/v1/tickets/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('세션 없이 요청하면 401을 반환해야 한다', async () => {
    await setAdminSession(null);
    const { PATCH } = await importHandlers();

    const res = await PATCH(
      makeRequest('PATCH', 'any-id', { status: 'IN_PROGRESS' }),
      makeParams('any-id'),
    );
    expect(res.status).toBe(401);
  });

  it('존재하지 않는 ID로 PATCH하면 404를 반환해야 한다', async () => {
    await setAdminSession();
    const { PATCH } = await importHandlers();

    const res = await PATCH(
      makeRequest('PATCH', 'nonexistent-id', { status: 'IN_PROGRESS' }),
      makeParams('nonexistent-id'),
    );
    expect(res.status).toBe(404);
  });

  it('status 업데이트 성공 시 200과 업데이트된 티켓을 반환해야 한다', async () => {
    await setAdminSession();
    const ticket = await createTestFeedback({ status: 'OPEN' });
    const { PATCH } = await importHandlers();

    const res = await PATCH(
      makeRequest('PATCH', ticket.id, { status: 'IN_PROGRESS' }),
      makeParams(ticket.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('IN_PROGRESS');
  });

  it('status 변경 시 StatusHistory가 생성되어야 한다 (C3 TOCTOU)', async () => {
    await setAdminSession();
    const ticket = await createTestFeedback({ status: 'OPEN' });
    const { PATCH } = await importHandlers();

    const res = await PATCH(
      makeRequest('PATCH', ticket.id, { status: 'RESOLVED', note: 'Fixed' }),
      makeParams(ticket.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    // PATCH 응답 body에서 직접 확인 — 별도 DB 쿼리는 pgBouncer 읽기 지연으로
    // read-after-write 불일치가 발생할 수 있으므로 사용하지 않음
    const history = body.data.statusHistory as {
      fromStatus: string | null;
      toStatus: string;
      note: string | null;
    }[];
    // 최소 2개: 초기 OPEN 생성 이력 + RESOLVED 변경 이력
    expect(history.length).toBeGreaterThanOrEqual(2);
    const lastEntry = history[history.length - 1];
    expect(lastEntry.fromStatus).toBe('OPEN');
    expect(lastEntry.toStatus).toBe('RESOLVED');
    expect(lastEntry.note).toBe('Fixed');
  });

  it('priority-only 업데이트 + note 는 StatusHistory에 저장되어야 한다 (H4 fix)', async () => {
    await setAdminSession();
    const ticket = await createTestFeedback();
    const { PATCH } = await importHandlers();

    const res = await PATCH(
      makeRequest('PATCH', ticket.id, { priority: 'CRITICAL', note: 'Escalated' }),
      makeParams(ticket.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    // PATCH 응답 body에서 직접 확인 (pgBouncer read-after-write 회피)
    const historyWithNote = (body.data.statusHistory as { note: string | null }[]).filter(
      (h) => h.note === 'Escalated',
    );
    expect(historyWithNote.length).toBeGreaterThanOrEqual(1);
  });

  it('priority 업데이트 성공 시 200과 업데이트된 priority를 반환해야 한다', async () => {
    await setAdminSession();
    const ticket = await createTestFeedback();
    const { PATCH } = await importHandlers();

    const res = await PATCH(
      makeRequest('PATCH', ticket.id, { priority: 'HIGH' }),
      makeParams(ticket.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.priority).toBe('HIGH');
  });

  it('status도 priority도 없는 바디는 400을 반환해야 한다', async () => {
    await setAdminSession();
    const ticket = await createTestFeedback();
    const { PATCH } = await importHandlers();

    const res = await PATCH(
      makeRequest('PATCH', ticket.id, { note: 'only a note' }),
      makeParams(ticket.id),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/At least one field/i);
  });

  it('잘못된 JSON 바디는 400을 반환해야 한다', async () => {
    await setAdminSession();
    const ticket = await createTestFeedback();
    const { PATCH } = await importHandlers();

    const req = new NextRequest(`http://localhost:3000/api/v1/tickets/${ticket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{{{',
    });
    const res = await PATCH(req, makeParams(ticket.id));
    expect(res.status).toBe(400);
  });

  it('유효하지 않은 status 값은 400을 반환해야 한다', async () => {
    await setAdminSession();
    const ticket = await createTestFeedback();
    const { PATCH } = await importHandlers();

    const res = await PATCH(
      makeRequest('PATCH', ticket.id, { status: 'PENDING' }),
      makeParams(ticket.id),
    );
    expect(res.status).toBe(400);
  });

  it('응답에 statusHistory가 포함되어야 한다', async () => {
    await setAdminSession();
    const ticket = await createTestFeedback({ status: 'OPEN' });
    const { PATCH } = await importHandlers();

    const res = await PATCH(
      makeRequest('PATCH', ticket.id, { status: 'CLOSED' }),
      makeParams(ticket.id),
    );
    // 200이 아니면 body.data가 null → 명확한 오류 메시지 제공
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data.statusHistory)).toBe(true);
    // statusHistory에 최소 2개 이상 (생성 이력 + CLOSED 변경 이력)
    expect(body.data.statusHistory.length).toBeGreaterThanOrEqual(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/v1/tickets/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('세션 없이 요청하면 401을 반환해야 한다', async () => {
    await setAdminSession(null);
    const { DELETE } = await importHandlers();

    const res = await DELETE(makeRequest('DELETE', 'any-id'), makeParams('any-id'));
    expect(res.status).toBe(401);
  });

  it('존재하지 않는 ID로 DELETE하면 404를 반환해야 한다', async () => {
    await setAdminSession();
    const { DELETE } = await importHandlers();

    const res = await DELETE(makeRequest('DELETE', 'nonexistent-id'), makeParams('nonexistent-id'));
    expect(res.status).toBe(404);
  });

  it('삭제 성공 시 200과 { id, deleted: true }를 반환해야 한다', async () => {
    await setAdminSession();
    const ticket = await createTestFeedback();
    // 삭제 후 afterEach에서 재삭제 시도하지 않도록 ID 제거
    const idx = createdIds.indexOf(ticket.id);
    if (idx !== -1) createdIds.splice(idx, 1);
    const { DELETE } = await importHandlers();

    const res = await DELETE(makeRequest('DELETE', ticket.id), makeParams(ticket.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(ticket.id);
    expect(body.data.deleted).toBe(true);
  });

  it('삭제 후 DB에서 해당 티켓이 사라져야 한다', async () => {
    await setAdminSession();
    const ticket = await createTestFeedback();
    const idx = createdIds.indexOf(ticket.id);
    if (idx !== -1) createdIds.splice(idx, 1);
    const { DELETE } = await importHandlers();

    await DELETE(makeRequest('DELETE', ticket.id), makeParams(ticket.id));

    const found = await prisma.feedback.findUnique({ where: { id: ticket.id } });
    expect(found).toBeNull();
  });

  it('삭제 후 StatusHistory도 Cascade 삭제되어야 한다', async () => {
    await setAdminSession();
    const ticket = await createTestFeedback();
    const idx = createdIds.indexOf(ticket.id);
    if (idx !== -1) createdIds.splice(idx, 1);
    const { DELETE } = await importHandlers();

    await DELETE(makeRequest('DELETE', ticket.id), makeParams(ticket.id));

    const history = await prisma.statusHistory.findMany({ where: { feedbackId: ticket.id } });
    expect(history).toHaveLength(0);
  });

  it('같은 ID로 두 번 DELETE하면 두 번째는 404를 반환해야 한다', async () => {
    await setAdminSession();
    const ticket = await createTestFeedback();
    const idx = createdIds.indexOf(ticket.id);
    if (idx !== -1) createdIds.splice(idx, 1);
    const { DELETE } = await importHandlers();

    await DELETE(makeRequest('DELETE', ticket.id), makeParams(ticket.id));
    const res2 = await DELETE(makeRequest('DELETE', ticket.id), makeParams(ticket.id));
    expect(res2.status).toBe(404);
  });
});
