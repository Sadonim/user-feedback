// @vitest-environment jsdom
/**
 * Accessibility tests — /admin/login page
 *
 * Tests the LoginForm component against WCAG 2.1 AA requirements
 * per design_phase4_accessibility.md.
 *
 * Issues verified: LGN-01, LGN-02
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/auth/LoginForm';
import { LoginErrorAlert } from '@/components/auth/LoginErrorAlert';
import { a11yAxeConfig } from './axe-config';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush, refresh: mockRefresh })),
}));

const mockSignIn = vi.fn();
vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSignIn.mockResolvedValue({ error: null });
});

// ── axe configuration ─────────────────────────────────────────────────────────
// Shared config (color-contrast + full-page rules disabled for jsdom fragments)
const axeConfig = a11yAxeConfig;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LoginForm — axe accessibility', () => {
  it('should have no axe violations on initial render', async () => {
    const { container } = render(<LoginForm />);
    const results = await axeConfig(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no axe violations when error is displayed', async () => {
    mockSignIn.mockResolvedValue({ error: 'CredentialsSignin' });

    const user = userEvent.setup();
    const { container } = render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await act(async () => {
      await user.type(emailInput, 'admin@example.com');
      await user.type(passwordInput, 'wrong-password');
      await user.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeNull();
    });

    const results = await axeConfig(container);
    expect(results).toHaveNoViolations();
  });

  it('LGN-01: LoginForm contains an <h1> heading', () => {
    render(<LoginForm />);
    const h1 = document.querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1?.textContent).toMatch(/admin login/i);
  });

  it('LGN-01: "Admin Login" heading is an h1, not a div', () => {
    render(<LoginForm />);
    // If CardTitle renders as div, this will fail — fix requires asChild
    const heading = screen.getByText(/admin login/i);
    expect(heading.tagName.toLowerCase()).toBe('h1');
  });

  it('has proper form field labels linked by htmlFor', () => {
    render(<LoginForm />);
    // Both inputs must have associated <label> elements
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
  });

  it('email input has autoComplete="email"', () => {
    render(<LoginForm />);
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    expect(emailInput.getAttribute('autocomplete')).toBe('email');
  });

  it('password input has autoComplete="current-password"', () => {
    render(<LoginForm />);
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    expect(passwordInput.getAttribute('autocomplete')).toBe('current-password');
  });
});

describe('LoginErrorAlert — axe accessibility', () => {
  it('should have no axe violations', async () => {
    const { container } = render(
      <LoginErrorAlert message="Invalid email or password" />
    );
    const results = await axeConfig(container);
    expect(results).toHaveNoViolations();
  });

  it('has role="alert" for screen reader announcement', () => {
    render(<LoginErrorAlert message="Invalid email or password" />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeTruthy();
    expect(alert.textContent).toContain('Invalid email or password');
  });
});

describe('LoginForm — keyboard navigation', () => {
  it('Tab moves focus from email → password → submit', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    emailInput.focus();
    expect(document.activeElement).toBe(emailInput);

    await user.tab();
    expect(document.activeElement).toBe(passwordInput);

    await user.tab();
    expect(document.activeElement).toBe(submitButton);
  });

  it('Enter key on submit button triggers form submission', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await act(async () => {
      await user.type(emailInput, 'admin@example.com');
      await user.type(passwordInput, 'correct-password');
      await user.keyboard('{Enter}');
    });

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('credentials', expect.objectContaining({
        email: 'admin@example.com',
        password: 'correct-password',
        redirect: false,
      }));
    });
  });

  it('LGN-02: error alert receives focus after failed login', async () => {
    mockSignIn.mockResolvedValue({ error: 'CredentialsSignin' });

    const user = userEvent.setup();
    render(<LoginForm />);

    await act(async () => {
      await user.type(screen.getByLabelText(/email/i), 'bad@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrong');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
    });

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeNull();
    });

    // After error, focus should move to the alert element
    const alert = screen.getByRole('alert');
    // Alert should be focusable (tabIndex=-1) and have focus
    expect(alert.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(alert);
  });
});
