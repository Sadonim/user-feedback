STATUS: REVISED
PHASE: 4–5
FEATURE: WCAG 2.1 AA Accessibility Audit
LAST_UPDATED: 2026-03-17
CRITIC_RESOLVED: C-01, H-01, H-02, H-03, H-04, H-05, M-01, M-02, M-03, M-04, M-05, M-06, L-01, L-02, L-03, L-04

---

# Accessibility Audit — Design Document

## Scope

**Coverage:** Full WCAG 2.1 Level AA audit and remediation, _plus_ selected WCAG 2.2 AA criteria (SC 2.4.11 Focus Appearance, SC 2.5.8 Target Size Minimum) which are explicitly called out in the checklist and axe configuration. These 2.2 additions are aspirational — the Phase 4 compliance target is WCAG **2.1 AA**.

Full WCAG 2.1 Level AA audit and remediation for:

| Surface | Route | Key Components |
|---------|-------|----------------|
| Public: Submit | `/submit` | `FeedbackForm`, `FeedbackTypeSelector` |
| Public: Track | `/track/[trackingId]` | `TrackingView`, `TrackingViewWrapper` |
| Admin: Login | `/admin/login` | `LoginForm`, `LoginErrorAlert` |
| Admin: Dashboard | `/admin/dashboard` | `StatsCard`, `RecentTicketsTable`, `TypeBreakdownCard` |
| Admin: Tickets | `/admin/tickets` | `TicketTable`, `TicketFiltersBar`, `TicketPagination` |
| Admin: Ticket Detail | `/admin/tickets/[id]` | `TicketDetailView`, `StatusUpdatePanel`, `PriorityUpdatePanel`, `DangerZoneCard` |
| Admin: Shell | all admin routes | `AdminSidebar`, `AdminHeader`, `AdminLayout` |
| Widget | embedded | `button.ts`, `popup.ts`, `type-select.ts`, `form.ts`, `success.ts` |

---

## 1. WCAG 2.1 AA Success Criteria Checklist

### Perceivable

| SC | Version | Level | Criterion | Status |
|----|---------|-------|-----------|--------|
| 1.1.1 | 2.1 | A | Non-text Content — all images/icons have text alternatives | ⚠️ GAPS |
| 1.3.1 | 2.1 | A | Info and Relationships — semantic structure conveys meaning | ⚠️ GAPS |
| 1.3.2 | 2.1 | A | Meaningful Sequence — reading order matches visual order | ✅ OK |
| 1.3.3 | 2.1 | A | Sensory Characteristics — no reliance on shape/color/position alone | ⚠️ GAPS |
| 1.3.5 | 2.1 | AA | Identify Input Purpose — personal data fields expose `autocomplete` | ⚠️ GAPS (see SUB-11) |
| 1.4.1 | 2.1 | A | Use of Color — color is not the sole means of conveying information | ⚠️ GAPS |
| 1.4.3 | 2.1 | AA | Contrast (Minimum) — 4.5:1 for normal text, 3:1 for large text | ⚠️ AUDIT NEEDED |
| 1.4.4 | 2.1 | AA | Resize Text — 200% zoom, no loss of functionality | ⚠️ AUDIT NEEDED (Phase 4 Step 7) |
| 1.4.10 | 2.1 | AA | Reflow — content reflows at 320px width without horizontal scroll | ⚠️ AUDIT NEEDED (Phase 4 Step 7) |
| 1.4.11 | 2.1 | AA | Non-text Contrast — UI components 3:1 vs adjacent | ⚠️ AUDIT NEEDED |
| 1.4.12 | 2.1 | AA | Text Spacing — no loss of content with override spacing | ✅ OK |
| 1.4.13 | 2.1 | AA | Content on Hover/Focus — dismissable, hoverable, persistent | ✅ OK |

### Operable

| SC | Version | Level | Criterion | Status |
|----|---------|-------|-----------|--------|
| 2.1.1 | 2.1 | A | Keyboard — all functionality available by keyboard | ⚠️ GAPS |
| 2.1.2 | 2.1 | A | No Keyboard Trap — focus not locked (widget: handled ✅) | ✅ WIDGET OK |
| 2.4.1 | 2.1 | A | Bypass Blocks — skip navigation link | ❌ MISSING |
| 2.4.2 | 2.1 | A | Page Titled — `<title>` set | ✅ OK |
| 2.4.3 | 2.1 | A | Focus Order — logical sequential focus order | ⚠️ GAPS |
| 2.4.4 | 2.1 | A | Link Purpose — link text describes destination | ⚠️ GAPS |
| 2.4.6 | 2.1 | AA | Headings and Labels — descriptive headings | ⚠️ GAPS |
| 2.4.7 | 2.1 | AA | Focus Visible — keyboard focus indicator visible | ⚠️ AUDIT NEEDED |
| 2.4.11 | **2.2** | AA | Focus Appearance — focus indicator meets size/contrast _(WCAG 2.2 bonus)_ | ⚠️ AUDIT NEEDED |
| 2.5.3 | 2.1 | A | Label in Name — accessible name matches visible label | ✅ OK |
| 2.5.8 | **2.2** | AA | Target Size — min 24×24px for interactive elements _(WCAG 2.2 bonus)_ | ⚠️ AUDIT NEEDED |

### Understandable

| SC | Version | Level | Criterion | Status |
|----|---------|-------|-----------|--------|
| 3.1.1 | 2.1 | A | Language of Page — `lang` attribute | ✅ OK (`lang="en"`) |
| 3.2.1 | 2.1 | A | On Focus — no context change on focus | ✅ OK |
| 3.2.2 | 2.1 | A | On Input — no unexpected context change on input | ✅ OK |
| 3.3.1 | 2.1 | A | Error Identification — errors described in text | ⚠️ GAPS |
| 3.3.2 | 2.1 | A | Labels or Instructions — form fields labeled | ✅ OK (React form) — gaps in admin panels only; see DTL-02, DTL-03, DTL-04 |
| 3.3.3 | 2.1 | AA | Error Suggestion — describe how to correct input errors | ⚠️ AUDIT NEEDED (see note below) |

> **SC 3.3.3 note:** Current forms rely on browser-native HTML5 validation popups (required, email format) which vary by browser and give no guided correction hints. Custom inline validation messages with specific suggestions (e.g., "Email must include @") are LOW priority — captured as SUB-12 in Phase 5 backlog.

### Robust

| SC | Version | Level | Criterion | Status |
|----|---------|-------|-----------|--------|
| 4.1.1 | 2.1 | A | Parsing — valid markup | ✅ OK |
| 4.1.2 | 2.1 | A | Name, Role, Value — custom UI components fully exposed | ⚠️ GAPS |
| 4.1.3 | 2.1 | AA | Status Messages — status changes announced | ⚠️ GAPS |

---

## 2. Issue Inventory by Page

### 2.1 Cross-Page Issues (affects all pages)

| ID | SC | Severity | Issue | Fix |
|----|----|----------|-------|-----|
| CX-01 | 2.4.1 | HIGH | No skip navigation link on any page — keyboard users must tab through full sidebar on every admin page | Create `<SkipNav>` component, insert before `<body>` content, link to `id="main-content"` |
| CX-02 | 1.1.1 | MEDIUM | Lucide React icon components rendered without `aria-hidden` in multiple places (sidebar icons, DangerZoneCard Trash2) | Add `aria-hidden="true"` to all decorative icons |
| CX-03 | 2.4.6 | HIGH | `<CardTitle>` in shadcn/ui renders as `<div>`, not `<h*>` — pages have no `<h1>` landmark in DOM | Use `<CardTitle asChild><h1>` or add explicit `<h1>` before Card |
| CX-04 | 2.4.7 | MEDIUM | Focus ring styles need audit across Tailwind CSS v4 — ensure `:focus-visible` outlines meet 2px+ / 3:1 contrast | Audit all interactive elements in `globals.css` |

---

### 2.2 `/submit` — FeedbackForm + FeedbackTypeSelector

| ID | SC | Severity | Issue | File | Fix |
|----|----|----------|-------|------|-----|
| SUB-01 | 2.4.6 | HIGH | No `<h1>` in DOM — `CardTitle` "Submit Feedback" is a `<div>` | `FeedbackForm.tsx` | Change `<CardTitle>` to render as `<h1>` via `asChild` prop |
| SUB-02 | 4.1.2 | HIGH | `FeedbackTypeSelector` buttons do not have `aria-pressed` — selected state conveyed only by CSS border color | `FeedbackTypeSelector.tsx` | Add `aria-pressed={value === type.value}` to each button |
| SUB-03 | 1.1.1 | MEDIUM | Emojis 🐛 ✨ 💬 in type selector buttons exposed to screen readers as raw emoji descriptions ("caterpillar", "sparkles") | `FeedbackTypeSelector.tsx` | Wrap emoji `<span>` with `aria-hidden="true"` |
| SUB-04 | 1.1.1 | MEDIUM | "← Back" button uses raw Unicode arrow `←` — screen readers announce "left arrow back" or similar | `FeedbackForm.tsx` | Replace with `<span aria-hidden="true">←</span><span className="sr-only">Back to type selection</span>` |
| SUB-05 | 4.1.3 | HIGH | Step transitions (type → details → success) not announced to screen readers | `FeedbackForm.tsx` | Add `<div aria-live="polite" aria-atomic="true" className="sr-only">` that announces step name on change |
| SUB-06 | 1.3.1 | LOW | Character counter `{description.length}/5000` is not programmatically associated with textarea | `FeedbackForm.tsx` | Add `id="desc-counter"` to counter `<p>`, set `aria-describedby="desc-counter"` on `<Textarea>` |
| SUB-07 | 4.1.3 | MEDIUM | During `isSubmitting`, submit button is `disabled` but form has no `aria-busy` — pending state not communicated | `FeedbackForm.tsx` | Add `aria-busy={isSubmitting}` to `<form>` element |
| SUB-08 | 2.4.3 | HIGH | Success screen rendered without moving focus — screen reader user misses confirmation | `FeedbackForm.tsx` | Create `successRef = useRef<HTMLDivElement>(); useEffect(() => { if (step === 'success') successRef.current?.focus() }, [step])` and add `tabIndex={-1}` to success Card |
| SUB-09 | 4.1.3 | MEDIUM | Success step renders emoji `✅` without `aria-hidden` | `FeedbackForm.tsx` | Add `aria-hidden="true"` to success emoji `<div>` |
| SUB-10 | 1.3.1 | HIGH | `FeedbackTypeSelector` wrapper `<div>` has no group label — SR user hears "Bug Report, button" with no context that they're choosing a feedback category | `FeedbackTypeSelector.tsx` | Add `<p id="feedback-type-label" className="sr-only">Select feedback type</p>` before the grid; wrap grid in `<div role="group" aria-labelledby="feedback-type-label">` |
| SUB-11 | 1.3.5 | MEDIUM | `<Input type="email">` has no `autoComplete="email"`; nickname input has no `autoComplete="nickname"` — users with cognitive disabilities lose browser autofill support | `FeedbackForm.tsx` | Add `autoComplete="email"` to email `<Input>` and `autoComplete="nickname"` to nickname `<Input>` |

---

### 2.3 `/track` — TrackingView

| ID | SC | Severity | Issue | File | Fix |
|----|----|----------|-------|------|-----|
| TRK-01 | 1.3.1 | HIGH | Search `<Input>` has `placeholder` but no `<Label>` or `aria-label` — no programmatic label | `TrackingView.tsx` | Add `<Label htmlFor="tracking-id-input">Tracking ID</Label>` and `id="tracking-id-input"` on Input |
| TRK-02 | 1.4.1 | MEDIUM | Status badge uses color alone to convey status (blue=OPEN, yellow=IN_PROGRESS, etc.) | `TrackingView.tsx` | Status badge already renders text label — verify it includes visible text (it does: `data.status.replace("_", " ")`). Add `aria-label={`Status: ${data.status.replace("_", " ")}`}` to badge `<span>` |
| TRK-03 | 4.1.3 | HIGH | Search results area has no `aria-live` region — screen reader not notified when results appear or "not found" message shown | `TrackingView.tsx` | Wrap results region in `<div aria-live="polite" aria-atomic="false">` |
| TRK-04 | 1.1.1 | LOW | Timeline bullet dots are decorative `<div>` elements without `aria-hidden` | `TrackingView.tsx` | The `<div>` dot elements need `aria-hidden="true"` |
| TRK-05 | 4.1.2 | MEDIUM | "Not found" message and error toast both fire on 404 — duplicate communication; only toast announced by SR | `TrackingView.tsx` | Keep visible "not found" text inside `aria-live` region; remove toast for 404 case (toast is read by SR already; duplicate is confusing) |
| TRK-06 | 1.3.1 | LOW | `<ol>` "Status History" section has no accessible heading label linking the ordered list to its purpose | `TrackingView.tsx` | Associate "Status History" `<p>` heading with `<ol>` via `aria-labelledby` |
| TRK-07 | 1.1.1 | MEDIUM | `TYPE_LABELS` map values include emoji inline (`"🐛 Bug"`, `"✨ Feature"`, `"💬 General"`) — SR announces "caterpillar Bug", "sparkles Feature" | `TrackingView.tsx` | Split into separate `TYPE_EMOJI` and `TYPE_TEXT` maps; render `<span aria-hidden="true">{emoji}</span><span>{label}</span>` for each type display |

---

### 2.4 `/admin/login` — LoginForm

| ID | SC | Severity | Issue | File | Fix |
|----|----|----------|-------|------|-----|
| LGN-01 | 2.4.6 | MEDIUM | No `<h1>` — CardTitle "Admin Login" renders as `<div>` | `LoginForm.tsx` | Use `<CardTitle asChild><h1>Admin Login</h1></CardTitle>` |
| LGN-02 | 2.4.3 | LOW | Login error alert (`LoginErrorAlert`) is `role="alert"` ✅ — announced. Focus remains on submit button. Consider moving focus to error after failed submission. | `LoginForm.tsx` | After `setError(...)`, call `errorRef.current?.focus()` with `tabIndex={-1}` on alert div |

---

### 2.5 Admin Shell — `AdminLayout` + `AdminSidebar` + `AdminHeader`

| ID | SC | Severity | Issue | File | Fix |
|----|----|----------|-------|------|-----|
| ADM-01 | 2.4.1 | HIGH | No skip navigation link — keyboard users traverse full 56-wide sidebar on every page load | `src/app/layout.tsx` + `AdminLayout` | Add `<SkipNav href="#main-content">` at top; add `id="main-content"` to admin `<main>` |
| ADM-02 | 4.1.2 | HIGH | Active nav item in `AdminSidebar` communicates current page only via CSS (`bg-primary`) — no `aria-current` | `AdminSidebar.tsx` | Add `aria-current={pathname === href ? 'page' : undefined}` to each `<Link>` |
| ADM-03 | 1.3.1 | MEDIUM | `<nav>` in `AdminSidebar` has no `aria-label` — when page has multiple nav landmarks, they must be distinguishable | `AdminSidebar.tsx` | Add `aria-label="Main navigation"` to `<nav>` |
| ADM-04 | 1.1.1 | MEDIUM | Lucide icons in nav (`LayoutDashboard`, `Ticket`, `LogOut`) have no `aria-hidden` — read by screen readers alongside link text | `AdminSidebar.tsx` | Add `aria-hidden="true"` to each `<Icon>` component |
| ADM-05 | 2.4.6 | MEDIUM | Admin dashboard page has no `<h1>` — visual page identity is only in stats cards | `dashboard/page.tsx` | Add `<h1 className="sr-only">Dashboard</h1>` or visible heading before stats |
| ADM-06 | 1.3.1 | LOW | `<main>` in admin layout has no landmark label differentiating it from other landmark regions | `(admin)/layout.tsx` | Add `id="main-content"` and optionally `aria-label="Main content"` |
| ADM-07 | 1.1.1 | LOW | `AdminHeader` avatar `<div>` renders a single letter initial (e.g. "A") with no context — decorative representation of the logged-in user; potentially confusing as standalone text node | `AdminHeader.tsx` | Add `aria-hidden="true"` to the avatar initial `<div>`; the surrounding username/email text already provides context |
| ADM-08 | 1.3.1 | LOW | `<aside>` complementary landmark in `AdminSidebar` has no `aria-label` — best practice per ARIA Landmarks specification | `AdminSidebar.tsx` | Add `aria-label="Sidebar"` to `<aside>` element |

---

### 2.6 `/admin/tickets` — TicketTable + TicketFiltersBar

| ID | SC | Severity | Issue | File | Fix |
|----|----|----------|-------|------|-----|
| TBL-01 | 1.3.1 | HIGH | `<table>` has no `<caption>` or `aria-label` — screen readers announce it as "table" with no context | `TicketTable.tsx` | Add `<caption className="sr-only">Ticket list</caption>` inside `<table>` |
| TBL-02 | 1.3.1 | HIGH | All `<th>` elements missing `scope="col"` — column/row association unclear to AT | `TicketTable.tsx` | Add `scope="col"` to all `<th>` elements |
| TBL-03 | 1.3.1 | MEDIUM | Last `<th />` (actions column) is empty — screen reader announces empty header | `TicketTable.tsx` | Add `scope="col"` and `<span className="sr-only">Actions</span>` |
| TBL-04 | 4.1.3 | MEDIUM | `isLoading` state only applies `opacity-50` visually — no `aria-busy` on table | `TicketTable.tsx` | Add `aria-busy={isLoading}` to `<table>` element |
| TBL-05 | 1.3.1 | HIGH | All `<select>` filters in `TicketFiltersBar` have no `<label>` or `aria-label` — unlabeled form controls | `TicketFiltersBar.tsx` | Add `aria-label="Filter by status"`, `aria-label="Filter by type"`, `aria-label="Sort order"` to each `<select>` |
| TBL-06 | 2.4.6 | MEDIUM | Tickets list page has no `<h1>` page heading | `tickets/page.tsx` | Add `<h1>Tickets</h1>` heading at top of page content |
| TBL-07 | 4.1.3 | LOW | When filters are applied and results update, no live region announces new result count to SR | `TicketListPageContent.tsx` | Add `<div aria-live="polite" className="sr-only">` announcing `{total} tickets found` on filter change |
| TBL-08 | 1.3.1 | LOW | `TicketFiltersBar` root `<div>` has no landmark or group role — unlabeled filter controls not discoverable by landmark navigation | `TicketFiltersBar.tsx` | Wrap in `<div role="search" aria-label="Filter tickets">` — `role="search"` is semantically appropriate for filter/query controls (ARIA 1.1) |

---

### 2.7 `/admin/tickets/[id]` — TicketDetailView + Sub-panels

| ID | SC | Severity | Issue | File | Fix |
|----|----|----------|-------|------|-----|
| DTL-01 | 1.1.1 | MEDIUM | "← Back to tickets" link uses raw Unicode arrow — read as "left arrow back to tickets" | `TicketDetailView.tsx` | `<span aria-hidden="true">←</span><span className="sr-only">Back to </span>tickets` or use visually-hidden arrow description |
| DTL-02 | 1.3.1 | HIGH | `<select>` in `StatusUpdatePanel` not associated with label — `<h3>Status</h3>` is visual but not programmatically linked | `StatusUpdatePanel.tsx` | Add `id="status-heading"` to `<h3>` and `aria-labelledby="status-heading"` to `<select>` |
| DTL-03 | 1.3.1 | HIGH | `<textarea>` for status note in `StatusUpdatePanel` has only `placeholder` — no `<label>` | `StatusUpdatePanel.tsx` | Add `<label htmlFor="status-note" className="sr-only">Status update note</label>` and `id="status-note"` to textarea |
| DTL-04 | 1.3.1 | HIGH | `<select>` in `PriorityUpdatePanel` has no associated label | `PriorityUpdatePanel.tsx` | Same pattern as DTL-02 — link `<h3>` to `<select>` via `aria-labelledby` |
| DTL-05 | 1.1.1 | LOW | `<Trash2>` icon in `DangerZoneCard` delete button is decorative but not `aria-hidden` | `DangerZoneCard.tsx` | Add `aria-hidden="true"` to `<Trash2>` icon |
| DTL-06 | 2.4.6 | LOW | `DangerZoneCard` delete button would benefit from `aria-describedby` pointing to warning text | `DangerZoneCard.tsx` | Add `id="danger-desc"` to warning `<p>` and `aria-describedby="danger-desc"` to delete button |
| DTL-07 | 4.1.3 | MEDIUM | After status update success, `toast.success('Status updated')` fires — toast IS announced by SR via sonner's live region ✅. No duplicate fix needed. | — | No action needed |
| DTL-08 | 4.1.2 | LOW | `window.confirm()` delete dialog — native browser confirm IS accessible on modern browsers but bypasses custom focus management. WCAG does not prohibit it, but a custom accessible modal would be preferred. | `DangerZoneCard.tsx` | Low priority: replace `confirm()` with accessible `AlertDialog` from shadcn/ui in Phase 5 |

---

### 2.8 Embeddable Widget (Shadow DOM)

The widget has strong existing accessibility foundations. Remaining gaps are minor:

| ID | SC | Severity | Issue | File | Fix |
|----|----|----------|-------|------|-----|
| WGT-01 | 1.1.1 | MEDIUM | Back button in form step renders "← Back" with raw arrow char — SR reads "left arrow Back" | `widget/ui/steps/form.ts` | Change `backBtn.textContent = '← Back'` to: set `aria-label="Go back to type selection"` on button; use visible arrow text with `aria-hidden` wrapper |
| WGT-02 | 4.1.3 | MEDIUM | Submit button during `submitting` step has no `aria-busy` — only text changes from "Submit" to "Submitting…" | `widget/ui/steps/form.ts` | In `updateFormState()`, add `submitBtn.setAttribute('aria-busy', state.step === 'submitting' ? 'true' : 'false')` |
| WGT-03 | 4.1.3 | MEDIUM | Type badge in form header includes emoji inline: `'🐛 Bug Report'` — SR reads emoji description | `widget/ui/steps/form.ts` | Use a text-only map for the badge: `const TYPE_TEXT = { BUG: 'Bug Report', FEATURE: 'Feature Request', GENERAL: 'General' }` and set `typeBadge.textContent` from text-only map; add a separate `aria-hidden="true"` emoji span for visual decoration |
| WGT-04 | 2.4.3 | MEDIUM | On success step render, `trapFocus(el)` moves focus to first focusable element (copy button) — SR user hears "Copy" without hearing success message | **Two files:** `widget/ui/steps/success.ts` + `widget/ui/popup.ts` | **Step 1 (`success.ts`):** Add `title.setAttribute('tabindex', '-1')` to the `<h3>` element so it is programmatically focusable. **Step 2 (`popup.ts`):** In the `case 'success':` branch (after `content.appendChild(renderSuccess(...))`), add `requestAnimationFrame(() => content.querySelector<HTMLElement>('.wfb-success-title')?.focus())` _before_ calling `trapFocus(el)`. This sequences focus: h3 receives focus first, SR announces success, then trap is set. |
| WGT-05 | 2.5.3 | LOW | Popup `aria-label="Submit Feedback"` does not match visible title "Send Feedback" — ARIA name diverges from visible label | `widget/ui/popup.ts` | **Preferred fix:** assign `title.id = 'wfb-popup-title'` to the existing title `<span>`, then replace `el.setAttribute('aria-label', ...)` with `el.setAttribute('aria-labelledby', 'wfb-popup-title')`. This keeps accessible name in sync if visible text ever changes, avoiding label drift. |
| WGT-06 | 1.4.3 | MEDIUM | Custom accent color (from `data-button-color`) may not meet 4.5:1 contrast against button text — depends on user config | `widget/styles.ts` | Document that deployers must ensure button color meets contrast. Add a contrast-checking validation in `config.ts` that warns (console.warn) if estimated contrast with white text is below 4.5:1 |

---

### 2.9 `/admin/tickets` — TicketPagination

`TicketPagination` is conditionally rendered (`total > limit`) and therefore invisible to axe sweeps in standard test scenarios. Issues must be explicitly enumerated.

| ID | SC | Severity | Issue | File | Fix |
|----|----|----------|-------|------|-----|
| PAG-01 | 1.3.1 | HIGH | Pagination container is a plain `<div>` with no `role="navigation"` or `<nav>` landmark — AT users navigating by landmark skip it entirely | `TicketPagination.tsx` | Wrap the pagination controls in `<nav aria-label="Pagination">` |
| PAG-02 | 2.4.4 | HIGH | "Previous" and "Next" buttons have generic text — SR announces "Previous, button" with no page context; user doesn't know current position | `TicketPagination.tsx` | Add `aria-label="Go to previous page"` and `aria-label={`Go to page ${currentPage + 1}`}` (or equivalent) to navigation buttons; display current page as `<span aria-current="page">` or `aria-label="Page {n}, current"` |
| PAG-03 | 4.1.2 | HIGH | No `aria-current` or `aria-disabled` pattern — when on page 1, Previous button may be visually disabled but SR cannot detect it | `TicketPagination.tsx` | Add `aria-disabled="true"` (not `disabled`) to Previous on page 1 and Next on last page, so AT announces the state without removing the element from tab order |

---

### 2.10 Admin Dashboard — RecentTicketsTable

`RecentTicketsTable` is in scope and has its own heading/link accessibility concerns beyond the generic CX-03 fix.

| ID | SC | Severity | Issue | File | Fix |
|----|----|----------|-------|------|-----|
| RST-01 | 2.4.6 | MEDIUM | `CardTitle` in `RecentTicketsTable` renders as `<div>` — once `<h1>Dashboard</h1>` is added (ADM-05), the card needs `<h2>` for proper heading hierarchy | `RecentTicketsTable.tsx` | Use `<CardTitle asChild><h2>Recent Tickets</h2></CardTitle>` |
| RST-02 | 2.4.4 | MEDIUM | Each row `<Link>` in `RecentTicketsTable` contains badge text (`TicketTypeBadge`, `TicketStatusBadge`) inlined into the link — SR announces "BUG Bug Report title OPEN" which is verbose and confusing | `RecentTicketsTable.tsx` | Add `aria-label={`View ticket: ${ticket.title}`}` to each row `<Link>`; add `aria-hidden="true"` to badge elements inside the link so SR reads only the clean label |

---

## 3. Color Contrast Audit Checklist

All values must be tested with browser dev tools / axe / Colour Contrast Analyser:

| Target | Foreground | Background | Required Ratio | Check |
|--------|-----------|------------|----------------|-------|
| Body text | `--foreground` | `--background` | 4.5:1 | Manual |
| Muted text | `text-muted-foreground` | `--background` | 4.5:1 | Manual |
| Button (primary) | `--primary-foreground` | `--primary` | 4.5:1 | Manual |
| Status badge OPEN | blue-800 | blue-100 | 4.5:1 | Manual |
| Status badge IN_PROGRESS | yellow-800 | yellow-100 | 4.5:1 | Manual |
| Status badge RESOLVED | green-800 | green-100 | 4.5:1 | Manual |
| Status badge CLOSED | gray-800 | gray-100 | 4.5:1 | Manual |
| Dark mode muted | blue-200 | blue-900 | 4.5:1 | Manual |
| Widget accent button | white | `--wfb-accent` | 4.5:1 | Manual + warn |
| Focus ring | focus outline | adjacent bg | 3:1 | Manual |
| Error text | `text-destructive` | `--background` | 4.5:1 | Manual |

---

## 4. Keyboard Navigation Checklist

Saved to: `docs/a11y/KEYBOARD_NAV_CHECKLIST.md`

### Per-page manual test script:

**Global (all pages):**
- [ ] Skip navigation link appears on first `Tab` press
- [ ] Skip link navigates focus to `#main-content`
- [ ] All interactive elements reachable by `Tab` / `Shift+Tab`
- [ ] No focus traps outside dialogs
- [ ] `Escape` key closes any open dialog/modal

**`/submit`:**
- [ ] `Tab` lands on type selector buttons
- [ ] `Space` / `Enter` on type button selects it and advances step
- [ ] Selected type button shows `aria-pressed="true"`
- [ ] Back button returns to type step
- [ ] All form fields reachable and operable
- [ ] Submit button operable by `Enter` or `Space`
- [ ] After submission, focus moves to success message
- [ ] "Track Status" and "Submit Another" buttons operable by keyboard

**`/track`:**
- [ ] `Tab` reaches tracking ID input
- [ ] Input has visible label
- [ ] Submit by `Enter` key
- [ ] Results announced in live region
- [ ] Status history list navigable

**`/admin/login`:**
- [ ] Skip nav link present
- [ ] Email → Password → Submit button via `Tab`
- [ ] Error message announced via `role="alert"` on failed login
- [ ] `Enter` on Submit button submits form

**`/admin/dashboard`:**
- [ ] Skip nav goes to `#main-content`
- [ ] Sidebar nav reachable (after skip nav used, user should NOT need to re-traverse sidebar)
- [ ] `aria-current="page"` on active Dashboard nav item

**`/admin/tickets`:**
- [ ] Skip nav skips sidebar
- [ ] Filter dropdowns operable by keyboard (native `<select>`)
- [ ] Filter `<select>` labels read aloud by SR
- [ ] Table cells navigable
- [ ] Sort option operable
- [ ] Pagination buttons operable
- [ ] Row links operable by `Enter`

**`/admin/tickets/[id]`:**
- [ ] Back link operable
- [ ] Status `<select>` readable with label
- [ ] Note textarea readable with label
- [ ] Update Status button operable
- [ ] Priority `<select>` readable with label
- [ ] Delete button operable; confirm dialog can be dismissed with keyboard
- [ ] Status history timeline readable

**Widget:**
- [ ] Trigger button announces `aria-haspopup="dialog"` and `aria-expanded`
- [ ] `Tab` reaches trigger button
- [ ] `Enter` / `Space` opens widget dialog
- [ ] Focus moves into dialog
- [ ] Focus trapped inside dialog
- [ ] `Tab` / `Shift+Tab` cycles inside dialog
- [ ] Type cards operable by `Enter` / `Space`
- [ ] Selected type reflects `aria-pressed="true"`
- [ ] Form inputs reachable
- [ ] `Escape` closes dialog; focus returns to trigger
- [ ] Submit button operable; `aria-busy` during submission
- [ ] Success screen: focus lands on success title, not copy button
- [ ] Close button returns focus to trigger

---

## 5. Testing Approach

### 5.1 Automated Testing (jest-axe / axe-core with Vitest)

> **⚠️ CRITICAL — Vitest DOM environment (C-01):** The project's `vitest.config.ts` sets `environment: 'node'`. All React a11y tests use `@testing-library/react` which requires browser DOM globals (`document`, `window`, `HTMLElement`). Without the correct environment, every `.a11y.test.tsx` file crashes with `ReferenceError: document is not defined`.
>
> **Fix:** Add `// @vitest-environment jsdom` as the **first line** of every `.a11y.test.tsx` file. This overrides the project-level `node` environment for that file only, leaving all existing API/server tests unaffected. The existing API integration tests correctly stay in `node` — do not change `vitest.config.ts` globally.

**Setup — new devDependencies:**

```json
{
  "devDependencies": {
    "jsdom": "^25.0.0",
    "jest-axe": "^9.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0"
  }
}
```

> `jsdom` is not bundled with Vitest and must be installed explicitly. `jest-axe` is compatible with Vitest's `expect` API via `configureAxe` + `toHaveNoViolations` matcher.

**Vitest setup file** (`vitest.setup.ts` or `src/__tests__/setup.ts`):
```ts
import { expect } from 'vitest';
import { toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);
```

**Rules configuration** (WCAG 2.1 AA + selected 2.2 bonus criteria):
```ts
const axeConfig = {
  rules: {
    'color-contrast': { enabled: true },
    'landmark-one-main': { enabled: true },
    'page-has-heading-one': { enabled: true },
    'region': { enabled: true },
    'aria-required-attr': { enabled: true },
    'label': { enabled: true },
    'table-scope': { enabled: true },
    'autocomplete-valid': { enabled: true },   // SC 1.3.5
  },
  runOnly: {
    type: 'tag',
    // wcag22aa included to catch SC 2.4.11 and SC 2.5.8 (bonus criteria)
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
  },
};
```

### 5.2 Test Files to Create

> **Required first line** for every `.a11y.test.tsx` file (C-01 fix):
> ```ts
> // @vitest-environment jsdom
> ```
> This overrides the project-level `environment: 'node'` for React component tests only.

---

**`src/__tests__/a11y/submit-page.a11y.test.tsx`**
```ts
// @vitest-environment jsdom
```
- **Mock setup required:** `vi.mock('next/navigation', () => ({ useRouter: vi.fn(() => ({ push: vi.fn() })) }))`
- Render `FeedbackForm` in `@testing-library/react`
- Run `axe(container, axeConfig)` and expect no violations
- Test: type card `aria-pressed` changes on click
- Test: type selector group has `role="group"` with accessible label (SUB-10)
- Test: focus moves to success card after form submission (SUB-08)
- Test: `aria-live` region announces step change (SUB-05)
- Test: email input has `autoComplete="email"` (SUB-11)

**`src/__tests__/a11y/track-page.a11y.test.tsx`**
```ts
// @vitest-environment jsdom
```
- **No mocks required** (`TrackingView` has no Next.js hooks — uses native `fetch`)
- Mock `fetch` with `vi.stubGlobal('fetch', vi.fn())`
- Render `TrackingView`
- Run `axe(container, axeConfig)` and expect no violations
- Test: search input has accessible label (`htmlFor` / `aria-label`)
- Test: `aria-live` region present in DOM
- Test: emoji in type labels split into `aria-hidden` span + text span (TRK-07)
- Test: "not found" text rendered inside live region on 404 response

**`src/__tests__/a11y/login-page.a11y.test.tsx`**
```ts
// @vitest-environment jsdom
```
- **Mock setup required:**
  ```ts
  vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));
  vi.mock('next/navigation', () => ({ useRouter: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn() })) }));
  ```
- Render `LoginForm`
- Run `axe(container, axeConfig)` and expect no violations
- Test: `<h1>` element present in DOM (LGN-01)
- Test: error alert has `role="alert"` when rendered (LoginErrorAlert)

**`src/__tests__/a11y/admin-sidebar.a11y.test.tsx`**
```ts
// @vitest-environment jsdom
```
- **Mock setup required:**
  ```ts
  vi.mock('next/navigation', () => ({ usePathname: vi.fn().mockReturnValue('/admin/dashboard') }));
  vi.mock('next-auth/react', () => ({ signOut: vi.fn() }));
  ```
- Render `AdminSidebar` with `user={{ username: 'admin', role: 'ADMIN' }}`
- Run `axe(container, axeConfig)` and expect no violations
- Test: `aria-current="page"` on Dashboard link when `pathname === '/admin/dashboard'` (ADM-02)
- Test: `<nav>` has `aria-label="Main navigation"` (ADM-03)
- Test: all Lucide icon elements have `aria-hidden="true"` (ADM-04)
- Test: `<aside>` has `aria-label="Sidebar"` (ADM-08)

**`src/__tests__/a11y/admin-tickets.a11y.test.tsx`**
```ts
// @vitest-environment jsdom
```
- **No Next.js mocks required** (server components; render only the table component)
- Render `TicketTable` with sample `TicketListItem[]` fixture
- Run `axe(container, axeConfig)` — expects no violations
- Test: `<caption>` present inside `<table>` (TBL-01)
- Test: all `<th>` have `scope="col"` attribute (TBL-02)
- Test: last `<th>` has visible sr-only text "Actions" (TBL-03)
- Test: `aria-busy="true"` on `<table>` when `isLoading={true}` (TBL-04)
- Render `TicketPagination` with `currentPage=2, totalPages=5` fixture
- Test: wrapping `<nav>` has `aria-label="Pagination"` (PAG-01)
- Test: Previous button has `aria-label` containing "previous" (PAG-02)
- Test: Previous button has `aria-disabled="true"` when `currentPage=1` (PAG-03)

**`src/__tests__/a11y/ticket-filters.a11y.test.tsx`**
```ts
// @vitest-environment jsdom
```
- **No mocks required**
- Render `TicketFiltersBar` with default filters
- Run `axe(container, axeConfig)` — expects no violations
- Test: each `<select>` has `aria-label` (TBL-05)
- Test: root `<div>` has `role="search"` and `aria-label="Filter tickets"` (TBL-08)

**`src/__tests__/a11y/ticket-detail.a11y.test.tsx`**
```ts
// @vitest-environment jsdom
```
- **Mock setup required:**
  ```ts
  vi.mock('next/navigation', () => ({ useRouter: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn() })) }));
  ```
- Render `StatusUpdatePanel` and `PriorityUpdatePanel` with a mock `FeedbackDetail` ticket
- Run `axe(container, axeConfig)` — expects no violations
- Test: status `<select>` has `aria-labelledby` pointing to "Status" heading (DTL-02)
- Test: note `<textarea>` has explicit label element (DTL-03)
- Test: priority `<select>` has `aria-labelledby` pointing to "Priority" heading (DTL-04)
- Test: Trash2 icon inside delete button has `aria-hidden="true"` (DTL-05)

**`src/__tests__/a11y/widget-a11y.test.ts`**
- (No `// @vitest-environment jsdom` required — widget uses raw DOM, `jsdom` provided by existing `widget-ui.test.ts` setup or `// @vitest-environment jsdom` added for consistency)
- Unit tests complementing `widget-ui.test.ts`
- Test: back button `aria-label="Go back to type selection"` (WGT-01)
- Test: `updateFormState()` sets `aria-busy="true"` on submit button during `submitting` step (WGT-02)
- Test: type badge in form header renders emoji in separate `aria-hidden` span (WGT-03)
- Test: `<h3>` success title has `tabindex="-1"` (WGT-04 / success.ts)
- Test: popup `aria-labelledby` points to `wfb-popup-title` element (WGT-05)

### 5.3 Manual Test Protocol

Tools required:
- **axe DevTools** browser extension (automated sweep)
- **Colour Contrast Analyser** (contrast audit)
- **NVDA** (Windows) or **VoiceOver** (macOS) screen reader
- **Keyboard-only navigation** (unplug mouse)

Steps:
1. Run `pnpm test src/__tests__/a11y/` — all new a11y tests must pass
2. Run axe DevTools on each route and resolve all WCAG 2.1 AA violations
3. Manual keyboard navigation per checklist in `docs/a11y/KEYBOARD_NAV_CHECKLIST.md`
4. Screen reader walkthrough of each page
5. Color contrast audit on status badges and custom widget accent

---

## 6. Component Tree

```
src/app/
├── layout.tsx                          MODIFY — add <SkipNav>
├── (public)/
│   ├── submit/
│   │   └── page.tsx                    MODIFY — add id="main-content"
│   └── track/
│       └── page.tsx                    MODIFY — add id="main-content"
├── (admin)/
│   ├── layout.tsx                      MODIFY — add id="main-content" to <main>
│   ├── dashboard/
│   │   └── page.tsx                    MODIFY — add <h1>
│   └── tickets/
│       ├── page.tsx                    MODIFY — add <h1>
│       └── [id]/
│           └── page.tsx                no change
└── admin/
    └── login/
        └── page.tsx                    MODIFY — add id="main-content"

src/components/
├── layout/
│   └── SkipNav.tsx                     CREATE
├── feedback/
│   ├── FeedbackForm.tsx                MODIFY (SUB-01 through SUB-09, SUB-11)
│   ├── FeedbackTypeSelector.tsx        MODIFY (SUB-02, SUB-03, SUB-10)
│   └── TrackingView.tsx                MODIFY (TRK-01 through TRK-07)
├── admin/
│   ├── AdminSidebar.tsx                MODIFY (ADM-02, ADM-03, ADM-04, ADM-08)
│   ├── AdminHeader.tsx                 MODIFY (ADM-07)
│   ├── TicketTable.tsx                 MODIFY (TBL-01 through TBL-04)
│   ├── TicketPagination.tsx            MODIFY (PAG-01, PAG-02, PAG-03)
│   ├── TicketFiltersBar.tsx            MODIFY (TBL-05, TBL-08)
│   ├── TicketListPageContent.tsx       MODIFY (TBL-07)
│   ├── RecentTicketsTable.tsx          MODIFY (RST-01, RST-02)
│   ├── StatusUpdatePanel.tsx           MODIFY (DTL-02, DTL-03)
│   ├── PriorityUpdatePanel.tsx         MODIFY (DTL-04)
│   └── DangerZoneCard.tsx              MODIFY (DTL-05, DTL-06)
└── auth/
    └── LoginForm.tsx                   MODIFY (LGN-01, LGN-02)

src/widget/ui/
├── steps/
│   ├── form.ts                         MODIFY (WGT-01, WGT-02, WGT-03)
│   └── success.ts                      MODIFY (WGT-04 step 1: tabindex on title)
├── popup.ts                            MODIFY (WGT-04 step 2: focus call + WGT-05: aria-labelledby)
└── button.ts                           ✅ already compliant

src/lib/a11y/
└── focus-utils.ts                      CREATE — shared React focus helpers

src/__tests__/a11y/
├── submit-page.a11y.test.tsx           CREATE
├── track-page.a11y.test.tsx            CREATE
├── login-page.a11y.test.tsx            CREATE
├── admin-sidebar.a11y.test.tsx         CREATE
├── admin-tickets.a11y.test.tsx         CREATE
├── ticket-filters.a11y.test.tsx        CREATE
├── ticket-detail.a11y.test.tsx         CREATE
└── widget-a11y.test.ts                 CREATE

docs/a11y/
└── KEYBOARD_NAV_CHECKLIST.md           CREATE
```

---

## 7. File List Summary

### CREATE (new files)

| File | Purpose |
|------|---------|
| `src/components/layout/SkipNav.tsx` | Skip to main content link (SC 2.4.1) |
| `src/lib/a11y/focus-utils.ts` | `useFocusOnMount(ref, condition)` hook; `announceToSR(message)` utility |
| `src/__tests__/a11y/submit-page.a11y.test.tsx` | axe + focused a11y assertions for submit page |
| `src/__tests__/a11y/track-page.a11y.test.tsx` | axe + focused a11y assertions for track page |
| `src/__tests__/a11y/login-page.a11y.test.tsx` | axe + focused a11y assertions for login page |
| `src/__tests__/a11y/admin-sidebar.a11y.test.tsx` | axe + aria-current + nav label tests |
| `src/__tests__/a11y/admin-tickets.a11y.test.tsx` | axe + table scope + aria-busy tests |
| `src/__tests__/a11y/ticket-filters.a11y.test.tsx` | axe + select label tests |
| `src/__tests__/a11y/ticket-detail.a11y.test.tsx` | axe + panel label association tests |
| `src/__tests__/a11y/widget-a11y.test.ts` | Widget-specific a11y tests (back btn, aria-busy, focus) |
| `docs/a11y/KEYBOARD_NAV_CHECKLIST.md` | Manual keyboard navigation test protocol |

### MODIFY (existing files)

| File | Changes |
|------|---------|
| `src/app/layout.tsx` | Add `<SkipNav>` before `{children}` |
| `src/app/(public)/submit/page.tsx` | Add `id="main-content"` to `<main>` |
| `src/app/(public)/track/page.tsx` | Add `id="main-content"` to wrapper `<main>` |
| `src/app/(admin)/layout.tsx` | Add `id="main-content"` to `<main>` |
| `src/app/(admin)/dashboard/page.tsx` | Add `<h1>Dashboard</h1>` (visually-hidden or visible) |
| `src/app/(admin)/tickets/page.tsx` | Add `<h1>Tickets</h1>` |
| `src/app/admin/login/page.tsx` | `<main>` already present; add `id="main-content"` |
| `src/components/feedback/FeedbackForm.tsx` | SUB-01 through SUB-09, SUB-11 (autocomplete) |
| `src/components/feedback/FeedbackTypeSelector.tsx` | SUB-02, SUB-03, SUB-10 (group semantics) |
| `src/components/feedback/TrackingView.tsx` | TRK-01 through TRK-07 (includes emoji split) |
| `src/components/admin/AdminSidebar.tsx` | ADM-02, ADM-03, ADM-04, ADM-08 (aside label) |
| `src/components/admin/AdminHeader.tsx` | ADM-07 (avatar aria-hidden) |
| `src/components/admin/TicketTable.tsx` | TBL-01 through TBL-04 |
| `src/components/admin/TicketPagination.tsx` | PAG-01, PAG-02, PAG-03 |
| `src/components/admin/TicketFiltersBar.tsx` | TBL-05, TBL-08 (role="search") |
| `src/components/admin/TicketListPageContent.tsx` | TBL-07 |
| `src/components/admin/RecentTicketsTable.tsx` | RST-01, RST-02 |
| `src/components/admin/StatusUpdatePanel.tsx` | DTL-02, DTL-03 |
| `src/components/admin/PriorityUpdatePanel.tsx` | DTL-04 |
| `src/components/admin/DangerZoneCard.tsx` | DTL-05, DTL-06 |
| `src/components/auth/LoginForm.tsx` | LGN-01, LGN-02 |
| `src/widget/ui/steps/form.ts` | WGT-01, WGT-02, WGT-03 |
| `src/widget/ui/steps/success.ts` | WGT-04 step 1 (tabindex on h3 title) |
| `src/widget/ui/popup.ts` | WGT-04 step 2 (rAF focus call) + WGT-05 (aria-labelledby) |
| `package.json` | Add `jsdom`, `jest-axe`, `@testing-library/react`, `@testing-library/user-event` |
| `vitest.setup.ts` (or `src/__tests__/setup.ts`) | Extend `expect` with `toHaveNoViolations` |

---

## 8. Dependencies and Implementation Order

```
Step 1 — Infrastructure (no UI changes)
  ├── Install jest-axe + @testing-library/* devDeps
  ├── Configure vitest.setup.ts with toHaveNoViolations
  ├── Create src/lib/a11y/focus-utils.ts
  └── Create src/components/layout/SkipNav.tsx

Step 2 — Cross-cutting fixes (unblock all page tests)
  ├── src/app/layout.tsx            → add <SkipNav>
  ├── All page files                → add id="main-content"
  └── AdminSidebar.tsx              → aria-current, aria-label, icon aria-hidden

Step 3 — Public pages
  ├── FeedbackForm.tsx + FeedbackTypeSelector.tsx   (SUB-01 to SUB-11)
  └── TrackingView.tsx                               (TRK-01 to TRK-07)

Step 4 — Admin pages
  ├── AdminSidebar.tsx                               (ADM-02, ADM-03, ADM-04, ADM-08)
  ├── AdminHeader.tsx                                (ADM-07)
  ├── TicketTable.tsx + TicketFiltersBar.tsx         (TBL-01 to TBL-08)
  ├── TicketPagination.tsx                           (PAG-01, PAG-02, PAG-03)
  ├── RecentTicketsTable.tsx                         (RST-01, RST-02)
  ├── StatusUpdatePanel.tsx + PriorityUpdatePanel.tsx (DTL-02 to DTL-04)
  ├── DangerZoneCard.tsx                              (DTL-05, DTL-06)
  └── LoginForm.tsx                                   (LGN-01, LGN-02)

Step 5 — Widget
  ├── form.ts                                         (WGT-01 to WGT-03)
  ├── success.ts                                      (WGT-04 step 1: tabindex)
  └── popup.ts                                        (WGT-04 step 2: rAF focus + WGT-05)

Step 6 — Write all a11y test files (add // @vitest-environment jsdom to each .tsx)
  └── src/__tests__/a11y/*.test.tsx (8 files)

Step 7 — Manual audit (Phase 4 — NOT deferred)
  ├── Run axe DevTools on each route
  ├── Keyboard-only navigation (per checklist in docs/a11y/KEYBOARD_NAV_CHECKLIST.md)
  ├── Colour Contrast Analyser on all items in Section 3
  ├── 200% text resize test (browser zoom)
  ├── Reflow at 320px viewport width (SC 1.4.10 — WCAG 2.1 AA requirement)
  └── Screen reader walkthrough (VoiceOver / NVDA)
```

---

## 9. Zod / Validator Changes

No API validator changes are needed for this feature. Accessibility is entirely a frontend/markup concern.

---

## 10. DB Schema Changes

None. Accessibility work is strictly UI-layer.

---

## 11. Known Low-Priority Items (Phase 5 backlog)

> **Note on SC 1.4.10 Reflow and SC 1.4.4 Resize Text:** These are WCAG 2.1 AA requirements, not optional. They have been promoted to Phase 4 Step 7 manual audit (see Section 8). They are no longer deferred.

| Item | SC | Rationale for deferral |
|------|----|------------------------|
| Replace `window.confirm()` in DangerZoneCard with shadcn `<AlertDialog>` | 2.1.1 | Native confirm is accessible on modern browsers; not a strict AA failure. Track as DTL-08. |
| Widget: contrast-checking validator for custom `buttonColor` | 1.4.3 | Runtime check; depends on deployer color choice. Can only `console.warn`. |
| SC 3.3.3 custom guided validation error messages | 3.3.3 | Browser-native HTML5 validation active; guided hints improve UX but not blocking. Track as SUB-12. |
| Target size full audit (2.5.8) | WCAG 2.2 | WCAG 2.2 bonus criterion only; requires browser devtools measurement of all small buttons |
| Focus Appearance full audit (2.4.11) | WCAG 2.2 | WCAG 2.2 bonus criterion only; requires precise focus indicator size/contrast measurement |

---

## References

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [APG Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [APG Navigation Landmark](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/examples/navigation.html)
- [jest-axe](https://github.com/nickcolley/jest-axe)
- [axe-core rules](https://dequeuniversity.com/rules/axe/4.9)
- `src/widget/utils/focus-trap.ts` — existing WCAG 2.1.2 implementation (reuse patterns)
