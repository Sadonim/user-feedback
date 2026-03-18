STATUS: REVIEWED
REVIEWER: CRITIC
FEATURE: Phase 5 — Advanced Features (Priority UI · Assignee · SSE · Analytics)
DATE: 2026-03-19
SEVERITY_SUMMARY: CRITICAL:2 / HIGH:3 / MEDIUM:7 / LOW:4

---

## Per-Section Verdicts

| Section | Verdict | Summary |
|---------|---------|---------|
| 5-1 Priority UI | **MINOR** | Sound. One colSpan omission, one type placement issue. |
| 5-2 Assignee | **MAJOR** | Critical passwordHash exposure risk; FeedbackDetail type breakage; validation gap |
| 5-3 SSE (Real-Time) | **MAJOR** | Resource leak; Last-Event-ID/query-param mismatch; ticket.deleted is dead code |
| 5-4 Analytics | **MINOR** | Divide-by-zero edge case; WCAG gap; otherwise well-designed |

---

## CRITICAL (must fix before implementation)

### C-1 · `GET /api/v1/admin/users` — passwordHash exposure risk
**Location:** Design §2.2, §2.5, §2.8 (CREATE `src/app/api/v1/admin/users/route.ts`)

The `AdminUser` Prisma model has a `passwordHash` field. The design shows the desired response shape
(`id`, `username`, `email`, `role`) but §2.5 "Backend Changes" only documents modifications to
*existing* routes — it never specifies the implementation of the new `admin/users/route.ts`.
If an implementer follows the pattern of `ticket-stats.ts` and calls
`prisma.adminUser.findMany()` without a `select`, every admin user's `passwordHash` will be
returned in the API response.

**Fix:** Add an explicit implementation note to §2.5:
```typescript
// src/app/api/v1/admin/users/route.ts
await prisma.adminUser.findMany({
  select: { id: true, username: true, email: true, role: true },
  orderBy: { username: 'asc' },
});
```
The `select` must be present in the design as a non-negotiable constraint, not left implicit.

---

### C-2 · Required field additions to `FeedbackDetail` and `TicketListItem` will break tests
**Location:** Design §2.4 (Type Changes)

The design proposes adding two **required** (non-optional) fields to existing interfaces:

```typescript
// FeedbackDetail: adds
assigneeId: string | null;     // NEW
assignee: AssigneeInfo | null; // NEW

// TicketListItem: adds
assigneeUsername: string | null; // NEW
```

All three are `T | null` (required), not `T | null | undefined` (optional). TypeScript will reject
any existing test that constructs a mock `FeedbackDetail` or `TicketListItem` without these fields.
With 635 passing tests, this is a high-probability regression.

Cross-check: `PriorityUpdatePanel.tsx` line 39 calls `onUpdate(json.data)` where `json.data` is
typed as `FeedbackDetail`. After this change the PATCH route must return `assignee` in the
response body; if the PATCH route is updated before the SELECT is expanded, tests for that route
will fail on the type coercion.

Additionally, §2.4 states `assigneeId` in `FeedbackDetail` is "kept for compatibility" — this is
factually incorrect. The current `FeedbackDetail` type (`src/types/index.ts` lines 47–52) has
**no** `assigneeId` field. This is a **new addition**, not a retention.

**Fix:** Mark all three new fields as optional until test coverage confirms existing fixtures are
updated, OR commit to a coordinated fixture update task in the implementation plan:
```typescript
assigneeId?: string | null;
assignee?: AssigneeInfo | null;
assigneeUsername?: string | null;
```
Correct the §2.4 description: "assigneeId in FeedbackDetail — NEW field (does not exist in
current type)."

---

## HIGH (fix if possible)

### H-1 · SSE polling interval not cancelled on client disconnect → resource leak
**Location:** Design §3.2, §3.6, §3.7 (no mention of cleanup)

The SSE implementation will use a `setInterval` (every 3 s) and a keepalive interval (every 15 s)
inside the route handler. In Next.js App Router, a streaming response is terminated by closing the
`ReadableStream`. If these intervals are not cleared inside the stream's `cancel()` callback, they
continue polling the database after the client disconnects.

With Vercel's 60 s `maxDuration`, each disconnected-but-still-polling connection runs up to 60 s of
wasted DB queries before the function eventually terminates.

**Fix:** Add to §3.6 (SSE Helper Utility) the required teardown pattern:
```typescript
// In the ReadableStream constructor
cancel() {
  clearInterval(pollTimer);
  clearInterval(keepaliveTimer);
}
```
This must be an implementation requirement in §3.6 and §3.11.

---

### H-2 · `Last-Event-ID` reconnect mechanism contradicts `streamQuerySchema`
**Location:** Design §3.2 (step 8), §3.3, §3.4

The design states: "Client's `EventSource` auto-reconnects on disconnect; sends `Last-Event-ID`
header with last timestamp, allowing the server to back-fill missed events."

The browser `EventSource` spec sends reconnect context as an HTTP **header** (`Last-Event-ID`),
not a query parameter. However, the design's `streamQuerySchema` validates a `since` **query
param** (`z.string().datetime().optional()`). These are two different channels.

The SSE event `id` is set to a Unix millisecond timestamp, but `streamQuerySchema.since` expects
an ISO 8601 datetime string with offset (`z.string().datetime({ offset: true })`). These formats
are incompatible.

**Fix:** Replace the `since` query param approach with header-based reconnect:
```typescript
// In GET /api/v1/tickets/stream handler:
const lastEventId = req.headers.get('last-event-id');
const since = lastEventId ? new Date(Number(lastEventId)) : new Date();
```
Remove `streamQuerySchema.since` or repurpose it as an optional manual override for
non-`EventSource` clients. Update §3.3 API contract and §3.4 Zod schema accordingly.

---

### H-3 · `ticket.deleted` SSE event type defined but will never fire
**Location:** Design §3.3 (Event types), §3.7, `TicketStreamItem` type, `useTicketStream` hook

The design defines a `ticket.deleted` event and provides an `onDeleted` callback in
`useTicketStream`. The polling mechanism queries `WHERE updatedAt > lastCheckedAt`. The
`DELETE /api/v1/tickets/:id` handler (`[id]/route.ts` line 172) calls
`prisma.feedback.delete()` — this removes the row entirely and never touches `updatedAt`.

**Result:** No `ticket.deleted` event will ever be emitted. The event type, the
`SSEEventType` union, and the `onDeleted` hook callback are all dead code that will mislead
implementers and users of the hook.

§3.7 acknowledges this and suggests a vague workaround ("client can check its local list on any
`ticket.updated` event"), but this heuristic is unreliable and undocumented in the hook API.

**Fix options (choose one):**
1. **Remove** `ticket.deleted` from the SSE contract and `useTicketStream`. Document the
   known limitation.
2. **Add a periodic "tombstone" poll** in the SSE handler: on each poll cycle, also check for
   IDs in the client's known set (tracked via the `init` event total) that no longer exist.
3. **Update the DELETE handler** to set `updatedAt = now()` before deleting, then let the next
   poll detect the state change before the row is gone (race-prone, not recommended).

Option 1 is simplest and most honest. Update §3.3, §3.5, and §3.8 to reflect the limitation.

---

## MEDIUM (can address in next iteration)

### M-1 · Analytics divide-by-zero when `total === 0`
**Location:** Design §4.3 (Computed fields), §4.6 (Analytics Service)

```
openRate = (OPEN / total) * 100
resolutionRate = ((RESOLVED + CLOSED) / total) * 100
```

If no tickets were submitted in the selected period, `total === 0` and both rates become `NaN`
(JavaScript division by zero). The chart components have no guard against `NaN` values and
recharts may render incorrectly.

**Fix:** Add to §4.6 implementation note:
```typescript
openRate: total > 0 ? (statusFunnel.OPEN / total) * 100 : 0,
resolutionRate: total > 0 ? ((statusFunnel.RESOLVED + statusFunnel.CLOSED) / total) * 100 : 0,
```

---

### M-2 · `assigneeId` filter in `ticketFiltersSchema` accepts arbitrary strings
**Location:** Design §2.3, §7 (Zod schema changes)

```typescript
assigneeId: z.string().optional()  // accepts any string
```

This is intentionally broad to support the `"unassigned"` special literal, but it also accepts
random non-CUID strings (e.g., `assigneeId=foo`) that will be passed to Prisma's `where` clause,
returning an empty list with no error signal. Confusing for API consumers.

**Fix:** Use an explicit union:
```typescript
assigneeId: z.union([z.string().cuid(), z.literal('unassigned')]).optional()
```

---

### M-3 · `TicketTable` empty-state `colSpan` not updated
**Location:** Design §1.6, §2.7 (Modified Components: TicketTable.tsx)

`src/components/admin/TicketTable.tsx` line 36 has `colSpan={7}` for the "No tickets found" row.
Phase 5-1 adds a "Priority" column and Phase 5-2 adds an "Assignee" column, making the total
**9 columns**. The design does not mention updating `colSpan`.

**Fix:** Add to §1.6 or §2.7: "Update empty-state `colSpan` from 7 → 9."

---

### M-4 · `TicketFilters` manual interface type diverges from Zod-inferred `TicketFiltersInput`
**Location:** Design §2.3, §7; `src/types/index.ts` lines 67–75

`src/types/index.ts` exports a manually written `TicketFilters` interface:
```typescript
export interface TicketFilters {
  status?: TicketStatus;
  type?: FeedbackType;
  priority?: Priority;
  page?: number;
  limit?: number;
  sort?: "createdAt" | "updatedAt";
  order?: "asc" | "desc";
}
```

The design adds `assigneeId` to `ticketFiltersSchema` (Zod) but does not mention updating the
`TicketFilters` interface. After Phase 5-2, `TicketFilters` and `TicketFiltersInput` (the Zod
inferred type) will diverge. Code that accepts `TicketFilters` won't know about `assigneeId`.

**Fix:** Either update `TicketFilters` to include `assigneeId?: string`, or remove `TicketFilters`
and consolidate to `TicketFiltersInput` everywhere.

---

### M-5 · Multiple redundant fetches to `GET /api/v1/admin/users` with no caching
**Location:** Design §2.6 (AssigneePanel), §2.7 (TicketFiltersBar)

`AssigneePanel` fetches `/api/v1/admin/users` on every mount (each time a ticket detail page
opens), and `TicketFiltersBar` fetches the same endpoint "on mount" for the filter dropdown. These
are independent calls with no shared cache or state.

In a typical admin session: opening 5 tickets = 5 AssigneePanel mounts = 5 redundant fetches of
the same static-ish list.

**Fix:** Add a recommendation in §2.6 to use `React.cache` (server) or a small Zustand store /
SWR cache (client) for the admin user list. At minimum, note the redundancy as a known
performance consideration.

---

### M-6 · `FeedbackDetail.assigneeId` documentation is misleading
**Location:** Design §0 (audit table), §2.4

The design §0 audit claims `assigneeId` is already in `FeedbackDetail`:
> `assigneeId` in `TicketListItem` and `FeedbackDetail` types | ✅ Done | `types/index.ts` lines 51, 63

Cross-checking `src/types/index.ts` lines 47–52, `FeedbackDetail` currently has no `assigneeId`.
Only `TicketListItem` (line 64) has it. The audit table is incorrect.

In §2.4, describing the addition as "kept for compatibility" is misleading — it is a **new field**
that has never existed in the TypeScript type (even though the Prisma select returns it at runtime).

**Fix:** Correct the §0 audit table row to: "assigneeId in TicketListItem only (NOT in
FeedbackDetail)". Rewrite §2.4 to state clearly: "Add new required field `assigneeId` to
`FeedbackDetail` to align type with existing Prisma runtime data."

---

### M-7 · `TicketFiltersBar` "Clear Filters" does not clear `assigneeId`
**Location:** Design §2.7 (TicketFiltersBar modification)

The existing "Clear Filters" button in `TicketFiltersBar.tsx` (lines 71–79) explicitly resets
`status`, `type`, and `priority` to `undefined`, but `assigneeId` is not included. After Phase
5-2 adds the assignee filter, the Clear Filters button will silently leave the `assigneeId` filter
active.

**Fix:** Add to §2.7 modification list: "Update Clear Filters handler to also reset `assigneeId`
to `undefined`."

---

## LOW (suggestions)

### L-1 · `PriorityColor` type belongs in the badge component, not `types/index.ts`
**Location:** Design §1.4

`PriorityColor = 'destructive' | 'orange' | 'yellow' | 'muted'` is a UI/CSS concern specific to
`TicketPriorityBadge`. Placing it in the shared types file couples the type layer to a presentational
detail. If the badge styling changes, it requires modifying the shared types.

**Fix:** Define `PriorityColor` as a local type inside `TicketPriorityBadge.tsx`.

---

### L-2 · Analytics chart components need explicit WCAG 2.1 AA review
**Location:** Design §4.8 (Chart Components); Phase 4 accessibility audit

Phase 4 established WCAG 2.1 AA as a project standard. Recharts has known accessibility
limitations: SVG charts lack proper ARIA roles by default, and interactive tooltips are often
not keyboard-accessible. The shadcn `ChartContainer` wrapper improves this but does not solve
all gaps.

The design does not address accessibility for any of the three chart types.

**Fix:** Add to §4.8 for each chart component:
- `role="img"` and `aria-label` on the chart container
- A text-based summary or data table as a fallback for screen reader users
- Verify keyboard tooltip access (Tab navigable)

---

### L-3 · SSE `init` event payload does not reuse existing `getTicketStats()`
**Location:** Design §3.2 (step 4), §3.3 (init event type)

The `init` event sends `{ total: number; open: number }` — a subset of `TicketStats`. The
existing `getTicketStats()` service already computes `total` and `byStatus.OPEN`. Instead of a
custom query, the SSE `init` event could call `getTicketStats()` and extract the needed fields,
avoiding code duplication.

**Fix (suggestion):** In §3.2 or §3.3, note: "init payload can be derived from
`getTicketStats()` — avoids a separate COUNT query."

---

### L-4 · `DashboardLiveUpdater` pattern not specified; potential hydration issue
**Location:** Design §3.10 (Modified Components: dashboard/page.tsx)

The design describes `DashboardLiveUpdater` as "an invisible client wrapper" added to
`dashboard/page.tsx` (currently a React Server Component). The mechanism for injecting a Client
Component into an RSC while maintaining SSR/hydration hygiene is not described.

Wrapping a server component's output in a `'use client'` wrapper that calls `useTicketStream`
can cause the entire dashboard to client-render if not structured carefully. The recommended
Next.js pattern is to keep the RSC structure and add a separate isolated `'use client'` leaf
component.

**Fix (suggestion):** Add a brief implementation sketch to §3.10:
```tsx
// app/(admin)/dashboard/page.tsx (RSC)
export default async function DashboardPage() {
  const stats = await getTicketStats();
  return (
    <>
      <StatsCards stats={stats} />
      <DashboardLiveUpdater /> {/* isolated client leaf — no props needed */}
    </>
  );
}
```
This keeps the RSC boundary intact and prevents unnecessary client-side hydration of stats cards.

---

## Approval Condition

This design can be **APPROVED** once:

1. **C-1** is resolved: Add explicit `select` to `GET /api/v1/admin/users` implementation spec.
2. **C-2** is resolved: Mark `assigneeId`, `assignee`, `assigneeUsername` as optional in the
   type changes, OR add a test fixture update task.
3. **H-1** is resolved: Add `cancel()` cleanup to SSE stream specification.
4. **H-2** is resolved: Replace `since` query param with `Last-Event-ID` header.
5. **H-3** is resolved: Remove or correctly scope the `ticket.deleted` event.

Items M-1 through L-4 may be addressed during implementation or deferred to Phase 6.
