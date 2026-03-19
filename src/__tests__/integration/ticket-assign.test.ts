/**
 * Integration: POST /api/v1/tickets/:id/assign
 *             GET  /api/v1/tickets — assigneeId filter
 *
 * TDD RED phase — src/app/api/v1/tickets/[id]/assign/route.ts does not exist yet.
 *
 * Tests:
 *   - Assigns a valid admin user to a ticket (200)
 *   - Unassigns (assigneeId: null)
 *   - 404 when assignee does not exist
 *   - GET /api/v1/tickets filtered by assigneeId (specific user)
 *   - GET /api/v1/tickets filtered by assigneeId=unassigned
 *
 * Strategy:
 *   - auth() mocked
 *   - Real Supabase DB — create admin user + feedback, clean up after each test
 */
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { hash } from 'bcryptjs';

// ── auth() mock ────────────────────────────────────────────────────────────
vi.mock('@/auth', () => ({ auth: vi.fn() }));

// ── admin user for FK satisfaction ────────────────────────────────────────
let ADMIN_ID: string;

beforeAll(async () => {
  const passwordHash = await hash('assign-test-password', 4);
  const admin = await prisma.adminUser.upsert({
    where: { email: 'test-admin-assign@vitest.local' },
    update: {},
    create: {
      email: 'test-admin-assign@vitest.local',
      username: `test-admin-assign-${Date.now()}`,
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
    email: 'test-admin-assign@vitest.local',
    username: 'test-admin-assign',
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

// ── test fixtures ──────────────────────────────────────────────────────────
const TEST_TAG = `test-assign-${Date.now()}`;
const createdFeedbackIds: string[] = [];

async function createTestFeedback() {
  const fb = await prisma.feedback.create({
    data: {
      type: 'BUG',
      title: `[${TEST_TAG}] Assign Test`,
      description: 'Integration test for assignee feature — minimum chars',
      nickname: 'assign-tester',
      trackingId: `FB-${Math.random().toString(36).slice(2, 10)}`,
      status: 'OPEN',
      statusHistory: { create: { toStatus: 'OPEN' } },
    },
  });
  createdFeedbackIds.push(fb.id);
  return fb;
}

async function cleanTestData() {
  if (createdFeedbackIds.length === 0) return;
  await prisma.statusHistory.deleteMany({ where: { feedbackId: { in: createdFeedbackIds } } });
  await prisma.feedback.deleteMany({ where: { id: { in: createdFeedbackIds } } });
  createdFeedbackIds.length = 0;
}

// ── route helpers ──────────────────────────────────────────────────────────
const importPOSTAssign = () =>
  import('@/app/api/v1/tickets/[id]/assign/route').then((m) => m.POST);

const importGETTickets = () =>
  import('@/app/api/v1/tickets/route').then((m) => m.GET);

function makeAssignRequest(ticketId: string, body: { assigneeId: string | null }) {
  return new NextRequest(`http://localhost:3000/api/v1/tickets/${ticketId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeGetTicketsRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost:3000/api/v1/tickets');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/v1/tickets/:id/assign', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanTestData();
  });

  // ── authentication ───────────────────────────────────────────────────────
  it('returns 401 when unauthenticated', async () => {
    await setAdminSession(null);
    const ticket = await createTestFeedback();
    const POST = await importPOSTAssign();
    const res = await POST(makeAssignRequest(ticket.id, { assigneeId: ADMIN_ID }), {
      params: Promise.resolve({ id: ticket.id }),
    });
    expect(res.status).toBe(401);
  });

  // ── assign ───────────────────────────────────────────────────────────────
  it('assigns a valid admin user and returns 200 with updated ticket', async () => {
    await setAdminSession();
    const ticket = await createTestFeedback();
    const POST = await importPOSTAssign();
    const res = await POST(makeAssignRequest(ticket.id, { assigneeId: ADMIN_ID }), {
      params: Promise.resolve({ id: ticket.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    // The response should include the assignee
    expect(body.data.assigneeId).toBe(ADMIN_ID);
  });

  it('persists the assignee in the DB after assignment', async () => {
    await setAdminSession();
    const ticket = await createTestFeedback();
    const POST = await importPOSTAssign();
    await POST(makeAssignRequest(ticket.id, { assigneeId: ADMIN_ID }), {
      params: Promise.resolve({ id: ticket.id }),
    });
    const updated = await prisma.feedback.findUnique({
      where: { id: ticket.id },
      select: { assigneeId: true },
    });
    expect(updated?.assigneeId).toBe(ADMIN_ID);
  });

  // ── unassign ─────────────────────────────────────────────────────────────
  it('unassigns when assigneeId is null and returns 200', async () => {
    await setAdminSession();
    const ticket = await createTestFeedback();
    // First assign
    const POST = await importPOSTAssign();
    await POST(makeAssignRequest(ticket.id, { assigneeId: ADMIN_ID }), {
      params: Promise.resolve({ id: ticket.id }),
    });
    // Then unassign
    const res = await POST(makeAssignRequest(ticket.id, { assigneeId: null }), {
      params: Promise.resolve({ id: ticket.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.assigneeId).toBeNull();
  });

  // ── error cases ──────────────────────────────────────────────────────────
  it('returns 404 when ticket does not exist', async () => {
    await setAdminSession();
    const POST = await importPOSTAssign();
    const nonExistentId = 'cjld2cjxh0000qzrmn831i700'; // valid cuid but no row
    const res = await POST(makeAssignRequest(nonExistentId, { assigneeId: ADMIN_ID }), {
      params: Promise.resolve({ id: nonExistentId }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 404 when assignee admin user does not exist', async () => {
    await setAdminSession();
    const ticket = await createTestFeedback();
    const POST = await importPOSTAssign();
    const nonExistentAdminId = 'cjld2cjxh0000qzrmn831i711'; // valid cuid but no admin row
    const res = await POST(makeAssignRequest(ticket.id, { assigneeId: nonExistentAdminId }), {
      params: Promise.resolve({ id: ticket.id }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/assignee/i);
  });

  it('returns 400 for invalid assigneeId (non-cuid string)', async () => {
    await setAdminSession();
    const ticket = await createTestFeedback();
    const POST = await importPOSTAssign();
    const res = await POST(
      new NextRequest(`http://localhost:3000/api/v1/tickets/${ticket.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeId: 'not-a-valid-id' }),
      }),
      { params: Promise.resolve({ id: ticket.id }) },
    );
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/v1/tickets — assigneeId filter (Phase 5-2)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanTestData();
  });

  it('returns only tickets assigned to the specified admin when assigneeId filter is used', async () => {
    await setAdminSession();
    // Create one assigned ticket and one unassigned
    const assignedTicket = await createTestFeedback();
    await createTestFeedback(); // unassigned

    // Assign the first ticket
    await prisma.feedback.update({
      where: { id: assignedTicket.id },
      data: { assigneeId: ADMIN_ID },
    });

    const GET = await importGETTickets();
    const res = await GET(makeGetTicketsRequest({ assigneeId: ADMIN_ID }));
    expect(res.status).toBe(200);
    const body = await res.json();
    const testTickets = body.data.filter((d: { title: string }) => d.title.includes(TEST_TAG));
    // Only the assigned ticket should appear
    expect(testTickets.every((t: { assigneeId: string | null }) => t.assigneeId === ADMIN_ID)).toBe(true);
  });

  it('returns only unassigned tickets when assigneeId=unassigned', async () => {
    await setAdminSession();
    // Create one assigned and one unassigned
    const assignedTicket = await createTestFeedback();
    const unassignedTicket = await createTestFeedback();

    await prisma.feedback.update({
      where: { id: assignedTicket.id },
      data: { assigneeId: ADMIN_ID },
    });

    const GET = await importGETTickets();
    const res = await GET(makeGetTicketsRequest({ assigneeId: 'unassigned' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    const testTickets = body.data.filter((d: { title: string }) => d.title.includes(TEST_TAG));
    // All test tickets in this group should be unassigned
    const unassignedIds = testTickets.map((t: { id: string }) => t.id);
    expect(unassignedIds).toContain(unassignedTicket.id);
    expect(unassignedIds).not.toContain(assignedTicket.id);
  });
});
