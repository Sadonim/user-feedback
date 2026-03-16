/**
 * Integration: CORS_PUBLIC_OPEN 환경변수에 따른 공개 피드백 엔드포인트 CORS 동작 검증.
 *
 * 대상: src/app/api/v1/feedback/route.ts + src/lib/api/cors.ts
 *
 * 시나리오:
 *   - CORS_PUBLIC_OPEN=true  → 모든 출처(*) 허용 — 위젯 임베딩용
 *   - CORS_PUBLIC_OPEN=false → 기존 allowlist 방식 유지
 *
 * 전략:
 *   - vi.stubEnv로 CORS_PUBLIC_OPEN 환경변수 동적 제어
 *   - CORS 헬퍼 함수(withPublicCors, publicCorsPreflightResponse) 단위 검증
 *   - POST 핸들러 CORS 헤더 통합 검증 (DB 호출은 vi.mock으로 차단)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextResponse, NextRequest } from 'next/server';
import {
  withPublicCors,
  publicCorsPreflightResponse,
} from '@/lib/api/cors';

// ── DB / rate-limit 모킹 (CORS 검증에 불필요한 I/O 차단) ──────────────────
vi.mock('@/server/db/prisma', () => ({
  prisma: {
    feedback: {
      create: vi.fn().mockResolvedValue({
        id: 'test-id',
        trackingId: 'FB-abc12345',
        type: 'BUG',
        status: 'OPEN',
        title: 'Test',
        createdAt: new Date().toISOString(),
      }),
    },
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/tracking', () => ({
  generateTrackingId: vi.fn().mockReturnValue('FB-abc12345'),
}));

// ── 요청 헬퍼 ─────────────────────────────────────────────────────────────
function makePost(body: unknown, origin = 'https://external.example.com') {
  return new NextRequest('http://localhost:3000/api/v1/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': origin,
      'x-forwarded-for': '10.0.0.1',
    },
    body: JSON.stringify(body),
  });
}

function makeOptions(origin = 'https://external.example.com') {
  return new NextRequest('http://localhost:3000/api/v1/feedback', {
    method: 'OPTIONS',
    headers: { 'Origin': origin },
  });
}

const VALID_BODY = {
  type: 'BUG',
  title: 'CORS test submission',
  description: 'Testing CORS header behavior for public widget endpoint.',
  nickname: 'cors-tester',
};

// ─────────────────────────────────────────────────────────────────────────────
// withPublicCors 헬퍼 단위 테스트
// ─────────────────────────────────────────────────────────────────────────────
describe('withPublicCors (src/lib/api/cors.ts)', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('CORS_PUBLIC_OPEN=true: Access-Control-Allow-Origin: * 를 반환해야 한다', () => {
    vi.stubEnv('CORS_PUBLIC_OPEN', 'true');
    const res = withPublicCors(NextResponse.json({ ok: true }), 'https://evil.com');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('CORS_PUBLIC_OPEN=true: POST, OPTIONS 메서드를 허용해야 한다', () => {
    vi.stubEnv('CORS_PUBLIC_OPEN', 'true');
    const methods = withPublicCors(NextResponse.json({ ok: true }), null)
      .headers.get('Access-Control-Allow-Methods') ?? '';
    expect(methods).toContain('POST');
    expect(methods).toContain('OPTIONS');
  });

  it('CORS_PUBLIC_OPEN=true: Content-Type 헤더를 허용해야 한다', () => {
    vi.stubEnv('CORS_PUBLIC_OPEN', 'true');
    const headers = withPublicCors(NextResponse.json({ ok: true }), null)
      .headers.get('Access-Control-Allow-Headers') ?? '';
    expect(headers).toContain('Content-Type');
  });

  it('CORS_PUBLIC_OPEN=false: 미허용 origin에는 CORS 헤더가 없어야 한다', () => {
    vi.stubEnv('CORS_PUBLIC_OPEN', 'false');
    const res = withPublicCors(NextResponse.json({ ok: true }), 'https://evil.com');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('CORS_PUBLIC_OPEN=false: 허용된 origin에는 기존 allowlist 방식 적용', () => {
    vi.stubEnv('CORS_PUBLIC_OPEN', 'false');
    const res = withPublicCors(NextResponse.json({ ok: true }), 'http://localhost:3000');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// publicCorsPreflightResponse 단위 테스트
// ─────────────────────────────────────────────────────────────────────────────
describe('publicCorsPreflightResponse (src/lib/api/cors.ts)', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('CORS_PUBLIC_OPEN=true: 204 + Access-Control-Allow-Origin: * 반환', () => {
    vi.stubEnv('CORS_PUBLIC_OPEN', 'true');
    const res = publicCorsPreflightResponse('https://any-origin.com');
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('CORS_PUBLIC_OPEN=true: null origin에도 와일드카드 반환', () => {
    vi.stubEnv('CORS_PUBLIC_OPEN', 'true');
    const res = publicCorsPreflightResponse(null);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('CORS_PUBLIC_OPEN=false: 미허용 origin에는 CORS 헤더 없음', () => {
    vi.stubEnv('CORS_PUBLIC_OPEN', 'false');
    const res = publicCorsPreflightResponse('https://evil.com');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('CORS_PUBLIC_OPEN=false: 허용된 origin은 allowlist 방식', () => {
    vi.stubEnv('CORS_PUBLIC_OPEN', 'false');
    const res = publicCorsPreflightResponse('http://localhost:3000');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
  });

  it('CORS_PUBLIC_OPEN=true: 응답 바디가 비어야 한다', async () => {
    vi.stubEnv('CORS_PUBLIC_OPEN', 'true');
    const text = await publicCorsPreflightResponse(null).text();
    expect(text).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// OPTIONS 라우트 통합 테스트
// ─────────────────────────────────────────────────────────────────────────────
describe('OPTIONS /api/v1/feedback — CORS_PUBLIC_OPEN', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllEnvs());

  it('CORS_PUBLIC_OPEN=true: 임의 외부 origin에 204 + * 반환', async () => {
    vi.stubEnv('CORS_PUBLIC_OPEN', 'true');
    vi.resetModules();
    const { OPTIONS } = await import('@/app/api/v1/feedback/route');
    const res = await OPTIONS(makeOptions('https://customer-site.com'));
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('CORS_PUBLIC_OPEN=false: 미허용 외부 origin에 CORS 헤더 없음', async () => {
    vi.stubEnv('CORS_PUBLIC_OPEN', 'false');
    vi.resetModules();
    const { OPTIONS } = await import('@/app/api/v1/feedback/route');
    const res = await OPTIONS(makeOptions('https://evil.example.com'));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST 라우트 통합 테스트
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/v1/feedback — CORS_PUBLIC_OPEN', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllEnvs());

  it('CORS_PUBLIC_OPEN=true: 외부 origin 요청에 ACAO: * 포함', async () => {
    vi.stubEnv('CORS_PUBLIC_OPEN', 'true');
    vi.resetModules();
    const { POST } = await import('@/app/api/v1/feedback/route');
    const res = await POST(makePost(VALID_BODY, 'https://external.example.com'));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('CORS_PUBLIC_OPEN=true: null origin에도 ACAO: * 포함', async () => {
    vi.stubEnv('CORS_PUBLIC_OPEN', 'true');
    vi.resetModules();

    const req = new NextRequest('http://localhost:3000/api/v1/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '10.0.0.1',
      },
      body: JSON.stringify(VALID_BODY),
    });

    const { POST } = await import('@/app/api/v1/feedback/route');
    const res = await POST(req);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('CORS_PUBLIC_OPEN=false: 미허용 외부 origin에 CORS 헤더 없음', async () => {
    vi.stubEnv('CORS_PUBLIC_OPEN', 'false');
    vi.resetModules();
    const { POST } = await import('@/app/api/v1/feedback/route');
    const res = await POST(makePost(VALID_BODY, 'https://evil.example.com'));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('CORS_PUBLIC_OPEN=false: 허용된 origin은 allowlist 방식', async () => {
    vi.stubEnv('CORS_PUBLIC_OPEN', 'false');
    vi.resetModules();
    const { POST } = await import('@/app/api/v1/feedback/route');
    const res = await POST(makePost(VALID_BODY, 'http://localhost:3000'));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
  });
});
