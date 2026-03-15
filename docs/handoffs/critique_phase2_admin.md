```
STATUS: REVIEWED
SEVERITY_SUMMARY: CRITICAL:3 / HIGH:4 / MEDIUM:4 / LOW:4
```

# Phase 2 Admin Dashboard — Critic Review

**Reviewed by:** CRITIC agent
**Date:** 2026-03-15
**Design file:** `docs/handoffs/design_phase2_admin.md`

---

## CRITICAL (반드시 수정 후 구현)

### C1: Open Redirect via `callbackUrl` — Post-Login Phishing Vector

- **Location:** Section 7-3 (`LoginForm.tsx`, line `router.push(callbackUrl ?? '/admin/dashboard')`)
- **Problem:** `callbackUrl` is read directly from `searchParams` (a URL query parameter) and passed to `router.push()` after a successful login. An attacker can craft:
  ```
  https://your-domain.com/admin/login?callbackUrl=https://evil.com/fake-admin
  ```
  After a valid admin logs in, `router.push('https://evil.com/fake-admin')` redirects the browser to an attacker-controlled phishing site that mimics the admin dashboard. The admin's session cookie is already set, so the attacker doesn't need to steal credentials — they just need to harvest whatever is displayed on the fake page, or use it for social engineering. This is a well-known NextAuth vulnerability (CVE category: open redirect) that appears in virtually every CredentialsProvider implementation that passes `callbackUrl` without validation.
- **Resolution:** Validate `callbackUrl` before use. The fix is a single guard in `LoginForm.tsx`:
  ```typescript
  const safeCallback =
    callbackUrl &&
    callbackUrl.startsWith('/') &&
    !callbackUrl.startsWith('//')
      ? callbackUrl
      : '/admin/dashboard';
  router.push(safeCallback);
  ```
  Additionally, the `AdminLoginPage` server component (`section 7-1`) should sanitize `callbackUrl` from `searchParams` before passing it to `LoginForm` — reject values that don't match `/^\/[a-zA-Z0-9\-_/?=&%#]*$/`. Document the accepted format in acceptance criteria (Section 16).

---

### C2: PATCH Handler Returns `ok(null)` When Ticket Deleted Mid-Transaction

- **Location:** Section 5-4 (`tickets/[id]/route.ts`, PATCH implementation, final `findUnique` after `$transaction`)
- **Problem:** After the `$transaction` commits, the handler performs a second, separate `findUnique` to return the full ticket state:
  ```typescript
  await prisma.$transaction(async (tx) => { ... }); // commits here

  const updated = await prisma.feedback.findUnique({  // ← NOT inside transaction
    where: { id },
    select: TICKET_DETAIL_SELECT,
  });
  return ok(updated);  // ← updated is null if ticket was deleted between tx and read
  ```
  In the window between the transaction committing and the `findUnique` executing, a concurrent `DELETE /api/v1/tickets/:id` can remove the record. `prisma.feedback.findUnique` returns `null` for a missing record (does not throw). `ok(null)` produces `{ "success": true, "data": null }` — a successful response with no data. The client-side `StatusUpdatePanel` then calls `onUpdate(json.data)` → `setTicket(null)` → the `TicketDetailView` component passes `null` as `ticket` to all its children, causing a runtime crash (TypeError: Cannot read properties of null) that the user sees as a blank/broken page.
- **Resolution:** Add a null guard before returning:
  ```typescript
  const updated = await prisma.feedback.findUnique({
    where: { id },
    select: TICKET_DETAIL_SELECT,
  });
  if (!updated) return notFound('Ticket');
  return ok(updated);
  ```
  Additionally, update the error table in Section 5-4 to include a `404` row for this scenario. For complete protection, move the final `findUnique` inside the `$transaction` callback so the read is part of the same transaction scope, eliminating the race window entirely.

---

### C3: TOCTOU Race in PATCH — `StatusHistory.fromStatus` Can Be Incorrect

- **Location:** Section 5-4 (`tickets/[id]/route.ts`, PATCH — reads `prevStatus` before `$transaction`)
- **Problem:** The PATCH handler reads the current status in a separate query, then uses it as `fromStatus` inside the transaction:
  ```typescript
  // Step 1: read status OUTSIDE transaction
  const existing = await prisma.feedback.findUnique({
    where: { id },
    select: { status: true },
  });
  const prevStatus = existing.status;  // ← e.g., "OPEN"

  // Time passes — another admin concurrently PATCHes this ticket to "IN_PROGRESS"

  // Step 2: write inside transaction
  await prisma.$transaction(async (tx) => {
    await tx.feedback.update({ where: { id }, data: { status: 'RESOLVED' } });
    await tx.statusHistory.create({
      data: { fromStatus: prevStatus, toStatus: 'RESOLVED', ... }
      // ← records "OPEN → RESOLVED" but actual previous status was "IN_PROGRESS"
    });
  });
  ```
  Under concurrent admin usage (two admins editing the same ticket simultaneously), the `StatusHistory` audit log will have incorrect `fromStatus` entries. The status history timeline shown to admins will be wrong, and the audit trail — which is a core feature of the system — becomes unreliable. This is a classic Time-Of-Check-Time-Of-Use (TOCTOU) race condition.
- **Resolution:** Move the initial `findUnique` inside the `$transaction` callback so the read and write share the same Prisma transaction and are executed atomically:
  ```typescript
  await prisma.$transaction(async (tx) => {
    const existing = await tx.feedback.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!existing) throw new Error('NOT_FOUND');

    const prevStatus = existing.status;
    const shouldCreateHistory = status !== undefined && status !== prevStatus;

    await tx.feedback.update({ where: { id }, data: updateData });

    if (shouldCreateHistory) {
      await tx.statusHistory.create({
        data: { feedbackId: id, fromStatus: prevStatus, toStatus: status!, changedById: authResult.user.id, note: note ?? null },
      });
    }
  });
  ```
  Handle the `'NOT_FOUND'` error thrown from inside the transaction by catching it before the generic `serverError` handler. Update the PATCH error table accordingly.

---

## HIGH (가능하면 수정)

### H1: Stats Logic Duplicated in Dashboard Page and Stats API — Maintenance Trap

- **Location:** Section 5-3 (`stats/route.ts`, `getStats()` implementation) and Section 9-1 (`dashboard/page.tsx`, `getStats()` implementation)
- **Problem:** The `getStats()` function is copy-pasted verbatim between two files. Both implementations run the same 5-query `$transaction` with identical date arithmetic. This violates DRY at an architectural level. When Phase 4 adds average response time, opens-over-time, or other metrics to the stats, both implementations must be updated in sync. A divergence between the two produces incorrect numbers depending on whether the dashboard page or the stats API is queried. No test suite can catch a drift between these two copies if one is updated and the other is not.
- **Resolution:** Extract `getStats()` into a shared service module:
  ```
  src/server/services/ticket-stats.ts   ← exports getTicketStats(): Promise<TicketStats>
  ```
  Both `stats/route.ts` and `dashboard/page.tsx` import from this module. The implementation lives in exactly one place. This is consistent with the CLAUDE.md architecture (`src/server/` for server-only logic) and makes the function independently unit-testable.

---

### H2: Double Request Per Filter Change in `TicketListPageContent`

- **Location:** Section 11-2 (`TicketListPageContent.tsx`, `updateFilters` callback)
- **Problem:** Inside `startTransition`, both `router.push()` and `fetch()` are called for the same data:
  ```typescript
  startTransition(async () => {
    router.push(`${pathname}?${params.toString()}`);      // ← triggers SSR re-render of page.tsx
    const res = await fetch(`/api/v1/tickets?${params.toString()}`);  // ← separate API call
    if (json.success) {
      setTickets(json.data);  // ← overwrites data from SSR re-render
      setMeta(json.meta);
    }
  });
  ```
  `router.push` causes Next.js to perform a server-side navigation, re-running `TicketsPage`'s `fetchTickets()` which calls `prisma.$transaction()`. Simultaneously, the `fetch()` call makes a separate HTTP request to `/api/v1/tickets` which calls `prisma.$transaction()` again. Every filter change hits the database **twice** instead of once. Under concurrent admin usage, this doubles DB load from the tickets page. It also creates a race condition: whichever response arrives second (SSR or fetch) wins, potentially showing stale data.
- **Resolution:** Choose one strategy — SSR or client-side fetch:
  - **SSR approach (preferred):** Remove the `fetch` + `setTickets` call entirely. Let `router.push` handle data updates. The server component re-renders with fresh data, Next.js patches the component tree. No client-side state needed for tickets/meta.
  - **Client-side approach:** Remove `router.push` entirely. Manage all state in the client. Update the URL via `window.history.replaceState` (or `useRouter.replace`) without triggering a full navigation.

---

### H3: `requireAuth` Loses `UserRole` Type — Role-Based Checks Impossible at Compile Time

- **Location:** Section 4-4 (`require-auth.ts`, `AuthOk` interface)
- **Problem:**
  ```typescript
  export interface AuthOk {
    user: {
      id: string;
      email: string;
      username: string;
      role: string;  // ← typed as `string`, not `UserRole`
    };
  }
  ```
  The session type augmentation (`next-auth.d.ts`) correctly types `role` as `UserRole`. But when `requireAuth()` maps the session fields, it downcasts `role` from `UserRole` to `string`. Any API handler that tries to check `authResult.user.role === 'ADMIN'` will work at runtime, but TypeScript cannot enforce it at compile time — e.g., a typo like `'ADIM'` will not be caught. This also prevents future RBAC logic from using discriminated union comparisons.
- **Resolution:** Import `UserRole` from `@prisma/client` and use it in `AuthOk`:
  ```typescript
  import type { UserRole } from '@prisma/client';

  export interface AuthOk {
    type: 'ok';
    user: {
      id: string;
      email: string;
      username: string;
      role: UserRole;  // ← typed correctly
    };
  }
  ```

---

### H4: `note` Field Silently Discarded When Only Priority Changes

- **Location:** Section 5-4 (`tickets/[id]/route.ts`, PATCH — `shouldCreateHistory` logic)
- **Problem:** `shouldCreateHistory` is `true` only when `status !== undefined && status !== prevStatus`. If an admin sends:
  ```json
  { "priority": "HIGH", "note": "Escalated due to customer complaint" }
  ```
  the note is received, parsed, and then silently discarded — no `StatusHistory` entry is created. The admin believes their note was saved; the system shows no error; but the note is lost permanently. This is a user-facing data loss bug that violates the principle of least surprise.
- **Resolution:** One of:
  1. **Also create a `StatusHistory` entry when `note` is provided**, even without a status change. Use `fromStatus = prevStatus` and `toStatus = prevStatus` (same status, note-only entry). Update the schema/display logic to render these as "note added" entries.
  2. **Document the limitation in the UI**: Show the note textarea only when a status change is selected. Add a tooltip: "Notes are recorded alongside status changes." This is the simpler fix and avoids schema implications.
  3. Either way, update the PATCH acceptance criteria in Section 16 to make this behavior explicit.

---

## MEDIUM (다음 iteration에서 처리 가능)

### M1: No RBAC Enforcement — MANAGER Can Delete Tickets

- **Location:** Section 5-4 (DELETE handler), Section 4-4 (`requireAuth`), Section 18 (Security Notes)
- **Problem:** The `AdminUser` model has `ADMIN` and `MANAGER` roles, and both are seeded. `requireAuth()` only checks `session?.user?.id` — it does not check role. The `DELETE /api/v1/tickets/:id` endpoint allows any authenticated user, including `MANAGER` role, to permanently delete tickets. The design defines roles but enforces no access control differentiation between them. If the role distinction is meaningful (which seeding both roles implies it is), then at minimum DELETE should be restricted to `ADMIN`.
- **Resolution:** Add an optional `requiredRole` parameter to `requireAuth()`, or create a dedicated `requireAdmin()` helper. Apply it to DELETE handlers:
  ```typescript
  // In require-auth.ts
  export async function requireRole(role: UserRole): Promise<AuthOk | AuthFail> {
    const result = await requireAuth();
    if (result.type === 'error') return result;
    if (result.user.role !== role) {
      return { type: 'error', response: forbidden() };
    }
    return result;
  }
  ```
  If roles are intentionally identical in Phase 2, document this explicitly in Section 17 (Out of Scope) to prevent confusion.

---

### M2: `generateMetadata` Makes a Redundant DB Query on Ticket Detail Page

- **Location:** Section 12-1 (`tickets/[id]/page.tsx`, `generateMetadata` + `getTicket` both query same row)
- **Problem:** Every ticket detail page load runs two separate `prisma.feedback.findUnique` queries for the same `id`:
  1. `generateMetadata` → `select: { title: true }`
  2. `getTicket` → `select: { ..., all fields ... }`
  While Next.js runs these in parallel, they are two separate DB round-trips for one page render. With connection pooling overhead, this adds ~10–50ms per page load.
- **Resolution:** Use React `cache()` to deduplicate the queries:
  ```typescript
  import { cache } from 'react';

  const getTicket = cache(async (id: string) => {
    return prisma.feedback.findUnique({ where: { id }, select: TICKET_DETAIL_SELECT });
  });

  export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const ticket = await getTicket(id);  // ← same cache key → deduped
    return { title: ticket?.title ?? 'Ticket Not Found' };
  }
  ```
  React's `cache()` deduplicates calls within the same render pass, so both `generateMetadata` and the page component share a single DB query.

---

### M3: `RecentTicketsTable` Creates a Waterfall on Dashboard Page Load

- **Location:** Section 9-5 (`RecentTicketsTable.tsx` — Client Component with `useEffect` fetch)
- **Problem:** `RecentTicketsTable` is a Client Component that fetches the last 5 tickets via `useEffect` after hydration. This creates a visible loading state:
  1. Dashboard page SSR renders — stats cards appear with data
  2. Browser hydrates
  3. `useEffect` fires → fetch `/api/v1/tickets?limit=5`
  4. Component re-renders with tickets (or error)
  The dashboard page already has direct Prisma access (`getStats()` runs at render time). Fetching the recent tickets could trivially be done in the same server-side pass, eliminating the loading flash entirely. The comment "Non-critical widget — silently fail" means errors are invisible to users (and admins), making this a reliability gap as well.
- **Resolution:** Convert `RecentTicketsTable` to a Server Component that receives data as props from `DashboardPage`:
  ```typescript
  // In dashboard/page.tsx
  const [stats, recentTickets] = await Promise.all([
    getStats(),
    prisma.feedback.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: { ... } }),
  ]);

  // Pass to RecentTicketsTable
  <RecentTicketsTable tickets={recentTickets} />
  ```
  This removes the Client Component, the `useEffect`, and the secondary API round-trip.

---

### M4: Seed File Has Weak, Undocumented Dev-Only Credentials

- **Location:** Section 13-1 (`prisma/seed.ts`, `admin1234` / `manager1234`)
- **Problem:** The seed script hardcodes `admin1234` and `manager1234` as admin credentials. Acceptance criteria (Section 16) states "Both admin accounts can log in successfully" — this passes the seed credentials as implicit facts. There is no warning that these credentials must be rotated before production deployment. If the seed is run on a production database (or staging that shares production access), these credentials become a publicly known backdoor.
- **Resolution:**
  1. Add a `WARNING` comment block in `prisma/seed.ts`: `// DEV ONLY — Change these credentials before any non-local deployment`
  2. Add a `SEED_ADMIN_PASSWORD` environment variable with a fallback: `const adminHash = await hash(process.env.SEED_ADMIN_PASSWORD ?? 'admin1234', BCRYPT_ROUNDS)`
  3. Add to Section 17 (Out of Scope): "Seed credential rotation instructions — see README before deploying to non-local environments"

---

## LOW (제안사항)

### L1: `StatusHistoryTimelineItem` Receives `isFirst` Prop That Is Never Used

- **Location:** Section 12-3 (`StatusHistoryTimelineItem.tsx`)
- **Problem:** The component signature declares `isFirst: boolean` in `StatusHistoryTimelineItemProps`, and `StatusHistoryTimeline` passes `isFirst={i === 0}` — but `isFirst` is never referenced in the component body (only `isLast` is used to toggle the connector line). This is dead code in the props interface.
- **Resolution:** Remove `isFirst` from the interface and all call sites:
  ```typescript
  interface StatusHistoryTimelineItemProps {
    entry: StatusHistoryEntry;
    // isFirst: boolean;  ← remove
    isLast: boolean;
  }
  ```

---

### L2: `formatRelativeDate` Uses Local Time for Diff Calculation

- **Location:** Section 11-5 (`TicketTableRow.tsx`, `formatRelativeDate`)
- **Problem:**
  ```typescript
  const diff = now - new Date(date).getTime();
  ```
  `Date.now()` returns the current UTC timestamp as a number. `new Date(date).getTime()` converts the ISO string (UTC) to a UTC timestamp. This is actually correct — both are UTC milliseconds and the diff is timezone-independent. The bug is in the display: `new Date(date).toLocaleDateString()` at the end uses the browser's local timezone, which is correct for display. However, the cutoffs (`hours < 1`, `hours < 24`, etc.) are computed against the real-world current time, which means a ticket created at 11pm UTC displayed to an admin in UTC+9 (8am next day) will show "9h ago" rather than "yesterday" — minor but potentially confusing.
- **Resolution:** This is low priority for Phase 2. Add a `// TODO: Phase 4 — consider using date-fns formatDistanceToNow for locale-aware display` comment. The current implementation is functionally correct.

---

### L3: `TicketFiltersBar` Imports `Select` from shadcn but Uses Native `<select>`

- **Location:** Section 11-3 (`TicketFiltersBar.tsx`, import statement)
- **Problem:** The file imports `{ Select }` from `@/components/ui/select`:
  ```typescript
  import { Select } from '@/components/ui/select';
  ```
  But the component body uses native `<select>` elements throughout. The `Select` import is unused, producing a dead import and (in strict lint setups) a compile warning or error.
- **Resolution:** Remove the unused `Select` import. The design note already explains the decision to use native selects — the import should match the implementation.

---

### L4: `DangerZoneCard` Uses `confirm()` — Blocked in Some Browser Contexts

- **Location:** Section 12-6 (`DangerZoneCard.tsx`, `window.confirm()`)
- **Problem:** `confirm()` is a synchronous browser dialog that is:
  - Blocked by default in cross-origin iframes (future embeds/integrations)
  - Inconsistently styled across browsers
  - Non-dismissible on iOS Safari with certain configurations
  - Already noted in Section 18 as a known limitation
  The design acknowledges this and defers to Phase 5. This is acceptable, but the current implementation uses `confirm()` inside `startTransition(async () => {...})` — the `confirm()` is actually called BEFORE `startTransition`, which is correct. However, the pattern could be confusing if refactored: if someone moves `confirm()` inside `startTransition`, it would be called after the transition starts.
- **Resolution:** Add a code comment to prevent the antipattern:
  ```typescript
  // IMPORTANT: confirm() must stay OUTSIDE startTransition to avoid blocking after transition start
  if (!confirm('Delete this ticket? This action cannot be undone.')) return;
  ```
  Track Phase 5 upgrade to `AlertDialog` in design docs.

---

## 승인 조건

- **CRITICAL 항목 모두 해결 시 APPROVED 가능**
- **C1 (Open Redirect):** `callbackUrl` 유효성 검사 — `/`로 시작하는 상대 경로만 허용, `//` 또는 `https://` 포함 시 `/admin/dashboard`로 폴백
- **C2 (PATCH null response):** `findUnique` 반환값 null 체크 추가 — `if (!updated) return notFound('Ticket')`
- **C3 (TOCTOU race):** 초기 `findUnique`를 `$transaction` 콜백 안으로 이동 — read-write 원자성 보장

**Priority order for implementation team:**
C1 → C3 → C2 → H4 (note silently discarded) → H1 (role type) → H2 (double request) → H3 (stats duplication) → M1 (RBAC) → remaining MEDIUM/LOW
```
