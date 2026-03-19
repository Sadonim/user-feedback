# REFACTOR Phase 5 — Summary

**Date:** 2026-03-19
**Agent:** REFACTOR
**Triggered by:** SECURITY review (CRITICAL:0 / HIGH:0 / MEDIUM:3)

---

## Fixes Applied

### FIX 1 (M1) — SSE Last-Event-ID NaN guard
**File:** `src/app/api/v1/tickets/stream/route.ts`

**Before:**
```ts
let lastCheckedAt = lastEventIdHeader
  ? new Date(Number(lastEventIdHeader))
  : new Date();
```
Non-numeric header values (e.g., `"abc"`) produced `NaN`, which silently becomes an invalid `Date`.

**After:**
```ts
const lastEventIdMs = lastEventIdHeader ? Number(lastEventIdHeader) : NaN;
let lastCheckedAt =
  !Number.isNaN(lastEventIdMs) && Number.isFinite(lastEventIdMs)
    ? new Date(lastEventIdMs)
    : new Date();
```
Uses `Number.isNaN` + `Number.isFinite` guard before constructing the Date. Falls back to `new Date()` for any non-numeric or non-finite value.

---

### FIX 2 (M3) — AnalyticsDashboard wrong API URL
**File:** `src/components/admin/charts/AnalyticsDashboard.tsx`

**Before:** Called `/api/v1/tickets/analytics` (non-existent endpoint), expected full `AnalyticsData` in response.

**After:** Calls `/api/v1/analytics/timeseries?days=N` (real endpoint). Added `PERIOD_TO_DAYS` mapping:
- `7d` → `days=7`
- `30d` → `days=30`
- `90d` → `days=90`

State update is immutable (spread + partial update):
```ts
setData((prev) => ({
  ...prev,
  period: newPeriod,
  trend: json.data as TimeseriesDataPoint[],
}));
```
Summary metric cards (typeBreakdown, statusFunnel, rates) retain the initial server-side 30d data on period switches, since the timeseries endpoint returns only `TimeseriesDataPoint[]`. The trend chart updates correctly for all periods.

**Note:** If full analytics refresh on period change is needed in future, add a `/api/v1/analytics` route wrapping `getAnalyticsData()` and restore the full `setData(json.data)` pattern.

---

### FIX 3 (M2) — Per-user rate limiting on admin endpoints
**Files modified:**
- `src/lib/rate-limit.ts` — added `checkAdminRateLimit(userId)` function
- `src/app/api/v1/analytics/timeseries/route.ts`
- `src/app/api/v1/analytics/summary/route.ts`
- `src/app/api/v1/tickets/[id]/assign/route.ts`
- `src/app/api/v1/admin/users/route.ts`
- `src/app/api/v1/tickets/stats/route.ts`

**Strategy:** Added a second `Ratelimit` instance in `rate-limit.ts` with `slidingWindow(120, '1 m')` (120 req/min per user). This is appropriately lenient for admin dashboard usage while still preventing runaway scripted abuse. Uses `prefix: 'uf:rl:admin'` to namespace it separately from the public endpoint limiter.

The `getRedisClient()` helper was extracted to eliminate code duplication between the two limiter initializers.

Pattern in each endpoint (after `requireAuth` check):
```ts
const allowed = await checkAdminRateLimit(authResult.user.id);
if (!allowed) return tooManyRequests();
```

---

## General Cleanup

- **`console.log`/`console.debug`:** None found in codebase — clean.
- **Unused imports:** None found in modified files.
- **File sizes:** All modified files are well under the 400-line limit (max: 153 lines for `stream/route.ts`).
- **Immutability:** All state updates use spread operators. No direct object mutation in modified files. Note: `analytics.ts` uses loop-based property assignment to build fresh local objects (initialized in same scope), which is acceptable.
- **TypeScript `any`:** No untyped `any` introduced. Type assertion `as TimeseriesDataPoint[]` on API response is appropriate.

---

## Files Modified

| File | Change |
|------|--------|
| `src/app/api/v1/tickets/stream/route.ts` | NaN-safe Last-Event-ID guard |
| `src/components/admin/charts/AnalyticsDashboard.tsx` | Fix API URL, add PERIOD_TO_DAYS, immutable trend update |
| `src/lib/rate-limit.ts` | Extract `getRedisClient()`, add `checkAdminRateLimit()` |
| `src/app/api/v1/analytics/timeseries/route.ts` | Add `checkAdminRateLimit` call |
| `src/app/api/v1/analytics/summary/route.ts` | Add `checkAdminRateLimit` call |
| `src/app/api/v1/tickets/[id]/assign/route.ts` | Add `checkAdminRateLimit` call |
| `src/app/api/v1/admin/users/route.ts` | Add `checkAdminRateLimit` call |
| `src/app/api/v1/tickets/stats/route.ts` | Add `checkAdminRateLimit` call, remove unused `_request` param |
