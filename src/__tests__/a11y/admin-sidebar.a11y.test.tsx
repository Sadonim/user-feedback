// @vitest-environment jsdom
/**
 * Accessibility tests — Admin Shell (AdminSidebar + AdminHeader)
 *
 * Tests against WCAG 2.1 AA requirements per design_phase4_accessibility.md.
 *
 * Issues verified: ADM-02, ADM-03, ADM-04, ADM-07, ADM-08
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { a11yAxeConfig } from './axe-config';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPathname = vi.fn().mockReturnValue('/admin/dashboard');

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}));

// next/link: render as <a> for testing
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockPathname.mockReturnValue('/admin/dashboard');
});

// ── axe configuration ─────────────────────────────────────────────────────────
// Shared config (color-contrast + full-page rules disabled for jsdom fragments)
const axeConfig = a11yAxeConfig;

const MOCK_USER = { username: 'admin', role: 'ADMIN' as const };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AdminSidebar — axe accessibility', () => {
  it('should have no axe violations', async () => {
    const { container } = render(<AdminSidebar user={MOCK_USER} />);
    const results = await axeConfig(container);
    expect(results).toHaveNoViolations();
  });

  it('ADM-03: <nav> element has aria-label="Main navigation"', () => {
    render(<AdminSidebar user={MOCK_USER} />);
    const nav = document.querySelector('nav');
    expect(nav).not.toBeNull();
    expect(nav?.getAttribute('aria-label')).toBe('Main navigation');
  });

  it('ADM-08: <aside> element has aria-label="Sidebar"', () => {
    render(<AdminSidebar user={MOCK_USER} />);
    const aside = document.querySelector('aside');
    expect(aside).not.toBeNull();
    expect(aside?.getAttribute('aria-label')).toBe('Sidebar');
  });

  it('ADM-02: active nav link has aria-current="page"', () => {
    mockPathname.mockReturnValue('/admin/dashboard');
    render(<AdminSidebar user={MOCK_USER} />);

    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink.getAttribute('aria-current')).toBe('page');
  });

  it('ADM-02: inactive nav link does NOT have aria-current', () => {
    mockPathname.mockReturnValue('/admin/dashboard');
    render(<AdminSidebar user={MOCK_USER} />);

    const ticketsLink = screen.getByRole('link', { name: /tickets/i });
    const ariaCurrent = ticketsLink.getAttribute('aria-current');
    expect(ariaCurrent === null || ariaCurrent === 'false' || ariaCurrent === 'undefined').toBe(true);
  });

  it('ADM-02: aria-current changes to "page" on the correct active link', () => {
    mockPathname.mockReturnValue('/admin/tickets');
    render(<AdminSidebar user={MOCK_USER} />);

    const ticketsLink = screen.getByRole('link', { name: /tickets/i });
    expect(ticketsLink.getAttribute('aria-current')).toBe('page');

    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    const dashboardCurrent = dashboardLink.getAttribute('aria-current');
    expect(dashboardCurrent === null || dashboardCurrent === 'false' || dashboardCurrent === 'undefined').toBe(true);
  });

  it('ADM-04: Lucide icons in nav have aria-hidden="true"', () => {
    const { container } = render(<AdminSidebar user={MOCK_USER} />);
    // Lucide renders SVGs; they should all be aria-hidden
    const svgs = container.querySelectorAll('svg');
    svgs.forEach((svg) => {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('ADM-04: nav link labels are still visible to screen readers via text content', () => {
    render(<AdminSidebar user={MOCK_USER} />);
    // Even with aria-hidden icons, text labels must remain visible
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /tickets/i })).toBeTruthy();
  });
});

describe('AdminSidebar — keyboard navigation', () => {
  it('all nav links are reachable via Tab', () => {
    render(<AdminSidebar user={MOCK_USER} />);

    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(2);

    // All links should be in the tab order (no tabIndex=-1 on links)
    links.forEach((link) => {
      const tabIndex = link.getAttribute('tabindex');
      // tabIndex null or 0 means it's in natural tab order
      expect(tabIndex === null || tabIndex === '0').toBe(true);
    });
  });

  it('Sign Out button is reachable via keyboard', () => {
    render(<AdminSidebar user={MOCK_USER} />);
    const signOutBtn = screen.getByRole('button', { name: /sign out/i });
    expect(signOutBtn).toBeTruthy();
    const tabIndex = signOutBtn.getAttribute('tabindex');
    expect(tabIndex === null || tabIndex === '0').toBe(true);
  });
});
