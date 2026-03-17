// @vitest-environment jsdom
/**
 * Accessibility tests — TicketFiltersBar
 *
 * Tests against WCAG 2.1 AA requirements per design_phase4_accessibility.md.
 *
 * Issues verified: TBL-05, TBL-07, TBL-08
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TicketFiltersBar } from '@/components/admin/TicketFiltersBar';
import type { TicketFiltersInput } from '@/lib/validators/feedback';
import { a11yAxeConfig } from './axe-config';

// ── axe configuration ─────────────────────────────────────────────────────────
// Shared config (color-contrast + full-page rules disabled for jsdom fragments)
const axeConfig = a11yAxeConfig;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: TicketFiltersInput = {
  page: 1,
  limit: 20,
  sort: 'createdAt',
  order: 'desc',
};

const ACTIVE_FILTERS: TicketFiltersInput = {
  ...DEFAULT_FILTERS,
  status: 'OPEN',
  type: 'BUG',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TicketFiltersBar — axe accessibility', () => {
  it('should have no axe violations with default filters', async () => {
    const { container } = render(
      <TicketFiltersBar filters={DEFAULT_FILTERS} onChange={vi.fn()} />
    );
    const results = await axeConfig(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no axe violations with active filters (Clear button visible)', async () => {
    const { container } = render(
      <TicketFiltersBar filters={ACTIVE_FILTERS} onChange={vi.fn()} />
    );
    const results = await axeConfig(container);
    expect(results).toHaveNoViolations();
  });

  it('TBL-05: status <select> has accessible label', () => {
    render(<TicketFiltersBar filters={DEFAULT_FILTERS} onChange={vi.fn()} />);
    const selects = document.querySelectorAll('select');
    // First select is status
    const statusSelect = selects[0];
    expect(statusSelect).not.toBeNull();
    const hasLabel =
      statusSelect.getAttribute('aria-label') !== null ||
      statusSelect.getAttribute('aria-labelledby') !== null ||
      document.querySelector(`label[for="${statusSelect.id}"]`) !== null;
    expect(hasLabel).toBe(true);
    expect(statusSelect.getAttribute('aria-label')?.toLowerCase()).toMatch(/status/);
  });

  it('TBL-05: type <select> has accessible label', () => {
    render(<TicketFiltersBar filters={DEFAULT_FILTERS} onChange={vi.fn()} />);
    const selects = document.querySelectorAll('select');
    const typeSelect = selects[1];
    expect(typeSelect).not.toBeNull();
    const ariaLabel = typeSelect.getAttribute('aria-label');
    expect(ariaLabel?.toLowerCase()).toMatch(/type/);
  });

  it('TBL-05: sort <select> has accessible label', () => {
    render(<TicketFiltersBar filters={DEFAULT_FILTERS} onChange={vi.fn()} />);
    const selects = document.querySelectorAll('select');
    const sortSelect = selects[2];
    expect(sortSelect).not.toBeNull();
    const ariaLabel = sortSelect.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel?.toLowerCase()).toMatch(/sort|order/);
  });

  it('TBL-08: root container has role="search"', () => {
    const { container } = render(
      <TicketFiltersBar filters={DEFAULT_FILTERS} onChange={vi.fn()} />
    );
    const searchRegion = container.querySelector('[role="search"]');
    expect(searchRegion).not.toBeNull();
  });

  it('TBL-08: root container has aria-label="Filter tickets"', () => {
    const { container } = render(
      <TicketFiltersBar filters={DEFAULT_FILTERS} onChange={vi.fn()} />
    );
    const searchRegion = container.querySelector('[role="search"]');
    expect(searchRegion?.getAttribute('aria-label')).toBe('Filter tickets');
  });
});

describe('TicketFiltersBar — keyboard navigation', () => {
  it('all select controls are reachable via Tab', () => {
    render(<TicketFiltersBar filters={DEFAULT_FILTERS} onChange={vi.fn()} />);

    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBe(3);

    selects.forEach((sel) => {
      const tabIndex = sel.getAttribute('tabindex');
      expect(tabIndex === null || tabIndex === '0').toBe(true);
    });
  });

  it('Clear Filters button appears and is keyboard-accessible with active filters', () => {
    render(<TicketFiltersBar filters={ACTIVE_FILTERS} onChange={vi.fn()} />);
    const clearBtn = screen.getByRole('button', { name: /clear/i });
    expect(clearBtn).toBeTruthy();
    const tabIndex = clearBtn.getAttribute('tabindex');
    expect(tabIndex === null || tabIndex === '0').toBe(true);
  });

  it('onChange is called when status filter is changed', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(<TicketFiltersBar filters={DEFAULT_FILTERS} onChange={mockOnChange} />);

    const selects = screen.getAllByRole('combobox');
    const statusSelect = selects[0];

    await user.selectOptions(statusSelect, 'OPEN');
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'OPEN' }));
  });
});
