// @vitest-environment jsdom
/**
 * Accessibility tests — Embeddable Widget (Shadow DOM)
 *
 * Tests against WCAG 2.1 AA requirements per design_phase4_accessibility.md.
 *
 * Issues verified: WGT-01 through WGT-05
 *
 * Widget uses vanilla TS + raw DOM — no React, no @testing-library/react.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { INITIAL_STATE } from '@/widget/state';
import type { WidgetState } from '@/widget/state';
import { renderForm, updateFormState } from '@/widget/ui/steps/form';
import { renderSuccess } from '@/widget/ui/steps/success';
import { createPopup } from '@/widget/ui/popup';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFormState(overrides: Partial<WidgetState> = {}): WidgetState {
  return {
    ...INITIAL_STATE,
    step: 'form',
    selectedType: 'BUG',
    ...overrides,
  };
}

function makeSuccessState(overrides: Partial<WidgetState> = {}): WidgetState {
  return {
    ...INITIAL_STATE,
    step: 'success',
    trackingId: 'FB-TESTTEST',
    ...overrides,
  };
}

// ── renderForm tests ───────────────────────────────────────────────────────────

describe('Widget renderForm — accessibility attributes', () => {
  it('WGT-01: back button has aria-label describing its purpose', () => {
    const state = makeFormState();
    const container = renderForm(state, vi.fn(), vi.fn(), vi.fn());

    const backBtn = container.querySelector<HTMLButtonElement>('[data-wfb-back]');
    expect(backBtn).not.toBeNull();

    // Must have aria-label to override the raw "← Back" text content
    const ariaLabel = backBtn?.getAttribute('aria-label');
    expect(ariaLabel).not.toBeNull();
    expect(ariaLabel).toMatch(/back|return|go back|돌아가기/i);
    // ariaLabel should NOT start with the unicode arrow character only
    expect(ariaLabel).not.toBe('←');
  });

  it('WGT-01: back button aria-label does not expose raw Unicode arrow to AT', () => {
    const state = makeFormState();
    const container = renderForm(state, vi.fn(), vi.fn(), vi.fn());

    const backBtn = container.querySelector<HTMLButtonElement>('[data-wfb-back]');
    const ariaLabel = backBtn?.getAttribute('aria-label') ?? backBtn?.textContent ?? '';
    // The accessible name should not be just the arrow
    expect(ariaLabel.trim()).not.toBe('←');
    expect(ariaLabel.trim()).not.toBe('← Back');
  });

  it('WGT-03: type badge renders emoji in a separate aria-hidden span', () => {
    const state = makeFormState({ selectedType: 'BUG' });
    const container = renderForm(state, vi.fn(), vi.fn(), vi.fn());

    const badge = container.querySelector('.wfb-form-type-badge');
    expect(badge).not.toBeNull();

    // The badge should have an aria-hidden child for the emoji
    const hiddenEmoji = badge?.querySelector('[aria-hidden="true"]');
    expect(hiddenEmoji).not.toBeNull();
  });

  it('WGT-03: type badge text (non-emoji) is visible to screen readers', () => {
    const state = makeFormState({ selectedType: 'BUG' });
    const container = renderForm(state, vi.fn(), vi.fn(), vi.fn());

    const badge = container.querySelector('.wfb-form-type-badge');
    // Should have a text node or span that contains the label without emoji
    const textContent = badge?.textContent ?? '';
    expect(textContent).toMatch(/bug report|bug|버그/i);
  });

  it('WGT-03: FEATURE type badge has emoji in aria-hidden span', () => {
    const state = makeFormState({ selectedType: 'FEATURE' });
    const container = renderForm(state, vi.fn(), vi.fn(), vi.fn());

    const badge = container.querySelector('.wfb-form-type-badge');
    const hiddenEmoji = badge?.querySelector('[aria-hidden="true"]');
    expect(hiddenEmoji).not.toBeNull();
  });

  it('all form inputs have aria-label or associated <label> elements', () => {
    const state = makeFormState();
    const container = renderForm(state, vi.fn(), vi.fn(), vi.fn());

    const inputs = container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'input, textarea'
    );
    expect(inputs.length).toBeGreaterThan(0);

    inputs.forEach((input) => {
      const hasAriaLabel = input.getAttribute('aria-label') !== null;
      const inputId = input.id;
      const hasLabel = inputId ? container.querySelector(`label[for="${inputId}"]`) !== null : false;
      expect(hasAriaLabel || hasLabel).toBe(true);
    });
  });

  it('submit button exists with correct initial state', () => {
    const state = makeFormState();
    const container = renderForm(state, vi.fn(), vi.fn(), vi.fn());

    const submitBtn = container.querySelector<HTMLButtonElement>('[data-wfb-submit]');
    expect(submitBtn).not.toBeNull();
    expect(submitBtn?.disabled).toBe(false);
    expect(submitBtn?.textContent).toMatch(/submit|제출/i);
  });
});

describe('Widget updateFormState — aria-busy during submitting', () => {
  it('WGT-02: submit button gets aria-busy="true" during submitting step', () => {
    const state = makeFormState({ step: 'form' });
    const container = renderForm(state, vi.fn(), vi.fn(), vi.fn());

    // Update to submitting state
    const submittingState = makeFormState({ step: 'submitting' });
    updateFormState(container, submittingState);

    const submitBtn = container.querySelector<HTMLButtonElement>('[data-wfb-submit]');
    expect(submitBtn?.getAttribute('aria-busy')).toBe('true');
  });

  it('WGT-02: submit button has aria-busy="false" (or absent) in idle step', () => {
    const state = makeFormState({ step: 'form' });
    const container = renderForm(state, vi.fn(), vi.fn(), vi.fn());

    updateFormState(container, state);

    const submitBtn = container.querySelector<HTMLButtonElement>('[data-wfb-submit]');
    const ariaBusy = submitBtn?.getAttribute('aria-busy');
    expect(ariaBusy === null || ariaBusy === 'false').toBe(true);
  });

  it('WGT-02: submit button text changes to loading text during submitting', () => {
    const state = makeFormState({ step: 'form' });
    const container = renderForm(state, vi.fn(), vi.fn(), vi.fn());

    updateFormState(container, makeFormState({ step: 'submitting' }));

    const submitBtn = container.querySelector<HTMLButtonElement>('[data-wfb-submit]');
    expect(submitBtn?.textContent).toMatch(/submitting|제출 중/i);
  });
});

// ── renderSuccess tests ───────────────────────────────────────────────────────

describe('Widget renderSuccess — accessibility attributes', () => {
  it('WGT-04: success title <h3> has tabindex="-1" for programmatic focus', () => {
    const state = makeSuccessState();
    const container = renderSuccess(state, vi.fn());

    const title = container.querySelector('.wfb-success-title');
    expect(title).not.toBeNull();
    expect(title?.getAttribute('tabindex')).toBe('-1');
  });

  it('success icon has aria-hidden="true"', () => {
    const state = makeSuccessState();
    const container = renderSuccess(state, vi.fn());

    const icon = container.querySelector('.wfb-success-icon');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });

  it('copy button has meaningful aria-label', () => {
    const state = makeSuccessState();
    const container = renderSuccess(state, vi.fn());

    const copyBtn = container.querySelector<HTMLButtonElement>('[data-wfb-copy]');
    expect(copyBtn).not.toBeNull();
    const ariaLabel = copyBtn?.getAttribute('aria-label');
    expect(ariaLabel).toMatch(/copy|복사/i);
  });

  it('close button exists and is keyboard operable', () => {
    const state = makeSuccessState();
    const container = renderSuccess(state, vi.fn());

    const closeBtn = container.querySelector<HTMLButtonElement>('[data-wfb-close]');
    expect(closeBtn).not.toBeNull();
    expect(closeBtn?.tagName.toLowerCase()).toBe('button');
  });
});

// ── createPopup tests ─────────────────────────────────────────────────────────

describe('Widget createPopup — accessibility attributes', () => {
  let host: HTMLElement;
  let shadow: ShadowRoot;
  const callbacks = {
    onClose: vi.fn(),
    onSelectType: vi.fn(),
    onBackToType: vi.fn(),
    onFormChange: vi.fn(),
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    shadow = host.attachShadow({ mode: 'open' });
    vi.clearAllMocks();
  });

  it('WGT-05: popup uses aria-labelledby instead of aria-label', () => {
    const { el } = createPopup(shadow, callbacks);

    // aria-labelledby is preferred over aria-label for labelling via visible text
    const hasLabelledBy = el.getAttribute('aria-labelledby') !== null;
    expect(hasLabelledBy).toBe(true);
    expect(el.getAttribute('aria-label')).toBeNull();
  });

  it('WGT-05: popup aria-labelledby points to title element', () => {
    const { el } = createPopup(shadow, callbacks);

    const labelledBy = el.getAttribute('aria-labelledby');
    expect(labelledBy).not.toBeNull();

    const titleEl = el.querySelector(`#${labelledBy}`);
    expect(titleEl).not.toBeNull();
    expect(titleEl?.textContent).toMatch(/feedback|피드백/i);
  });

  it('popup has role="dialog"', () => {
    const { el } = createPopup(shadow, callbacks);
    expect(el.getAttribute('role')).toBe('dialog');
  });

  it('popup has aria-modal="true"', () => {
    const { el } = createPopup(shadow, callbacks);
    expect(el.getAttribute('aria-modal')).toBe('true');
  });

  it('close button in header has accessible aria-label', () => {
    const { el } = createPopup(shadow, callbacks);
    const closeBtn = el.querySelector<HTMLButtonElement>('.wfb-close-btn');
    expect(closeBtn).not.toBeNull();
    const ariaLabel = closeBtn?.getAttribute('aria-label');
    expect(ariaLabel).toMatch(/close|닫기/i);
  });

  it('close button SVG icon has aria-hidden="true"', () => {
    const { el } = createPopup(shadow, callbacks);
    const svg = el.querySelector('.wfb-close-btn svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('destroy() cleans up without errors', () => {
    const { destroy } = createPopup(shadow, callbacks);
    expect(() => destroy()).not.toThrow();
  });
});
