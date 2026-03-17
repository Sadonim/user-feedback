// @vitest-environment jsdom
/**
 * Accessibility tests — /submit page
 *
 * Tests the FeedbackForm and FeedbackTypeSelector components against
 * WCAG 2.1 AA requirements per design_phase4_accessibility.md.
 *
 * Issues verified: SUB-01 through SUB-11
 *
 * NOTE: These tests follow TDD RED→GREEN. They document what the
 * components MUST implement; some will fail until fixes are applied.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { FeedbackForm } from '@/components/feedback/FeedbackForm';
import { FeedbackTypeSelector } from '@/components/feedback/FeedbackTypeSelector';
import { a11yAxeConfig } from './axe-config';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
}));

// Silence sonner toasts in tests
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// ── axe configuration ─────────────────────────────────────────────────────────
// Shared config (color-contrast + full-page rules disabled for jsdom fragments)
const axeConfig = a11yAxeConfig;

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderFeedbackForm() {
  return render(<FeedbackForm />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FeedbackTypeSelector — axe accessibility', () => {
  it('should have no axe violations on type-selection step', async () => {
    const { container } = renderFeedbackForm();
    const results = await axeConfig(container);
    expect(results).toHaveNoViolations();
  });

  it('SUB-10: type selector group has role="group" with accessible label', () => {
    renderFeedbackForm();
    const group = document.querySelector('[role="group"]');
    expect(group).not.toBeNull();
    // group must be labelled by an element or aria-label
    const labelledBy = group?.getAttribute('aria-labelledby');
    const ariaLabel = group?.getAttribute('aria-label');
    expect(labelledBy || ariaLabel).toBeTruthy();
  });

  it('SUB-02: type buttons have aria-pressed attribute', () => {
    renderFeedbackForm();
    const buttons = screen.getAllByRole('button');
    // Filter to type-selector buttons (Bug Report, Feature Request, General)
    const typeButtons = buttons.filter(
      (btn) => btn.getAttribute('aria-pressed') !== null
    );
    expect(typeButtons.length).toBeGreaterThanOrEqual(3);
  });

  it('SUB-02: aria-pressed is "false" initially for all type buttons', () => {
    renderFeedbackForm();
    const typeButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.getAttribute('aria-pressed') !== null);
    typeButtons.forEach((btn) => {
      expect(btn.getAttribute('aria-pressed')).toBe('false');
    });
  });

  it('SUB-02: aria-pressed is "true" for the selected type in FeedbackTypeSelector', () => {
    // Render FeedbackTypeSelector directly with a selected value
    const { container } = render(
      <FeedbackTypeSelector value="BUG" onChange={vi.fn()} />
    );
    const pressedBtn = container.querySelector('[aria-pressed="true"]');
    expect(pressedBtn).not.toBeNull();
    expect(pressedBtn?.textContent).toContain('Bug Report');
  });

  it('SUB-03: emoji spans in type selector have aria-hidden="true"', () => {
    const { container } = render(
      <FeedbackTypeSelector value={null} onChange={vi.fn()} />
    );
    const hiddenEmojis = container.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenEmojis.length).toBeGreaterThanOrEqual(3);
  });
});

describe('FeedbackForm details step — axe accessibility', () => {
  async function renderDetailsStep() {
    const utils = renderFeedbackForm();
    // Click the Bug Report button to advance to the details step.
    // Use textContent match since aria-pressed is not yet implemented.
    const typeButtons = screen.getAllByRole('button');
    const bugButton = typeButtons.find((btn) => btn.textContent?.includes('Bug Report'));
    if (bugButton) {
      await act(async () => { fireEvent.click(bugButton); });
    }
    return utils;
  }

  it('should have no axe violations on details step', async () => {
    const { container } = await renderDetailsStep();
    const results = await axeConfig(container);
    expect(results).toHaveNoViolations();
  });

  it('SUB-01: details step has an <h1> element', async () => {
    await renderDetailsStep();
    const h1 = document.querySelector('h1');
    expect(h1).not.toBeNull();
  });

  it('SUB-04: Back button does not use raw Unicode arrow as sole accessible name', async () => {
    await renderDetailsStep();
    const buttons = screen.getAllByRole('button');
    // Back button is identified by text content or aria-label containing "back"
    const backButton = buttons.find((btn) => {
      const label = btn.getAttribute('aria-label') ?? btn.textContent ?? '';
      return label.toLowerCase().includes('back');
    });
    expect(backButton).toBeTruthy();

    const ariaLabel = backButton?.getAttribute('aria-label');
    if (ariaLabel) {
      // Must not be just the arrow character
      expect(ariaLabel.trim()).not.toBe('←');
      expect(ariaLabel.length).toBeGreaterThan(2);
    } else {
      // Without aria-label, the visible text "← Back" is acceptable ONLY if
      // the arrow is wrapped in aria-hidden and the word "Back" remains
      const hiddenArrow = backButton?.querySelector('[aria-hidden="true"]');
      // After fix: hidden arrow span MUST exist; until then the test documents the gap
      expect(hiddenArrow).not.toBeNull();
    }
  });

  it('SUB-05: aria-live region exists for step announcements', async () => {
    await renderDetailsStep();
    const liveRegion = document.querySelector('[aria-live]');
    expect(liveRegion).not.toBeNull();
  });

  it('SUB-07: form has aria-busy attribute', async () => {
    await renderDetailsStep();
    const form = document.querySelector('form');
    expect(form?.hasAttribute('aria-busy')).toBe(true);
  });

  it('SUB-11: email input has autoComplete="email"', async () => {
    await renderDetailsStep();
    // Use querySelector directly since the label contains "(optional)" text
    const emailInput = document.getElementById('email') as HTMLInputElement;
    expect(emailInput).not.toBeNull();
    expect(emailInput.getAttribute('autocomplete')).toBe('email');
  });

  it('SUB-11: nickname input has autoComplete="nickname"', async () => {
    await renderDetailsStep();
    const nicknameInput = document.getElementById('nickname') as HTMLInputElement;
    expect(nicknameInput).not.toBeNull();
    expect(nicknameInput.getAttribute('autocomplete')).toBe('nickname');
  });
});

describe('FeedbackForm success step — axe accessibility', () => {
  async function renderSuccessStep() {
    const utils = renderFeedbackForm();

    // Navigate to details step via text match (pre-fix fallback)
    const typeButtons = screen.getAllByRole('button');
    const bugButton = typeButtons.find((btn) => btn.textContent?.includes('Bug Report'));
    if (bugButton) {
      await act(async () => { fireEvent.click(bugButton); });
    }

    // Fill required fields
    const titleInput = screen.getByLabelText(/title/i);
    const descInput = screen.getByLabelText(/description/i);
    const nicknameInput = screen.getByLabelText(/nickname/i);

    await act(async () => {
      fireEvent.change(titleInput, { target: { value: 'Test bug' } });
      fireEvent.change(descInput, { target: { value: 'This is a test bug description' } });
      fireEvent.change(nicknameInput, { target: { value: 'Tester' } });
    });

    // Mock the fetch to return success
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { trackingId: 'FB-TESTTEST' } }),
    }));

    const submitBtn = screen.getByRole('button', { name: /submit/i });
    await act(async () => { fireEvent.click(submitBtn); });

    await waitFor(() => {
      expect(screen.queryByText(/tracking id/i)).not.toBeNull();
    });

    vi.unstubAllGlobals();
    return utils;
  }

  it('should have no axe violations on success step', async () => {
    const { container } = await renderSuccessStep();
    const results = await axeConfig(container);
    expect(results).toHaveNoViolations();
  });

  it('SUB-09: success emoji has aria-hidden="true"', async () => {
    await renderSuccessStep();
    // The ✅ emoji container should be aria-hidden
    const hiddenEmoji = document.querySelector('[aria-hidden="true"]');
    expect(hiddenEmoji).not.toBeNull();
  });

  it('SUB-08: success card receives focus after submission', async () => {
    await renderSuccessStep();
    // The success section should be focusable (tabIndex=-1) and focused
    const successSection = document.querySelector('[tabindex="-1"]');
    expect(successSection).not.toBeNull();
    expect(document.activeElement).toBe(successSection);
  });
});

describe('FeedbackTypeSelector — standalone axe', () => {
  it('should have no axe violations', async () => {
    const { container } = render(
      <FeedbackTypeSelector value={null} onChange={vi.fn()} />
    );
    const results = await axeConfig(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no axe violations with a selected value', async () => {
    const { container } = render(
      <FeedbackTypeSelector value="BUG" onChange={vi.fn()} />
    );
    const results = await axeConfig(container);
    expect(results).toHaveNoViolations();
  });
});
