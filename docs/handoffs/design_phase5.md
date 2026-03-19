STATUS: BACKEND_DONE
PHASE: 5
FEATURE: Advanced Features (Priority UI · Assignee · SSE · Analytics)
LAST_UPDATED: 2026-03-19

---

# Phase 5 — Advanced Features Design Document

## 0. What Is Already Implemented (Do Not Re-implement)

A precise audit of the codebase before designing to avoid redundant work:

| Item | Status | Evidence |
|------|--------|----------|
| `Priority` enum in Prisma | ✅ Done | `schema.prisma` line 29–34 |
| `priority` field on `Feedback` model | ✅ Done | `schema.prisma` line 46 |
| `priority` filter in `ticketFiltersSchema` | ✅ Done | `validators/feedback.ts` line 48 |
| `priority` in `updateTicketSchema` | ✅ Done | `validators/feedback.ts` line 37 |
| `priority` in `GET /api/v1/tickets` where clause | ✅ Done | `tickets/route.ts` line 22 |
| `priority` in `GET /api/v1/tickets/[id]` select | ✅ Done | `[id]/route.ts` `TICKET_DETAIL_SELECT` line 16 |
| `priority` update in `PATCH /api/v1/tickets/[id]` | ✅ Done | `[id]/route.ts` line 77 |
| `priority` in `TicketListItem` and `FeedbackDetail` types | ✅ Done | `types/index.ts` lines 51, 63 |
| `PriorityUpdatePanel` component | ✅ Done | `components/admin/PriorityUpdatePanel.tsx` |
| `assigneeId` FK + `assignee` relation on `Feedback` | ✅ Done | `schema.prisma` lines 47, 52 |
| `assigned` relation on `AdminUser` | ✅ Done | `schema.prisma` line 76 |
| `assigneeId` in `GET /api/v1/tickets` select | ✅ Done | `tickets/route.ts` line 50 |
| `assigneeId` in `TicketListItem` type | ✅ Done | `types/index.ts` line 64 |
| `assigneeId` in `FeedbackDetail` type | ❌ Not present | `FeedbackDetail` has no `assigneeId` — new addition in Phase 5-2 |

**Phase 5-1 net new work:** UI only — badge component + filter select + table column.
**Phase 5-2 net new work:** Two new API endpoints, schema indexes, validator additions, UI components.
**Phase 5-3 net new work:** Fully new — SSE endpoint + client hook.
**Phase 5-4 net new work:** Fully new — analytics endpoint + page + chart components + recharts dep.

---

## 1. Phase 5-1: Priority Levels

### 1.1 DB Schema Changes

No migration required — `Priority` enum and `priority` field already exist. Add two performance
indexes alongside Phase 5-2 migration:

```prisma
// prisma/schema.prisma — add to Feedback model indexes block
@@index([priority])     // NEW: speeds up priority-filtered queries
@@index([assigneeId])   // NEW: speeds up assignee-filtered queries (Phase 5-2)
```

Migration file: `prisma/migrations/20260317_phase5_indexes/migration.sql`

### 1.2 API Contracts

No API changes. All endpoints already support `priority`.

### 1.3 Zod Schema Changes

No changes. `ticketFiltersSchema` and `updateTicketSchema` already include `priority`.

### 1.4 New Type

```typescript
// src/types/index.ts — add
export type PriorityColor = 'destructive' | 'orange' | 'yellow' | 'muted';
```

### 1.5 New Components

**`TicketPriorityBadge`** — `src/components/admin/TicketPriorityBadge.tsx`

```
Props: { priority: Priority | null }
Renders: <span> badge with color-coded label
Colors:
  CRITICAL → destructive red  (text-destructive bg-destructive/10 border-destructive/30)
  HIGH     → orange           (text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900)
  MEDIUM   → yellow           (text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900)
  LOW      → muted gray       (text-muted-foreground bg-muted)
  null     → renders nothing (return null)
```

### 1.6 Modified Components

| File | Change |
|------|--------|
| `TicketFiltersBar.tsx` | Add `<select aria-label="Filter by priority">` with LOW/MEDIUM/HIGH/CRITICAL options; bind to `filters.priority` |
| `TicketTable.tsx` | Add "Priority" `<th scope="col">` between Type and Title; render `<TicketPriorityBadge>` in each row. **Note:** After Phase 5-1 the table has 8 columns; after Phase 5-2 (Assignee) it will have 9 columns — update the empty-state row's `colSpan` from 7 → 9 in the Phase 5-2 step (see §2.7) |
| `TicketDetailView.tsx` | Add `<TicketPriorityBadge>` to meta row alongside `<TicketTypeBadge>` and `<TicketStatusBadge>` |

### 1.7 File List

| Action | File |
|--------|------|
| CREATE | `src/components/admin/TicketPriorityBadge.tsx` |
| MODIFY | `src/components/admin/TicketFiltersBar.tsx` |
| MODIFY | `src/components/admin/TicketTable.tsx` |
| MODIFY | `src/components/admin/TicketDetailView.tsx` |
| MODIFY | `prisma/schema.prisma` (indexes — shared with 5-2) |

---

## 2. Phase 5-2: Assignee Management

### 2.1 DB Schema Changes

Add performance indexes (shared with 5-1 above). No column additions required — `assigneeId` FK
and `assignee` relation already exist in the schema.

```prisma
// In Feedback model — add to @@index block:
@@index([priority])
@@index([assigneeId])
```

Run: `pnpm prisma migrate dev --name phase5_indexes`

### 2.2 API Contracts

#### `GET /api/v1/admin/users` — NEW

List all admin users for the assignee dropdown.

```
Auth:     required (any authenticated admin)
Method:   GET
Path:     /api/v1/admin/users
Response 200:
  {
    "success": true,
    "data": [
      { "id": "cm...", "username": "alice", "email": "alice@example.com", "role": "ADMIN" }
    ],
    "error": null
  }
Response 401: Unauthorized
Response 500: Internal server error
```

#### `POST /api/v1/tickets/:id/assign` — NEW

Assign or unassign a ticket to an admin user.

```
Auth:     required
Method:   POST
Path:     /api/v1/tickets/:id/assign
Body:     { "assigneeId": "cm..." }  // assign
          { "assigneeId": null }      // unassign
Response 200:
  {
    "success": true,
    "data": FeedbackDetail              // full updated ticket including assignee object
  }
Response 400: "assigneeId must be a string or null"
Response 404: "Ticket not found" | "Assignee not found"
Response 401: Unauthorized
Response 500: Internal server error
```

#### `GET /api/v1/tickets` — MODIFY

Add `assigneeId` filter support. Validator addition required (see 2.3).

```
New query param: assigneeId (string, optional) — filter to assigned user's tickets
                 assigneeId=unassigned             — special value: filter tickets with no assignee
```

### 2.3 Zod Schema Changes

```typescript
// src/lib/validators/feedback.ts

// NEW schema
export const assignTicketSchema = z.object({
  assigneeId: z.string().cuid("Invalid assignee ID").nullable(),
});
export type AssignTicketInput = z.infer<typeof assignTicketSchema>;

// MODIFY ticketFiltersSchema — add one field:
assigneeId: z.union([z.string().cuid(), z.literal('unassigned')]).optional(),
// Explicit union rejects arbitrary strings while still allowing the "unassigned" sentinel
```

### 2.4 Type Changes

```typescript
// src/types/index.ts

// NEW
export interface AssigneeInfo {
  id: string;
  username: string;
  email: string;
  role: UserRole;
}

// MODIFY FeedbackDetail — add two new optional fields
// NOTE: assigneeId does NOT currently exist in FeedbackDetail — this is a new addition
// Fields are marked optional (?) to avoid breaking existing test fixtures that mock FeedbackDetail.
// Once all test fixtures are updated to include these fields they may be promoted to required.
export interface FeedbackDetail extends FeedbackSummary {
  description: string;
  email: string | null;
  priority: Priority | null;
  assigneeId?: string | null;     // NEW — aligns type with Prisma runtime data (was never in the TS type)
  assignee?: AssigneeInfo | null; // NEW — full assignee object for display
  statusHistory: StatusHistoryEntry[];
}

// MODIFY TicketListItem — add lightweight assignee for list
// Field is marked optional (?) to avoid breaking existing test fixtures.
export interface TicketListItem extends FeedbackSummary {
  priority: Priority | null;
  assigneeId: string | null;
  assigneeUsername?: string | null; // NEW — for list column display
}
```

### 2.5 Backend Changes

**`GET /api/v1/admin/users`** in `src/app/api/v1/admin/users/route.ts`:

> **SECURITY REQUIREMENT (non-negotiable):** The `AdminUser` Prisma model contains a `passwordHash`
> field. The query MUST use an explicit `select` that excludes it. Never call `findMany()` without
> `select` on this model.

```typescript
// src/app/api/v1/admin/users/route.ts
await prisma.adminUser.findMany({
  select: { id: true, username: true, email: true, role: true },
  orderBy: { username: 'asc' },
});
```

**`TICKET_DETAIL_SELECT`** in `src/app/api/v1/tickets/[id]/route.ts`:
```typescript
// Add to select object:
assignee: {
  select: { id: true, username: true, email: true, role: true },
},
```

**`GET /api/v1/tickets`** in `src/app/api/v1/tickets/route.ts`:
```typescript
// Add to where clause:
...(assigneeId === 'unassigned'
  ? { assigneeId: null }
  : assigneeId
    ? { assigneeId }
    : {}),

// Add to Prisma select:
assignee: { select: { username: true } },
// Map to TicketListItem: assigneeUsername: item.assignee?.username ?? null
```

### 2.6 New Components

**`AssigneePanel`** — `src/components/admin/AssigneePanel.tsx`
```
Props: { ticket: FeedbackDetail; onUpdate: (t: FeedbackDetail) => void }
State: selectedAssigneeId (string | null), isPending (useTransition)
Behaviour:
  - On mount: fetch GET /api/v1/admin/users → populate <select>
  - Shows current assignee (username or "Unassigned")
  - <select aria-labelledby="assignee-heading"> with admin user options + "Unassigned" option
  - "Assign" button → POST /api/v1/tickets/:id/assign
  - Disabled when selectedAssigneeId === current assigneeId
  - toast.success on success, toast.error on failure
```

**`AssigneeBadge`** — `src/components/admin/AssigneeBadge.tsx`
```
Props: { assignee: AssigneeInfo | null; size?: 'sm' | 'md' }
Renders: avatar initial + username, or "Unassigned" in muted text
Used in: TicketDetailView meta row, TicketTable column
```

### 2.7 Modified Components

| File | Change |
|------|--------|
| `TicketDetailView.tsx` | Add `<AssigneeBadge>` in meta row; add `<AssigneePanel>` to sidebar action column |
| `TicketTable.tsx` | Add "Assignee" column; render `<AssigneeBadge size="sm">`. Update empty-state `colSpan` from 7 → 9 (Priority column added in 5-1 + Assignee column here). |
| `TicketFiltersBar.tsx` | Add `<select aria-label="Filter by assignee">` — options from a static list or fetched on mount. **Update "Clear Filters" handler to also reset `assigneeId` to `undefined`** (alongside existing status/type/priority resets). |

### 2.8 File List

| Action | File |
|--------|------|
| CREATE | `src/app/api/v1/admin/users/route.ts` |
| CREATE | `src/app/api/v1/tickets/[id]/assign/route.ts` |
| CREATE | `src/lib/validators/feedback.ts` — add `assignTicketSchema` |
| CREATE | `src/components/admin/AssigneePanel.tsx` |
| CREATE | `src/components/admin/AssigneeBadge.tsx` |
| MODIFY | `src/app/api/v1/tickets/route.ts` (assigneeId filter + assignee select) |
| MODIFY | `src/app/api/v1/tickets/[id]/route.ts` (TICKET_DETAIL_SELECT + assignee) |
| MODIFY | `src/lib/validators/feedback.ts` (ticketFiltersSchema + assigneeId) |
| MODIFY | `src/types/index.ts` (AssigneeInfo, FeedbackDetail, TicketListItem) |
| MODIFY | `src/components/admin/TicketDetailView.tsx` |
| MODIFY | `src/components/admin/TicketTable.tsx` |
| MODIFY | `src/components/admin/TicketFiltersBar.tsx` |
| MODIFY | `prisma/schema.prisma` (indexes — shared with 5-1) |

---

## 3. Phase 5-3: Real-Time Updates (SSE)

### 3.1 DB Schema Changes

None.

### 3.2 Architecture Decision: DB-Polling SSE

**Chosen approach:** Server-Sent Events with server-side database polling.

**Rationale:** Vercel serverless functions are stateless — an in-memory `Set<SSEConnection>` cannot
be shared across invocations. Redis pub/sub with `@upstash/redis` is HTTP-based and does not support
long-lived subscriptions. DB polling SSE is reliable, serverless-compatible, and sufficient for
admin-only real-time updates (low connection count).

**Behaviour:**
1. Client connects with `EventSource('/api/v1/tickets/stream')`
2. Server authenticates via session cookie (same as other admin routes)
3. Server records `lastCheckedAt = new Date()` at connection time
4. Server sends `init` event with current ticket count
5. Server polls `prisma.feedback.findMany({ where: { updatedAt: { gt: lastCheckedAt } } })` every 3 s
6. For each changed ticket: emit `ticket.updated` event; update `lastCheckedAt`
7. Server sends `: keepalive` comment every 15 s to prevent proxy timeout
8. Client's `EventSource` auto-reconnects on disconnect; sends `Last-Event-ID` header with last
   timestamp, allowing the server to back-fill missed events
9. Server-side: `export const maxDuration = 60` (Vercel Hobby limit; increase on Pro)

**SSE vs WebSocket:** SSE is unidirectional (server → client), sufficient for push notifications.
No bidirectional communication is needed for admin dashboard updates.

### 3.3 API Contract

#### `GET /api/v1/tickets/stream` — NEW

```
Auth:    required (session cookie)
Method:  GET
Path:    /api/v1/tickets/stream
Headers: Accept: text/event-stream
         Last-Event-ID: <Unix ms timestamp>  (optional, sent automatically by EventSource on reconnect)

Response headers:
  Content-Type: text/event-stream
  Cache-Control: no-cache, no-transform
  Connection: keep-alive
  X-Accel-Buffering: no

Route config (route file):
  export const dynamic = 'force-dynamic';
  export const maxDuration = 60;  // seconds; increase to 300 on Vercel Pro

Event format:
  id: <Unix ms timestamp>
  event: <type>
  data: <JSON string>
  retry: 5000\n\n

Event types and payloads:
  init           → { total: number; open: number }
  ticket.created → TicketStreamItem (see type below)
  ticket.updated → TicketStreamItem
  keepalive      → comment line only (": keepalive\n\n"), no event/data

Known limitation: ticket.deleted is NOT emitted.
  The polling mechanism uses WHERE updatedAt > lastCheckedAt. The DELETE handler calls
  prisma.feedback.delete() which removes the row entirely — it never touches updatedAt, so
  the poll cannot detect it. Client implementations should handle stale ticket IDs gracefully
  (e.g., ignore 404s on detail fetches; perform a full list refresh on any ticket.updated event
  to remove items no longer present).

Keepalive comment (not a named event — client EventSource ignores comments):
  : keepalive
```

**`TicketStreamItem`** — lightweight payload for SSE events:
```typescript
export interface TicketStreamItem {
  id: string;
  trackingId: string;
  title: string;
  type: FeedbackType;
  status: TicketStatus;
  priority: Priority | null;
  assigneeId: string | null;
  updatedAt: string;  // ISO string
}
```

### 3.4 Reconnect via `Last-Event-ID` Header

The browser `EventSource` spec sends reconnect context as an HTTP **header** (`Last-Event-ID`),
not a query parameter. The server must read this header — not a `since` query param — to support
standard `EventSource` auto-reconnect behaviour.

```typescript
// In GET /api/v1/tickets/stream handler:
const lastEventId = req.headers.get('last-event-id');
// Event id is stored as Unix ms timestamp (matches SSE id: field format)
const since = lastEventId ? new Date(Number(lastEventId)) : new Date();
```

**No `streamQuerySchema` is needed** for standard `EventSource` clients. If a non-`EventSource`
client (e.g., curl, custom fetch) needs to specify a start time, an optional `since` query param
of type `z.string().datetime({ offset: true })` may be supported as a fallback — but it must not
be the primary mechanism.

> **Removed:** The `streamQuerySchema` (previously proposed in this section) has been removed.
> `since` as a Zod-validated ISO 8601 datetime query param is incompatible with the `Last-Event-ID`
> header which carries a Unix ms timestamp. The two formats would require dual parsing logic.
> Implementers should use header-based reconnect exclusively.

### 3.5 Type Changes

```typescript
// src/types/index.ts — add

// ticket.deleted is intentionally omitted — deleted rows cannot be detected via updatedAt polling.
// See §3.3 Known Limitation for details.
export type SSEEventType = 'init' | 'ticket.created' | 'ticket.updated';

export interface TicketStreamItem {
  id: string;
  trackingId: string;
  title: string;
  type: FeedbackType;
  status: TicketStatus;
  priority: Priority | null;
  assigneeId: string | null;
  updatedAt: string;
}

export interface SSEInitPayload {
  total: number;
  open: number;
}
```

### 3.6 SSE Helper Utility

**`src/lib/sse/format.ts`** — pure formatting functions, no side effects:
```typescript
// formatSSEEvent(id, event, data) → string in SSE wire format
// formatSSEComment(comment) → ": comment\n\n"
// STREAM_POLL_INTERVAL_MS = 3000
// STREAM_KEEPALIVE_INTERVAL_MS = 15000
```

**REQUIRED: `cancel()` teardown in the `ReadableStream` constructor** (route handler):

> **Resource leak prevention (non-negotiable):** The SSE route starts a `setInterval` (poll, 3 s)
> and a second `setInterval` (keepalive, 15 s). If the client disconnects before Vercel's
> `maxDuration` is reached, these intervals continue running and issue wasted DB queries until
> the serverless function terminates. The `ReadableStream` `cancel` callback is the only reliable
> hook for cleanup.

```typescript
// In src/app/api/v1/tickets/stream/route.ts — ReadableStream constructor
new ReadableStream({
  start(controller) {
    pollTimer = setInterval(async () => { /* poll DB */ }, STREAM_POLL_INTERVAL_MS);
    keepaliveTimer = setInterval(() => { /* send comment */ }, STREAM_KEEPALIVE_INTERVAL_MS);
  },
  cancel() {
    clearInterval(pollTimer);
    clearInterval(keepaliveTimer);
  },
});
```

Both `pollTimer` and `keepaliveTimer` must be declared in the enclosing scope so they are
accessible in `cancel()`. This pattern must be present in the implementation — it is not optional.

### 3.7 Emission Mechanism (Mutation Routes)

After successful mutations, the SSE endpoint auto-discovers changes via DB polling — **no explicit
publish calls required** in the mutation routes. The polling detects all `updatedAt` changes.

**Known limitation — DELETE not detectable via SSE:**
`DELETE /api/v1/tickets/:id` calls `prisma.feedback.delete()` which removes the row entirely. The
polling query (`WHERE updatedAt > lastCheckedAt`) will never see a row that no longer exists, so
no `ticket.deleted` event is emitted. The `ticket.deleted` event type has been removed from the
SSE contract (see §3.3 and §3.5).

**Client-side mitigation for deletes:**
- When the detail page for a deleted ticket is loaded, the `GET /api/v1/tickets/:id` route returns
  404 — the page-level error boundary handles this.
- The ticket list page should perform a full refresh (`GET /api/v1/tickets`) on any `ticket.updated`
  event to remove items no longer present. This is a simple, reliable approach for admin-only use.

### 3.8 New Client Hook

**`src/hooks/useTicketStream.ts`** — `'use client'`

```typescript
// Signature:
useTicketStream(options?: { onCreated?: (t: TicketStreamItem) => void;
                             onUpdated?: (t: TicketStreamItem) => void;
                             // onDeleted is intentionally omitted — ticket.deleted is not emitted
                             // (deleted rows undetectable via updatedAt polling — see §3.7)
                             enabled?: boolean; }) => { connected: boolean }

// Behaviour:
// - Creates EventSource on mount (if enabled !== false)
// - Fires callbacks on each event type
// - Cleans up EventSource on unmount
// - Sets connected=true on 'open', false on 'error'
// - Shows toast.info("Live updates active") on first connect (dismissible)
```

### 3.9 New UI Component

**`LiveIndicator`** — `src/components/admin/LiveIndicator.tsx`

```
Props: { connected: boolean }
Renders: pulsing green dot + "Live" label when connected
         gray dot + "Offline" when not connected
Used in: AdminHeader (top bar)
```

### 3.10 Modified Components

| File | Change |
|------|--------|
| `TicketListPageContent.tsx` | Integrate `useTicketStream`; on `onCreated`: prepend ticket + show "1 new ticket" banner; on `onUpdated`: replace matching item in list + perform full re-fetch to handle any deletes that may have occurred (ticket.deleted is not supported — see §3.7) |
| `AdminHeader.tsx` | Add `<LiveIndicator>` component with SSE connection status |
| `dashboard/page.tsx` | Add client wrapper `DashboardLiveUpdater` that uses `useTicketStream` to refresh stats card when `onCreated` fires |

### 3.11 File List

| Action | File |
|--------|------|
| CREATE | `src/app/api/v1/tickets/stream/route.ts` — **must include `cancel()` with `clearInterval(pollTimer); clearInterval(keepaliveTimer)` (see §3.6)** |
| CREATE | `src/lib/sse/format.ts` |
| CREATE | `src/types/index.ts` — add SSE types |
| CREATE | `src/hooks/useTicketStream.ts` |
| CREATE | `src/components/admin/LiveIndicator.tsx` |
| MODIFY | `src/components/admin/TicketListPageContent.tsx` |
| MODIFY | `src/components/admin/AdminHeader.tsx` |
| MODIFY | `src/app/(admin)/dashboard/page.tsx` |

---

## 4. Phase 5-4: Analytics Dashboard

### 4.1 DB Schema Changes

None. Analytics queries operate on existing `Feedback` and `StatusHistory` tables using raw SQL
(`prisma.$queryRaw`) for date truncation and window functions.

### 4.2 New Dependency

```bash
pnpm dlx shadcn@latest add chart
# Installs recharts ^2.x and creates src/components/ui/chart.tsx
```

The shadcn Chart component provides `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`,
`ChartLegend`, and `ChartLegendContent` wrappers around recharts primitives.

**Package change:** `recharts` added to `dependencies` (auto-managed by shadcn add).

### 4.3 API Contract

#### `GET /api/v1/tickets/analytics` — NEW

```
Auth:   required
Method: GET
Path:   /api/v1/tickets/analytics
Query:
  period      = "7d" | "30d" | "90d"   (default "30d")
  granularity = "day" | "week"          (default "day")

Response 200:
  {
    "success": true,
    "data": {
      "period": "30d",
      "granularity": "day",
      "startDate": "2026-02-15T00:00:00.000Z",
      "total": 169,
      "trend": [
        { "date": "2026-02-15", "count": 5 },
        { "date": "2026-02-16", "count": 3 },
        ...
      ],
      "avgResponseTimeHours": 8.3,
      "avgResponseTimeByType": {
        "BUG": 6.2,
        "FEATURE": 14.1,
        "GENERAL": 5.8
      },
      "statusFunnel": {
        "OPEN": 45,
        "IN_PROGRESS": 12,
        "RESOLVED": 89,
        "CLOSED": 23
      },
      "typeBreakdown": {
        "BUG": 67,
        "FEATURE": 45,
        "GENERAL": 57
      },
      "openRate": 26.6,
      "resolutionRate": 66.3
    },
    "error": null
  }

Response 400: invalid period or granularity
Response 401: Unauthorized
Response 500: Internal server error
```

**Computed fields:**
- `openRate = (OPEN / total) * 100`
- `resolutionRate = ((RESOLVED + CLOSED) / total) * 100`
- `avgResponseTimeHours` = null if no resolved tickets in period

### 4.4 Zod Schema Changes

```typescript
// src/lib/validators/feedback.ts — add

export const analyticsQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d']).default('30d'),
  granularity: z.enum(['day', 'week']).default('day'),
});
export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;
```

### 4.5 Type Changes

```typescript
// src/types/index.ts — add

export interface TrendDataPoint {
  date: string;    // ISO date string "YYYY-MM-DD"
  count: number;
}

export interface AnalyticsData {
  period: '7d' | '30d' | '90d';
  granularity: 'day' | 'week';
  startDate: string;             // ISO timestamp
  total: number;
  trend: TrendDataPoint[];
  avgResponseTimeHours: number | null;
  avgResponseTimeByType: Record<FeedbackType, number | null>;
  statusFunnel: Record<TicketStatus, number>;
  typeBreakdown: Record<FeedbackType, number>;
  openRate: number;              // 0–100
  resolutionRate: number;        // 0–100
}
```

### 4.6 Analytics Service

**`src/server/services/analytics.ts`**

Implements `getAnalyticsData(input: AnalyticsQueryInput): Promise<AnalyticsData>`.

Uses three queries (run in `Promise.all`):

**Query 1 — Trend (raw SQL for date truncation):**
```sql
SELECT
  TO_CHAR(DATE_TRUNC($granularity, "createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date,
  COUNT(*)::int AS count
FROM "Feedback"
WHERE "createdAt" >= $startDate
GROUP BY DATE_TRUNC($granularity, "createdAt" AT TIME ZONE 'UTC')
ORDER BY 1 ASC
```
Prisma: `prisma.$queryRaw<TrendRow[]>` with tagged template literal.

**Query 2 — Average response time (raw SQL):**
```sql
SELECT
  f.type,
  AVG(
    EXTRACT(EPOCH FROM (sh."createdAt" - f."createdAt")) / 3600.0
  )::float AS avg_hours
FROM "Feedback" f
INNER JOIN (
  SELECT DISTINCT ON ("feedbackId") "feedbackId", "createdAt"
  FROM "StatusHistory"
  WHERE "toStatus" IN ('RESOLVED', 'CLOSED')
  ORDER BY "feedbackId", "createdAt" ASC
) sh ON sh."feedbackId" = f.id
WHERE f."createdAt" >= $startDate
GROUP BY f.type
```
`DISTINCT ON ("feedbackId")` selects the first (earliest) resolution event per ticket.

**Query 3 — Status and type breakdown (Prisma groupBy — same pattern as `getTicketStats`):**
```typescript
prisma.feedback.groupBy({ by: ['status'], _count: true, where: { createdAt: { gte: startDate } } })
prisma.feedback.groupBy({ by: ['type'],   _count: true, where: { createdAt: { gte: startDate } } })
prisma.feedback.count({ where: { createdAt: { gte: startDate } } })
```

**Trend gap-filling:** After the DB query, fill dates with zero count for days with no submissions
so the chart renders a continuous line (not gaps). Implemented as a pure utility function
`fillTrendGaps(rows, startDate, granularity): TrendDataPoint[]`.

**Divide-by-zero guard for rate fields:** When `total === 0` (no tickets in the selected period),
JavaScript division produces `NaN` which will cause recharts to render incorrectly. Use:
```typescript
openRate: total > 0 ? (statusFunnel.OPEN / total) * 100 : 0,
resolutionRate: total > 0 ? ((statusFunnel.RESOLVED + statusFunnel.CLOSED) / total) * 100 : 0,
```

### 4.7 New Admin Page

**Route:** `/admin/analytics`
**File:** `src/app/(admin)/analytics/page.tsx` (React Server Component)

```
Component tree:

AnalyticsPage (server component — fetches initial data for period="30d")
├── <h1>Analytics</h1>
├── PeriodTabs (client component)       ← 7d / 30d / 90d tab selector
└── AnalyticsDashboard (client component, receives data as prop or re-fetches on period change)
    ├── AnalyticsSummaryCards
    │   ├── SummaryCard "Total Submissions"  (total count)
    │   ├── SummaryCard "Avg Response Time"  (avgResponseTimeHours, formatted as "X.X hrs")
    │   ├── SummaryCard "Open Rate"          (openRate + %)
    │   └── SummaryCard "Resolution Rate"   (resolutionRate + %)
    ├── TrendChart                       ← recharts AreaChart
    ├── TypeBreakdownChart               ← recharts PieChart
    └── StatusFunnelChart                ← recharts BarChart (horizontal)
```

### 4.8 New Chart Components

All chart components are `'use client'` and use shadcn `ChartContainer`.

**`TrendChart`** — `src/components/admin/charts/TrendChart.tsx`
```
Props: { data: TrendDataPoint[]; granularity: 'day' | 'week' }
Chart: recharts AreaChart with single area (fill + stroke)
X-axis: date labels (abbreviated via date-fns format)
Y-axis: count (integer ticks)
Tooltip: "N submissions on [date]"
Empty state: "No data for this period" placeholder
```

**`TypeBreakdownChart`** — `src/components/admin/charts/TypeBreakdownChart.tsx`
```
Props: { data: Record<FeedbackType, number> }
Chart: recharts PieChart with three slices (BUG, FEATURE, GENERAL)
Colors: BUG=destructive, FEATURE=primary, GENERAL=secondary
Legend: type labels with counts
Tooltip: "N tickets (X%)"
```

**`StatusFunnelChart`** — `src/components/admin/charts/StatusFunnelChart.tsx`
```
Props: { data: Record<TicketStatus, number> }
Chart: recharts BarChart horizontal — shows OPEN→IN_PROGRESS→RESOLVED→CLOSED as stages
Each bar colored matching TicketStatusBadge palette
Tooltip: "N tickets"
Note: "funnel" here is a conceptual stage view; recharts BarChart is used (not FunnelChart)
      because FunnelChart has limited accessibility support
```

**`AnalyticsSummaryCards`** — `src/components/admin/charts/AnalyticsSummaryCards.tsx`
```
Props: { data: AnalyticsData }
Renders: 4 StatsCard instances (reuses existing component)
Formats avgResponseTimeHours: < 1h → "< 1 hr"; 1h+ → "X.X hrs"; null → "N/A"
```

### 4.9 Modified Components

| File | Change |
|------|--------|
| `AdminSidebar.tsx` | Add `{ href: '/admin/analytics', label: 'Analytics', icon: BarChart3 }` to `navItems` |
| `src/types/index.ts` | Add `TrendDataPoint`, `AnalyticsData` types |
| `src/lib/validators/feedback.ts` | Add `analyticsQuerySchema` |

### 4.10 File List

| Action | File |
|--------|------|
| CREATE | `src/app/api/v1/tickets/analytics/route.ts` |
| CREATE | `src/server/services/analytics.ts` |
| CREATE | `src/app/(admin)/analytics/page.tsx` |
| CREATE | `src/components/admin/charts/TrendChart.tsx` |
| CREATE | `src/components/admin/charts/TypeBreakdownChart.tsx` |
| CREATE | `src/components/admin/charts/StatusFunnelChart.tsx` |
| CREATE | `src/components/admin/charts/AnalyticsSummaryCards.tsx` |
| MODIFY | `src/components/admin/AdminSidebar.tsx` |
| MODIFY | `src/types/index.ts` |
| MODIFY | `src/lib/validators/feedback.ts` |
| MODIFY | `package.json` (recharts added by `shadcn add chart`) |
| MODIFY | `src/components/ui/chart.tsx` (created by `shadcn add chart`) |

---

## 5. DB Schema Changes — Full Summary

### 5.1 Prisma Schema Diff

```prisma
// prisma/schema.prisma

model Feedback {
  // ... existing fields unchanged ...

  @@index([status])
  @@index([type])
  @@index([createdAt])
  @@index([trackingId])
  @@index([priority])    // NEW — Phase 5-1/5-2
  @@index([assigneeId])  // NEW — Phase 5-2
}
```

**One migration:** `prisma/migrations/20260317_phase5_indexes/migration.sql`
```sql
CREATE INDEX "Feedback_priority_idx" ON "Feedback"("priority");
CREATE INDEX "Feedback_assigneeId_idx" ON "Feedback"("assigneeId");
```

These are non-blocking index additions with no data migration.

---

## 6. API Contracts — Complete Inventory

### New Endpoints

| Method | Path | Auth | Phase |
|--------|------|------|-------|
| GET | `/api/v1/admin/users` | ✅ required | 5-2 |
| POST | `/api/v1/tickets/:id/assign` | ✅ required | 5-2 |
| GET | `/api/v1/tickets/stream` | ✅ required | 5-3 |
| GET | `/api/v1/tickets/analytics` | ✅ required | 5-4 |

### Modified Endpoints

| Method | Path | Change | Phase |
|--------|------|--------|-------|
| GET | `/api/v1/tickets` | Add `assigneeId` filter param; add `assigneeUsername` to select | 5-2 |
| GET | `/api/v1/tickets/:id` | Expand `TICKET_DETAIL_SELECT` to include `assignee` object | 5-2 |

### Existing Endpoints (No Change)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/v1/feedback` | No change — SSE auto-detects via polling |
| PATCH | `/api/v1/tickets/:id` | No change — SSE auto-detects via polling |
| DELETE | `/api/v1/tickets/:id` | No change |
| GET | `/api/v1/tickets/stats` | No change |
| GET | `/api/v1/feedback/:trackingId` | No change |
| GET | `/api/v1/status` | No change |

---

## 7. Zod Validator Changes — Complete Summary

```typescript
// src/lib/validators/feedback.ts

// MODIFY: ticketFiltersSchema — add one field
assigneeId: z.string().optional()

// NEW: assignTicketSchema
export const assignTicketSchema = z.object({
  assigneeId: z.string().cuid("Invalid assignee ID").nullable(),
});

// NOTE: streamQuerySchema removed — reconnect uses Last-Event-ID header, not a query param.
// See §3.4 for details. No Zod schema is needed for the SSE stream endpoint.

// NEW: analyticsQuerySchema
export const analyticsQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d']).default('30d'),
  granularity: z.enum(['day', 'week']).default('day'),
});
```

---

## 8. Component Tree — Full Admin Application

```
(admin layout — AdminSidebar + AdminHeader + main)
├── AdminSidebar
│   └── navItems: Dashboard | Tickets | Analytics (NEW)
├── AdminHeader
│   └── LiveIndicator (NEW 5-3)
├── /admin/dashboard
│   ├── StatsCards (x4)
│   ├── TypeBreakdownCard
│   ├── RecentActivityCard
│   ├── RecentTicketsTable
│   └── DashboardLiveUpdater (NEW 5-3, invisible, uses useTicketStream)
├── /admin/tickets
│   └── TicketListPageContent
│       ├── TicketFiltersBar (MODIFY: +priority filter, +assignee filter)
│       ├── TicketTable (MODIFY: +Priority col, +Assignee col)
│       │   └── TicketTableRow
│       │       ├── TicketTypeBadge
│       │       ├── TicketStatusBadge
│       │       ├── TicketPriorityBadge (NEW 5-1)
│       │       └── AssigneeBadge (NEW 5-2)
│       └── TicketPagination
├── /admin/tickets/[id]
│   └── TicketDetailView (MODIFY)
│       ├── [meta row] TicketTypeBadge + TicketStatusBadge + TicketPriorityBadge (NEW) + AssigneeBadge (NEW)
│       ├── [description card]
│       ├── StatusHistoryTimeline
│       └── [sidebar]
│           ├── StatusUpdatePanel
│           ├── PriorityUpdatePanel
│           ├── AssigneePanel (NEW 5-2)
│           └── DangerZoneCard
└── /admin/analytics (NEW 5-4)
    └── AnalyticsPage
        ├── PeriodTabs
        └── AnalyticsDashboard
            ├── AnalyticsSummaryCards
            ├── TrendChart
            ├── TypeBreakdownChart
            └── StatusFunnelChart
```

---

## 9. File List — Complete

### CREATE

| File | Phase |
|------|-------|
| `src/components/admin/TicketPriorityBadge.tsx` | 5-1 |
| `src/app/api/v1/admin/users/route.ts` | 5-2 |
| `src/app/api/v1/tickets/[id]/assign/route.ts` | 5-2 |
| `src/components/admin/AssigneePanel.tsx` | 5-2 |
| `src/components/admin/AssigneeBadge.tsx` | 5-2 |
| `src/app/api/v1/tickets/stream/route.ts` | 5-3 |
| `src/lib/sse/format.ts` | 5-3 |
| `src/hooks/useTicketStream.ts` | 5-3 |
| `src/components/admin/LiveIndicator.tsx` | 5-3 |
| `src/app/api/v1/tickets/analytics/route.ts` | 5-4 |
| `src/server/services/analytics.ts` | 5-4 |
| `src/app/(admin)/analytics/page.tsx` | 5-4 |
| `src/components/admin/charts/TrendChart.tsx` | 5-4 |
| `src/components/admin/charts/TypeBreakdownChart.tsx` | 5-4 |
| `src/components/admin/charts/StatusFunnelChart.tsx` | 5-4 |
| `src/components/admin/charts/AnalyticsSummaryCards.tsx` | 5-4 |

### MODIFY

| File | Change | Phase |
|------|--------|-------|
| `prisma/schema.prisma` | Add `@@index([priority])`, `@@index([assigneeId])` | 5-1/5-2 |
| `src/types/index.ts` | AssigneeInfo, FeedbackDetail.assignee, TicketListItem.assigneeUsername, SSE types, AnalyticsData | 5-2/5-3/5-4 |
| `src/lib/validators/feedback.ts` | ticketFiltersSchema+assigneeId, assignTicketSchema, streamQuerySchema, analyticsQuerySchema | 5-2/5-3/5-4 |
| `src/app/api/v1/tickets/route.ts` | assigneeId filter, assigneeUsername in select | 5-2 |
| `src/app/api/v1/tickets/[id]/route.ts` | TICKET_DETAIL_SELECT + assignee object | 5-2 |
| `src/components/admin/TicketFiltersBar.tsx` | Priority filter select, assignee filter select | 5-1/5-2 |
| `src/components/admin/TicketTable.tsx` | Priority column, assignee column | 5-1/5-2 |
| `src/components/admin/TicketDetailView.tsx` | Priority badge, AssigneeBadge, AssigneePanel | 5-1/5-2 |
| `src/components/admin/TicketListPageContent.tsx` | SSE integration via useTicketStream | 5-3 |
| `src/components/admin/AdminHeader.tsx` | LiveIndicator | 5-3 |
| `src/app/(admin)/dashboard/page.tsx` | DashboardLiveUpdater client wrapper | 5-3 |
| `src/components/admin/AdminSidebar.tsx` | Add Analytics nav item | 5-4 |
| `src/components/ui/chart.tsx` | Created by `shadcn add chart` | 5-4 |
| `package.json` | recharts added by `shadcn add chart` | 5-4 |

---

## 10. Implementation Order

```
Step 0 — Dependency and Schema
  ├── prisma migrate dev --name phase5_indexes   (adds priority + assigneeId indexes)
  └── pnpm dlx shadcn@latest add chart           (recharts + chart.tsx)

Step 1 — Phase 5-1: Priority UI (smallest scope, unblocks table layout changes)
  ├── src/components/admin/TicketPriorityBadge.tsx
  ├── Modify TicketFiltersBar.tsx (add priority select)
  ├── Modify TicketTable.tsx (add priority column)
  └── Modify TicketDetailView.tsx (add priority badge to meta row)

Step 2 — Phase 5-2: Assignee (depends on Step 1 for table layout baseline)
  ├── Modify types/index.ts (AssigneeInfo, FeedbackDetail.assignee)
  ├── Modify validators/feedback.ts (assignTicketSchema, assigneeId filter)
  ├── Modify tickets/route.ts (assigneeId filter + assigneeUsername select)
  ├── Modify tickets/[id]/route.ts (TICKET_DETAIL_SELECT)
  ├── CREATE api/v1/admin/users/route.ts
  ├── CREATE api/v1/tickets/[id]/assign/route.ts
  ├── CREATE AssigneeBadge.tsx
  ├── CREATE AssigneePanel.tsx
  ├── Modify TicketTable.tsx (assignee column)
  ├── Modify TicketFiltersBar.tsx (assignee filter)
  └── Modify TicketDetailView.tsx (AssigneeBadge + AssigneePanel)

Step 3 — Phase 5-3: SSE (independent of Steps 1-2)
  ├── CREATE src/lib/sse/format.ts
  ├── Modify validators/feedback.ts (streamQuerySchema)
  ├── Modify types/index.ts (SSE types)
  ├── CREATE api/v1/tickets/stream/route.ts
  ├── CREATE src/hooks/useTicketStream.ts
  ├── CREATE src/components/admin/LiveIndicator.tsx
  ├── Modify AdminHeader.tsx (LiveIndicator)
  ├── Modify TicketListPageContent.tsx (useTicketStream integration)
  └── Modify dashboard/page.tsx (DashboardLiveUpdater)

Step 4 — Phase 5-4: Analytics (independent of Steps 1-3)
  ├── Modify types/index.ts (AnalyticsData, TrendDataPoint)
  ├── Modify validators/feedback.ts (analyticsQuerySchema)
  ├── CREATE server/services/analytics.ts
  ├── CREATE api/v1/tickets/analytics/route.ts
  ├── CREATE charts/AnalyticsSummaryCards.tsx
  ├── CREATE charts/TrendChart.tsx
  ├── CREATE charts/TypeBreakdownChart.tsx
  ├── CREATE charts/StatusFunnelChart.tsx
  ├── CREATE app/(admin)/analytics/page.tsx
  └── Modify AdminSidebar.tsx (Analytics nav item)

Step 5 — Tests (write tests after each step, or all at end)
  ├── Unit: AnalyticsService (mock prisma.$queryRaw)
  ├── Unit: fillTrendGaps utility
  ├── Unit: SSE format.ts (pure functions)
  ├── Unit: assignTicketSchema, analyticsQuerySchema, streamQuerySchema
  ├── Integration: GET /api/v1/admin/users
  ├── Integration: POST /api/v1/tickets/:id/assign
  ├── Integration: GET /api/v1/tickets/analytics
  ├── Integration: GET /api/v1/tickets (assigneeId filter)
  └── Component: TicketPriorityBadge, AssigneeBadge, LiveIndicator
```

---

## 11. Testing Approach

### Unit Tests (Vitest, no DB)

| Test | File |
|------|------|
| `analyticsQuerySchema` validation | `validators/feedback.test.ts` (existing file, add cases) |
| `assignTicketSchema` validation | same |
| `streamQuerySchema` validation | same |
| `fillTrendGaps(rows, start, gran)` — gaps filled correctly | `analytics.test.ts` |
| `formatSSEEvent(id, type, data)` → correct wire format | `sse/format.test.ts` |
| `TicketPriorityBadge` renders null for null priority | component test |
| `AssigneeBadge` renders "Unassigned" for null | component test |
| `LiveIndicator` shows correct state | component test |

### Integration Tests (Vitest + real DB)

| Test | File |
|------|------|
| `GET /api/v1/admin/users` returns admin list | `admin-users.test.ts` |
| `POST /api/v1/tickets/:id/assign` assigns correctly | `ticket-assign.test.ts` |
| `POST /api/v1/tickets/:id/assign` with null unassigns | same |
| `POST /api/v1/tickets/:id/assign` with unknown assigneeId → 404 | same |
| `GET /api/v1/tickets?assigneeId=unassigned` returns unassigned | `tickets-list.test.ts` (existing, add case) |
| `GET /api/v1/tickets/analytics?period=7d` returns shape | `analytics-api.test.ts` |
| `GET /api/v1/tickets/analytics` avgResponseTime only for resolved | same |

### Manual / Browser Tests

| Test | Method |
|------|--------|
| SSE connection opens and sends `init` event | DevTools → Network → EventStream tab |
| SSE `ticket.updated` fires when ticket PATCH occurs | Open two browser tabs; update in one, observe other |
| Analytics charts render with real data | Visual inspection in `/admin/analytics` |
| Priority badge displays correctly for all 4 values | Visual inspection |
| Assignee select populates with real admin users | Visual inspection in `AssigneePanel` |

---

## 12. Known Constraints and Future Considerations

| Item | Note |
|------|------|
| SSE on Vercel Hobby | `maxDuration = 60` (60-second max). Users see auto-reconnect every minute — functionally fine for admin dashboard. Increase to 300 on Pro. |
| SSE at scale | DB polling (one query per connection per 3s) is sufficient for < 50 concurrent admin users. For higher scale, upgrade to Redis pub/sub using existing `@upstash/redis` dep. |
| Analytics raw SQL | `prisma.$queryRaw` bypasses Prisma type safety; validate all inputs rigorously in `analyticsQuerySchema` to prevent injection. Prisma tagged template literals prevent SQL injection — always use them, never string concatenation. |
| recharts bundle size | recharts adds ~350 KB gzipped. Use dynamic import for `AnalyticsDashboard` with `next/dynamic` + `loading` prop to keep initial page load fast. |
| Assignee permissions | Phase 5 does not restrict who can be assigned (any `AdminUser`). RBAC enforcement (e.g., only `MANAGER` role can assign) is Phase 6 scope. |
| Priority filter in TicketFiltersBar | Currently `TicketFiltersBar` does not have a priority select despite the API supporting it. Phase 5-1 adds this. |

---

## References

- [Recharts Documentation](https://recharts.org/en-US/)
- [shadcn/ui Chart Component](https://ui.shadcn.com/docs/components/chart)
- [MDN: Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Next.js Streaming](https://nextjs.org/docs/app/building-your-application/routing/route-handlers#streaming)
- [Prisma $queryRaw](https://www.prisma.io/docs/orm/prisma-client/queries/raw-database-access/raw-queries)
- `src/server/services/ticket-stats.ts` — pattern to follow for analytics service
- `src/lib/api/response.ts` — response helpers (all endpoints use these)
- `src/lib/api/require-auth.ts` — auth helper (all admin endpoints use this)
