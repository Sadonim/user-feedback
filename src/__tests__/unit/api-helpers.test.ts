/**
 * Unit: src/lib/api/response.ts + src/lib/api/cors.ts + src/lib/tracking.ts
 *
 * 대상 함수:
 *  response.ts  — ok, created, badRequest, unauthorized, forbidden,
 *                 notFound, tooManyRequests, serverError
 *  cors.ts      — withCors, corsPreflightResponse
 *  tracking.ts  — generateTrackingId
 *
 * 모두 순수함수 / I/O 없음 → DB 불필요, 빠른 단위 테스트
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextResponse } from 'next/server';

// 정적 임포트 — 순수 유틸리티 모듈은 mock 불필요
import {
  ok, created, badRequest, unauthorized,
  forbidden, notFound, tooManyRequests, serverError,
} from '@/lib/api/response';
import { withCors, corsPreflightResponse } from '@/lib/api/cors';
import { generateTrackingId } from '@/lib/tracking';

// ─────────────────────────────────────────────────────────────────────────────
// response.ts
// ─────────────────────────────────────────────────────────────────────────────
describe('response helpers (src/lib/api/response.ts)', () => {
  // ── ok() ──────────────────────────────────────────────────────────────────
  describe('ok()', () => {
    it('200 상태 코드를 반환해야 한다', () => {
      expect(ok({ id: '1' }).status).toBe(200);
    });

    it('success: true, data, error: null 형태여야 한다', async () => {
      const data = { id: '1', name: 'test' };
      const body = await ok(data).json();
      expect(body).toEqual({ success: true, data, error: null });
    });

    it('meta가 전달되면 응답에 포함되어야 한다', async () => {
      const meta = { total: 100, page: 2, limit: 20, hasNextPage: true };
      const body = await ok([], meta).json();
      expect(body.meta).toEqual(meta);
    });

    it('meta가 없으면 meta 필드가 없어야 한다', async () => {
      const body = await ok({ id: '1' }).json();
      expect(body.meta).toBeUndefined();
    });

    it('status 오버라이드가 동작해야 한다', () => {
      expect(ok({ id: '1' }, undefined, 202).status).toBe(202);
    });

    it('null 데이터도 허용해야 한다', async () => {
      const body = await ok(null).json();
      expect(body.success).toBe(true);
      expect(body.data).toBeNull();
    });

    it('배열 데이터도 허용해야 한다', async () => {
      const body = await ok([1, 2, 3]).json();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data).toHaveLength(3);
    });
  });

  // ── created() ─────────────────────────────────────────────────────────────
  describe('created()', () => {
    it('201 상태 코드를 반환해야 한다', () => {
      expect(created({ id: '1' }).status).toBe(201);
    });

    it('success: true, error: null 이어야 한다', async () => {
      const body = await created({ id: '1' }).json();
      expect(body.success).toBe(true);
      expect(body.error).toBeNull();
    });

    it('data 필드가 포함되어야 한다', async () => {
      const data = { trackingId: 'FB-abc12345', status: 'OPEN' };
      const body = await created(data).json();
      expect(body.data).toEqual(data);
    });
  });

  // ── badRequest() ──────────────────────────────────────────────────────────
  describe('badRequest()', () => {
    it('400 상태 코드를 반환해야 한다', () => {
      expect(badRequest('invalid').status).toBe(400);
    });

    it('success: false 이어야 한다', async () => {
      const body = await badRequest('invalid').json();
      expect(body.success).toBe(false);
    });

    it('error 필드에 전달된 메시지가 들어가야 한다', async () => {
      const body = await badRequest('Title is required').json();
      expect(body.error).toBe('Title is required');
    });

    it('data는 null 이어야 한다', async () => {
      const body = await badRequest('err').json();
      expect(body.data).toBeNull();
    });
  });

  // ── unauthorized() ────────────────────────────────────────────────────────
  describe('unauthorized()', () => {
    it('401 상태 코드를 반환해야 한다', () => {
      expect(unauthorized().status).toBe(401);
    });

    it('error: Unauthorized, success: false 이어야 한다', async () => {
      const body = await unauthorized().json();
      expect(body.error).toBe('Unauthorized');
      expect(body.success).toBe(false);
    });

    it('data는 null 이어야 한다', async () => {
      const body = await unauthorized().json();
      expect(body.data).toBeNull();
    });
  });

  // ── forbidden() ───────────────────────────────────────────────────────────
  describe('forbidden()', () => {
    it('403 상태 코드를 반환해야 한다', () => {
      expect(forbidden().status).toBe(403);
    });

    it('error: Forbidden, success: false 이어야 한다', async () => {
      const body = await forbidden().json();
      expect(body.error).toBe('Forbidden');
      expect(body.success).toBe(false);
    });

    it('data는 null 이어야 한다', async () => {
      const body = await forbidden().json();
      expect(body.data).toBeNull();
    });
  });

  // ── notFound() ────────────────────────────────────────────────────────────
  describe('notFound()', () => {
    it('404 상태 코드를 반환해야 한다', () => {
      expect(notFound().status).toBe(404);
    });

    it('기본 resource="Resource" 로 메시지를 생성해야 한다', async () => {
      const body = await notFound().json();
      expect(body.error).toBe('Resource not found');
    });

    it('커스텀 resource 이름이 메시지에 포함되어야 한다', async () => {
      const body = await notFound('Ticket').json();
      expect(body.error).toBe('Ticket not found');
    });

    it('"Feedback not found" 메시지도 생성해야 한다', async () => {
      const body = await notFound('Feedback').json();
      expect(body.error).toBe('Feedback not found');
    });

    it('success: false, data: null 이어야 한다', async () => {
      const body = await notFound('X').json();
      expect(body.success).toBe(false);
      expect(body.data).toBeNull();
    });
  });

  // ── tooManyRequests() ─────────────────────────────────────────────────────
  describe('tooManyRequests()', () => {
    it('429 상태 코드를 반환해야 한다', () => {
      expect(tooManyRequests().status).toBe(429);
    });

    it('rate limit 메시지를 포함해야 한다', async () => {
      const body = await tooManyRequests().json();
      expect(body.error).toMatch(/too many requests/i);
    });

    it('success: false, data: null 이어야 한다', async () => {
      const body = await tooManyRequests().json();
      expect(body.success).toBe(false);
      expect(body.data).toBeNull();
    });
  });

  // ── serverError() ─────────────────────────────────────────────────────────
  describe('serverError()', () => {
    afterEach(() => vi.restoreAllMocks());

    it('500 상태 코드를 반환해야 한다', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(serverError(new Error('boom')).status).toBe(500);
    });

    it('error: Internal server error 이어야 한다', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const body = await serverError('something went wrong').json();
      expect(body.error).toBe('Internal server error');
      expect(body.success).toBe(false);
    });

    it('Error 객체를 받아도 500을 반환해야 한다', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(serverError(new Error('boom')).status).toBe(500);
    });

    it('문자열 에러를 받아도 500을 반환해야 한다', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(serverError('string error').status).toBe(500);
    });

    it('undefined를 받아도 500을 반환해야 한다', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(serverError(undefined).status).toBe(500);
    });

    it('에러 내용을 console.error로 로깅해야 한다', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const err = new Error('secret details');
      serverError(err);
      expect(consoleSpy).toHaveBeenCalledWith('[API Error]', err);
    });

    it('스택 트레이스를 클라이언트 응답에 노출하지 않아야 한다', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const body = await serverError(new Error('secret stack')).json();
      expect(JSON.stringify(body)).not.toContain('secret stack');
    });

    it('data는 null 이어야 한다', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const body = await serverError('err').json();
      expect(body.data).toBeNull();
    });
  });

  // ── 공통 ApiResponse 봉투 구조 검증 ──────────────────────────────────────
  describe('공통 ApiResponse 봉투 구조', () => {
    afterEach(() => vi.restoreAllMocks());

    it('모든 응답은 success, data, error 필드를 가져야 한다', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const responses = [
        ok({ id: '1' }),
        created({ id: '1' }),
        badRequest('err'),
        unauthorized(),
        forbidden(),
        notFound(),
        tooManyRequests(),
        serverError('err'),
      ];
      for (const res of responses) {
        const body = await res.json();
        expect(body, `status=${res.status}`).toHaveProperty('success');
        expect(body, `status=${res.status}`).toHaveProperty('data');
        expect(body, `status=${res.status}`).toHaveProperty('error');
      }
    });

    it('성공 응답은 error: null 이어야 한다', async () => {
      const bodies = await Promise.all([
        ok({ id: '1' }).json(),
        created({ id: '2' }).json(),
      ]);
      for (const body of bodies) {
        expect(body.error).toBeNull();
        expect(body.success).toBe(true);
      }
    });

    it('실패 응답은 data: null 이어야 한다', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const bodies = await Promise.all([
        badRequest('err').json(),
        unauthorized().json(),
        forbidden().json(),
        notFound().json(),
        tooManyRequests().json(),
        serverError('err').json(),
      ]);
      for (const body of bodies) {
        expect(body.data).toBeNull();
        expect(body.success).toBe(false);
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// cors.ts
// ─────────────────────────────────────────────────────────────────────────────
describe('CORS helpers (src/lib/api/cors.ts)', () => {
  // 테스트 환경: NEXT_PUBLIC_APP_URL=http://localhost:3000 (setup.ts 또는 .env에서)
  const ALLOWED = 'http://localhost:3000';
  const NOT_ALLOWED = 'https://evil.example.com';

  // ── withCors() ────────────────────────────────────────────────────────────
  describe('withCors()', () => {
    it('허용된 origin에 Access-Control-Allow-Origin 헤더를 추가해야 한다', () => {
      const base = NextResponse.json({ ok: true });
      const res = withCors(base, ALLOWED);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ALLOWED);
    });

    it('허용된 origin에 Access-Control-Allow-Methods 헤더를 추가해야 한다', () => {
      const base = NextResponse.json({ ok: true });
      const res = withCors(base, ALLOWED);
      expect(res.headers.get('Access-Control-Allow-Methods')).toBeTruthy();
    });

    it('허용된 origin에 Access-Control-Allow-Headers 헤더를 추가해야 한다', () => {
      const base = NextResponse.json({ ok: true });
      const res = withCors(base, ALLOWED);
      expect(res.headers.get('Access-Control-Allow-Headers')).toBeTruthy();
    });

    it('GET, POST, OPTIONS 메서드를 허용해야 한다', () => {
      const base = NextResponse.json({ ok: true });
      const methods = withCors(base, ALLOWED).headers.get('Access-Control-Allow-Methods') ?? '';
      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
      expect(methods).toContain('OPTIONS');
    });

    it('Content-Type 헤더를 허용해야 한다', () => {
      const base = NextResponse.json({ ok: true });
      const headers = withCors(base, ALLOWED).headers.get('Access-Control-Allow-Headers') ?? '';
      expect(headers).toContain('Content-Type');
    });

    it('Access-Control-Max-Age: 86400 을 설정해야 한다', () => {
      const base = NextResponse.json({ ok: true });
      expect(withCors(base, ALLOWED).headers.get('Access-Control-Max-Age')).toBe('86400');
    });

    it('허용되지 않은 origin에는 CORS 헤더를 추가하지 않아야 한다', () => {
      const base = NextResponse.json({ ok: true });
      const res = withCors(base, NOT_ALLOWED);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('origin이 null이면 CORS 헤더를 추가하지 않아야 한다', () => {
      const base = NextResponse.json({ ok: true });
      const res = withCors(base, null);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('동일한 Response 인스턴스를 반환해야 한다 (제자리 수정)', () => {
      const base = NextResponse.json({ ok: true });
      expect(withCors(base, ALLOWED)).toBe(base);
    });

    it('허용되지 않은 origin에 호출해도 Response 인스턴스를 반환해야 한다', () => {
      const base = NextResponse.json({ ok: true });
      expect(withCors(base, NOT_ALLOWED)).toBe(base);
    });
  });

  // ── corsPreflightResponse() ───────────────────────────────────────────────
  describe('corsPreflightResponse()', () => {
    it('204 상태 코드를 반환해야 한다', () => {
      expect(corsPreflightResponse(ALLOWED).status).toBe(204);
    });

    it('허용된 origin에 CORS 헤더가 포함되어야 한다', () => {
      const res = corsPreflightResponse(ALLOWED);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ALLOWED);
    });

    it('허용되지 않은 origin에는 CORS 헤더가 없어야 한다', () => {
      const res = corsPreflightResponse(NOT_ALLOWED);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('null origin이면 CORS 헤더가 없어야 한다', () => {
      const res = corsPreflightResponse(null);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('응답 바디가 비어야 한다', async () => {
      const text = await corsPreflightResponse(ALLOWED).text();
      expect(text).toBe('');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// tracking.ts
// ─────────────────────────────────────────────────────────────────────────────
describe('tracking helpers (src/lib/tracking.ts)', () => {
  // ── generateTrackingId() ──────────────────────────────────────────────────
  describe('generateTrackingId()', () => {
    it('FB- 접두사로 시작해야 한다', () => {
      expect(generateTrackingId()).toMatch(/^FB-/);
    });

    it('FB-[a-z0-9]{8} 형식이어야 한다', () => {
      expect(generateTrackingId()).toMatch(/^FB-[a-z0-9]{8}$/);
    });

    it('총 길이가 11자여야 한다 (FB- 3자 + 8자)', () => {
      expect(generateTrackingId()).toHaveLength(11);
    });

    it('10번 호출해도 모두 유효한 형식이어야 한다', () => {
      const pattern = /^FB-[a-z0-9]{8}$/;
      for (let i = 0; i < 10; i++) {
        expect(generateTrackingId(), `attempt ${i}`).toMatch(pattern);
      }
    });

    it('100번 연속 생성 시 중복이 없어야 한다 (통계적 확인)', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateTrackingId()));
      expect(ids.size).toBe(100);
    });

    it('대문자나 특수문자를 포함하지 않아야 한다', () => {
      const id = generateTrackingId();
      const suffix = id.slice(3); // FB- 제거
      expect(suffix).toMatch(/^[a-z0-9]+$/);
    });
  });

});

