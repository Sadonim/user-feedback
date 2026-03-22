/**
 * Integration: POST /api/v1/feedback — admin email notification side-effects
 *
 * Strategy:
 *  - emailService is mocked at module level (vi.mock) — no real email sent
 *  - Real DB (Prisma) is used for feedback creation and cleanup
 *  - Rate limiter is bypassed by mocking checkRateLimit
 *
 * Verifies:
 *  - Valid POST triggers notifyAdminNewFeedback once with correct params
 *  - parseAdminEmails is called with ADMIN_NOTIFICATION_EMAILS env var
 *  - Invalid POST (validation failure) does NOT trigger notifyAdminNewFeedback
 *  - POST still returns 201 even if notifyAdminNewFeedback throws
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/server/db/prisma';

// ── Mock email service before route import ────────────────────────────────
vi.mock('@/server/services/email', () => ({
  emailService: {
    notifyStatusChanged: vi.fn().mockResolvedValue(undefined),
    notifyAdminNewFeedback: vi.fn().mockResolvedValue(undefined),
  },
  parseAdminEmails: vi.fn().mockReturnValue([]),
}));

// ── Mock rate limiter so tests always pass the rate check ─────────────────
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
}));

// ── Import mocked service for assertion ───────────────────────────────────
import { emailService, parseAdminEmails } from '@/server/services/email';

// ── Fixture helpers ───────────────────────────────────────────────────────
const TEST_TAG = `feedback-admin-notif-${Date.now()}`;

// Track created feedback by title so we can clean up by TAG
afterEach(async () => {
  vi.clearAllMocks();
  await prisma.statusHistory.deleteMany({
    where: { feedback: { title: { contains: TEST_TAG } } },
  });
  await prisma.feedback.deleteMany({
    where: { title: { contains: TEST_TAG } },
  });
});
// Note: title is auto-generated from content's first line in the route handler

// ── Valid submission body ─────────────────────────────────────────────────
function validBody(overrides: Record<string, unknown> = {}) {
  return {
    type: 'BUG',
    content: `[${TEST_TAG}] Admin notification test`,
    nickname: 'test-user',
    ...overrides,
  };
}

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/v1/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const importHandlers = () => import('@/app/api/v1/feedback/route');

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/v1/feedback — admin notifications', () => {
  beforeEach(() => {
    // Reset env so parseAdminEmails can be tested with a known value
    delete process.env.ADMIN_NOTIFICATION_EMAILS;
  });

  it('calls notifyAdminNewFeedback once on valid submission', async () => {
    const { POST } = await importHandlers();

    const res = await POST(makePostRequest(validBody()));

    expect(res.status).toBe(201);
    expect(vi.mocked(emailService.notifyAdminNewFeedback)).toHaveBeenCalledTimes(1);
  });

  it('calls notifyAdminNewFeedback with correct trackingId format', async () => {
    const { POST } = await importHandlers();

    await POST(makePostRequest(validBody()));

    const call = vi.mocked(emailService.notifyAdminNewFeedback).mock.calls[0][0];
    expect(call.trackingId).toMatch(/^FB-[a-z0-9]{8}$/);
  });

  it('calls notifyAdminNewFeedback with correct type', async () => {
    const { POST } = await importHandlers();

    await POST(makePostRequest(validBody({ type: 'FEATURE' })));

    const call = vi.mocked(emailService.notifyAdminNewFeedback).mock.calls[0][0];
    expect(call.type).toBe('FEATURE');
  });

  it('calls notifyAdminNewFeedback with correct title (auto-generated from content first line)', async () => {
    const { POST } = await importHandlers();
    // title is truncated to 50 chars from first line of content
    const expectedTitle = `[${TEST_TAG}] Admin notification test`.slice(0, 50);

    await POST(makePostRequest(validBody()));

    const call = vi.mocked(emailService.notifyAdminNewFeedback).mock.calls[0][0];
    expect(call.title).toBe(expectedTitle);
  });

  it('calls parseAdminEmails with process.env.ADMIN_NOTIFICATION_EMAILS', async () => {
    process.env.ADMIN_NOTIFICATION_EMAILS = 'admin@example.com,ops@example.com';
    const { POST } = await importHandlers();

    await POST(makePostRequest(validBody()));

    expect(vi.mocked(parseAdminEmails)).toHaveBeenCalledWith('admin@example.com,ops@example.com');
  });

  it('calls parseAdminEmails with undefined when env var is not set', async () => {
    // env var is deleted in beforeEach
    const { POST } = await importHandlers();

    await POST(makePostRequest(validBody()));

    expect(vi.mocked(parseAdminEmails)).toHaveBeenCalledWith(undefined);
  });

  it('does NOT call notifyAdminNewFeedback on invalid body (validation failure)', async () => {
    const { POST } = await importHandlers();

    // Missing required `content` field
    const res = await POST(
      makePostRequest({ type: 'BUG', nickname: 'tester' })
    );

    expect(res.status).toBe(400);
    expect(vi.mocked(emailService.notifyAdminNewFeedback)).not.toHaveBeenCalled();
  });

  it('does NOT call notifyAdminNewFeedback on invalid JSON body', async () => {
    const { POST } = await importHandlers();

    const req = new NextRequest('http://localhost:3000/api/v1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{bad json{{{',
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(vi.mocked(emailService.notifyAdminNewFeedback)).not.toHaveBeenCalled();
  });

  it('still returns 201 even if notifyAdminNewFeedback throws', async () => {
    vi.mocked(emailService.notifyAdminNewFeedback).mockRejectedValue(
      new Error('Email service unavailable')
    );

    const { POST } = await importHandlers();

    const res = await POST(makePostRequest(validBody()));

    expect(res.status).toBe(201);
  });
});
