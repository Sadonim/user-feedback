/**
 * Integration: GET /api/v1/admin/users
 *
 * TDD RED phase — src/app/api/v1/admin/users/route.ts does not exist yet.
 *
 * SECURITY REQUIREMENT (design_phase5.md §2.5):
 *   The response MUST NOT include the passwordHash field.
 *
 * Test strategy:
 *   - auth() mocked to inject session
 *   - Real Supabase DB (no DB mocks)
 *   - Admin user created in beforeAll / deleted in afterAll
 */
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { hash } from 'bcryptjs';

// ── auth() mock ────────────────────────────────────────────────────────────
vi.mock('@/auth', () => ({ auth: vi.fn() }));

// ── test admin user ────────────────────────────────────────────────────────
let ADMIN_ID: string;

beforeAll(async () => {
  const passwordHash = await hash('test-password-admin-users-123', 4);
  const admin = await prisma.adminUser.upsert({
    where: { email: 'test-admin-users@vitest.local' },
    update: {},
    create: {
      email: 'test-admin-users@vitest.local',
      username: `test-admin-users-${Date.now()}`,
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
  user: {
    id: ADMIN_ID,
    email: 'test-admin-users@vitest.local',
    username: 'test-admin-users',
    role: 'ADMIN' as const,
  },
  expires: new Date(Date.now() + 3_600_000).toISOString(),
});

const setAdminSession = async (
  session: ReturnType<typeof makeAdminSession> | null = makeAdminSession(),
) => {
  const { auth } = await import('@/auth');
  (auth as ReturnType<typeof vi.fn>).mockResolvedValue(session);
};

// ── route under test ───────────────────────────────────────────────────────
const importGET = () =>
  import('@/app/api/v1/admin/users/route').then((m) => m.GET);

function makeGetRequest() {
  return new NextRequest('http://localhost:3000/api/v1/admin/users');
}

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/v1/admin/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── authentication ───────────────────────────────────────────────────────
  describe('authentication', () => {
    it('returns 401 when unauthenticated', async () => {
      await setAdminSession(null);
      const GET = await importGET();
      const res = await GET(makeGetRequest());
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
    });
  });

  // ── success responses ────────────────────────────────────────────────────
  describe('success', () => {
    it('returns 200 with success:true for authenticated requests', async () => {
      await setAdminSession();
      const GET = await importGET();
      const res = await GET(makeGetRequest());
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it('returns data as an array', async () => {
      await setAdminSession();
      const GET = await importGET();
      const res = await GET(makeGetRequest());
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('includes the test admin user in the response', async () => {
      await setAdminSession();
      const GET = await importGET();
      const res = await GET(makeGetRequest());
      const body = await res.json();
      const found = body.data.find((u: { id: string }) => u.id === ADMIN_ID);
      expect(found).toBeDefined();
    });

    it('each user has id, username, email, role fields', async () => {
      await setAdminSession();
      const GET = await importGET();
      const res = await GET(makeGetRequest());
      const body = await res.json();
      // At minimum our test admin should be in the list
      const found = body.data.find((u: { id: string }) => u.id === ADMIN_ID);
      expect(found).toMatchObject({
        id: expect.any(String),
        username: expect.any(String),
        email: expect.any(String),
        role: 'ADMIN',
      });
    });

    it('SECURITY: response does NOT include passwordHash field', async () => {
      await setAdminSession();
      const GET = await importGET();
      const res = await GET(makeGetRequest());
      const body = await res.json();
      // Check every returned user — none should have passwordHash
      for (const user of body.data) {
        expect(user).not.toHaveProperty('passwordHash');
      }
    });

    it('SECURITY: response does NOT include passwordHash even as null', async () => {
      await setAdminSession();
      const GET = await importGET();
      const res = await GET(makeGetRequest());
      const body = await res.json();
      const serialised = JSON.stringify(body.data);
      expect(serialised).not.toContain('passwordHash');
    });
  });
});
