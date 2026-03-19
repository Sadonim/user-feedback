# Security Review — Phase 5

**Agent:** SECURITY
**Feature:** phase5 (Assignee, SSE, Analytics)
**Date:** 2026-03-19
**Reviewer:** SECURITY agent

---

## STATUS: REVIEWED

```
SEVERITY_SUMMARY: CRITICAL:0 / HIGH:0 / MEDIUM:3 / LOW:1
```

No critical or high issues found. Implementation may proceed to REFACTOR and RUNNER.

---

## Scope Reviewed

| File | Reviewed |
|------|---------|
| `src/app/api/v1/admin/users/route.ts` | ✅ |
| `src/app/api/v1/tickets/[id]/assign/route.ts` | ✅ |
| `src/app/api/v1/tickets/stream/route.ts` | ✅ |
| `src/app/api/v1/analytics/summary/route.ts` | ✅ |
| `src/app/api/v1/analytics/timeseries/route.ts` | ✅ |
| `src/server/services/analytics.ts` | ✅ |
| `src/lib/sse/format.ts` | ✅ |
| `src/hooks/useTicketStream.ts` | ✅ |
| `src/components/admin/AssigneePanel.tsx` | ✅ |
| `src/components/admin/AssigneeBadge.tsx` | ✅ |
| `src/components/admin/charts/*.tsx` | ✅ |
| `src/lib/api/require-auth.ts` | ✅ |
| `src/lib/validators/feedback.ts` | ✅ |
| `auth.ts` | ✅ |
| `middleware.ts` | ✅ |

---

## CRITICAL (halt implementation immediately, must fix)

_None._

---

## HIGH (fix before next commit)

_None._

---

## MEDIUM (fix within this phase)

### M1 — SSE `Last-Event-ID` lacks numeric validation

**File:** `src/app/api/v1/tickets/stream/route.ts` lines 49–52
**Pattern:** Unvalidated header → `NaN` → `Invalid Date` → repeated Prisma errors

```ts
// CURRENT (vulnerable)
const lastEventIdHeader = req.headers.get("last-event-id");
let lastCheckedAt = lastEventIdHeader
  ? new Date(Number(lastEventIdHeader))
  : new Date();
```

`Number("not-a-number")` returns `NaN`. `new Date(NaN)` is an Invalid Date.
Prisma's `findMany({ where: { updatedAt: { gt: Invalid Date } } })` will throw on
every poll tick (every 3 s). The catch block suppresses the error, so the SSE
stream stays open but never emits ticket events for that connection.

**Impact:** An authenticated admin sending a crafted `Last-Event-ID: garbage` header
causes their own stream to silently fail — a self-affecting DoS. Server logs will
flood with `[SSE] poll failed` errors.

**Fix:**
```ts
const lastEventIdHeader = req.headers.get("last-event-id");
const lastEventIdMs = lastEventIdHeader ? Number(lastEventIdHeader) : NaN;
let lastCheckedAt =
  !Number.isNaN(lastEventIdMs) && Number.isFinite(lastEventIdMs)
    ? new Date(lastEventIdMs)
    : new Date();
```

---

### M2 — Rate limiting not applied to new admin endpoints

**Files:** All 5 new route handlers
**Pattern:** `checkRateLimit` is only used in `src/app/api/v1/feedback/route.ts`

None of the 5 new admin endpoints call `checkRateLimit`. While all require
authentication (reducing severity significantly), a compromised admin account
could:
- Enumerate admin users in a tight loop (`GET /admin/users`)
- Trigger repeated analytics DB aggregation queries (`GET /analytics/summary`)
- Open many concurrent SSE connections draining DB connection pool

**Fix:** Add rate limiting to admin endpoints. Per-admin-user key (not per-IP,
since admin traffic typically comes from shared office IPs):

```ts
// Example for /analytics endpoints
const allowed = await checkRateLimit(`admin:${authResult.user.id}`);
if (!allowed) return tooManyRequests();
```

For SSE, consider limiting concurrent connections per admin user rather than
request-based limiting.

**Priority:** Medium — authentication mitigates most risk; apply before
production launch.

---

### M3 — `AnalyticsDashboard` calls a non-existent API endpoint

**File:** `src/components/admin/charts/AnalyticsDashboard.tsx` line 38
**Pattern:** Wrong URL → 404 on period change

```ts
// CURRENT (broken)
const res = await fetch(`/api/v1/tickets/analytics?period=${newPeriod}&granularity=day`);
```

The route `/api/v1/tickets/analytics` does not exist. The correct documented
analytics endpoint is `/api/v1/analytics/summary` (all-time) or
`/api/v1/analytics/timeseries` (daily counts). Additionally,
`getAnalyticsData()` — which provides period-filtered trend data — is only
called server-side from the RSC page; there is no REST route that exposes it.

**Security note:** The 404 response is handled gracefully with `toast.error()`,
so no data leaks. However, period changes silently fail for users.

**Fix:** Either:
1. Create a `GET /api/v1/analytics/data?period=...&granularity=...` route backed
   by `getAnalyticsData()`, OR
2. Change the dashboard to call the timeseries endpoint and reconstruct the
   `AnalyticsData` shape client-side.

This is primarily a functional bug surfaced during security review.

---

## LOW

### L1 — No limit on concurrent SSE connections per user

**File:** `src/app/api/v1/tickets/stream/route.ts`
**Impact:** A single admin account could open many SSE connections, each holding
a DB poll timer (every 3 s), consuming DB connection pool slots.
**Fix:** Track active SSE connections per user in a server-side map and reject
connections above a threshold (e.g., 3 per admin user). Low priority for
single-admin deployments.

---

## Clean / PASS Checks

| Check | Result | Notes |
|-------|--------|-------|
| All 5 endpoints have `requireAuth()` | ✅ PASS | Verified line-by-line |
| `passwordHash` excluded from `/admin/users` response | ✅ PASS | `ADMIN_USER_SELECT` explicitly omits it |
| Assign endpoint: Zod validation on body | ✅ PASS | `assignTicketSchema` (cuid + nullable) |
| Assign endpoint: ticket existence validated | ✅ PASS | `findUnique` before update |
| Assign endpoint: assignee existence validated | ✅ PASS | `findUnique` on AdminUser |
| SSE `cancel()` clears BOTH timers | ✅ PASS | `clearInterval(pollTimer)` + `clearInterval(keepaliveTimer)` |
| Analytics raw SQL injection | ✅ PASS | Prisma `$queryRaw` template literals = parameterized |
| Analytics query param injection | ✅ PASS | `timeseriesQuerySchema` + `analyticsQuerySchema` via Zod |
| `serverError()` leaks stack trace | ✅ PASS | Returns `"Internal server error"` only |
| `AssigneeBadge` XSS | ✅ PASS | Pure React JSX (`{assignee.username}`) — auto-escaped |
| `AssigneePanel` XSS | ✅ PASS | No innerHTML; all strings via React |
| Chart components XSS | ✅ PASS | Recharts + numeric data; no raw HTML |
| `useTicketStream` JSON parse guarded | ✅ PASS | try/catch on all `JSON.parse(e.data)` calls |
| `useTicketStream` cleanup on unmount | ✅ PASS | `es.close()` in effect cleanup |
| SSE CORS headers | ✅ PASS | Admin-only, same-origin — no CORS headers needed |
| JWT expiry | ✅ PASS | 8 hours (previously fixed, H2) |
| Timing attack on login | ✅ PASS | DUMMY_HASH ensures constant-time compare |

---

## Recommendations

1. **M1 fix is straightforward** — 3-line guard on `last-event-id` header before
   creating the SSE stream. Should be fixed before production.

2. **M2 (rate limiting)** — Use `authResult.user.id` as the rate-limit key for
   admin endpoints. Consider a generous limit (e.g., 60 req/min) since admins
   need responsive UX.

3. **M3 (broken analytics URL)** — The analytics page SSR works correctly
   (initial 30d data loads via server-side `getAnalyticsData()`), but client-side
   period switching is broken. A new REST route is needed.

4. **CSP headers** — Consider adding a `Content-Security-Policy` header in
   `next.config.ts` covering the admin path (already recommended in Phase 4 review,
   repeating for visibility).

5. **Prisma selects** — All new endpoints use explicit Prisma `select` objects.
   This pattern is correctly applied throughout Phase 5. Continue enforcing it.
