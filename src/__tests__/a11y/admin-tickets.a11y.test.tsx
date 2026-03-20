// @vitest-environment jsdom
/**
 * Accessibility tests — /admin/tickets (TicketTable + TicketPagination)
 *
 * Tests against WCAG 2.1 AA requirements per design_phase4_accessibility.md.
 *
 * Issues verified: TBL-01 through TBL-04, PAG-01 through PAG-03
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TicketTable } from '@/components/admin/TicketTable';
import { TicketPagination } from '@/components/admin/TicketPagination';
import type { TicketListItem, ApiMeta } from '@/types';
import { a11yAxeConfig } from './axe-config';

// ── Mocks for sub-components ──────────────────────────────────────────────────

// Mock next/link to avoid router context requirement
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// ── axe configuration ─────────────────────────────────────────────────────────
// Shared config (color-contrast + full-page rules disabled for jsdom fragments)
const axeConfig = a11yAxeConfig;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SAMPLE_TICKETS: TicketListItem[] = [
  {
    id: 'ticket-1',
    trackingId: 'FB-AAAAAA01',
    type: 'BUG',
    status: 'OPEN',
    title: 'Login page crashes',
    nickname: 'alice',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    priority: 'HIGH',
    assigneeId: null,
  },
  {
    id: 'ticket-2',
    trackingId: 'FB-BBBBBB02',
    type: 'FEATURE',
    status: 'IN_PROGRESS',
    title: 'Dark mode support',
    nickname: 'bob',
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-17'),
    priority: null,
    assigneeId: null,
  },
];

const PAGINATION_META_PAGE1: ApiMeta = {
  total: 50,
  page: 1,
  limit: 20,
  hasNextPage: true,
};

const PAGINATION_META_PAGE2: ApiMeta = {
  total: 50,
  page: 2,
  limit: 20,
  hasNextPage: true,
};

const PAGINATION_META_LAST: ApiMeta = {
  total: 40,
  page: 2,
  limit: 20,
  hasNextPage: false,
};

// ── TicketTable Tests ─────────────────────────────────────────────────────────

describe('TicketTable — axe accessibility', () => {
  it('should have no axe violations with tickets', async () => {
    const { container } = render(
      <TicketTable tickets={SAMPLE_TICKETS} isLoading={false} />
    );
    const results = await axeConfig(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no axe violations with empty ticket list', async () => {
    const { container } = render(
      <TicketTable tickets={[]} isLoading={false} />
    );
    const results = await axeConfig(container);
    expect(results).toHaveNoViolations();
  });

  it('TBL-01: table has a <caption> element', () => {
    render(<TicketTable tickets={SAMPLE_TICKETS} />);
    const caption = document.querySelector('table caption');
    expect(caption).not.toBeNull();
  });

  it('TBL-01: table caption contains descriptive text', () => {
    render(<TicketTable tickets={SAMPLE_TICKETS} />);
    const caption = document.querySelector('table caption');
    expect(caption?.textContent).toMatch(/티켓/);
  });

  it('TBL-02: all <th> elements have scope="col"', () => {
    render(<TicketTable tickets={SAMPLE_TICKETS} />);
    const headers = document.querySelectorAll('th');
    expect(headers.length).toBeGreaterThan(0);
    headers.forEach((th) => {
      expect(th.getAttribute('scope')).toBe('col');
    });
  });

  it('TBL-03: last <th> (actions column) has sr-only text "Actions"', () => {
    render(<TicketTable tickets={SAMPLE_TICKETS} />);
    const allHeaders = Array.from(document.querySelectorAll('th'));
    const lastHeader = allHeaders[allHeaders.length - 1];
    expect(lastHeader).not.toBeNull();
    // Either has visible text or sr-only span
    const srOnly = lastHeader.querySelector('.sr-only');
    const textContent = lastHeader.textContent?.trim();
    expect(srOnly?.textContent?.match(/액션|action/i) || textContent?.match(/액션|action/i)).toBeTruthy();
  });

  it('TBL-04: table has aria-busy="false" when not loading', () => {
    render(<TicketTable tickets={SAMPLE_TICKETS} isLoading={false} />);
    const table = document.querySelector('table');
    expect(table?.getAttribute('aria-busy')).toBe('false');
  });

  it('TBL-04: table has aria-busy="true" when loading', () => {
    render(<TicketTable tickets={SAMPLE_TICKETS} isLoading={true} />);
    const table = document.querySelector('table');
    expect(table?.getAttribute('aria-busy')).toBe('true');
  });
});

// ── TicketPagination Tests ─────────────────────────────────────────────────────

describe('TicketPagination — axe accessibility', () => {
  it('returns null when total <= limit (not rendered)', () => {
    const meta: ApiMeta = { total: 10, page: 1, limit: 20, hasNextPage: false };
    const { container } = render(
      <TicketPagination meta={meta} currentPage={1} onPageChange={vi.fn()} />
    );
    // Component should return null
    expect(container.firstChild).toBeNull();
  });

  it('should have no axe violations when rendered', async () => {
    const { container } = render(
      <TicketPagination
        meta={PAGINATION_META_PAGE2}
        currentPage={2}
        onPageChange={vi.fn()}
      />
    );
    const results = await axeConfig(container);
    expect(results).toHaveNoViolations();
  });

  it('PAG-01: pagination is wrapped in <nav> with aria-label', () => {
    render(
      <TicketPagination
        meta={PAGINATION_META_PAGE2}
        currentPage={2}
        onPageChange={vi.fn()}
      />
    );
    const nav = document.querySelector('nav[aria-label]');
    expect(nav).not.toBeNull();
    expect(nav?.getAttribute('aria-label')).toBeTruthy();
  });

  it('PAG-02: Previous button has descriptive aria-label', () => {
    render(
      <TicketPagination
        meta={PAGINATION_META_PAGE2}
        currentPage={2}
        onPageChange={vi.fn()}
      />
    );
    const prevBtn = screen.getByRole('button', { name: /이전/ });
    const ariaLabel = prevBtn.getAttribute('aria-label') ?? prevBtn.textContent ?? '';
    expect(ariaLabel).toBeTruthy();
  });

  it('PAG-02: Next button has descriptive aria-label', () => {
    render(
      <TicketPagination
        meta={PAGINATION_META_PAGE1}
        currentPage={1}
        onPageChange={vi.fn()}
      />
    );
    const nextBtn = screen.getByRole('button', { name: /다음/ });
    expect(nextBtn).toBeTruthy();
  });

  it('PAG-03: Previous button has aria-disabled="true" on page 1', () => {
    render(
      <TicketPagination
        meta={PAGINATION_META_PAGE1}
        currentPage={1}
        onPageChange={vi.fn()}
      />
    );
    const prevBtn = screen.getByRole('button', { name: /이전/ });
    // Either disabled or aria-disabled
    const isAriaDisabled = prevBtn.getAttribute('aria-disabled') === 'true';
    const isDisabled = prevBtn.hasAttribute('disabled');
    expect(isAriaDisabled || isDisabled).toBe(true);
  });

  it('PAG-03: Next button has aria-disabled="true" on last page', () => {
    render(
      <TicketPagination
        meta={PAGINATION_META_LAST}
        currentPage={2}
        onPageChange={vi.fn()}
      />
    );
    const nextBtn = screen.getByRole('button', { name: /다음/ });
    const isAriaDisabled = nextBtn.getAttribute('aria-disabled') === 'true';
    const isDisabled = nextBtn.hasAttribute('disabled');
    expect(isAriaDisabled || isDisabled).toBe(true);
  });

  it('PAG-03: Previous button is NOT disabled on page 2+', () => {
    render(
      <TicketPagination
        meta={PAGINATION_META_PAGE2}
        currentPage={2}
        onPageChange={vi.fn()}
      />
    );
    const prevBtn = screen.getByRole('button', { name: /이전/ });
    expect(prevBtn.getAttribute('aria-disabled')).not.toBe('true');
    expect(prevBtn.hasAttribute('disabled')).toBe(false);
  });
});

describe('TicketPagination — keyboard navigation', () => {
  it('Previous and Next buttons are reachable via Tab', () => {
    render(
      <TicketPagination
        meta={PAGINATION_META_PAGE2}
        currentPage={2}
        onPageChange={vi.fn()}
      />
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(2);
    buttons.forEach((btn) => {
      const tabIndex = btn.getAttribute('tabindex');
      expect(tabIndex === null || tabIndex === '0').toBe(true);
    });
  });
});
