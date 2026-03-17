/**
 * Integration: PATCH /api/v1/tickets/:id — email notification side-effects
 *
 * Strategy:
 *  - emailService is mocked at module level (vi.mock) — no real email sent
 *  - Real DB (Prisma) is used for ticket creation and cleanup
 *  - auth() is mocked to inject an admin session
 *
 * Verifies:
 *  - Status change triggers notifyStatusChanged with correct params
 *  - Priority-only change does NOT trigger notifyStatusChanged
 *  - Null email on feedback suppresses the notification
 *  - 404 ticket does NOT trigger notifyStatusChanged
 *  - PATCH still returns 200 even if notifyStatusChanged throws
 */
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { hash } from 'bcryptjs';

// ── Mock email service before any route imports ────────────────────────────
vi.mock('@/server/services/email', () => ({
  emailService: {
    notifyStatusChanged: vi.fn().mockResolvedValue(undefined),
    notifyAdminNewFeedback: vi.fn().mockResolvedValue(undefined),
  },
  parseAdminEmails: vi.fn().mockReturnValue([]),
}));

// ── Mock auth ──────────────────────────────────────────────────────────────
vi.mock('@/auth', () => ({ auth: vi.fn() }));

// ── Import mocked emailService for assertion ───────────────────────────────
import { emailService } from '@/server/services/email';

// ── Admin user setup (required for changedById FK) ─────────────────────────
let ADMIN_ID: string;

beforeAll(async () => {
  const passwordHash = await hash('test-password-notif', 4);
  const admin = await prisma.adminUser.upsert({
    where: { email: 'test-admin-notif@vitest.local' },
    update: {},
    create: {
      email: 'test-admin-notif@vitest.local',
      username: `test-admin-notif-${Date.now()}`,
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

// ── Session helpers ────────────────────────────────────────────────────────
const makeAdminSession = () => ({
  user: {
    id: ADMIN_ID,
    email: 'test-admin-notif@vitest.local',
    username: 'test-admin-notif',
    role: 'ADMIN' as const,
  },
  expires: new Date(Date.now() + 3_600_000).toISOString(),
});

const setAdminSession = async (
  session: ReturnType<typeof makeAdminSession> | null = makeAdminSession()
) => {
  const { auth } = await import('@/auth');
  (auth as ReturnType<typeof vi.fn>).mockResolvedValue(session);
};

// ── Fixture helpers ────────────────────────────────────────────────────────
const TEST_TAG = `ticket-notif-${Date.now()}`;
const createdIds: string[] = [];

async function createTestFeedback(
  overrides: {
    status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
    email?: string | null;
  } = {}
) {
  const fb = await prisma.feedback.create({
    data: {
      type: 'BUG',
      title: `[${TEST_TAG}] Notification Test`,
      description: 'Integration test — notification side-effects',
      nickname: 'notif-tester',
      email: overrides.email !== undefined ? overrides.email : 'submitter@example.com',
      trackingId: `FB-${Math.random().toString(36).slice(2, 10)}`,
      status: overrides.status ?? 'OPEN',
      statusHistory: {
        create: { toStatus: overrides.status ?? 'OPEN' },
      },
    },
  });
  createdIds.push(fb.id);
  return fb;
}

afterEach(async () => {
  vi.clearAllMocks();
  if (createdIds.length === 0) return;
  await prisma.statusHistory.deleteMany({ where: { feedbackId: { in: [...createdIds] } } });
  await prisma.feedback.deleteMany({ where: { id: { in: [...createdIds] } } });
  createdIds.length = 0;
});

// ── Request helpers ────────────────────────────────────────────────────────
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

const importHandlers = () => import('@/app/api/v1/tickets/[id]/route');

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/v1/tickets/:id — email notifications', () => {
  beforeEach(() => setAdminSession());

  it('calls notifyStatusChanged once on status change', async () => {
    const ticket = await createTestFeedback({ status: 'OPEN' });
    const { PATCH } = await importHandlers();

    const res = await PATCH(
      makeRequest('PATCH', ticket.id, { status: 'IN_PROGRESS' }),
      makeParams(ticket.id)
    );

    expect(res.status).toBe(200);
    expect(vi.mocked(emailService.notifyStatusChanged)).toHaveBeenCalledTimes(1);
  });

  it('calls notifyStatusChanged with correct `to` (submitter email)', async () => {
    const ticket = await createTestFeedback({ status: 'OPEN', email: 'submitter@example.com' });
    const { PATCH } = await importHandlers();

    await PATCH(
      makeRequest('PATCH', ticket.id, { status: 'RESOLVED' }),
      makeParams(ticket.id)
    );

    expect(vi.mocked(emailService.notifyStatusChanged)).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'submitter@example.com' })
    );
  });

  it('calls notifyStatusChanged with correct trackingId', async () => {
    const ticket = await createTestFeedback({ status: 'OPEN' });
    const { PATCH } = await importHandlers();

    await PATCH(
      makeRequest('PATCH', ticket.id, { status: 'RESOLVED' }),
      makeParams(ticket.id)
    );

    expect(vi.mocked(emailService.notifyStatusChanged)).toHaveBeenCalledWith(
      expect.objectContaining({ trackingId: ticket.trackingId })
    );
  });

  it('calls notifyStatusChanged with correct fromStatus and toStatus', async () => {
    const ticket = await createTestFeedback({ status: 'OPEN' });
    const { PATCH } = await importHandlers();

    await PATCH(
      makeRequest('PATCH', ticket.id, { status: 'CLOSED' }),
      makeParams(ticket.id)
    );

    expect(vi.mocked(emailService.notifyStatusChanged)).toHaveBeenCalledWith(
      expect.objectContaining({ fromStatus: 'OPEN', toStatus: 'CLOSED' })
    );
  });

  it('does NOT call notifyStatusChanged on priority-only change', async () => {
    const ticket = await createTestFeedback();
    const { PATCH } = await importHandlers();

    const res = await PATCH(
      makeRequest('PATCH', ticket.id, { priority: 'HIGH' }),
      makeParams(ticket.id)
    );

    expect(res.status).toBe(200);
    expect(vi.mocked(emailService.notifyStatusChanged)).not.toHaveBeenCalled();
  });

  it('does NOT call notifyStatusChanged when feedback.email is null', async () => {
    const ticket = await createTestFeedback({ email: null });
    const { PATCH } = await importHandlers();

    const res = await PATCH(
      makeRequest('PATCH', ticket.id, { status: 'RESOLVED' }),
      makeParams(ticket.id)
    );

    expect(res.status).toBe(200);
    expect(vi.mocked(emailService.notifyStatusChanged)).not.toHaveBeenCalled();
  });

  it('does NOT call notifyStatusChanged for a non-existent ticket (404)', async () => {
    const { PATCH } = await importHandlers();

    const res = await PATCH(
      makeRequest('PATCH', 'nonexistent-id-xyz', { status: 'RESOLVED' }),
      makeParams('nonexistent-id-xyz')
    );

    expect(res.status).toBe(404);
    expect(vi.mocked(emailService.notifyStatusChanged)).not.toHaveBeenCalled();
  });

  it('still returns 200 even if notifyStatusChanged throws', async () => {
    vi.mocked(emailService.notifyStatusChanged).mockRejectedValue(new Error('SMTP down'));

    const ticket = await createTestFeedback({ status: 'OPEN' });
    const { PATCH } = await importHandlers();

    const res = await PATCH(
      makeRequest('PATCH', ticket.id, { status: 'IN_PROGRESS' }),
      makeParams(ticket.id)
    );

    expect(res.status).toBe(200);
  });
});
