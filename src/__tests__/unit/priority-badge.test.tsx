// @vitest-environment jsdom
/**
 * Unit: TicketPriorityBadge component
 *
 * TDD RED phase — src/components/admin/TicketPriorityBadge.tsx does not exist yet.
 *
 * Spec (design_phase5.md §1.5):
 *   CRITICAL → destructive red badge with label "Critical"
 *   HIGH     → orange badge with label "High"
 *   MEDIUM   → yellow badge with label "Medium"
 *   LOW      → muted gray badge with label "Low"
 *   null     → renders nothing (return null)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TicketPriorityBadge } from '@/components/admin/TicketPriorityBadge';

describe('TicketPriorityBadge', () => {
  describe('renders correct label per priority value', () => {
    it('renders "Critical" for CRITICAL priority', () => {
      render(<TicketPriorityBadge priority="CRITICAL" />);
      expect(screen.getByText('Critical')).toBeTruthy();
    });

    it('renders "High" for HIGH priority', () => {
      render(<TicketPriorityBadge priority="HIGH" />);
      expect(screen.getByText('High')).toBeTruthy();
    });

    it('renders "Medium" for MEDIUM priority', () => {
      render(<TicketPriorityBadge priority="MEDIUM" />);
      expect(screen.getByText('Medium')).toBeTruthy();
    });

    it('renders "Low" for LOW priority', () => {
      render(<TicketPriorityBadge priority="LOW" />);
      expect(screen.getByText('Low')).toBeTruthy();
    });
  });

  describe('null priority', () => {
    it('renders nothing (returns null) when priority is null', () => {
      const { container } = render(<TicketPriorityBadge priority={null} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('styling classes', () => {
    it('CRITICAL badge has destructive color class', () => {
      const { container } = render(<TicketPriorityBadge priority="CRITICAL" />);
      const badge = container.firstChild as HTMLElement;
      // Matches design spec: text-destructive or similar destructive class
      expect(badge.className).toMatch(/destructive/);
    });

    it('HIGH badge has orange color class', () => {
      const { container } = render(<TicketPriorityBadge priority="HIGH" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toMatch(/orange/);
    });

    it('MEDIUM badge has yellow color class', () => {
      const { container } = render(<TicketPriorityBadge priority="MEDIUM" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toMatch(/yellow/);
    });

    it('LOW badge has muted color class', () => {
      const { container } = render(<TicketPriorityBadge priority="LOW" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toMatch(/muted/);
    });
  });
});
