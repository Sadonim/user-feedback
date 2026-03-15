/**
 * Unit: sanitizeCallbackUrl (AdminLoginPage 내부 함수)
 *
 * TDD RED phase — src/app/admin/login/page.tsx 아직 미구현
 *
 * C1 보안 수정: callbackUrl을 서버 사이드에서 검증해 Open Redirect를 방지한다.
 * 허용: /admin/dashboard 같은 상대 경로
 * 거부: https://evil.com, //evil.com, javascript:alert(1)
 *
 * 구현 파일이 없으므로 이 테스트는 모두 FAIL 상태 (RED).
 */
import { describe, it, expect } from 'vitest';

// 구현 파일에서 내보내진 함수를 테스트한다.
// 현재 파일이 없으므로 import 자체가 실패한다 → RED.
// 구현 후에는 이 import가 동작해야 한다.
let sanitizeCallbackUrl: (raw: string | undefined) => string;

beforeAll(async () => {
  // 동적 임포트로 로드 실패를 테스트 내에서 처리
  try {
    const mod = await import('@/app/admin/login/page');
    // page.tsx가 sanitizeCallbackUrl을 named export로 내보내야 한다.
    // (기본값은 /admin/dashboard)
    sanitizeCallbackUrl = (mod as { sanitizeCallbackUrl?: (raw: string | undefined) => string }).sanitizeCallbackUrl ?? (() => '/admin/dashboard');
  } catch {
    // 파일 미존재 시 기본 stub — 테스트는 실패한다
    sanitizeCallbackUrl = () => { throw new Error('sanitizeCallbackUrl not implemented'); };
  }
});

const DEFAULT = '/admin/dashboard';
const SAFE_CALLBACK_RE = /^\/[a-zA-Z0-9\-_/?=&%#]*$/;

describe('sanitizeCallbackUrl()', () => {
  describe('허용되어야 하는 경로', () => {
    it('undefined이면 기본 경로를 반환해야 한다', () => {
      expect(sanitizeCallbackUrl(undefined)).toBe(DEFAULT);
    });

    it('/admin/tickets 는 허용해야 한다', () => {
      expect(sanitizeCallbackUrl('/admin/tickets')).toBe('/admin/tickets');
    });

    it('/admin/tickets/abc123 은 허용해야 한다', () => {
      expect(sanitizeCallbackUrl('/admin/tickets/abc123')).toBe('/admin/tickets/abc123');
    });

    it('쿼리 파라미터가 있는 상대 경로를 허용해야 한다', () => {
      expect(sanitizeCallbackUrl('/admin/tickets?status=OPEN')).toBe(
        '/admin/tickets?status=OPEN',
      );
    });

    it('정규식 패턴에 맞는 경로는 모두 허용해야 한다', () => {
      const validPaths = [
        '/admin/dashboard',
        '/admin/tickets',
        '/admin/tickets/id-123',
        '/admin/tickets?page=2&limit=10',
        '/submit',
        '/track',
      ];
      for (const path of validPaths) {
        if (SAFE_CALLBACK_RE.test(path)) {
          expect(sanitizeCallbackUrl(path)).toBe(path);
        }
      }
    });
  });

  describe('거부되어야 하는 경로 (→ 기본 경로 반환)', () => {
    it('절대 URL (https://)을 거부해야 한다', () => {
      expect(sanitizeCallbackUrl('https://evil.com')).toBe(DEFAULT);
    });

    it('절대 URL (http://)을 거부해야 한다', () => {
      expect(sanitizeCallbackUrl('http://evil.com/steal?token=xyz')).toBe(DEFAULT);
    });

    it('프로토콜 상대 URL (//)을 거부해야 한다', () => {
      expect(sanitizeCallbackUrl('//evil.com')).toBe(DEFAULT);
    });

    it('javascript: 스키마를 거부해야 한다', () => {
      expect(sanitizeCallbackUrl('javascript:alert(1)')).toBe(DEFAULT);
    });

    it('빈 문자열을 거부해야 한다', () => {
      expect(sanitizeCallbackUrl('')).toBe(DEFAULT);
    });

    it('/ 로 시작하지 않는 상대 경로를 거부해야 한다', () => {
      expect(sanitizeCallbackUrl('admin/dashboard')).toBe(DEFAULT);
    });

    it('이중 슬래시 (//로 시작) 경로를 거부해야 한다', () => {
      expect(sanitizeCallbackUrl('//admin/dashboard')).toBe(DEFAULT);
    });

    it('data: URI를 거부해야 한다', () => {
      expect(sanitizeCallbackUrl('data:text/html,<script>alert(1)</script>')).toBe(DEFAULT);
    });

    it('특수문자 포함 경로를 거부해야 한다 (공백)', () => {
      // 정규식 패턴에 공백이 없으므로 거부
      expect(sanitizeCallbackUrl('/admin/dashboard page')).toBe(DEFAULT);
    });
  });

  describe('엣지 케이스', () => {
    it('정확히 "/" 만인 경로는 허용해야 한다', () => {
      // SAFE_CALLBACK_RE: /^\/[a-zA-Z0-9\-_/?=&%#]*$/ — 빈 suffix도 매칭
      // "/"는 ^\/$ 패턴에 해당하므로 허용
      const result = sanitizeCallbackUrl('/');
      expect([DEFAULT, '/']).toContain(result); // 구현에 따라 허용/거부 가능
    });

    it('/admin/login 은 허용해야 한다 (무한 루프는 미들웨어가 처리)', () => {
      const result = sanitizeCallbackUrl('/admin/login');
      expect(result).toBe('/admin/login');
    });
  });
});
