/**
 * Unit: requireAuth()
 *
 * TDD RED phase — src/lib/api/require-auth.ts 아직 미구현
 * 이 테스트들은 구현 전에 실패해야 한다.
 *
 * 테스트 전략:
 *  - `auth()` (NextAuth 세션 함수)를 vi.mock으로 교체
 *  - DB 호출 없음 — requireAuth는 순수 세션 판별 로직
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── NextAuth auth() 모킹 ──────────────────────────────────────────────────
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// 모킹 후 임포트 (hoisting 때문에 dynamic import 사용)
const getAuthMock = async () => {
  const { auth } = await import('@/auth');
  return auth as ReturnType<typeof vi.fn>;
};

// ── 실제 테스트 대상 (아직 미구현 → RED) ───────────────────────────────────
// import { requireAuth } from '@/lib/api/require-auth';
// 구현 파일이 없으므로 dynamic import로 감싸 에러를 테스트 내부에서 처리
const importRequireAuth = () => import('@/lib/api/require-auth');

describe('requireAuth()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 인증 성공 케이스 ────────────────────────────────────────────────────
  describe('유효한 세션이 있을 때', () => {
    it('type: ok 와 user 객체를 반환해야 한다', async () => {
      const authMock = await getAuthMock();
      authMock.mockResolvedValue({
        user: {
          id: 'admin-1',
          email: 'admin@example.com',
          username: 'admin',
          role: 'ADMIN',
        },
        expires: new Date(Date.now() + 3600_000).toISOString(),
      });

      const { requireAuth } = await importRequireAuth();
      const result = await requireAuth();

      expect(result.type).toBe('ok');
      if (result.type === 'ok') {
        expect(result.user.id).toBe('admin-1');
        expect(result.user.email).toBe('admin@example.com');
        expect(result.user.username).toBe('admin');
        expect(result.user.role).toBe('ADMIN');
      }
    });

    it('MANAGER 역할도 허용해야 한다', async () => {
      const authMock = await getAuthMock();
      authMock.mockResolvedValue({
        user: {
          id: 'manager-1',
          email: 'manager@example.com',
          username: 'manager',
          role: 'MANAGER',
        },
        expires: new Date(Date.now() + 3600_000).toISOString(),
      });

      const { requireAuth } = await importRequireAuth();
      const result = await requireAuth();

      expect(result.type).toBe('ok');
      if (result.type === 'ok') {
        expect(result.user.role).toBe('MANAGER');
      }
    });

    it('반환된 user 객체는 불변 형태여야 한다 (새 객체 생성)', async () => {
      const session = {
        user: {
          id: 'admin-1',
          email: 'admin@example.com',
          username: 'admin',
          role: 'ADMIN' as const,
        },
        expires: new Date(Date.now() + 3600_000).toISOString(),
      };
      const authMock = await getAuthMock();
      authMock.mockResolvedValue(session);

      const { requireAuth } = await importRequireAuth();
      const result = await requireAuth();

      if (result.type === 'ok') {
        // 원본 세션 객체와 동일한 참조가 아니어야 함
        expect(result.user).not.toBe(session.user);
      }
    });
  });

  // ── 인증 실패 케이스 ────────────────────────────────────────────────────
  describe('세션이 없거나 불완전할 때', () => {
    it('auth()가 null을 반환하면 type: error + 401 응답을 반환해야 한다', async () => {
      const authMock = await getAuthMock();
      authMock.mockResolvedValue(null);

      const { requireAuth } = await importRequireAuth();
      const result = await requireAuth();

      expect(result.type).toBe('error');
      if (result.type === 'error') {
        expect(result.response.status).toBe(401);
        const body = await result.response.json();
        expect(body.success).toBe(false);
        expect(body.error).toBe('Unauthorized');
      }
    });

    it('session.user가 없으면 type: error + 401을 반환해야 한다', async () => {
      const authMock = await getAuthMock();
      authMock.mockResolvedValue({
        expires: new Date(Date.now() + 3600_000).toISOString(),
        // user 없음
      });

      const { requireAuth } = await importRequireAuth();
      const result = await requireAuth();

      expect(result.type).toBe('error');
      if (result.type === 'error') {
        expect(result.response.status).toBe(401);
      }
    });

    it('session.user.id가 없으면 type: error + 401을 반환해야 한다', async () => {
      const authMock = await getAuthMock();
      authMock.mockResolvedValue({
        user: {
          // id 없음
          email: 'admin@example.com',
          username: 'admin',
          role: 'ADMIN',
        },
        expires: new Date(Date.now() + 3600_000).toISOString(),
      });

      const { requireAuth } = await importRequireAuth();
      const result = await requireAuth();

      expect(result.type).toBe('error');
      if (result.type === 'error') {
        expect(result.response.status).toBe(401);
      }
    });

    it('session.user.id가 빈 문자열이면 type: error + 401을 반환해야 한다', async () => {
      const authMock = await getAuthMock();
      authMock.mockResolvedValue({
        user: { id: '', email: 'admin@example.com', username: 'admin', role: 'ADMIN' },
        expires: new Date(Date.now() + 3600_000).toISOString(),
      });

      const { requireAuth } = await importRequireAuth();
      const result = await requireAuth();

      expect(result.type).toBe('error');
      if (result.type === 'error') {
        expect(result.response.status).toBe(401);
      }
    });

    it('auth()가 예외를 던지면 에러가 전파되어야 한다', async () => {
      const authMock = await getAuthMock();
      authMock.mockRejectedValue(new Error('AUTH_SECRET missing'));

      const { requireAuth } = await importRequireAuth();
      await expect(requireAuth()).rejects.toThrow('AUTH_SECRET missing');
    });
  });

  // ── 타입 안전성 ────────────────────────────────────────────────────────
  describe('AuthOk / AuthFail 판별 타입', () => {
    it('AuthOk는 type === ok 이고 user 필드를 가져야 한다', async () => {
      const authMock = await getAuthMock();
      authMock.mockResolvedValue({
        user: { id: 'u1', email: 'e@e.com', username: 'u', role: 'ADMIN' },
        expires: new Date(Date.now() + 3600_000).toISOString(),
      });

      const { requireAuth } = await importRequireAuth();
      const result = await requireAuth();

      // 타입 좁히기가 정상 동작하는지 확인
      if (result.type === 'ok') {
        expect(typeof result.user.id).toBe('string');
        expect(typeof result.user.username).toBe('string');
        expect(['ADMIN', 'MANAGER']).toContain(result.user.role);
      }
    });

    it('AuthFail는 type === error 이고 response 필드를 가져야 한다', async () => {
      const authMock = await getAuthMock();
      authMock.mockResolvedValue(null);

      const { requireAuth } = await importRequireAuth();
      const result = await requireAuth();

      if (result.type === 'error') {
        expect(result.response).toBeDefined();
        expect(typeof result.response.status).toBe('number');
      }
    });
  });
});
