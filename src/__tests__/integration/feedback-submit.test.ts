/**
 * Integration: POST /api/v1/feedback + OPTIONS (CORS preflight)
 *
 * 대상: src/app/api/v1/feedback/route.ts
 *
 * 전략:
 *  - 실제 DB 사용 (DB mock 금지)
 *  - 각 테스트 독립 IP로 rate limit 간섭 방지
 *  - rate limit 강제 테스트는 checkRateLimit 모킹
 *  - afterEach에서 생성된 피드백 삭제 (trackingId prefix 로 식별)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/server/db/prisma';

// ── rate-limit 모킹 (특정 테스트에서만 override) ──────────────────────────
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true), // 기본: 허용
}));

const getRateLimitMock = async () => {
  const { checkRateLimit } = await import('@/lib/rate-limit');
  return checkRateLimit as ReturnType<typeof vi.fn>;
};

// ── 테스트 픽스처 ──────────────────────────────────────────────────────────
const TEST_TAG = `[submit-test-${Date.now()}]`;
const createdTrackingIds: string[] = [];

async function cleanTestData() {
  if (createdTrackingIds.length === 0) return;
  const feedbacks = await prisma.feedback.findMany({
    where: { trackingId: { in: [...createdTrackingIds] } },
    select: { id: true },
  });
  if (feedbacks.length === 0) return;
  const ids = feedbacks.map((f) => f.id);
  await prisma.statusHistory.deleteMany({ where: { feedbackId: { in: ids } } });
  await prisma.feedback.deleteMany({ where: { id: { in: ids } } });
  createdTrackingIds.length = 0;
}

// ── 요청 헬퍼 ─────────────────────────────────────────────────────────────
let ipCounter = 0;
function makeUniqueIp() {
  // 각 테스트마다 고유 IP로 rate-limit 버킷을 분리
  return `192.168.test.${++ipCounter}`;
}

function makePostRequest(
  body: unknown,
  opts: { ip?: string; origin?: string } = {},
) {
  const ip = opts.ip ?? makeUniqueIp();
  const origin = opts.origin ?? 'http://localhost:3000';
  return new NextRequest('http://localhost:3000/api/v1/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
      ...(origin && { Origin: origin }),
    },
    body: JSON.stringify(body),
  });
}

function makeOptionsRequest(origin = 'http://localhost:3000') {
  return new NextRequest('http://localhost:3000/api/v1/feedback', {
    method: 'OPTIONS',
    headers: { Origin: origin },
  });
}

// ── 유효한 피드백 바디 팩토리 ───────────────────────────────────────────────
const validBody = (overrides: Record<string, unknown> = {}) => ({
  type: 'BUG',
  title: `${TEST_TAG} Submit button crash`,
  description: 'Clicking submit causes an unhandled exception in the form.',
  nickname: 'tester-alice',
  ...overrides,
});

// ── 테스트 대상 임포트 ────────────────────────────────────────────────────
const importHandlers = () => import('@/app/api/v1/feedback/route');

// ─────────────────────────────────────────────────────────────────────────────
describe('OPTIONS /api/v1/feedback — CORS preflight', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanTestData());

  it('204 상태 코드를 반환해야 한다', async () => {
    const { OPTIONS } = await importHandlers();
    const res = await OPTIONS(makeOptionsRequest());
    expect(res.status).toBe(204);
  });

  it('허용된 origin에 CORS 헤더가 포함되어야 한다', async () => {
    const { OPTIONS } = await importHandlers();
    const res = await OPTIONS(makeOptionsRequest('http://localhost:3000'));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
  });

  it('허용되지 않은 origin에는 CORS 헤더가 없어야 한다', async () => {
    const { OPTIONS } = await importHandlers();
    const res = await OPTIONS(makeOptionsRequest('https://evil.example.com'));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/v1/feedback — 성공 케이스', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanTestData());

  it('유효한 BUG 피드백 제출 시 201을 반환해야 한다', async () => {
    const mock = await getRateLimitMock();
    mock.mockResolvedValue(true);
    const { POST } = await importHandlers();

    const res = await POST(makePostRequest(validBody()));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    // 응답에서 trackingId 수집 (클린업용)
    if (body.data?.trackingId) createdTrackingIds.push(body.data.trackingId);
  });

  it('유효한 FEATURE 피드백 제출 시 201을 반환해야 한다', async () => {
    const mock = await getRateLimitMock();
    mock.mockResolvedValue(true);
    const { POST } = await importHandlers();

    const res = await POST(makePostRequest(validBody({ type: 'FEATURE', title: `${TEST_TAG} Dark mode request` })));
    expect(res.status).toBe(201);
    const body = await res.json();
    if (body.data?.trackingId) createdTrackingIds.push(body.data.trackingId);
  });

  it('유효한 GENERAL 피드백 제출 시 201을 반환해야 한다', async () => {
    const mock = await getRateLimitMock();
    mock.mockResolvedValue(true);
    const { POST } = await importHandlers();

    const res = await POST(makePostRequest(validBody({ type: 'GENERAL', title: `${TEST_TAG} Question about billing` })));
    expect(res.status).toBe(201);
    const body = await res.json();
    if (body.data?.trackingId) createdTrackingIds.push(body.data.trackingId);
  });

  it('이메일 포함 제출이 가능해야 한다', async () => {
    const mock = await getRateLimitMock();
    mock.mockResolvedValue(true);
    const { POST } = await importHandlers();

    const res = await POST(makePostRequest(validBody({ email: 'tester@example.com' })));
    expect(res.status).toBe(201);
    const body = await res.json();
    if (body.data?.trackingId) createdTrackingIds.push(body.data.trackingId);
  });

  it('이메일 없이도 제출이 가능해야 한다 (선택 필드)', async () => {
    const mock = await getRateLimitMock();
    mock.mockResolvedValue(true);
    const { POST } = await importHandlers();

    const res = await POST(makePostRequest(validBody({ email: undefined })));
    expect(res.status).toBe(201);
    const body = await res.json();
    if (body.data?.trackingId) createdTrackingIds.push(body.data.trackingId);
  });

  it('빈 문자열 이메일도 제출이 가능해야 한다 (optional or empty)', async () => {
    const mock = await getRateLimitMock();
    mock.mockResolvedValue(true);
    const { POST } = await importHandlers();

    const res = await POST(makePostRequest(validBody({ email: '' })));
    expect(res.status).toBe(201);
    const body = await res.json();
    if (body.data?.trackingId) createdTrackingIds.push(body.data.trackingId);
  });

  it('응답에 trackingId, type, status, title, createdAt이 포함되어야 한다', async () => {
    const mock = await getRateLimitMock();
    mock.mockResolvedValue(true);
    const { POST } = await importHandlers();

    const res = await POST(makePostRequest(validBody()));
    const body = await res.json();
    expect(body.data).toMatchObject({
      trackingId: expect.stringMatching(/^FB-[a-z0-9]{8}$/),
      type: 'BUG',
      status: 'OPEN',
      title: expect.any(String),
      createdAt: expect.any(String),
    });
    if (body.data?.trackingId) createdTrackingIds.push(body.data.trackingId);
  });

  it('생성된 피드백의 초기 status는 OPEN이어야 한다', async () => {
    const mock = await getRateLimitMock();
    mock.mockResolvedValue(true);
    const { POST } = await importHandlers();

    const res = await POST(makePostRequest(validBody()));
    const body = await res.json();
    expect(body.data.status).toBe('OPEN');
    if (body.data?.trackingId) createdTrackingIds.push(body.data.trackingId);
  });

  it('허용된 origin에 CORS 헤더가 응답에 포함되어야 한다', async () => {
    const mock = await getRateLimitMock();
    mock.mockResolvedValue(true);
    const { POST } = await importHandlers();

    const res = await POST(makePostRequest(validBody(), { origin: 'http://localhost:3000' }));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    const body = await res.json();
    if (body.data?.trackingId) createdTrackingIds.push(body.data.trackingId);
  });

  it('허용되지 않은 origin에는 CORS 헤더가 없어야 한다', async () => {
    const mock = await getRateLimitMock();
    mock.mockResolvedValue(true);
    const { POST } = await importHandlers();

    const res = await POST(makePostRequest(validBody(), { origin: 'https://evil.example.com' }));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    const body = await res.json();
    if (body.data?.trackingId) createdTrackingIds.push(body.data.trackingId);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/v1/feedback — 유효성 검사 실패', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanTestData());

  const expectBadRequest = async (body: unknown) => {
    const mock = await getRateLimitMock();
    mock.mockResolvedValue(true);
    const { POST } = await importHandlers();
    const res = await POST(makePostRequest(body));
    expect(res.status).toBe(400);
    const resBody = await res.json();
    expect(resBody.success).toBe(false);
    expect(resBody.error).toBeTruthy();
    return resBody;
  };

  it('title이 없으면 400을 반환해야 한다', async () => {
    const { error } = await expectBadRequest(validBody({ title: '' }));
    expect(error).toMatch(/required|title/i);
  });

  it('description이 10자 미만이면 400을 반환해야 한다', async () => {
    await expectBadRequest(validBody({ description: 'short' }));
  });

  it('nickname이 없으면 400을 반환해야 한다', async () => {
    const { error } = await expectBadRequest(validBody({ nickname: '' }));
    expect(error).toMatch(/required|nickname/i);
  });

  it('유효하지 않은 type이면 400을 반환해야 한다', async () => {
    await expectBadRequest(validBody({ type: 'COMPLAINT' }));
  });

  it('이메일 형식이 잘못되면 400을 반환해야 한다', async () => {
    await expectBadRequest(validBody({ email: 'not-an-email' }));
  });

  it('title이 200자를 초과하면 400을 반환해야 한다', async () => {
    await expectBadRequest(validBody({ title: 'a'.repeat(201) }));
  });

  it('description이 5000자를 초과하면 400을 반환해야 한다', async () => {
    await expectBadRequest(validBody({ description: 'a'.repeat(5001) }));
  });

  it('필수 필드가 모두 없으면 400을 반환해야 한다', async () => {
    await expectBadRequest({});
  });

  it('잘못된 JSON 바디는 400을 반환해야 한다', async () => {
    const mock = await getRateLimitMock();
    mock.mockResolvedValue(true);
    const { POST } = await importHandlers();

    const req = new NextRequest('http://localhost:3000/api/v1/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': makeUniqueIp(),
      },
      body: '{invalid json{{',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/v1/feedback — Rate Limit', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanTestData());

  it('rate limit 초과 시 429를 반환해야 한다', async () => {
    const mock = await getRateLimitMock();
    mock.mockResolvedValue(false); // 한도 초과 시뮬레이션
    const { POST } = await importHandlers();

    const res = await POST(makePostRequest(validBody()));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/too many requests/i);
  });

  it('rate limit 응답에도 CORS 헤더가 포함되어야 한다', async () => {
    const mock = await getRateLimitMock();
    mock.mockResolvedValue(false);
    const { POST } = await importHandlers();

    const res = await POST(makePostRequest(validBody(), { origin: 'http://localhost:3000' }));
    expect(res.status).toBe(429);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
  });

  it('rate limit 검사는 x-forwarded-for IP를 사용해야 한다', async () => {
    const mock = await getRateLimitMock();
    mock.mockResolvedValue(true);
    const { POST } = await importHandlers();

    const ip = makeUniqueIp();
    const res = await POST(makePostRequest(validBody(), { ip }));
    expect(res.status).toBe(201);
    // checkRateLimit이 해당 IP로 호출되었는지 확인
    expect(mock).toHaveBeenCalledWith(ip);
    const body = await res.json();
    if (body.data?.trackingId) createdTrackingIds.push(body.data.trackingId);
  });

  it('x-forwarded-for가 없으면 anonymous를 키로 사용해야 한다', async () => {
    const mock = await getRateLimitMock();
    mock.mockResolvedValue(true);
    const { POST } = await importHandlers();

    const req = new NextRequest('http://localhost:3000/api/v1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody()),
    });
    const res = await POST(req);
    expect(mock).toHaveBeenCalledWith('anonymous');
    const body = await res.json();
    if (body.data?.trackingId) createdTrackingIds.push(body.data.trackingId);
  });

  it('콤마로 구분된 IP 목록에서 첫 번째 IP를 추출해야 한다', async () => {
    const mock = await getRateLimitMock();
    mock.mockResolvedValue(true);
    const { POST } = await importHandlers();

    const req = new NextRequest('http://localhost:3000/api/v1/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '10.0.0.1, 10.0.0.2, 10.0.0.3',
      },
      body: JSON.stringify(validBody()),
    });
    await POST(req);
    expect(mock).toHaveBeenCalledWith('10.0.0.1');
    const body = await (await POST(req)).json();
    if (body.data?.trackingId) createdTrackingIds.push(body.data.trackingId);
  });
});
