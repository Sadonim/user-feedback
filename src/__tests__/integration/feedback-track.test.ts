/**
 * Integration: GET /api/v1/feedback/[trackingId]
 *
 * 대상: src/app/api/v1/feedback/[trackingId]/route.ts
 *
 * 전략:
 *  - 실제 DB 사용 (DB mock 금지)
 *  - beforeEach에서 테스트용 피드백 생성
 *  - afterEach에서 정리
 *  - CORS 없는 라우트이므로 CORS 헤더 검사 불필요
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/server/db/prisma';

// ── 테스트 픽스처 ──────────────────────────────────────────────────────────
const TEST_TAG = `track-test-${Date.now()}`;
const createdIds: string[] = [];

async function createTestFeedback(overrides: {
  type?: 'BUG' | 'FEATURE' | 'GENERAL';
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  withHistory?: boolean;
} = {}) {
  const trackingId = `FB-${Math.random().toString(36).slice(2, 10).padEnd(8, '0')}`;
  const fb = await prisma.feedback.create({
    data: {
      type: overrides.type ?? 'BUG',
      title: `[${TEST_TAG}] Track test ticket`,
      description: 'Integration test description — minimum 10 chars',
      nickname: 'track-tester',
      trackingId,
      status: overrides.status ?? 'OPEN',
      statusHistory: {
        create: {
          toStatus: overrides.status ?? 'OPEN',
          fromStatus: null,
        },
      },
    },
  });
  createdIds.push(fb.id);

  // 추가 이력이 필요한 경우
  if (overrides.withHistory) {
    await prisma.statusHistory.create({
      data: {
        feedbackId: fb.id,
        fromStatus: 'OPEN',
        toStatus: 'IN_PROGRESS',
        note: 'Working on it',
      },
    });
  }

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
function makeGetRequest(trackingId: string) {
  return new NextRequest(
    `http://localhost:3000/api/v1/feedback/${trackingId}`,
  );
}

const makeParams = (trackingId: string) => ({
  params: Promise.resolve({ trackingId }),
});

// ── 테스트 대상 임포트 ────────────────────────────────────────────────────
const importGET = () =>
  import('@/app/api/v1/feedback/[trackingId]/route').then((m) => m.GET);

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/v1/feedback/[trackingId] — 성공 케이스', () => {
  it('유효한 trackingId로 조회 시 200을 반환해야 한다', async () => {
    const ticket = await createTestFeedback();
    const GET = await importGET();

    const res = await GET(makeGetRequest(ticket.trackingId), makeParams(ticket.trackingId));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('응답에 trackingId, type, status, title이 포함되어야 한다', async () => {
    const ticket = await createTestFeedback({ type: 'FEATURE' });
    const GET = await importGET();

    const res = await GET(makeGetRequest(ticket.trackingId), makeParams(ticket.trackingId));
    const body = await res.json();
    expect(body.data).toMatchObject({
      trackingId: ticket.trackingId,
      type: 'FEATURE',
      status: 'OPEN',
      title: expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('응답에 statusHistory 배열이 포함되어야 한다', async () => {
    const ticket = await createTestFeedback({ withHistory: false });
    const GET = await importGET();

    const res = await GET(makeGetRequest(ticket.trackingId), makeParams(ticket.trackingId));
    const body = await res.json();
    expect(Array.isArray(body.data.statusHistory)).toBe(true);
    expect(body.data.statusHistory.length).toBeGreaterThanOrEqual(1);
  });

  it('statusHistory는 createdAt 오름차순으로 정렬되어야 한다', async () => {
    const ticket = await createTestFeedback({ withHistory: true });
    const GET = await importGET();

    const res = await GET(makeGetRequest(ticket.trackingId), makeParams(ticket.trackingId));
    const body = await res.json();
    const history = body.data.statusHistory as { createdAt: string }[];
    if (history.length >= 2) {
      const times = history.map((h) => new Date(h.createdAt).getTime());
      expect(times[0]).toBeLessThanOrEqual(times[1]);
    }
  });

  it('statusHistory 각 항목에 id, toStatus, fromStatus, note, createdAt이 있어야 한다', async () => {
    const ticket = await createTestFeedback();
    const GET = await importGET();

    const res = await GET(makeGetRequest(ticket.trackingId), makeParams(ticket.trackingId));
    const body = await res.json();
    const firstEntry = body.data.statusHistory[0];
    expect(firstEntry).toHaveProperty('id');
    expect(firstEntry).toHaveProperty('toStatus');
    expect(firstEntry).toHaveProperty('fromStatus');
    expect(firstEntry).toHaveProperty('note');
    expect(firstEntry).toHaveProperty('createdAt');
  });

  it('비공개 필드 (email, description)는 응답에 없어야 한다', async () => {
    const ticket = await createTestFeedback();
    const GET = await importGET();

    const res = await GET(makeGetRequest(ticket.trackingId), makeParams(ticket.trackingId));
    const body = await res.json();
    // 공개 트래킹 엔드포인트 — 이메일/설명 비공개
    expect(body.data.email).toBeUndefined();
    expect(body.data.description).toBeUndefined();
  });

  it('RESOLVED 상태 티켓도 조회할 수 있어야 한다', async () => {
    const ticket = await createTestFeedback({ status: 'RESOLVED' });
    const GET = await importGET();

    const res = await GET(makeGetRequest(ticket.trackingId), makeParams(ticket.trackingId));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('RESOLVED');
  });

  it('IN_PROGRESS 상태 티켓도 조회할 수 있어야 한다', async () => {
    const ticket = await createTestFeedback({ status: 'IN_PROGRESS' });
    const GET = await importGET();

    const res = await GET(makeGetRequest(ticket.trackingId), makeParams(ticket.trackingId));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('IN_PROGRESS');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/v1/feedback/[trackingId] — 유효성 검사 실패', () => {
  it('잘못된 trackingId 형식이면 400을 반환해야 한다', async () => {
    const GET = await importGET();

    const invalidIds = [
      'INVALID',         // 접두사 없음
      'FB-',             // 접미사 없음
      'FB-UPPERCASE',    // 대문자 포함
      'FB-abc',          // 8자 미만
      'FB-abc123456789', // 8자 초과
      'fb-abc12345',     // 소문자 접두사
    ];

    for (const id of invalidIds) {
      const res = await GET(makeGetRequest(id), makeParams(id));
      expect(res.status, `ID=${id}이 400이 아님`).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toMatch(/invalid tracking id/i);
    }
  });

  it('빈 trackingId는 400을 반환해야 한다', async () => {
    const GET = await importGET();
    const res = await GET(makeGetRequest(''), makeParams(''));
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/v1/feedback/[trackingId] — 존재하지 않는 리소스', () => {
  it('존재하지 않는 trackingId는 404를 반환해야 한다', async () => {
    const GET = await importGET();

    const res = await GET(
      makeGetRequest('FB-00000000'),
      makeParams('FB-00000000'),
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/not found/i);
  });

  it('404 응답의 data는 null이어야 한다', async () => {
    const GET = await importGET();
    const res = await GET(makeGetRequest('FB-99999999'), makeParams('FB-99999999'));
    const body = await res.json();
    expect(body.data).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/v1/feedback/[trackingId] — trackingIdSchema 유효 형식 확인', () => {
  it('FB-[a-z0-9]{8} 형식의 trackingId는 통과해야 한다', async () => {
    const ticket = await createTestFeedback();
    const GET = await importGET();

    // 실제 생성된 trackingId가 스키마를 통과해야 함
    expect(ticket.trackingId).toMatch(/^FB-[a-z0-9]{8}$/);
    const res = await GET(makeGetRequest(ticket.trackingId), makeParams(ticket.trackingId));
    expect(res.status).toBe(200);
  });

  it('숫자 포함 trackingId도 유효해야 한다', async () => {
    // 직접 trackingId 생성 (숫자 포함)
    const trackingId = 'FB-a1b2c3d4';
    const fb = await prisma.feedback.create({
      data: {
        type: 'GENERAL',
        title: `[${TEST_TAG}] Numeric ID test`,
        description: 'Test with numeric ID',
        nickname: 'tester',
        trackingId,
        statusHistory: { create: { toStatus: 'OPEN' } },
      },
    });
    createdIds.push(fb.id);
    const GET = await importGET();

    const res = await GET(makeGetRequest(trackingId), makeParams(trackingId));
    expect(res.status).toBe(200);
  });
});
