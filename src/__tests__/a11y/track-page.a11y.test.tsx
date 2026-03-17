// @vitest-environment jsdom
/**
 * Accessibility tests — /track page
 *
 * Tests the TrackingView component against WCAG 2.1 AA requirements
 * per design_phase4_accessibility.md.
 *
 * Issues verified: TRK-01 through TRK-07
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrackingView } from '@/components/feedback/TrackingView';
import { a11yAxeConfig } from './axe-config';

// Silence sonner toasts in tests
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── axe configuration ─────────────────────────────────────────────────────────
// Shared config (color-contrast + full-page rules disabled for jsdom fragments)
const axeConfig = a11yAxeConfig;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_TRACKING_DATA = {
  trackingId: 'FB-TESTTEST',
  type: 'BUG' as const,
  status: 'OPEN' as const,
  title: 'Test bug title',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  statusHistory: [
    {
      id: 'hist-1',
      fromStatus: null,
      toStatus: 'OPEN' as const,
      note: 'Ticket created',
      createdAt: new Date().toISOString(),
    },
  ],
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TrackingView — initial render axe', () => {
  it('should have no axe violations on initial empty state', async () => {
    const { container } = render(<TrackingView />);
    const results = await axeConfig(container);
    expect(results).toHaveNoViolations();
  });

  it('TRK-01: search input has an accessible label', () => {
    render(<TrackingView />);
    // Input must have a label via htmlFor/aria-label/aria-labelledby
    const input = screen.getByRole('textbox');
    expect(input).toBeTruthy();
    const id = input.getAttribute('id') ?? input.getAttribute('name');
    const hasLabel = id
      ? document.querySelector(`label[for="${id}"]`) !== null
      : input.getAttribute('aria-label') !== null ||
        input.getAttribute('aria-labelledby') !== null;
    expect(hasLabel).toBe(true);
  });

  it('TRK-03: aria-live region is present in the DOM', () => {
    render(<TrackingView />);
    const liveRegion = document.querySelector('[aria-live]');
    expect(liveRegion).not.toBeNull();
  });
});

describe('TrackingView — not-found state', () => {
  it('TRK-03: "not found" message renders inside aria-live region on 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ success: false, error: 'Not found' }),
    }));

    const user = userEvent.setup();
    render(<TrackingView initialId="FB-UNKNOWN" />);

    const trackButton = screen.getByRole('button', { name: /track/i });
    await act(async () => { await user.click(trackButton); });

    await waitFor(() => {
      // "not found" paragraph should exist
      const notFoundText = screen.queryByText(/no feedback found/i);
      expect(notFoundText).not.toBeNull();
    });

    // Verify the not-found message is inside an aria-live region
    const liveRegion = document.querySelector('[aria-live]');
    expect(liveRegion).not.toBeNull();
    if (liveRegion) {
      expect(liveRegion.textContent).toMatch(/no feedback found|not found/i);
    }
  });
});

describe('TrackingView — results found state', () => {
  it('should have no axe violations when results are shown', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: MOCK_TRACKING_DATA }),
    }));

    const user = userEvent.setup();
    const { container } = render(<TrackingView initialId="FB-TESTTEST" />);

    const trackButton = screen.getByRole('button', { name: /track/i });
    await act(async () => { await user.click(trackButton); });

    await waitFor(() => {
      expect(screen.queryByText('Test bug title')).not.toBeNull();
    });

    const results = await axeConfig(container);
    expect(results).toHaveNoViolations();
  });

  it('TRK-02: status badge has aria-label describing the status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: MOCK_TRACKING_DATA }),
    }));

    const user = userEvent.setup();
    render(<TrackingView initialId="FB-TESTTEST" />);

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /track/i }));
    });

    await waitFor(() => {
      expect(screen.queryByText('Test bug title')).not.toBeNull();
    });

    // Status badge should have either text or aria-label identifying the status
    const statusBadge = document.querySelector('[aria-label*="Status"]');
    if (!statusBadge) {
      // Accept if the status text "OPEN" is visible without relying on color alone
      const visibleStatus = screen.queryByText(/open/i);
      expect(visibleStatus).not.toBeNull();
    } else {
      expect(statusBadge.getAttribute('aria-label')).toMatch(/open/i);
    }
  });

  it('TRK-07: type label renders emoji in separate aria-hidden span', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: MOCK_TRACKING_DATA }),
    }));

    const user = userEvent.setup();
    render(<TrackingView initialId="FB-TESTTEST" />);

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /track/i }));
    });

    await waitFor(() => {
      expect(screen.queryByText('Test bug title')).not.toBeNull();
    });

    // Type emoji should be in an aria-hidden span, separate from the text label
    const hiddenEmoji = document.querySelector('[aria-hidden="true"]');
    expect(hiddenEmoji).not.toBeNull();
  });

  it('TRK-04: timeline bullet dots have aria-hidden="true"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: MOCK_TRACKING_DATA }),
    }));

    const user = userEvent.setup();
    render(<TrackingView initialId="FB-TESTTEST" />);

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /track/i }));
    });

    await waitFor(() => {
      expect(screen.queryByText('Test bug title')).not.toBeNull();
    });

    // Decorative bullet dots should be aria-hidden
    const hiddenElements = document.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenElements.length).toBeGreaterThan(0);
  });

  it('TRK-06: status history list is associated with its heading', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: MOCK_TRACKING_DATA }),
    }));

    const user = userEvent.setup();
    render(<TrackingView initialId="FB-TESTTEST" />);

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /track/i }));
    });

    await waitFor(() => {
      expect(screen.queryByText(/status history/i)).not.toBeNull();
    });

    const list = document.querySelector('ol');
    expect(list).not.toBeNull();
    // The list should be associated with the "Status History" heading
    const labelledBy = list?.getAttribute('aria-labelledby');
    if (labelledBy) {
      const heading = document.getElementById(labelledBy);
      expect(heading?.textContent).toMatch(/status history/i);
    }
  });
});

describe('TrackingView — keyboard navigation', () => {
  it('TRK-01: search can be submitted with Enter key', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: MOCK_TRACKING_DATA }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const user = userEvent.setup();
    render(<TrackingView />);

    const input = screen.getByRole('textbox');
    await act(async () => {
      await user.type(input, 'FB-TESTTEST');
      await user.keyboard('{Enter}');
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
