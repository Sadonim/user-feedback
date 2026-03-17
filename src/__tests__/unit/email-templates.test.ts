/**
 * Unit: email template pure functions
 *
 * statusChangedTemplate  — src/server/services/email/templates/status-changed.ts
 * newFeedbackTemplate    — src/server/services/email/templates/new-feedback.ts
 *
 * These are pure functions (no I/O) — no mocking needed.
 */
import { describe, it, expect } from 'vitest';
import { statusChangedTemplate } from '@/server/services/email/templates/status-changed';
import { newFeedbackTemplate } from '@/server/services/email/templates/new-feedback';

// ─────────────────────────────────────────────────────────────────────────────
describe('statusChangedTemplate', () => {
  const baseParams = {
    trackingId: 'FB-abc12345',
    fromStatus: 'OPEN' as const,
    toStatus: 'IN_PROGRESS' as const,
    title: 'Test ticket title',
    note: null,
  };

  // ── subject ────────────────────────────────────────────────────────────────
  describe('subject', () => {
    it('contains the trackingId', () => {
      const { subject } = statusChangedTemplate(baseParams);
      expect(subject).toContain('FB-abc12345');
    });

    it('contains the toStatus label', () => {
      const { subject } = statusChangedTemplate(baseParams);
      expect(subject).toContain('In Progress');
    });

    it('contains the toStatus label for RESOLVED', () => {
      const { subject } = statusChangedTemplate({ ...baseParams, toStatus: 'RESOLVED' });
      expect(subject).toContain('Resolved');
    });

    it('contains the toStatus label for CLOSED', () => {
      const { subject } = statusChangedTemplate({ ...baseParams, toStatus: 'CLOSED' });
      expect(subject).toContain('Closed');
    });
  });

  // ── HTML content ───────────────────────────────────────────────────────────
  describe('html', () => {
    it('contains trackingId', () => {
      const { html } = statusChangedTemplate(baseParams);
      expect(html).toContain('FB-abc12345');
    });

    it('contains title', () => {
      const { html } = statusChangedTemplate(baseParams);
      expect(html).toContain('Test ticket title');
    });

    it('contains fromStatus label', () => {
      const { html } = statusChangedTemplate(baseParams);
      expect(html).toContain('Open');
    });

    it('contains toStatus label', () => {
      const { html } = statusChangedTemplate(baseParams);
      expect(html).toContain('In Progress');
    });
  });

  // ── fromStatus: null handling ──────────────────────────────────────────────
  describe('fromStatus: null', () => {
    it('shows "New" instead of null in html', () => {
      const { html } = statusChangedTemplate({ ...baseParams, fromStatus: null });
      expect(html).toContain('New');
    });

    it('does not render the literal string "null"', () => {
      const { html } = statusChangedTemplate({ ...baseParams, fromStatus: null });
      expect(html).not.toContain('>null<');
    });
  });

  // ── note section ───────────────────────────────────────────────────────────
  describe('note section', () => {
    it('includes note in html when note is provided', () => {
      const { html } = statusChangedTemplate({ ...baseParams, note: 'This was fixed in v2' });
      expect(html).toContain('This was fixed in v2');
    });

    it('does not include note section in html when note is null', () => {
      const { html } = statusChangedTemplate({ ...baseParams, note: null });
      // note paragraph should be absent
      expect(html).not.toContain('Note:');
    });
  });

  // ── HTML escaping ──────────────────────────────────────────────────────────
  describe('HTML escaping', () => {
    it('escapes dangerous characters in title', () => {
      const maliciousTitle = '<script>alert("xss")</script>';
      const { html } = statusChangedTemplate({ ...baseParams, title: maliciousTitle });
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('escapes dangerous characters in note', () => {
      const maliciousNote = '<img src=x onerror="alert(1)">';
      const { html } = statusChangedTemplate({ ...baseParams, note: maliciousNote });
      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;img');
    });
  });

  // ── text alternative ───────────────────────────────────────────────────────
  describe('text alternative', () => {
    it('returns a non-empty text field', () => {
      const { text } = statusChangedTemplate(baseParams);
      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(0);
    });

    it('text contains trackingId', () => {
      const { text } = statusChangedTemplate(baseParams);
      expect(text).toContain('FB-abc12345');
    });

    it('text contains status info', () => {
      const { text } = statusChangedTemplate(baseParams);
      expect(text).toContain('In Progress');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('newFeedbackTemplate', () => {
  const baseParams = {
    trackingId: 'FB-xyz99999',
    type: 'BUG' as const,
    title: 'Something is broken',
    nickname: 'alice',
  };

  // ── subject ────────────────────────────────────────────────────────────────
  describe('subject', () => {
    it('contains the type label', () => {
      const { subject } = newFeedbackTemplate(baseParams);
      expect(subject).toContain('Bug Report');
    });

    it('contains (part of) the title', () => {
      const { subject } = newFeedbackTemplate(baseParams);
      expect(subject).toContain('Something is broken');
    });

    it('uses correct label for FEATURE type', () => {
      const { subject } = newFeedbackTemplate({ ...baseParams, type: 'FEATURE' });
      expect(subject).toContain('Feature Request');
    });

    it('uses correct label for GENERAL type', () => {
      const { subject } = newFeedbackTemplate({ ...baseParams, type: 'GENERAL' });
      expect(subject).toContain('General');
    });
  });

  // ── HTML content ───────────────────────────────────────────────────────────
  describe('html', () => {
    it('contains trackingId', () => {
      const { html } = newFeedbackTemplate(baseParams);
      expect(html).toContain('FB-xyz99999');
    });

    it('contains type label', () => {
      const { html } = newFeedbackTemplate(baseParams);
      expect(html).toContain('Bug Report');
    });

    it('contains title', () => {
      const { html } = newFeedbackTemplate(baseParams);
      expect(html).toContain('Something is broken');
    });

    it('contains nickname', () => {
      const { html } = newFeedbackTemplate(baseParams);
      expect(html).toContain('alice');
    });
  });

  // ── Anonymous fallback ─────────────────────────────────────────────────────
  describe('anonymous nickname', () => {
    it('uses "Anonymous" when nickname is null', () => {
      const { html } = newFeedbackTemplate({ ...baseParams, nickname: null });
      expect(html).toContain('Anonymous');
    });

    it('does not show "null" when nickname is null', () => {
      const { html } = newFeedbackTemplate({ ...baseParams, nickname: null });
      expect(html).not.toContain('>null<');
    });
  });

  // ── HTML escaping ──────────────────────────────────────────────────────────
  describe('HTML escaping', () => {
    it('escapes dangerous characters in title', () => {
      const { html } = newFeedbackTemplate({
        ...baseParams,
        title: '<script>alert(1)</script>',
      });
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('escapes dangerous characters in nickname', () => {
      const { html } = newFeedbackTemplate({
        ...baseParams,
        nickname: '"><svg/onload=alert(1)>',
      });
      expect(html).not.toContain('<svg');
      expect(html).toContain('&lt;svg');
    });
  });

  // ── text alternative ───────────────────────────────────────────────────────
  describe('text alternative', () => {
    it('returns a non-empty text field', () => {
      const { text } = newFeedbackTemplate(baseParams);
      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(0);
    });

    it('text contains trackingId', () => {
      const { text } = newFeedbackTemplate(baseParams);
      expect(text).toContain('FB-xyz99999');
    });

    it('text contains type label', () => {
      const { text } = newFeedbackTemplate(baseParams);
      expect(text).toContain('Bug Report');
    });
  });
});
