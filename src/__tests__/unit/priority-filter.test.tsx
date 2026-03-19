// @vitest-environment jsdom
/**
 * Unit: Priority filter select in TicketFiltersBar
 *
 * Verifies that the priority filter <select> renders all priority options
 * and fires onChange when a value is selected.
 *
 * NOTE: TicketFiltersBar already exists (Phase 3). The priority select was added
 * as part of Phase 5-1. Tests here are GREEN after Phase 5-1 implementation.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TicketFiltersBar } from '@/components/admin/TicketFiltersBar';
import type { TicketFiltersInput } from '@/lib/validators/feedback';

// Minimal filters object satisfying required fields
const defaultFilters: TicketFiltersInput = {
  page: 1,
  limit: 20,
  sort: 'createdAt',
  order: 'desc',
};

describe('TicketFiltersBar — priority filter select', () => {
  it('renders the priority filter select with aria-label', () => {
    render(<TicketFiltersBar filters={defaultFilters} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: /filter by priority/i })).toBeTruthy();
  });

  it('renders all priority options', () => {
    render(<TicketFiltersBar filters={defaultFilters} onChange={vi.fn()} />);
    const select = screen.getByRole('combobox', { name: /filter by priority/i });
    const options = Array.from((select as HTMLSelectElement).options).map((o) => o.value);
    expect(options).toContain('CRITICAL');
    expect(options).toContain('HIGH');
    expect(options).toContain('MEDIUM');
    expect(options).toContain('LOW');
    // "All Priorities" empty option
    expect(options).toContain('');
  });

  it('fires onChange with selected priority when changed', () => {
    const onChange = vi.fn();
    render(<TicketFiltersBar filters={defaultFilters} onChange={onChange} />);
    const select = screen.getByRole('combobox', { name: /filter by priority/i });
    fireEvent.change(select, { target: { value: 'HIGH' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ priority: 'HIGH' }));
  });

  it('fires onChange with undefined priority when "All Priorities" is selected', () => {
    const onChange = vi.fn();
    const filtersWithPriority: TicketFiltersInput = { ...defaultFilters, priority: 'HIGH' };
    render(<TicketFiltersBar filters={filtersWithPriority} onChange={onChange} />);
    const select = screen.getByRole('combobox', { name: /filter by priority/i });
    fireEvent.change(select, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ priority: undefined }));
  });

  it('reflects the current priority filter value', () => {
    const filtersWithPriority: TicketFiltersInput = { ...defaultFilters, priority: 'CRITICAL' };
    render(<TicketFiltersBar filters={filtersWithPriority} onChange={vi.fn()} />);
    const select = screen.getByRole('combobox', { name: /filter by priority/i }) as HTMLSelectElement;
    expect(select.value).toBe('CRITICAL');
  });
});
