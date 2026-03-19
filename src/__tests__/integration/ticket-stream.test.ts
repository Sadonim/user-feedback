/**
 * Integration: GET /api/v1/tickets/stream (SSE)
 *
 * TDD RED phase — src/app/api/v1/tickets/stream/route.ts does not exist yet.
 *
 * Tests:
 *   - Returns 401 when unauthenticated
 *   - Returns Content-Type: text/event-stream when authenticated
 *   - First SSE event is "init" with total and open fields
 *
 * Strategy:
 *   - auth() mocked
 *   - Real Supabase DB for init event counts
 *   - Stream is read once then immediately cancelled to avoid hanging
 */
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { hash } from 'bcryptjs';

// ── auth() mock ────────────────────────────────────────────────────────────
vi.mock('@/auth', () => ({ auth: vi.fn() }));

// ── admin user ─────────────────────────────────────────────────────────────
let ADMIN_ID: string;

beforeAll(async () => {
  const passwordHash = await hash('stream-test-password', 4);
  const admin = await prisma.adminUser.upsert({
    where: { email: 'test-admin-stream@vitest.local' },
    update: {},
    create: {
      email: 'test-admin-stream@vitest.local',
      username: `test-admin-stream-${Date.now()}`,
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
    email: 'test-admin-stream@vitest.local',
    username: 'test-admin-stream',
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
  import('@/app/api/v1/tickets/stream/route').then((m) => m.GET);

function makeStreamRequest() {
  return new NextRequest('http://localhost:3000/api/v1/tickets/stream', {
    headers: { Accept: 'text/event-stream' },
  });
}

/** Read bytes from a ReadableStream until the accumulated text contains a target string,
 *  or until maxBytes are read, then cancel the reader. */
async function readUntil(
  body: ReadableStream<Uint8Array>,
  target: string,
  maxBytes = 4096,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  try {
    while (accumulated.length < maxBytes) {
      const { value, done } = await reader.read();
      if (done) break;
      accumulated += decoder.decode(value, { stream: true });
      if (accumulated.includes(target)) break;
    }
  } finally {
    await reader.cancel();
  }
  return accumulated;
}

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/v1/tickets/stream (SSE)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── authentication ───────────────────────────────────────────────────────
  it('returns 401 when unauthenticated', async () => {
    await setAdminSession(null);
    const GET = await importGET();
    const res = await GET(makeStreamRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // ── response format ──────────────────────────────────────────────────────
  it('returns Content-Type: text/event-stream when authenticated', async () => {
    await setAdminSession();
    const GET = await importGET();
    const res = await GET(makeStreamRequest());
    expect(res.status).toBe(200);
    const contentType = res.headers.get('content-type') ?? '';
    expect(contentType).toMatch(/text\/event-stream/);
  });

  it('includes Cache-Control: no-cache in response headers', async () => {
    await setAdminSession();
    const GET = await importGET();
    const res = await GET(makeStreamRequest());
    const cacheControl = res.headers.get('cache-control') ?? '';
    expect(cacheControl).toMatch(/no-cache/);
  });

  // ── init event ───────────────────────────────────────────────────────────
  it('emits an "init" SSE event as the first event', async () => {
    await setAdminSession();
    const GET = await importGET();
    const res = await GET(makeStreamRequest());
    expect(res.body).toBeTruthy();
    const text = await readUntil(res.body!, 'event: init');
    expect(text).toContain('event: init');
  });

  it('init event data contains "total" field', async () => {
    await setAdminSession();
    const GET = await importGET();
    const res = await GET(makeStreamRequest());
    const text = await readUntil(res.body!, 'event: init');
    // Extract the data line after the event: init line
    const dataMatch = text.match(/event:\s*init\r?\ndata:\s*(.+)/);
    expect(dataMatch).toBeTruthy();
    const data = JSON.parse(dataMatch![1]);
    expect(data).toHaveProperty('total');
    expect(typeof data.total).toBe('number');
  });

  it('init event data contains "open" field', async () => {
    await setAdminSession();
    const GET = await importGET();
    const res = await GET(makeStreamRequest());
    const text = await readUntil(res.body!, 'event: init');
    const dataMatch = text.match(/event:\s*init\r?\ndata:\s*(.+)/);
    expect(dataMatch).toBeTruthy();
    const data = JSON.parse(dataMatch![1]);
    expect(data).toHaveProperty('open');
    expect(typeof data.open).toBe('number');
  });

  it('open count is <= total count in init payload', async () => {
    await setAdminSession();
    const GET = await importGET();
    const res = await GET(makeStreamRequest());
    const text = await readUntil(res.body!, 'event: init');
    const dataMatch = text.match(/event:\s*init\r?\ndata:\s*(.+)/);
    const data = JSON.parse(dataMatch![1]);
    expect(data.open).toBeLessThanOrEqual(data.total);
  });
});
