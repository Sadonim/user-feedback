// @vitest-environment jsdom
/**
 * Unit: AnalyticsSummaryCards component
 *
 * TDD RED phase — src/components/admin/charts/AnalyticsSummaryCards.tsx does not exist yet.
 *
 * Spec (design_phase5.md §4.8):
 *   - Renders 4 StatsCard instances (Total, Avg Response Time, Open Rate, Resolution Rate)
 *   - Formats avgResponseTimeHours: null → "N/A", < 1 → "< 1 hr", ≥ 1 → "X.X hrs"
 *   - openRate displayed as percentage string
 *   - Must not crash on empty data (total=0, all zeros)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnalyticsSummaryCards } from '@/components/admin/charts/AnalyticsSummaryCards';
import type { AnalyticsData } from '@/types';

// ── test fixtures ──────────────────────────────────────────────────────────

const emptyData: AnalyticsData = {
  period: '30d',
  granularity: 'day',
  startDate: new Date('2026-02-17').toISOString(),
  total: 0,
  trend: [],
  avgResponseTimeHours: null,
  avgResponseTimeByType: { BUG: null, FEATURE: null, GENERAL: null },
  statusFunnel: { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 },
  typeBreakdown: { BUG: 0, FEATURE: 0, GENERAL: 0 },
  openRate: 0,
  resolutionRate: 0,
};

const populatedData: AnalyticsData = {
  period: '30d',
  granularity: 'day',
  startDate: new Date('2026-02-17').toISOString(),
  total: 169,
  trend: [],
  avgResponseTimeHours: 8.3,
  avgResponseTimeByType: { BUG: 6.2, FEATURE: 14.1, GENERAL: 5.8 },
  statusFunnel: { OPEN: 45, IN_PROGRESS: 12, RESOLVED: 89, CLOSED: 23 },
  typeBreakdown: { BUG: 67, FEATURE: 45, GENERAL: 57 },
  openRate: 26.6,
  resolutionRate: 66.3,
};

const subHourData: AnalyticsData = {
  ...populatedData,
  avgResponseTimeHours: 0.5,
};

// ─────────────────────────────────────────────────────────────────────────────
describe('AnalyticsSummaryCards', () => {
  it('renders without crashing on empty data (total=0)', () => {
    expect(() => render(<AnalyticsSummaryCards data={emptyData} />)).not.toThrow();
  });

  it('renders without crashing on populated data', () => {
    expect(() => render(<AnalyticsSummaryCards data={populatedData} />)).not.toThrow();
  });

  describe('Total Submissions card', () => {
    it('shows total count', () => {
      render(<AnalyticsSummaryCards data={populatedData} />);
      // The value 169 should appear somewhere in the rendered output
      expect(screen.getByText('169')).toBeTruthy();
    });

    it('shows 0 for empty data', () => {
      render(<AnalyticsSummaryCards data={emptyData} />);
      // At least one "0" should be rendered
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThan(0);
    });
  });

  describe('Avg Response Time card', () => {
    it('shows "N/A" when avgResponseTimeHours is null', () => {
      render(<AnalyticsSummaryCards data={emptyData} />);
      expect(screen.getByText('N/A')).toBeTruthy();
    });

    it('shows "< 1 hr" when avgResponseTimeHours is less than 1', () => {
      render(<AnalyticsSummaryCards data={subHourData} />);
      expect(screen.getByText('< 1 hr')).toBeTruthy();
    });

    it('shows formatted hours string for values ≥ 1', () => {
      render(<AnalyticsSummaryCards data={populatedData} />);
      // 8.3 → "8.3 hrs" (or similar formatted string)
      expect(screen.getByText(/8\.3\s*hrs?/i)).toBeTruthy();
    });
  });

  describe('Open Rate card', () => {
    it('shows "0%" or similar when openRate is 0', () => {
      render(<AnalyticsSummaryCards data={emptyData} />);
      // Should show 0 without NaN
      const content = document.body.textContent ?? '';
      expect(content).not.toContain('NaN');
    });

    it('shows openRate percentage for populated data', () => {
      render(<AnalyticsSummaryCards data={populatedData} />);
      const content = document.body.textContent ?? '';
      expect(content).toContain('26');
      expect(content).not.toContain('NaN');
    });
  });

  describe('Resolution Rate card', () => {
    it('does not show NaN when data is empty', () => {
      render(<AnalyticsSummaryCards data={emptyData} />);
      const content = document.body.textContent ?? '';
      expect(content).not.toContain('NaN');
    });
  });
});
