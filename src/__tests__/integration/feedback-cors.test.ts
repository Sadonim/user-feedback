/**
 * Integration: CORS 헤더 통합 테스트
 *
 * CORS_PUBLIC_OPEN 환경변수에 따른 CORS 헤더 동작 검증.
 * DB 없이 순수 CORS 헤더만 검증하므로 rate-limit, prisma, tracking을 모킹한다.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const VALID_BODY = {
  type: 'BUG',
  content: 'CORS test feedback',
  nickname: 'cors-tester',
};

function makePost(origin: string) {
  return new NextRequest('http://localhost:3000/api/v1/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'x-forwarded-for': '10.0.0.99',
    },
    body: JSON.stringify(VALID_BODY),
  });
}

function makeOptions(origin: string) {
  return new NextRequest('http://localhost:3000/api/v1/feedback', {
    method: 'OPTIONS',
    headers: { Origin: origin },
  });
}

vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue(true) }));
vi.mock('@/lib/tracking', () => ({ generateTrackingId: vi.fn().mockReturnValue('FB-cors1234') }));
vi.mock('@/server/db/prisma', () => ({
  prisma: {
    feedback: {
      create: vi.fn().mockResolvedValue({
        id: 'test-id',
        trackingId: 'FB-cors1234',
        type: 'BUG',
        status: 'OPEN',
        title: 'CORS test',
        createdAt: new Date().toISOString(),
      }),
    },
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
describe('CORS_PUBLIC_OPEN=true — 공개 모드', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.CORS_PUBLIC_OPEN = 'true';
  });

  afterEach(() => {
    delete process.env.CORS_PUBLIC_OPEN;
    vi.resetModules();
  });

  it('임의 외부 origin에서 POST 시 Access-Control-Allow-Origin: * 를 반환한다', async () => {
    const { POST } = await import('@/app/api/v1/feedback/route');
    const res = await POST(makePost('https://external-site.io'));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('OPTIONS preflight — 204 + Access-Control-Allow-Origin: * 반환', async () => {
    const { OPTIONS } = await import('@/app/api/v1/feedback/route');
    const res = await OPTIONS(makeOptions('https://any-origin.com'));
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Methods')).toMatch(/POST/);
  });

  it('POST 성공 응답에도 CORS 헤더가 포함된다', async () => {
    const { POST } = await import('@/app/api/v1/feedback/route');
    const res = await POST(makePost('https://blog.example.com'));
    expect(res.status).toBe(201);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('CORS_PUBLIC_OPEN=false (기본값) — allowlist 모드', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.CORS_PUBLIC_OPEN = 'false';
    process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:3000';
  });

  afterEach(() => {
    delete process.env.CORS_PUBLIC_OPEN;
    vi.resetModules();
  });

  it('미허용 origin에서 POST 시 CORS 헤더가 없다', async () => {
    const { POST } = await import('@/app/api/v1/feedback/route');
    const res = await POST(makePost('https://evil.example.com'));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('OPTIONS preflight — 미허용 origin에 CORS 헤더 없음', async () => {
    const { OPTIONS } = await import('@/app/api/v1/feedback/route');
    const res = await OPTIONS(makeOptions('https://evil.example.com'));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('허용된 origin(localhost:3000)은 CORS 헤더를 받는다', async () => {
    const { POST } = await import('@/app/api/v1/feedback/route');
    const res = await POST(makePost('http://localhost:3000'));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
  });
});
