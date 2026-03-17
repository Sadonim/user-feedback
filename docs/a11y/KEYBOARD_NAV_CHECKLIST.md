# Keyboard Navigation Manual Test Checklist

WCAG 2.1 AA — user-feedback project
Last updated: 2026-03-17

## How to Use

1. Close all browser extensions that may interfere
2. Open the page under test
3. Unplug or disable your mouse (or use keyboard-only mode)
4. Work through each checklist item
5. Mark ✅ pass / ❌ fail / ⚠️ partial for each item
6. File issues for all failures referencing the Issue ID from `design_phase4_accessibility.md`

---

## Global (all pages)

- [ ] First `Tab` press shows skip navigation link with visible focus ring
- [ ] Pressing `Enter` on skip link moves focus to `#main-content`
- [ ] All interactive elements (links, buttons, inputs, selects) reachable via `Tab`
- [ ] `Shift+Tab` reverses focus order correctly
- [ ] No focus traps outside dialogs/modals
- [ ] Focus ring is clearly visible on every interactive element (2px outline minimum)
- [ ] `Escape` closes any open dialog, dropdown, or modal
- [ ] Browser zoom at 200% — all content readable, no horizontal overflow

---

## `/submit` — Feedback Submission

- [ ] `Tab` → lands on type selector section
- [ ] Type cards are reachable via `Tab`
- [ ] `Space` on "Bug Report" card → advances to form step; card shows `aria-pressed="true"`
- [ ] `Enter` on "Bug Report" card → advances to form step
- [ ] Screen reader announces step change via live region (e.g. "Step: Enter details")
- [ ] Back button labeled "Back to type selection" announced by SR
- [ ] `Tab` through form: Title → Description → Nickname → Email → Submit
- [ ] `Enter` in Title field — does NOT submit form early
- [ ] `Enter` on Submit button → submits form
- [ ] During submission: button disabled; `aria-busy` on form (SR announces "busy")
- [ ] After success: focus automatically moves to success card
- [ ] SR announces "Feedback Submitted!" on success step
- [ ] "Track Status" button operable by `Space` / `Enter`
- [ ] "Submit Another" button operable by `Space` / `Enter`
- [ ] `Tab` order in success card is logical

---

## `/track` — Tracking Page

- [ ] Skip nav → `#main-content` → `Tab` reaches tracking ID input
- [ ] Input has visible label ("Tracking ID" or similar)
- [ ] SR announces input label when focused
- [ ] Type tracking ID → `Enter` submits search
- [ ] "Track" button operable by `Space` / `Enter`
- [ ] During loading: button disabled, loading state communicated
- [ ] After search: live region announces result (e.g. "1 result found" or "No feedback found")
- [ ] Result card content navigable by `Tab` / Arrow keys
- [ ] Status text readable (not color-only)
- [ ] Status history list navigable

---

## `/admin/login` — Admin Login

- [ ] Skip nav link visible on first `Tab`
- [ ] `Tab` → Email input (with label "Email")
- [ ] `Tab` → Password input (with label "Password")
- [ ] `Tab` → Sign In button
- [ ] `Enter` on Sign In → attempts login
- [ ] Incorrect credentials → error alert announced by SR (role="alert")
- [ ] Focus management after error: error alert or first field focused
- [ ] `Tab` cycle: Email → Password → Button → (back to skip nav)

---

## `/admin/dashboard` — Dashboard

- [ ] Skip nav skips sidebar; focus lands on `<main>` region
- [ ] `Tab` can reach sidebar nav items (after main content interaction)
- [ ] `aria-current="page"` on Dashboard nav link (SR announces "current page" or similar)
- [ ] Stats cards readable (icon descriptions suppressed, values read)
- [ ] Recent tickets table navigable
- [ ] Page has `<h1>` landmark (SR announces "Dashboard, heading level 1")

---

## `/admin/tickets` — Ticket List

- [ ] Skip nav → main content → filter section
- [ ] "Filter by status" select → operable, label announced by SR
- [ ] "Filter by type" select → operable, label announced by SR
- [ ] "Sort order" select → operable, label announced by SR
- [ ] Filter change → live region announces updated count (e.g. "12 tickets found")
- [ ] Table caption/label announced by SR ("Ticket list")
- [ ] Column headers read by SR as each cell is navigated
- [ ] `Tab` through table rows — each row link operable
- [ ] `Enter` on row → navigates to ticket detail
- [ ] Pagination buttons operable; current page communicated
- [ ] `aria-current="page"` on active sidebar "Tickets" nav item

---

## `/admin/tickets/[id]` — Ticket Detail

- [ ] "Back to tickets" link operable; destination described
- [ ] Page `<h1>` is ticket title (announced by SR on page load)
- [ ] Status Update panel:
  - [ ] "Status" heading label linked to select
  - [ ] `<select>` announces current value + label
  - [ ] Note textarea has label ("Status update note")
  - [ ] "Update Status" button operable
- [ ] Priority Update panel:
  - [ ] Priority `<select>` labeled
  - [ ] Operable by keyboard
- [ ] Status history timeline: list items navigable
- [ ] Danger Zone:
  - [ ] Delete button operable
  - [ ] Button describes consequence via `aria-describedby`
  - [ ] Confirm dialog keyboard-accessible (Tab through options, Enter to confirm/cancel)

---

## Embeddable Widget

- [ ] `Tab` reaches floating trigger button
- [ ] SR announces: "Submit feedback, expanded: false, button, has popup dialog"
- [ ] `Enter` / `Space` opens widget dialog
- [ ] SR announces: "Send Feedback, dialog"
- [ ] Focus trapped inside dialog (Tab cycles: type cards → ... → close button → back to first)
- [ ] `Shift+Tab` reverses within dialog
- [ ] Type card: `Space` / `Enter` selects type; `aria-pressed` changes to `true`
- [ ] Form step: `Tab` through all form fields; each has visible label
- [ ] Back button announces "Go back to type selection"
- [ ] Submit button:
  - [ ] Operable by `Space` / `Enter`
  - [ ] During submit: `aria-busy="true"` announced by SR as "busy" or "submitting"
- [ ] Success step: focus moves to "Feedback Submitted!" heading
- [ ] Copy button operable; announces "Copy tracking ID"
- [ ] Close button ("Close"): returns focus to trigger button
- [ ] Trigger button now announces `aria-expanded="false"` after close
- [ ] `Escape` at any point closes dialog and restores focus to trigger

---

## Screen Reader Testing Notes

### VoiceOver (macOS)
- Enable: `Cmd+F5`
- Navigate by headings: `VO+Cmd+H`
- Navigate by landmarks: `VO+Cmd+L`
- Navigate by form controls: `VO+Cmd+J`

### NVDA (Windows)
- Download from nvaccess.org
- Navigate by headings: `H`
- Navigate by landmarks: `D`
- Navigate by form controls: `F`

### Key things to verify with SR:
1. Page title announced on load
2. `<h1>` announced on each page
3. Live regions announced without user action
4. Error messages announced on form errors
5. Dialog open/close announced
6. `aria-current="page"` in nav announced
7. Table structure (column headers per cell)
8. `aria-busy` state changes announced

---

## Contrast Quick Tests

Using Colour Contrast Analyser or browser devtools:

| Item | Test |
|------|------|
| Body text | Pick foreground/background colors, verify ≥ 4.5:1 |
| Muted text | Verify `text-muted-foreground` ≥ 4.5:1 vs background |
| Primary button | Button text vs button background ≥ 4.5:1 |
| Status badge OPEN | Text vs background in both light and dark mode |
| Status badge IN_PROGRESS | Text vs background in both light and dark mode |
| Status badge RESOLVED | Text vs background in both light and dark mode |
| Focus ring | Focus outline vs adjacent background ≥ 3:1 |
| Widget button | White text vs `--wfb-accent` ≥ 4.5:1 (default `#7c3aed`) |
