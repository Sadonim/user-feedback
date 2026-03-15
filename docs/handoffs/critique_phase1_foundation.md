```
STATUS: REVIEWED
SEVERITY_SUMMARY: CRITICAL:3 / HIGH:4 / MEDIUM:5 / LOW:4
```

# Phase 1 Foundation — Critic Review

**Reviewed by:** CRITIC agent
**Date:** 2026-03-15
**Design file:** `docs/handoffs/design_phase1_foundation.md`

---

## CRITICAL (반드시 수정 후 구현)

### C1: Rate Limiting Absent on Public POST Endpoint — Deferred Too Late

- **Location:** Section 6 (POST /api/v1/feedback), Section 15 (Out of Scope)
- **Problem:** `POST /api/v1/feedback` is a fully public, unauthenticated write endpoint. The design explicitly defers rate limiting to Phase 4. This creates a window of at least three development phases during which the endpoint can be trivially abused — spam submissions, DB flooding, storage exhaustion, and cost amplification (Supabase charges per row and egress). A single automated client can generate thousands of rows per minute. Even a Supabase free-tier DB will hit row/storage caps. There is no IP-based throttle, no per-session limit, and no CAPTCHA fallback.
- **Resolution:** Add a lightweight rate-limiting layer **in Phase 1**, before the endpoint goes live. Acceptable options in order of effort:
  1. **Vercel Edge Middleware** — use the `@upstash/ratelimit` SDK with Redis (Upstash free tier). Limit to, e.g., 5 submissions per IP per 10-minute window. This is a ~20-line middleware file and does not require a Phase 4 deferral.
  2. **In-memory token bucket** (acceptable for single-instance dev/staging only) — use a server-side Map keyed on IP. Acceptable only until Upstash Redis is wired.
  - Add the rate-limit middleware file to the Phase 1 file structure (Section 10) and Wave 3 implementation order (Section 11). Remove from "Out of Scope" in Section 15 or add a note that a basic version is required in Phase 1 and a production-grade version is refined in Phase 4.

---

### C2: trackingId Collision Risk — No Retry or Uniqueness Guarantee at Application Layer

- **Location:** Section 5 (`src/lib/api/tracking-id.ts`), Section 6 (Handler Logic step 3–4)
- **Problem:** `generateTrackingId()` uses `nanoid(8)` over a 62-character alphabet, giving ~218 trillion combinations. The `trackingId` column has a `@unique` constraint. However, the handler pseudocode (Section 6) calls `generateTrackingId()` once and then immediately calls `prisma.feedback.create(...)`. If a collision occurs, the Prisma call throws `P2002` (unique constraint violation), and `handleApiError` correctly returns a 400 with the message "A record with this value already exists." This is **wrong behaviour** — a collision is an internal generation failure, not a client error. The user submitted valid data and receives a 400 response they cannot act on.
- **Resolution:** Wrap the `generateTrackingId()` call in a retry loop with a configurable max-attempts guard (e.g., 3 attempts). Only after exhausting retries should the handler return a 500. Alternatively, detect `P2002` specifically in the feedback creation context and distinguish it from other unique constraint violations (e.g., a duplicate email). A dedicated `createFeedbackWithRetry` service function isolates this logic cleanly and is more testable than inline retry in the route handler.

---

### C3: CORS Configuration Missing for Widget-Origin API Calls

- **Location:** Section 6 and 7 (API endpoints), Section 12 (Dependencies), CLAUDE.md (Embeddable Widget Strategy)
- **Problem:** Phase 3 introduces the embeddable widget, which calls `POST /api/v1/feedback` and `GET /api/v1/feedback/:trackingId` from arbitrary third-party origins. Next.js Route Handlers do **not** add CORS headers by default. If CORS is not configured in Phase 1, the API will silently block widget requests from external origins once the widget is introduced, requiring a retroactive change to already-tested route handlers. More critically, the design does not specify an `allowedOrigins` strategy or a configurable `ALLOWED_ORIGINS` environment variable, which means either the API is locked to same-origin or it must allow all origins (`*`) — both are problematic.
- **Resolution:** Add CORS handling to the API route handlers in Phase 1, even if only same-origin is needed today:
  1. Create `src/lib/api/cors.ts` with a `withCors(handler, options)` wrapper or a utility that returns CORS headers.
  2. Add `ALLOWED_ORIGINS` to the environment variable list (Section 13). Default to `NEXT_PUBLIC_APP_URL` for Phase 1.
  3. Handle `OPTIONS` preflight requests on the feedback routes.
  - This is low-effort now and eliminates a breaking change in Phase 3.

---

## HIGH (가능하면 수정)

### H1: Zod Email Validator Accepts Empty String — Silent Data Quality Issue

- **Location:** Section 3 (`src/lib/validators/feedback.ts`, `email` field)
- **Problem:** The email field is defined as:
  ```typescript
  email: z.string().trim().email(...).optional().or(z.literal(''))
  ```
  The `.or(z.literal(''))` branch allows an empty string to pass validation and be stored in the DB as `""` rather than `null`. This produces inconsistent nullability in the `email` column (some rows will have `null`, others `""`), complicating queries and email-notification logic in Phase 4. The `FeedbackPublicView` type declares `nickname: string | null` but does not include `email` — however, the DB row itself will have dirty data.
- **Resolution:** Replace with a transform that coerces empty strings to `undefined`:
  ```typescript
  email: z.string().trim().email('email must be a valid email address').optional(),
  ```
  And in the route handler, normalize the body before DB insert: if `email === ''`, set it to `undefined`. Alternatively, use `z.preprocess` to strip the field if empty before email validation runs.

---

### H2: Anonymous Submission Allows No Identification Whatsoever — No Policy Defined

- **Location:** Section 6 (POST endpoint), CLAUDE.md Auth Model ("Anonymous users: must provide nickname + optional email")
- **Problem:** The `createFeedbackSchema` makes both `nickname` and `email` fully optional. CLAUDE.md states "Anonymous users: must provide nickname + optional email." These two statements conflict. The design allows a submission with no `nickname`, no `email`, and no `userId` — meaning the submitter has zero ability to re-identify their own ticket (other than saving the `trackingId` themselves). There is no policy for whether completely anonymous submissions should be rejected, warned, or silently accepted. This also creates a support dead-end: admins cannot follow up with users who provided no contact information.
- **Resolution:** Define and enforce one of the following policies explicitly in the design:
  1. **Require nickname for anonymous submissions** — add `.min(1)` without `.optional()` when `userId` is absent. Since the API cannot know if a user is authenticated at validation time (auth is Phase 2), the simplest Phase 1 rule is: if no `userId` context, `nickname` is required.
  2. **Accept fully anonymous** but add a `isAnonymous: boolean` computed field to the `FeedbackPublicView` to make the state explicit.
  - The chosen policy must be reflected in the Zod schema, the acceptance criteria (Section 14), and the UI (the nickname input must not be optional in the form if policy 1 is chosen).

---

### H3: StatusHistory Initial Entry Not Atomic with Feedback Creation

- **Location:** Section 6 (Handler Logic steps 4–5)
- **Problem:** The pseudocode shows two separate operations:
  ```
  4. prisma.feedback.create(...)
  5. Create initial StatusHistory entry: { feedbackId, fromStatus: null, toStatus: OPEN }
  ```
  These are sequential, not wrapped in a transaction. If step 5 fails (e.g., due to a transient DB error), the Feedback row exists but has no `StatusHistory`. The `GET /api/v1/feedback/:trackingId` response always includes `statusHistory`, and the `StatusTimeline` component maps over it — an empty array is technically valid but inconsistent with the invariant that every ticket starts with an OPEN entry. Subsequent timeline display will show a ticket with no history of when it was opened.
- **Resolution:** Use a Prisma nested write or `$transaction` to ensure atomicity:
  ```typescript
  await prisma.feedback.create({
    data: {
      ...validatedBody,
      trackingId,
      status: 'OPEN',
      statusHistory: {
        create: { fromStatus: null, toStatus: 'OPEN' }
      }
    }
  });
  ```
  This eliminates the two-step write and makes the operation atomic without requiring an explicit `$transaction` call.

---

### H4: GET /api/v1/feedback/:trackingId Exposes Enumerable Resource

- **Location:** Section 7 (GET endpoint)
- **Problem:** The endpoint is fully public with no authentication and no anti-enumeration protection. Although `trackingId` is not sequential, the regex `^FB-[A-Za-z0-9]{8}$` defines the full search space. A determined attacker can brute-force valid tracking IDs. Once found, they see the ticket title, description, nickname, and full status history. For sensitive bug reports, this leaks user-reported data to unauthorized parties.
- **Resolution:** Consider one or more of the following:
  1. Add a short **access token** alongside the `trackingId` — returned at submission, required for lookup (similar to how many support systems work). This does not require auth but ties lookup to the original submission session.
  2. At minimum, document the privacy trade-off in the design and note it as an accepted risk until Phase 2 auth is available.
  3. Apply the same rate limit from C1 to the GET endpoint to slow brute-force attempts.
  - This is a design-level decision that must be made explicitly rather than left implicit.

---

## MEDIUM (다음 iteration에서 처리 가능)

### M1: Zod Error Path Format Inconsistency Between POST and GET Error Responses

- **Location:** Section 6 error table, Section 7 error table, `src/lib/api/error-handler.ts`
- **Problem:** The POST endpoint error examples prefix paths with `"body."` (e.g., `"body.type: type must be BUG, FEATURE, or GENERAL"`). The GET endpoint error example uses no prefix (`"trackingId: invalid tracking ID format"`). The `handleApiError` function formats paths as `e.path.join('.')`, which produces the raw Zod path with no `"body."` prefix. The error table examples in Section 6 therefore do not match what `handleApiError` will actually produce — the `body.` prefix is fictional. Consumers who parse the `error` string will be misled.
- **Resolution:** Remove the `"body."` prefix from all error examples in Section 6 error table to match actual `handleApiError` output. Alternatively, add a `"body."` prefix in the error handler when processing POST body validation errors (pass a `context` parameter). Either choice is fine — the design must be self-consistent.

---

### M2: Zustand Store `submit` Action Has No Duplicate-Submission Guard

- **Location:** Section 8 (Zustand Store `FeedbackFormState`)
- **Problem:** The store has an `isSubmitting: boolean` flag, but the design does not specify that `submit()` should check `isSubmitting` before proceeding. If a user double-clicks the submit button before the action sets `isSubmitting = true` (which happens asynchronously), two concurrent POST requests can be fired. Both will succeed (different `trackingId` values generated), creating duplicate DB rows. The `SubmitConfirmStep` component has an `isSubmitting` prop but the guard logic is not specified.
- **Resolution:** The `submit()` action must begin with an early return if `isSubmitting === true`. Document this guard explicitly in the store action pseudocode. Additionally, the `<Button type="submit">` in `SubmitConfirmStep` must have `disabled={isSubmitting}` — this should be listed in the component's acceptance criteria.

---

### M3: `trackingId` in URL Query String Not Validated Before Auto-Trigger

- **Location:** Section 9 (Tracking Page, URL Query String Support)
- **Problem:** The design states: "The `/track` page should read `?id=FB-XXXXXXXX` from the URL on initial load and pre-populate the input, then auto-trigger the lookup." There is no mention of validating the `?id` value against the `trackingIdParamSchema` before triggering the API call. A malformed or malicious `?id` value will fire a GET request that returns a 400 — which is handled — but the UX is suboptimal (user sees an error before they've done anything). More importantly, the `initialTrackingId` prop on `TrackingPageContainer` is typed as `string | undefined` with no validation constraint stated.
- **Resolution:** Validate the `?id` query param against `trackingIdParamSchema` in the `track/page.tsx` Server Component before passing it as `initialTrackingId`. Only pass the value if it matches the pattern; otherwise pass `undefined`. This keeps the validation at the boundary and prevents the client component from receiving dirty input.

---

### M4: `FeedbackSummaryCard` Displays Raw Email in Step 3 Confirmation

- **Location:** Section 8 (`FeedbackSummaryCardProps`)
- **Problem:** `FeedbackSummaryCardProps` includes `email?: string`. Step 3 is a read-only review screen shown before final submission. Displaying the full email address in clear text on screen is a minor privacy concern (e.g., shoulder surfing in a public place). This is especially relevant since the email is optional and its presence may not be obvious to the user.
- **Resolution:** Mask the email in the summary card: `alice@example.com` → `a***@example.com`. This is a one-line transform. Alternatively, omit email from the summary card entirely (it is only used for admin notification, not user-facing).

---

### M5: No `Content-Type` Validation on POST Endpoint

- **Location:** Section 6 (POST /api/v1/feedback)
- **Problem:** The handler pseudocode uses `request.json()` to parse the body. If the client sends a request with `Content-Type: text/plain` or `Content-Type: application/x-www-form-urlencoded`, Next.js may fail to parse the body or return an empty object, resulting in Zod validation errors rather than a clear "unsupported media type" error. The design does not specify a `415 Unsupported Media Type` response for non-JSON bodies.
- **Resolution:** Add an explicit `Content-Type` check at the start of the POST handler:
  ```typescript
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return errorResponse('Content-Type must be application/json', 415);
  }
  ```
  Also add a `415` row to the error cases table in Section 6.

---

## LOW (제안사항)

### L1: `nanoid` Alphabet Includes Visually Ambiguous Characters

- **Location:** Section 5 (`src/lib/api/tracking-id.ts`)
- **Problem:** The alphabet `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789` includes pairs like `0`/`O`, `1`/`l`/`I` that are visually indistinguishable in many fonts. Since the `trackingId` is displayed to users who may need to type it manually (e.g., into the `/track` page input), this increases transcription error rate.
- **Resolution:** Use a human-friendly alphabet that excludes ambiguous characters:
  ```typescript
  const nanoid = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz', 8);
  ```
  This still provides >200 trillion combinations while improving manual entry accuracy. Update the regex in `trackingIdParamSchema` if the alphabet changes.

---

### L2: `handleApiError` Uses `console.error` — No Structured Logging

- **Location:** Section 5 (`src/lib/api/error-handler.ts`)
- **Problem:** The error handler uses `console.error` for server-side logging. On Vercel, this works but produces unstructured log lines. When the application scales or is monitored by an external service (e.g., Sentry, Datadog), structured logs (JSON with `level`, `message`, `code`, `traceId`) are significantly easier to query and alert on.
- **Resolution:** This is acceptable for Phase 1, but add a `// TODO: replace with structured logger (Pino/Winston) before Phase 4` comment in the error handler. Consider defining a minimal `logger.ts` wrapper now that is easy to swap out later.

---

### L3: `ApiMeta` Does Not Include `hasNextPage` — Pagination UX Gap

- **Location:** Section 2 (`src/types/feedback.ts`, `ApiMeta`)
- **Problem:** `ApiMeta` exposes `{ total, page, limit }`. Consumers must compute `hasNextPage` as `page * limit < total`. This is a trivial calculation but is error-prone if off-by-one. Many pagination clients (including React Query) expect a `hasNextPage` or `nextPage` field directly.
- **Resolution:** Add `hasNextPage: boolean` (computed as `page * limit < total`) to `ApiMeta` before the first paginated endpoint is implemented. Changing this type later is a breaking API change.

---

### L4: Implementation Order Wave 1 Includes Migration Command — Fragile for CI

- **Location:** Section 11 (Wave 1, step 2)
- **Problem:** The implementation order includes `npx prisma migrate dev --name init` as step 2. `migrate dev` is an interactive command designed for local development; it prompts and applies migrations to the developer's local DB. Running this in a CI pipeline or a fresh environment without a configured `DATABASE_URL` will fail with an unhelpful error. The design does not mention a `prisma/seed.ts` for Phase 1, but the migration command is listed as a mandatory sequential step.
- **Resolution:** Clarify in the implementation order that step 2 is a local developer action only, not part of the automated build. Add a note that CI uses `prisma migrate deploy` (non-interactive) and that `DATABASE_URL` must be set in the developer's `.env.local` before running this step. Also note that `DIRECT_URL` (not `DATABASE_URL`) must be used for migrations against Supabase's pooled connection.

---

## 승인 조건

- **CRITICAL 항목 모두 해결 시 APPROVED 가능**
- C1 (Rate limiting): Add basic rate limiting to Phase 1 scope — at minimum a Vercel Edge Middleware wrapper using Upstash
- C2 (trackingId collision): Implement retry loop or nested Prisma write; distinguish P2002 collision from client errors
- C3 (CORS): Add `src/lib/api/cors.ts` and handle OPTIONS preflight before Phase 3 widget integration

**Priority order for implementation team:** C1 → C3 → C2 → H3 (atomic write) → H1 (email empty string) → H2 (anonymous policy) → remaining HIGH items
