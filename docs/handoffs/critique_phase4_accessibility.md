STATUS: REVIEWED
PHASE: 4–5
FEATURE: WCAG 2.1 AA Accessibility Audit
REVIEWED_BY: CRITIC
DATE: 2026-03-17
SEVERITY_SUMMARY: CRITICAL:1 / HIGH:5 / MEDIUM:6 / LOW:4

---

# Critique: WCAG 2.1 AA Accessibility Audit Design

---

## CRITICAL (must fix before implementation)

### C-01 — Vitest environment `node` will crash all React a11y tests

**Where:** `vitest.config.ts` line 8 (`environment: 'node'`) vs. all 7 proposed `.a11y.test.tsx` files

**Problem:** The existing Vitest config sets `environment: 'node'`. Every proposed React component test in `src/__tests__/a11y/*.tsx` uses `@testing-library/react`, which depends on browser DOM globals (`document`, `window`, `HTMLElement`). These simply don't exist in Node. All 7 tests will crash immediately with `ReferenceError: document is not defined` — none of the testing infrastructure in the design works as written.

The design says to run `pnpm test src/__tests__/a11y/` and "all new a11y tests must pass" (Section 5.3), but this cannot happen without resolving the environment.

**Solution:** Add a `// @vitest-environment jsdom` docblock comment at the top of each `.a11y.test.tsx` file (the simplest fix that avoids disrupting existing API/server tests which correctly stay `node`):

```ts
// @vitest-environment jsdom
import { render } from '@testing-library/react';
// ...
```

Alternatively, add a Vitest `projects` config so `.a11y.test.tsx` files run under `jsdom` while all other tests remain in `node`. The design **must** specify one of these approaches — not doing so guarantees zero a11y tests will run.

Also note: `jsdom` must be installed (`pnpm add -D jsdom`) as it is not bundled with Vitest.

---

## HIGH (fix if possible)

### H-01 — WCAG 2.2 criteria silently included in a "2.1 AA" scope document

**Where:** Section 1 WCAG checklist — SC 2.4.11 (Focus Appearance) and SC 2.5.8 (Target Size Minimum)

**Problem:** Both criteria are from **WCAG 2.2**, not WCAG 2.1. The document's declared scope is "WCAG 2.1 Level AA" but it includes 2.2 requirements without acknowledgment. This creates a governance problem: the team may treat these as WCAG 2.1 requirements (which they are not), and when a tool like axe-core flags them it uses 2.2 rule tags — the `runOnly` config in Section 5.1 only targets `wcag2a/wcag2aa/wcag21a/wcag21aa`, meaning axe **won't** catch 2.4.11 or 2.5.8 violations automatically.

**Solution:** Either:
- State clearly at the top that the audit covers WCAG 2.1 AA _plus_ selected WCAG 2.2 AA criteria (2.4.11, 2.5.8), and add `wcag22aa` to the axe `runOnly` values; or
- Separate them into a "WCAG 2.2 bonus" section so the team knows what is required vs. aspirational.

---

### H-02 — `TicketPagination` is in scope but receives zero audit coverage

**Where:** Section 1 scope table lists `TicketPagination`; Section 2 never mentions it; Section 6 component tree doesn't list it as MODIFY

**Problem:** The actual `TicketPagination.tsx` has concrete violations:
- The container is a plain `<div>` with no `<nav>` or `role="navigation"` — violates SC 1.3.1 landmark structure
- "Previous" and "Next" buttons convey no page context — a SR user hears "Previous, button" with no indication of their current position (violates SC 2.4.4 Link Purpose)
- No `aria-current` or `aria-label` pattern announces which page is active (violates SC 4.1.2)

If the component isn't rendered (hidden when `total <= limit`), axe won't catch it. These must be explicitly enumerated and fixed.

**Solution:** Add issue IDs `PAG-01` through `PAG-03` to Section 2 and add `TicketPagination.tsx` to Section 6 as MODIFY. Minimum fixes: wrap in `<nav aria-label="Pagination">`, add `aria-label="Go to previous page"` and `aria-label={`Go to page ${currentPage + 1}`}` to buttons.

---

### H-03 — `FeedbackTypeSelector` missing group semantics

**Where:** Section 2.2 covers `FeedbackTypeSelector.tsx` (SUB-02, SUB-03) but misses the group structure problem

**Problem:** The three type buttons ("Bug Report", "Feature Request", "General") are a mutual-exclusion selection group, but the wrapper `<div className="grid">` has no group label. A screen reader user hears "Bug Report, button" with zero context that they're choosing a feedback category. This violates SC 1.3.1 (Info and Relationships) — the semantic relationship between the buttons and their collective purpose is not programmatically expressed.

The design adds `aria-pressed` (SUB-02) which is good, but `aria-pressed` buttons without a group role leave SR users without the critical "choose one feedback type" instruction.

**Solution:** Wrap the grid in `<div role="group" aria-labelledby="feedback-type-label">` and add `<p id="feedback-type-label" className="sr-only">Select feedback type</p>` before the grid. Add this as issue `SUB-10 / SC 1.3.1 / HIGH`.

---

### H-04 — `TrackingView.tsx` emoji exposure missed (same class of bug as SUB-03)

**Where:** Section 2.3 `TrackingView.tsx` issues; not listed

**Problem:** `TrackingView.tsx` lines 37–40 define:
```ts
const TYPE_LABELS: Record<FeedbackType, string> = {
  BUG: "🐛 Bug",
  FEATURE: "✨ Feature",
  GENERAL: "💬 General",
};
```
This is rendered via `<span>{TYPE_LABELS[data.type]}</span>` — screen readers will announce "caterpillar Bug", "sparkles Feature", "speech bubble General". The design correctly identified the same class of bug in `FeedbackTypeSelector` (SUB-03) and the widget (WGT-03) but missed this identical instance in the React tracking page.

**Solution:** Add issue `TRK-07 / SC 1.1.1 / MEDIUM` to Section 2.3. Fix: split into `<span aria-hidden="true">{emoji}</span><span>{label}</span>` using a separate `TYPE_EMOJI` map.

---

### H-05 — `RecentTicketsTable` in scope but receives zero audit coverage

**Where:** Section 1 scope lists `RecentTicketsTable`; Section 2 and Section 6 never reference it

**Problem:** `RecentTicketsTable.tsx` has the same `CardTitle` issue as CX-03 (renders as `<div>`, not `<h2>` — the dashboard has no heading hierarchy at all once the `<h1>` is added to the page). It also contains `TicketTypeBadge` and `TicketStatusBadge` rendered inside each `<Link>`, making the full accessible name something like "BUG Bug Report title OPEN" — the badge text is read as part of the link, which may be confusing.

**Solution:** Add `RST-01` through `RST-02` to a new Section 2.x for the Dashboard `RecentTicketsTable`. Minimum: mark `CardTitle` to render as `<h2>` (or `asChild` → `<h2>`), and add `aria-label` to each Link that includes a cleaner name pattern.

---

## MEDIUM (can address in next iteration)

### M-01 — WCAG checklist SC 3.3.2 status is factually wrong

**Where:** Section 1 Understandable table, SC 3.3.2 marked "⚠️ GAPS"

**Problem:** `FeedbackForm.tsx` already has `<Label htmlFor="title">`, `<Label htmlFor="description">`, `<Label htmlFor="nickname">`, and `<Label htmlFor="email">` — all four form fields are properly labeled. Marking this as "GAPS" is incorrect and will lead the implementer to add redundant fixes. The real gaps are only in `TrackingView` (covered by TRK-01) and admin panels (DTL-02/03/04).

**Solution:** Change SC 3.3.2 status to "✅ OK (React form)" with a note "gaps in admin panels — see DTL-02, DTL-03, DTL-04".

---

### M-02 — SC 1.3.5 (Identify Input Purpose) missing from checklist entirely

**Where:** Section 1 Perceivable table; not listed

**Problem:** SC 1.3.5 is WCAG 2.1 **AA** — it requires that input fields for personal data expose their purpose via `autocomplete` attributes. `FeedbackForm.tsx` email input (line 190) has `type="email"` but no `autocomplete="email"`. The nickname field has no `autocomplete="nickname"`. The widget `FORM_FIELDS` array also lacks `autocomplete` entries.

Users with cognitive disabilities benefit significantly from browser autofill. This is not a stretch criterion — it applies directly to this form.

**Solution:** Add SC 1.3.5 to the checklist (status: "⚠️ GAPS"). Add issue `SUB-11`: add `autoComplete="email"` to the email `<Input>` and `autoComplete="nickname"` to the nickname `<Input>`. Add `autocomplete` attributes to the widget `inp.autocomplete` in `FORM_FIELDS`.

---

### M-03 — WGT-04 fix logic placed in wrong file

**Where:** Section 2.8, WGT-04 fix directs changes to `widget/ui/steps/success.ts`

**Problem:** `success.ts` renders DOM elements and returns a container — it does not control focus. Focus management after step transitions is performed by `popup.ts` lines 99–101:
```ts
releaseFocusTrap?.();
releaseFocusTrap = trapFocus(el);
```
`trapFocus(el)` will move focus to the **first focusable element** of the new step container (which is the "Copy" button in the success step), not the `<h3>` title. The design correctly identifies the problem (focus lands on "Copy" before SR announces the success) but incorrectly says "in `trapFocus` or after step change, call `titleEl.focus()`" targeting `success.ts`.

The `<h3>` element in `success.ts` should receive `tabindex="-1"`, but the `requestAnimationFrame(() => h3.focus())` call must happen in `popup.ts` after the step-change DOM rebuild, before `trapFocus` is set.

**Solution:** Update fix description: in `success.ts`, add `title.setAttribute('tabindex', '-1')`. In `popup.ts`, after `case 'success': content.appendChild(renderSuccess(...))`, add `requestAnimationFrame(() => content.querySelector<HTMLElement>('.wfb-success-title')?.focus())` before calling `trapFocus(el)`.

---

### M-04 — `AdminHeader` avatar is in scope but receives no issues

**Where:** Section 1 scope lists `AdminHeader`; Section 2 and Section 6 never reference it

**Problem:** The avatar `<div>` in `AdminHeader.tsx` (line 16-18) renders `user.username.slice(0, 1)` as a visible initial letter inside a round element. This is not interactive, but it is a meaningful text element — the single letter "A" or "J" has no accessible context. As a purely decorative representation of the logged-in user's name, it should have `aria-hidden="true"`. The surrounding `<div>` with `user.username` and `user.email` text provides context, but the avatar letter is potentially confusing as a standalone text node.

**Solution:** Add `ADM-07 / SC 1.1.1 / LOW`: add `aria-hidden="true"` to the avatar `<div>`. Add `AdminHeader.tsx` to Section 6 as MODIFY.

---

### M-05 — No Next.js / NextAuth mock setup specified for React tests

**Where:** Section 5.2 test files description for `admin-sidebar.a11y.test.tsx`

**Problem:** `AdminSidebar.tsx` imports `usePathname` from `next/navigation` and `signOut` from `next-auth/react`. Without mocking these, the test will throw `Error: invariant: usePathname is only available inside app/` or similar. Similarly, `FeedbackForm.tsx` imports `useRouter`. The design says "Render `AdminSidebar`" and "Render `FeedbackForm`" without specifying any mock setup — a new developer would not know these are required.

**Solution:** Add a "Mock setup required" note to each affected test file description in Section 5.2. Example for admin-sidebar:
```ts
vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/admin/dashboard'),
}));
vi.mock('next-auth/react', () => ({ signOut: vi.fn() }));
```

---

### M-06 — Missing SC 3.3.3 (Error Suggestion) in checklist

**Where:** Section 1 Understandable table

**Problem:** SC 3.3.3 (Error Suggestion) is WCAG 2.1 AA — when an input error is detected, the description should suggest how to correct it. The current form only shows `toast.error("Submission failed...")` on server errors. HTML5 native validation errors (required, maxLength, email format) provide browser-default messages, but these vary across browsers and don't offer guided suggestions (e.g., "Email must include an @ symbol"). Not in the checklist or any issue.

**Solution:** Add SC 3.3.3 to checklist with status "⚠️ AUDIT NEEDED". Add a LOW-priority issue recommending custom validation messages with specific correction hints rather than relying solely on browser-native validation popups.

---

## LOW (suggestions)

### L-01 — SC 1.4.10 (Reflow) deferred to Phase 5 but it is a WCAG 2.1 AA requirement

**Where:** Section 11 Known Low-Priority Items

**Problem:** The design defers the reflow audit "to Phase 5" because it "requires dedicated browser testing at 320px viewport." This is factually true (it needs manual testing), but SC 1.4.10 is not optional for WCAG 2.1 AA compliance — it is a hard requirement. Labeling it "low priority" and deferring it signals that the Phase 4 release may not be WCAG 2.1 AA compliant. If the goal is genuinely "WCAG 2.1 AA audit," reflow must be in Phase 4.

**Recommendation:** Either move reflow testing into Phase 4 Step 7 manual audit, or explicitly state that Phase 4 delivers "partial WCAG 2.1 AA coverage" with reflow deferred.

---

### L-02 — WGT-05 fix should prefer `aria-labelledby` over matching string to `aria-label`

**Where:** Section 2.8, WGT-05 fix

**Problem:** The design says "change `aria-label` to 'Send Feedback' OR use `aria-labelledby`". Looking at the actual `popup.ts` code (line 123), the title span already exists: `title.textContent = 'Send Feedback'`. The cleanest fix is `el.setAttribute('aria-labelledby', 'wfb-popup-title')` with `title.id = 'wfb-popup-title'` — this means if the visible text ever changes, the `aria-label` automatically stays in sync. The "OR just change the string" option creates label drift risk.

**Recommendation:** Make `aria-labelledby` the primary fix, not an "OR".

---

### L-03 — `TicketFiltersBar` wrapper `<div>` has no landmark or form role

**Where:** `TicketFiltersBar.tsx` root element

**Problem:** The filter bar is an unlabeled `<div>`. Since filters fire on `onChange` (not on form submit), a `<form>` wrapper isn't appropriate. But the three unlabeled `<select>` elements inside a plain `<div>` are isolated from any search/filter landmark context. A screen reader user navigating by landmark would not find the filter controls without tabbing.

**Recommendation:** Wrap in `<div role="search" aria-label="Filter tickets">` — `role="search"` is semantically appropriate for filter/query controls (ARIA 1.1). Add as LOW issue `TBL-08`.

---

### L-04 — `AdminSidebar` `<aside>` should have an `aria-label`

**Where:** `AdminSidebar.tsx` line 23: `<aside className="...">`

**Problem:** The `<aside>` complementary landmark has no label. When a page has multiple `<aside>` elements (which could happen in the admin shell if a panel is added), unlabeled complementary landmarks become indistinguishable to AT. Even with one `<aside>`, adding `aria-label="Sidebar"` is best practice per ARIA Landmarks document.

**Recommendation:** Add `aria-label="Sidebar"` to `<aside>`. Add as LOW sub-item of ADM-03 or a new `ADM-07`.

---

## Approval Condition

Can be APPROVED once all CRITICAL and HIGH items are resolved:
- **C-01** — Add `// @vitest-environment jsdom` to all 7 `.a11y.test.tsx` files + install `jsdom` devDep
- **H-01** — Clarify WCAG 2.1 vs 2.2 scope; update axe `runOnly` if including 2.2 criteria
- **H-02** — Add `TicketPagination` issue inventory (PAG-01 through PAG-03) and MODIFY entry in Section 6
- **H-03** — Add `SUB-10` for `FeedbackTypeSelector` group semantics (`role="group"` + `aria-label`)
- **H-04** — Add `TRK-07` for `TrackingView` emoji exposure in `TYPE_LABELS`
- **H-05** — Add `RecentTicketsTable` issue inventory and MODIFY entry in Section 6

MEDIUM items M-01 through M-06 should be addressed in the same implementation pass (all are small, well-scoped fixes).
