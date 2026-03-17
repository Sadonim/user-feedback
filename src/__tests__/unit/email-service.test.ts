/**
 * Unit: EmailService class + parseAdminEmails utility
 *
 * EmailService — src/server/services/email/email.service.ts
 * parseAdminEmails — src/server/services/email/index.ts
 *
 * Strategy:
 *  - Inject a mock IEmailAdapter to verify EmailService behaviour
 *  - No real network calls
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailService } from '@/server/services/email/email.service';
import type { IEmailAdapter, EmailMessage } from '@/server/services/email/email.adapter';

// ── Mock adapter factory ───────────────────────────────────────────────────
function makeMockAdapter(): IEmailAdapter & { send: ReturnType<typeof vi.fn> } {
  return { send: vi.fn().mockResolvedValue(undefined) };
}

// ─────────────────────────────────────────────────────────────────────────────
describe('EmailService.notifyStatusChanged', () => {
  let adapter: ReturnType<typeof makeMockAdapter>;
  let service: EmailService;

  beforeEach(() => {
    adapter = makeMockAdapter();
    service = new EmailService(adapter);
  });

  it('calls adapter.send once', async () => {
    await service.notifyStatusChanged({
      to: 'user@example.com',
      trackingId: 'FB-abc12345',
      fromStatus: 'OPEN',
      toStatus: 'IN_PROGRESS',
      title: 'Test ticket',
      note: null,
    });
    expect(adapter.send).toHaveBeenCalledTimes(1);
  });

  it('calls adapter.send with the correct `to` field', async () => {
    await service.notifyStatusChanged({
      to: 'recipient@example.com',
      trackingId: 'FB-abc12345',
      fromStatus: 'OPEN',
      toStatus: 'RESOLVED',
      title: 'Test ticket',
      note: null,
    });
    const call = adapter.send.mock.calls[0][0] as EmailMessage;
    expect(call.to).toBe('recipient@example.com');
  });

  it('re-throws when adapter.send rejects', async () => {
    adapter.send.mockRejectedValue(new Error('SMTP failure'));
    await expect(
      service.notifyStatusChanged({
        to: 'user@example.com',
        trackingId: 'FB-abc12345',
        fromStatus: 'OPEN',
        toStatus: 'CLOSED',
        title: 'Test',
        note: null,
      })
    ).rejects.toThrow('SMTP failure');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('EmailService.notifyAdminNewFeedback', () => {
  let adapter: ReturnType<typeof makeMockAdapter>;
  let service: EmailService;

  beforeEach(() => {
    adapter = makeMockAdapter();
    service = new EmailService(adapter);
  });

  it('never calls adapter.send when adminEmails is empty', async () => {
    await service.notifyAdminNewFeedback({
      adminEmails: [],
      trackingId: 'FB-abc12345',
      type: 'BUG',
      title: 'Test',
      nickname: null,
    });
    expect(adapter.send).not.toHaveBeenCalled();
  });

  it('calls adapter.send once for a single admin email', async () => {
    await service.notifyAdminNewFeedback({
      adminEmails: ['admin@example.com'],
      trackingId: 'FB-abc12345',
      type: 'BUG',
      title: 'Test',
      nickname: null,
    });
    expect(adapter.send).toHaveBeenCalledTimes(1);
  });

  it('calls adapter.send three times for three admin emails', async () => {
    await service.notifyAdminNewFeedback({
      adminEmails: ['a@example.com', 'b@example.com', 'c@example.com'],
      trackingId: 'FB-abc12345',
      type: 'FEATURE',
      title: 'New feature idea',
      nickname: 'alice',
    });
    expect(adapter.send).toHaveBeenCalledTimes(3);
  });

  it('each adapter.send call receives the correct `to` address', async () => {
    const adminEmails = ['first@example.com', 'second@example.com'];
    await service.notifyAdminNewFeedback({
      adminEmails,
      trackingId: 'FB-abc12345',
      type: 'GENERAL',
      title: 'General question',
      nickname: null,
    });
    const recipients = adapter.send.mock.calls.map((c) => (c[0] as EmailMessage).to);
    expect(recipients).toEqual(expect.arrayContaining(adminEmails));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('parseAdminEmails (from @/server/services/email)', () => {
  // Dynamic import so module-level constants (emailService) don't side-effect
  const getParseAdminEmails = async () => {
    const mod = await import('@/server/services/email');
    return mod.parseAdminEmails;
  };

  it('returns valid emails unchanged', async () => {
    const parse = await getParseAdminEmails();
    expect(parse('admin@example.com,ops@example.org')).toEqual([
      'admin@example.com',
      'ops@example.org',
    ]);
  });

  it('filters out entries without "@"', async () => {
    const parse = await getParseAdminEmails();
    expect(parse('notanemail,valid@example.com')).toEqual(['valid@example.com']);
  });

  it('filters out empty strings produced by trailing commas', async () => {
    const parse = await getParseAdminEmails();
    const result = parse('admin@example.com,');
    expect(result).toEqual(['admin@example.com']);
  });

  it('returns empty array for undefined input', async () => {
    const parse = await getParseAdminEmails();
    expect(parse(undefined)).toEqual([]);
  });

  it('returns empty array for empty string', async () => {
    const parse = await getParseAdminEmails();
    expect(parse('')).toEqual([]);
  });

  it('trims whitespace around email addresses', async () => {
    const parse = await getParseAdminEmails();
    expect(parse('  admin@example.com  ,  ops@example.com  ')).toEqual([
      'admin@example.com',
      'ops@example.com',
    ]);
  });
});
