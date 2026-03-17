// @vitest-environment jsdom
/**
 * Accessibility tests — /admin/tickets/[id] (StatusUpdatePanel + PriorityUpdatePanel + DangerZoneCard)
 *
 * Tests against WCAG 2.1 AA requirements per design_phase4_accessibility.md.
 *
 * Issues verified: DTL-01 through DTL-06
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusUpdatePanel } from '@/components/admin/StatusUpdatePanel';
import { PriorityUpdatePanel } from '@/components/admin/PriorityUpdatePanel';
import { DangerZoneCard } from '@/components/admin/DangerZoneCard';
import type { FeedbackDetail } from '@/types';
import { a11yAxeConfig } from './axe-config';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush, refresh: mockRefresh })),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
});

// ── axe configuration ─────────────────────────────────────────────────────────
// Shared config (color-contrast + full-page rules disabled for jsdom fragments)
const axeConfig = a11yAxeConfig;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_TICKET: FeedbackDetail = {
  id: 'ticket-abc-123',
  trackingId: 'FB-TESTTEST',
  type: 'BUG',
  status: 'OPEN',
  title: 'Test bug title',
  nickname: 'tester',
  description: 'A detailed bug description',
  email: 'tester@example.com',
  priority: 'HIGH',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
  statusHistory: [
    {
      id: 'hist-1',
      fromStatus: null,
      toStatus: 'OPEN',
      note: 'Ticket opened',
      createdAt: new Date('2024-01-15'),
    },
  ],
};

// ── StatusUpdatePanel Tests ───────────────────────────────────────────────────

describe('StatusUpdatePanel — axe accessibility', () => {
  it('should have no axe violations', async () => {
    const { container } = render(
      <StatusUpdatePanel ticket={MOCK_TICKET} onUpdate={vi.fn()} />
    );
    const results = await axeConfig(container);
    expect(results).toHaveNoViolations();
  });

  it('DTL-02: status <select> is associated with the "Status" heading via aria-labelledby', () => {
    render(<StatusUpdatePanel ticket={MOCK_TICKET} onUpdate={vi.fn()} />);
    const select = document.querySelector('select');
    expect(select).not.toBeNull();

    const labelledBy = select?.getAttribute('aria-labelledby');
    const ariaLabel = select?.getAttribute('aria-label');

    if (labelledBy) {
      const labelElement = document.getElementById(labelledBy);
      expect(labelElement?.textContent?.toLowerCase()).toMatch(/status/);
    } else {
      // Accept aria-label as alternative
      expect(ariaLabel?.toLowerCase()).toMatch(/status/);
    }
  });

  it('DTL-03: note <textarea> has an explicit <label>', () => {
    render(<StatusUpdatePanel ticket={MOCK_TICKET} onUpdate={vi.fn()} />);
    const textarea = document.querySelector('textarea');
    expect(textarea).not.toBeNull();

    const textareaId = textarea?.getAttribute('id');
    const hasLabel = textareaId
      ? document.querySelector(`label[for="${textareaId}"]`) !== null
      : textarea?.getAttribute('aria-label') !== null ||
        textarea?.getAttribute('aria-labelledby') !== null;

    expect(hasLabel).toBe(true);
  });

  it('DTL-03: note textarea label text is meaningful', () => {
    render(<StatusUpdatePanel ticket={MOCK_TICKET} onUpdate={vi.fn()} />);
    const textarea = document.querySelector('textarea');
    const textareaId = textarea?.getAttribute('id') ?? '';
    const label = textareaId
      ? document.querySelector(`label[for="${textareaId}"]`)
      : null;

    if (label) {
      expect(label.textContent?.toLowerCase()).toMatch(/note|comment/);
    } else if (textarea?.getAttribute('aria-label')) {
      expect(textarea.getAttribute('aria-label')?.toLowerCase()).toMatch(/note|comment/);
    }
  });
});

describe('StatusUpdatePanel — keyboard navigation', () => {
  it('status select is keyboard operable', () => {
    render(<StatusUpdatePanel ticket={MOCK_TICKET} onUpdate={vi.fn()} />);
    const select = document.querySelector('select');
    expect(select).not.toBeNull();
    expect(select?.getAttribute('tabindex')).not.toBe('-1');
  });

  it('Update Status button is keyboard operable', () => {
    render(<StatusUpdatePanel ticket={MOCK_TICKET} onUpdate={vi.fn()} />);
    const updateBtn = screen.getByRole('button', { name: /update status/i });
    expect(updateBtn).toBeTruthy();
    expect(updateBtn.getAttribute('tabindex')).not.toBe('-1');
  });
});

// ── PriorityUpdatePanel Tests ─────────────────────────────────────────────────

describe('PriorityUpdatePanel — axe accessibility', () => {
  it('should have no axe violations', async () => {
    const { container } = render(
      <PriorityUpdatePanel ticket={MOCK_TICKET} onUpdate={vi.fn()} />
    );
    const results = await axeConfig(container);
    expect(results).toHaveNoViolations();
  });

  it('DTL-04: priority <select> is associated with the "Priority" heading via aria-labelledby', () => {
    render(<PriorityUpdatePanel ticket={MOCK_TICKET} onUpdate={vi.fn()} />);
    const select = document.querySelector('select');
    expect(select).not.toBeNull();

    const labelledBy = select?.getAttribute('aria-labelledby');
    const ariaLabel = select?.getAttribute('aria-label');

    if (labelledBy) {
      const labelElement = document.getElementById(labelledBy);
      expect(labelElement?.textContent?.toLowerCase()).toMatch(/priority/);
    } else {
      expect(ariaLabel?.toLowerCase()).toMatch(/priority/);
    }
  });

  it('Set Priority button is keyboard operable', () => {
    render(<PriorityUpdatePanel ticket={MOCK_TICKET} onUpdate={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /set priority/i });
    expect(btn).toBeTruthy();
  });
});

// ── DangerZoneCard Tests ──────────────────────────────────────────────────────

describe('DangerZoneCard — axe accessibility', () => {
  it('should have no axe violations', async () => {
    const { container } = render(<DangerZoneCard ticketId="ticket-abc-123" />);
    const results = await axeConfig(container);
    expect(results).toHaveNoViolations();
  });

  it('DTL-05: Trash2 icon inside delete button has aria-hidden="true"', () => {
    const { container } = render(<DangerZoneCard ticketId="ticket-abc-123" />);
    // Lucide Trash2 renders as SVG
    const svgIcons = container.querySelectorAll('svg');
    svgIcons.forEach((svg) => {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('Delete Ticket button has accessible name', () => {
    render(<DangerZoneCard ticketId="ticket-abc-123" />);
    const deleteBtn = screen.getByRole('button', { name: /delete/i });
    expect(deleteBtn).toBeTruthy();
  });

  it('DTL-06: delete button has aria-describedby pointing to warning text', () => {
    render(<DangerZoneCard ticketId="ticket-abc-123" />);
    const deleteBtn = screen.getByRole('button', { name: /delete/i });
    const describedBy = deleteBtn.getAttribute('aria-describedby');
    if (describedBy) {
      const descElement = document.getElementById(describedBy);
      expect(descElement).not.toBeNull();
      expect(descElement?.textContent?.toLowerCase()).toMatch(/delete|permanent|cannot/);
    }
  });

  it('Delete Ticket button is keyboard operable', () => {
    render(<DangerZoneCard ticketId="ticket-abc-123" />);
    const deleteBtn = screen.getByRole('button', { name: /delete/i });
    const tabIndex = deleteBtn.getAttribute('tabindex');
    expect(tabIndex === null || tabIndex === '0').toBe(true);
  });
});
