STATUS: REVIEWED
PHASE: 4–5
FEATURE: WCAG 2.1 AA Accessibility Audit
REVIEWED_BY: SECURITY
DATE: 2026-03-17
SEVERITY_SUMMARY: CRITICAL:0 / HIGH:0 / MEDIUM:2 / LOW:3

---

# Security Review — Phase 4 Accessibility Changes

## Scope

All ARIA attribute additions, focus management code, skip-to-content links, Shadow DOM changes, and
new DOM elements introduced by the WCAG 2.1 AA accessibility remediation (Phase 4).

### Files examined

| File | Focus |
|------|-------|
| `src/components/layout/SkipNav.tsx` | Skip link — href injection, label injection |
| `src/lib/a11y/focus-utils.ts` | `announceToSR` — live region DOM injection |
| `src/app/layout.tsx` | SkipNav placement in root layout |
| `src/app/(admin)/layout.tsx` | Auth gate + `id="main-content"` anchor |
| `src/app/admin/login/page.tsx` | `callbackUrl` flow into login form |
| `src/components/auth/LoginForm.tsx` | Redirect logic after auth, error focus |
| `src/components/auth/LoginErrorAlert.tsx` | `role="alert"` message rendering |
| `src/components/feedback/FeedbackForm.tsx` | Live region, `autoComplete`, focus-on-success |
| `src/components/feedback/FeedbackTypeSelector.tsx` | `role="group"`, `aria-pressed` |
| `src/components/feedback/TrackingView.tsx` | Live region with API data, status labels |
| `src/components/admin/AdminSidebar.tsx` | `aria-current`, nav landmark |
| `src/components/admin/AdminHeader.tsx` | Avatar `aria-hidden` |
| `src/components/admin/TicketTable.tsx` | `aria-busy`, `<caption>`, `scope` attrs |
| `src/components/admin/TicketPagination.tsx` | Pagination nav landmark, `aria-disabled` |
| `src/components/admin/TicketFiltersBar.tsx` | `role="search"`, select `aria-label` |
| `src/components/admin/RecentTicketsTable.tsx` | `aria-label` with dynamic `ticket.title` |
| `src/components/admin/StatusUpdatePanel.tsx` | `aria-labelledby`, labeled textarea |
| `src/components/admin/PriorityUpdatePanel.tsx` | `aria-labelledby` |
| `src/components/admin/DangerZoneCard.tsx` | `aria-describedby`, `aria-hidden` on icon |
| `src/widget/ui/button.ts` | Trigger button ARIA attributes |
| `src/widget/ui/popup.ts` | `aria-labelledby`, focus management, Escape handler |
| `src/widget/ui/steps/form.ts` | `aria-busy`, `aria-label`, `aria-hidden` on emoji |
| `src/widget/ui/steps/success.ts` | `tabindex="-1"` on h3, trackingId in DOM |
| `src/widget/ui/steps/type-select.ts` | `role="button"`, `aria-pressed`, `aria-label` |
| `src/widget/utils/focus-trap.ts` | Focus trap — Shadow DOM containment |
| `src/widget/config.ts` | Input sanitization before DOM insertion |
| `src/widget/ui/root.ts` | Shadow DOM setup, `data-position`, CSS var |
| `src/widget/ui/steps/index.ts` | Alternate monolithic renderer (unreferenced) |
| `src/lib/auth/sanitize-callback-url.ts` | Callback URL sanitization |

---

## CRITICAL (halt implementation immediately, must fix)

None.

---

## HIGH (fix before next commit)

None.

---

## MEDIUM (fix within this phase)

### M-01 — `announceToSR` appends DOM element with user-controlled `message` to `document.body`

**File:** `src/lib/a11y/focus-utils.ts` lines 24–48

**Observation:** `announceToSR(message, politeness)` creates a live-region `<div>`, sets
`el.textContent = message`, and appends it to `document.body`. The function is currently only defined
and exported but **not called** anywhere in the production codebase (no callsites found in `src/`
outside tests). This is a future-use utility.

**Concern:** `textContent` assignment is safe — it does not interpret HTML, so no XSS is possible
from the `message` argument. However, the function is exported from a `'use client'` utility module
that any component can import. If a future caller passes a string derived from user-submitted data
(e.g., `ticket.title`, `entry.note`) without first sanitising for maximum length, an attacker could
submit a title of arbitrary length (up to field `maxLength`) which gets announced via the live region
and also exists in the DOM until the 1-second cleanup timeout.

**Risk level:** LOW risk at present (no callsites, `textContent` prevents XSS), elevated to MEDIUM
because the export creates a surface for future misuse.

**Recommendation:** Add a JSDoc comment warning that `message` must never be raw user-submitted
content; callers should use static, developer-controlled strings only. Optionally enforce a max
length guard inside the function (e.g., `message.slice(0, 200)`) as a defence-in-depth measure.

---

### M-02 — `SkipNav` accepts arbitrary `href` prop without validation

**File:** `src/components/layout/SkipNav.tsx` lines 1–21

**Observation:** The `SkipNav` component accepts an `href` prop with no validation:
```tsx
export function SkipNav({ href = '#main-content', label = 'Skip to main content' }: SkipNavProps)
```
The prop type is `string?` and there is no allowlist or format check. The component is currently
called without props in `layout.tsx` (`<SkipNav />`), so the default `'#main-content'` is always
used and the risk does not materialise today.

**Concern:** If a future developer calls `<SkipNav href={someVariable} />` with a value derived from
query parameters, environment config, or CMS content, a `javascript:alert(1)` or `//evil.com` value
would be rendered as a `<a href="...">` that a keyboard user (the primary user of skip navigation)
would activate on their very first `Tab` press. Skip-link activation requires only a single `Enter`
keypress, making this a particularly impactful injection point for keyboard-only users.

**Recommendation:** Restrict the `href` prop to fragment anchors only (i.e., must start with `#`).
Add a runtime guard:
```tsx
const safeHref = href.startsWith('#') ? href : '#main-content';
```
This is a low-cost defence-in-depth that prevents open-redirect or JavaScript-protocol injection via
this component regardless of how callers use it.

---

## LOW / Informational

### L-01 — `aria-label` on `RecentTicketsTable` links contains unsanitised `ticket.title`

**File:** `src/components/admin/RecentTicketsTable.tsx` line 30

**Pattern:** `aria-label={\`View ticket: ${ticket.title}\`}`

`ticket.title` is user-submitted data (up to 200 characters). In React, `aria-label` is set as an
HTML attribute (not `innerHTML`), so JavaScript injection is not possible. The string is safely HTML-
escaped by React's renderer. No XSS risk exists.

**Informational note:** The title content will be announced by screen readers as part of the
accessible name. An attacker who submits a maliciously crafted title (e.g., a very long string, or
one designed to sound like a system message: "Ticket: SECURITY ALERT — click escape to close") could
cause confusing announcements for admin users using assistive technology. This is a social-engineering
vector, not a code injection vector. It is mitigated by admin-only access to this component.

**Recommendation:** No code change required. Documented for awareness.

---

### L-02 — Widget `data-button-label` written to `aria-label` without HTML sanitisation (defence-in-depth gap)

**File:** `src/widget/config.ts` lines 41–43; `src/widget/ui/button.ts` line 37

**Pattern:**
```ts
btn.setAttribute('aria-label', config.buttonLabel); // config.ts: sanitizeLabel trims + slices to 50 chars
```

`sanitizeLabel` trims whitespace and enforces a 50-character limit but does not strip HTML special
characters. `setAttribute` does not interpret HTML, so `<script>` or `"onclick="...` in the label
string cannot be injected into the DOM as markup. The value is treated as a plain string attribute.
No XSS vector exists via this path.

**Informational note:** A label containing unusual characters (e.g., `"` or `'`) is safely escaped
by `setAttribute`. This is correct and safe behaviour. The previous Phase 3 security review already
confirmed this pattern as sound (`[C2] 모든 동적 값은 textContent / setAttribute 만 사용`).

**Recommendation:** No code change required. Confirms existing security controls are operating
correctly.

---

### L-03 — `status-heading` and `priority-heading` IDs are not scoped to instances (low risk in current single-instance admin)

**Files:** `src/components/admin/StatusUpdatePanel.tsx` line 51;
`src/components/admin/PriorityUpdatePanel.tsx` line 48

**Pattern:** `<h3 id="status-heading">` and `<h3 id="priority-heading">` use fixed IDs. If multiple
instances of these panels were rendered on the same page simultaneously (e.g., a future bulk-edit
view), `aria-labelledby` would reference the first matching element, causing label association errors.

**Risk:** None in current architecture — these panels are rendered once per ticket detail page.

**Recommendation:** No immediate action required. If bulk-edit is implemented in Phase 5, these IDs
should be scoped with instance keys (e.g., `id={`status-heading-${ticket.id}`}`).

---

## Specific Security Findings by Area

### Skip-to-Content Link

The `SkipNav` component renders `<a href="#main-content">` using the default prop value. The `href`
is not sanitised (see M-02). All four pages that include a `#main-content` anchor (`/submit`,
`/track`, `/admin/login`, `/(admin)/layout`) correctly place the anchor on a `<main>` element that
is inside the authenticated layout, not before the auth gate. The skip link **bypasses navigation
chrome** (sidebar, header) as intended, but it does NOT bypass the NextAuth authentication check
(`auth()` → `redirect('/admin/login')`) in `(admin)/layout.tsx`. The auth check runs at the server
level, before any DOM is rendered. The skip link cannot be used as an auth bypass vector.

### Focus Trap (Widget Shadow DOM)

`src/widget/utils/focus-trap.ts` correctly uses `container.getRootNode()` to obtain the
`ShadowRoot` and then `shadowRoot.activeElement` for focus detection. This is the correct, fixed
approach from Phase 3 (H2). The trap contains focus inside the Shadow DOM container, not the host
page. Tab cycling is correctly implemented. The Escape key handler in `popup.ts` is registered on
`shadow.addEventListener` (not `document`), with `stopPropagation()` to prevent leaking Escape
events to the host page. No bypass of focus containment or host DOM escape paths found.

### Shadow DOM Style Isolation

`src/widget/ui/root.ts` uses `host.attachShadow({ mode: 'open' })`. The accessibility changes do not
alter the shadow mode. All new ARIA attributes (`aria-hidden`, `aria-label`, `aria-pressed`,
`aria-busy`, `aria-labelledby`) are set on Shadow DOM internal elements. No new `part` attributes
or CSS custom properties that would break style isolation were introduced. The `--wfb-accent` CSS
variable is set on the host element via `host.style.setProperty`, which is correct and safe.
`sanitizeHexColor` validation from Phase 3 remains in place and correctly blocks CSS injection.

### ARIA Attribute Leakage of Sensitive Information

Reviewed all dynamic ARIA attributes that incorporate data values:

| Attribute | Value source | Risk |
|-----------|-------------|------|
| `aria-label="View ticket: ${ticket.title}"` | User-submitted, admin-only page | No XSS; admin-only |
| `aria-label={`Status: ${data.status.replace("_"," ")}`}` | Enum from server, not user text | No risk |
| `aria-label={`Page ${currentPage} of ${totalPages}, current page`}` | Numeric, server-controlled | No risk |
| `aria-label="Go to previous/next page"` | Static strings | No risk |
| `aria-current={pathname === href ? 'page' : undefined}` | Static route strings | No risk |
| `aria-labelledby="status-heading"` / `"priority-heading"` | Static IDs, no user data | No risk |
| Widget `aria-label` on back button: `'Go back to type selection'` | Static string | No risk |

No ARIA attribute was found to expose authentication tokens, session data, email addresses,
passwords, or other sensitive information.

### `announceToSR` Live Region Injection

`focus-utils.ts` creates a live-region element via `document.createElement` and assigns
`el.textContent = message`. Since `textContent` does not parse HTML, this cannot create script tags
or event handlers. The element is appended to `document.body` and removed after 1000ms. See M-01
for future-use concern.

### Login Redirect Security

`src/app/admin/login/page.tsx` passes `callbackUrl` from query params through
`sanitizeCallbackUrl()` before passing to `LoginForm`. The server-side sanitizer uses the regex
`/^\/(?!\/)[a-zA-Z0-9\-_/?=&%#]*$/` to restrict to safe relative paths. `LoginForm.tsx` adds a
second client-side defence: `callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')`. Double
sanitisation is belt-and-suspenders correct. No open redirect vulnerability.

### `role="alert"` in LoginErrorAlert

`LoginErrorAlert` renders `message` as `{message}` (React JSX text node). The message is always
the static string `'Invalid email or password'` (set in `LoginForm.tsx` line 53). React JSX renders
text nodes safely. No injection path.

### Widget `steps/index.ts` — Unreferenced Code

`src/widget/ui/steps/index.ts` (314 lines) contains a monolithic alternative widget renderer with
its own `renderStep` function. It is **not imported** by any production file (`widget/index.ts` uses
the modular `popup.ts` → `form.ts`, `success.ts`, `type-select.ts` chain). The file appears to be
dead code — a prior implementation iteration. Its ARIA handling is correct (textContent-only, no
innerHTML), but its existence creates maintenance confusion. This is not a security risk today but
is flagged for cleanup.

---

## Recommendations

1. **M-02 (MEDIUM) — Harden SkipNav href:** Add `const safeHref = href.startsWith('#') ? href : '#main-content'`
   before the `<a>` render. Low effort, high value for defence-in-depth. Should be addressed before
   any caller passes a dynamic value to the `href` prop.

2. **M-01 (MEDIUM) — Document announceToSR message constraint:** Add a JSDoc warning that the
   `message` argument must be developer-controlled static text. Optionally add `message.slice(0, 200)`
   inside the function.

3. **L-03 (LOW) — Scope panel heading IDs for Phase 5 bulk-edit:** If `StatusUpdatePanel` or
   `PriorityUpdatePanel` are ever rendered more than once per page, generate instance-scoped IDs.

4. **Dead code cleanup — `widget/ui/steps/index.ts`:** This file is unreferenced by production code.
   Delete or archive it to reduce attack surface and maintenance confusion. Tag for REFACTOR agent.

5. **Carry forward from Phase 3:** The `console.warn` contrast checker for `data-button-color` (WGT-06)
   remains a Phase 5 backlog item. Not a security vulnerability, but deployers who configure
   low-contrast accent colours could inadvertently harm accessibility for users who rely on color
   contrast. Consider a runtime warning in the widget init.
