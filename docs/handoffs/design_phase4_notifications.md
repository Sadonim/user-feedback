# Phase 4 Implementation Design — Notifications & Rate Limiting

> Authored by ARCHITECT agent, 2026-03-17

## Preamble: Codebase Observations

1. **4-1 (StatusHistory) is already partially done.** `PATCH /api/v1/tickets/:id` already records StatusHistory inside a transaction. `POST /api/v1/feedback` also creates the initial `OPEN` history entry. Only verification + gap tests needed.

2. **4-4 (Rate Limiting) has a working stub.** `src/lib/rate-limit.ts` is an in-memory implementation annotated "Phase 4: Replace with Upstash Redis". Its public interface — `checkRateLimit(key: string): Promise<boolean>` — is used in `feedback/route.ts`. The Upstash replacement must maintain this exact signature.

3. **`resend`, `@upstash/ratelimit`, `@upstash/redis` are not yet in `package.json`.** Must be added.

4. **No Prisma schema changes needed.** Email notifications are fire-and-forget with no persistence. `Notification` model deferred to Phase 5.

---

## 1. Architecture Decisions

### 4-1: StatusHistory Auto-Recording

**Decision: Keep current service-layer approach (no Prisma middleware).**

Already correctly placed inside `$transaction` block in the PATCH route. Only work: write the "same status → no new history entry" test that is currently missing.

### 4-2 and 4-3: Email Notifications

**Decision: Adapter pattern, fire-and-forget async, no DB persistence.**

- Send email async after DB write succeeds
- If email fails, log server-side but do not fail the API response
- NullAdapter used in dev/test when `RESEND_API_KEY` is not set

### 4-4: Rate Limiting with Upstash Redis

**Decision: Replace implementation in `src/lib/rate-limit.ts`, keep the same public interface.**

Use `@upstash/ratelimit` sliding window (5 req / 10 min). Graceful fallback to allow=true when env vars are missing or Redis is unreachable.

### 4-5: Accessibility Audit

**Decision: Audit-only with targeted fixes.** Deliver a findings report + fixes to existing components.

---

## 2. New Files to Create

### Email Infrastructure

**`src/server/services/email/email.adapter.ts`**
```typescript
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface IEmailAdapter {
  send(message: EmailMessage): Promise<void>;
}
```

**`src/server/services/email/adapters/resend.adapter.ts`**
```typescript
export class ResendAdapter implements IEmailAdapter {
  constructor(private readonly apiKey: string, private readonly fromAddress: string) {}
  async send(message: EmailMessage): Promise<void> { ... }
}
```

**`src/server/services/email/adapters/null.adapter.ts`**
```typescript
export class NullAdapter implements IEmailAdapter {
  async send(_message: EmailMessage): Promise<void> { /* no-op */ }
}
```

**`src/server/services/email/email.service.ts`**
```typescript
export interface StatusChangedParams {
  to: string;
  trackingId: string;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus;
  title: string;
  note: string | null;
}

export interface NewFeedbackParams {
  adminEmails: string[];
  trackingId: string;
  type: FeedbackType;
  title: string;
  nickname: string | null;
}

export interface IEmailService {
  notifyStatusChanged(params: StatusChangedParams): Promise<void>;
  notifyAdminNewFeedback(params: NewFeedbackParams): Promise<void>;
}

export class EmailService implements IEmailService {
  constructor(private readonly adapter: IEmailAdapter) {}
  async notifyStatusChanged(params: StatusChangedParams): Promise<void> { ... }
  async notifyAdminNewFeedback(params: NewFeedbackParams): Promise<void> { ... }
}
```

**`src/server/services/email/templates/status-changed.ts`**
Pure function returning `{ subject, html, text }` given `StatusChangedParams`.

**`src/server/services/email/templates/new-feedback.ts`**
Pure function returning `{ subject, html, text }` for admin notifications.

**`src/server/services/email/index.ts`** — Singleton factory
```typescript
function createEmailService(): IEmailService {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[EmailService] RESEND_API_KEY not set — using NullAdapter');
    return new EmailService(new NullAdapter());
  }
  return new EmailService(new ResendAdapter(apiKey, process.env.EMAIL_FROM ?? 'noreply@example.com'));
}

export const emailService: IEmailService = createEmailService();
```

### Test Files

- `src/__tests__/unit/email-templates.test.ts` — template pure function tests
- `src/__tests__/unit/email-service.test.ts` — service with mock adapter
- `src/__tests__/unit/rate-limit.test.ts` — Upstash mock tests
- `src/__tests__/integration/ticket-notifications.test.ts` — PATCH triggers email
- `src/__tests__/integration/feedback-admin-notification.test.ts` — POST triggers admin notification

---

## 3. Files to Modify

| File | Change |
|------|--------|
| `src/lib/rate-limit.ts` | Replace in-memory Map with `@upstash/ratelimit` sliding window; preserve `checkRateLimit(key)` signature; graceful fallback |
| `src/app/api/v1/tickets/[id]/route.ts` | Import `emailService`; extend transaction's `findUnique` to include `email`, `title`, `trackingId`; fire `void emailService.notifyStatusChanged(...)` after commit when `statusChanged && feedback.email` |
| `src/app/api/v1/feedback/route.ts` | Import `emailService`; fire `void emailService.notifyAdminNewFeedback(...)` after successful creation |
| `package.json` | Add `resend`, `@upstash/ratelimit`, `@upstash/redis` |
| `src/__tests__/integration/ticket-detail.test.ts` | Add "same status → no new history entry" test |

---

## 4. Prisma Schema Changes

**None.** `StatusHistory` model is complete. `Notification` model deferred to Phase 5.

---

## 5. Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `RESEND_API_KEY` | Prod | Resend API key. Absent → NullAdapter used silently. |
| `EMAIL_FROM` | Recommended | Sender address. Default: `noreply@example.com`. |
| `ADMIN_NOTIFICATION_EMAILS` | Optional | Comma-separated admin emails. Empty → skip admin notifications. |
| `UPSTASH_REDIS_REST_URL` | Prod | Upstash Redis endpoint. Absent → allow-all fallback. |
| `UPSTASH_REDIS_REST_TOKEN` | Prod | Upstash Redis token. Same fallback. |

---

## 6. API Contract Changes

**None.** All changes are additive side-effects invisible to API consumers.

---

## 7. Test Strategy

### 4-1: StatusHistory gap
- "Same status → no new history entry" test in `ticket-detail.test.ts`

### 4-2: Submitter email
- Unit: template output, error swallowing, null adapter
- Integration: PATCH triggers notify on status change only, not on priority-only, not when email is null

### 4-3: Admin notification
- Integration: POST triggers admin notify; empty adminEmails → no throw

### 4-4: Rate limiting
- Unit: mock Upstash — allow/block/fallback on Redis error
- Existing 456 tests must still pass (they mock `checkRateLimit`)

### 4-5: Accessibility
- `@axe-core/playwright` or `vitest-axe` automated scan
- Manual: keyboard navigation, focus trap, ARIA labels, colour contrast

---

## 8. Implementation Order

1. **Install dependencies** — `resend`, `@upstash/ratelimit`, `@upstash/redis`
2. **Rate limiter replacement** — `src/lib/rate-limit.ts` + `rate-limit.test.ts`
3. **Email infrastructure** — entire `src/server/services/email/` + unit tests
4. **Wire PATCH notification** — `tickets/[id]/route.ts` + `ticket-notifications.test.ts`
5. **Wire POST notification** — `feedback/route.ts` + `feedback-admin-notification.test.ts`
6. **StatusHistory gap test** — add to `ticket-detail.test.ts`
7. **Accessibility audit** — scan + fix + document
8. **Final full test run** — `npm run test:coverage` ≥ 80%
