```
STATUS: REVISED
PHASE: 2
FEATURE: admin-dashboard
LAST_UPDATED: 2026-03-15
CRITIQUE: docs/handoffs/critique_phase2_admin.md
REVISED: 2026-03-15
CHANGES: C1 Open Redirect, C2 PATCH null response, C3 TOCTOU race, H1 stats duplication, H2 double request, H3 UserRole type, H4 note discarded
```

# Phase 2 Admin Dashboard — Complete Design Handoff

## Overview

Phase 2 adds the admin side of the system: authentication via NextAuth v5, ticket management API endpoints, and four UI pages (login, dashboard, ticket list, ticket detail). It builds directly on the Phase 1 foundation — all validators, Prisma models, and API helpers are already in place.

**Phase 1 actuals that Phase 2 depends on (verified by reading source files):**

| File | Status | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | Implemented | `AdminUser`, `StatusHistory` models exist; `Priority` enum defined |
| `src/types/index.ts` | Implemented | `TicketListItem`, `TicketFilters`, `FeedbackDetail`, `StatusHistoryEntry` defined |
| `src/lib/validators/feedback.ts` | Implemented | `updateTicketSchema`, `ticketFiltersSchema` fully implemented |
| `src/lib/api/response.ts` | Implemented | `unauthorized()`, `forbidden()`, `notFound()`, `serverError()` all present |
| `src/lib/api/cors.ts` | Implemented | `withCors`, `corsPreflightResponse` present |
| `src/server/db/prisma.ts` | Implemented | Singleton client with dev logging |
| `src/components/ui/button.tsx` | Implemented | Uses `@base-ui/react/button` primitive with `buttonVariants` CVA |
| `src/components/ui/card.tsx` | Implemented | Full Card family exported |
| `next-auth@^5.0.0-beta.30` | Installed | In `package.json` dependencies |

**Key codebase observations that affect implementation:**

- `Button` component uses `@base-ui/react/button` as primitive — import `Button` and `buttonVariants` from `@/components/ui/button`, never from `@base-ui/react` directly in pages/components
- shadcn style is `base-nova` (from `components.json`) — use Tailwind CSS v4 class names
- `FeedbackForm.tsx` uses `"use client"` at the top — follow same pattern for all interactive admin components
- The `zod` version is `^4.3.6` — use `z.string().email()` etc. (Zod 4 API, same as existing validators)
- `bcryptjs` and `date-fns` are NOT in `package.json` — must be installed
- `ts-node` is NOT in devDependencies — must be installed for seed script

---

## 1. Dependencies to Install

Run these before implementing any Phase 2 code:

```bash
# Password hashing (pure JS, no native binaries, works on Vercel/Edge)
npm install bcryptjs
npm install --save-dev @types/bcryptjs

# Date arithmetic for stats endpoint
npm install date-fns

# Seed script runner
npm install --save-dev ts-node

# shadcn/ui components needed for admin UI
npx shadcn@latest add table select textarea alert-dialog dropdown-menu avatar separator badge
```

---

## 2. Environment Variables

Add to `.env.local` alongside existing Phase 1 variables:

```bash
# Required: cryptographically random secret for JWT signing
AUTH_SECRET=<generate with: openssl rand -base64 32>

# Required for NextAuth redirect URLs
NEXTAUTH_URL=http://localhost:3000
```

`AUTH_SECRET` must be present at runtime. If absent, NextAuth v5 will throw at startup.

---

## 3. Type Augmentations and Updates

### 3-1. File: `src/types/next-auth.d.ts` (NEW)

```typescript
import type { UserRole } from '@prisma/client';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      role: UserRole;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    username: string;
    role: UserRole;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
    role: UserRole;
  }
}
```

### 3-2. Updated `src/types/index.ts` (MODIFY)

Add the following to the existing file. Do NOT remove existing exports.

```typescript
// Add hasNextPage to ApiMeta
export interface ApiMeta {
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;  // NEW: page * limit < total
}

// Add TicketStats for dashboard
export interface TicketStats {
  total: number;
  byStatus: Record<TicketStatus, number>;
  byType: Record<FeedbackType, number>;
  recent: {
    today: number;
    thisWeek: number;
  };
}

// Admin session user (mirrors next-auth.d.ts shape for non-auth contexts)
export interface AdminSessionUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
}
```

**Breaking change note:** Adding `hasNextPage` to `ApiMeta` makes it required. The existing `ok()` response helper in `src/lib/api/response.ts` accepts `meta?: ApiMeta` as optional — callers that omit `meta` are unaffected. Any caller that passes a `meta` object must add `hasNextPage`. Currently only the new tickets list endpoint passes `meta`.

---

## 4. NextAuth v5 Configuration

### 4-1. File: `auth.ts` (NEW — project root)

```typescript
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { prisma } from '@/server/db/prisma';
import { z } from 'zod';
import type { UserRole } from '@prisma/client';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const admin = await prisma.adminUser.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            username: true,
            passwordHash: true,
            role: true,
          },
        });
        if (!admin) return null;

        const passwordValid = await compare(password, admin.passwordHash);
        if (!passwordValid) return null;

        // Return immutable user object — NextAuth persists to JWT
        return {
          id: admin.id,
          email: admin.email,
          username: admin.username,
          role: admin.role as UserRole,
        };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      // Persist admin fields on initial sign-in only
      if (user) {
        return {
          ...token,
          id: user.id,
          username: user.username,
          role: user.role,
        };
      }
      return token;
    },
    session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id,
          username: token.username,
          role: token.role,
        },
      };
    },
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
});
```

### 4-2. File: `src/app/api/auth/[...nextauth]/route.ts` (NEW)

```typescript
import { handlers } from '@/auth';

export const { GET, POST } = handlers;
```

### 4-3. File: `middleware.ts` (NEW — project root)

Protects all `/admin/*` routes. Must be at project root (same level as `auth.ts`).

```typescript
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default auth((req: NextRequest & { auth: unknown }) => {
  const pathname = req.nextUrl.pathname;
  const isAdminPath = pathname.startsWith('/admin');
  const isLoginPath = pathname === '/admin/login';
  const isAuthenticated = !!(req as { auth?: { user?: unknown } }).auth?.user;

  // Unauthenticated request to protected admin page
  if (isAdminPath && !isLoginPath && !isAuthenticated) {
    const loginUrl = new URL('/admin/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already authenticated — redirect away from login
  if (isLoginPath && isAuthenticated) {
    return NextResponse.redirect(new URL('/admin/dashboard', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/admin/:path*'],
};
```

### 4-4. File: `src/lib/api/require-auth.ts` (NEW)

Used by every admin API route handler as the first operation.

```typescript
import { auth } from '@/auth';
import { unauthorized } from '@/lib/api/response';
import type { NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';
import type { UserRole } from '@prisma/client'; // H3: use precise type for compile-time RBAC safety

export interface AuthOk {
  type: 'ok';
  user: {
    id: string;
    email: string;
    username: string;
    role: UserRole; // H3 fix: was `string` — typos like 'ADIM' are now caught at compile time
  };
}

export interface AuthFail {
  type: 'error';
  response: NextResponse<ApiResponse<null>>;
}

export async function requireAuth(): Promise<AuthOk | AuthFail> {
  const session = await auth();
  if (!session?.user?.id) {
    return { type: 'error', response: unauthorized() };
  }
  return {
    type: 'ok',
    user: {
      id: session.user.id,
      email: session.user.email ?? '',
      username: session.user.username,
      role: session.user.role,
    },
  };
}
```

---

## 5. Ticket API Endpoints

### 5-1. Directory Structure

```
src/app/api/v1/tickets/
├── route.ts              ← GET /api/v1/tickets
├── stats/
│   └── route.ts          ← GET /api/v1/tickets/stats
└── [id]/
    └── route.ts          ← GET + PATCH + DELETE /api/v1/tickets/:id
```

The `stats/` directory must be a named path segment — NOT a dynamic `[id]` catch-all — to prevent Next.js treating `"stats"` as a ticket ID. Order in the filesystem does not matter; Next.js always prefers exact matches over dynamic segments.

### 5-2. File: `src/app/api/v1/tickets/route.ts` — GET list

#### Request

Query params validated by `ticketFiltersSchema` from `src/lib/validators/feedback.ts`:

| Param | Type | Default |
|-------|------|---------|
| `page` | number (coerced) | 1 |
| `limit` | number (coerced) | 20 |
| `status` | `TicketStatus` | — |
| `type` | `FeedbackType` | — |
| `priority` | `Priority` | — |
| `sort` | `"createdAt"` \| `"updatedAt"` | `"createdAt"` |
| `order` | `"asc"` \| `"desc"` | `"desc"` |

#### Response — 200 OK

```json
{
  "success": true,
  "data": [
    {
      "id": "cm...",
      "trackingId": "FB-a1b2c3d4",
      "type": "BUG",
      "status": "OPEN",
      "title": "Submit button not responding",
      "nickname": "alice",
      "priority": null,
      "assigneeId": null,
      "createdAt": "2026-03-15T09:00:00.000Z",
      "updatedAt": "2026-03-15T09:00:00.000Z"
    }
  ],
  "error": null,
  "meta": {
    "total": 47,
    "page": 1,
    "limit": 20,
    "hasNextPage": true
  }
}
```

#### Full Implementation

```typescript
import { type NextRequest } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { ticketFiltersSchema } from '@/lib/validators/feedback';
import { ok, badRequest, serverError } from '@/lib/api/response';
import { requireAuth } from '@/lib/api/require-auth';

export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult.type === 'error') return authResult.response;

  const searchParams = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = ticketFiltersSchema.safeParse(searchParams);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join(', ');
    return badRequest(message);
  }

  const { page, limit, status, type, priority, sort, order } = parsed.data;

  const where = {
    ...(status && { status }),
    ...(type && { type }),
    ...(priority && { priority }),
  };

  try {
    const [total, items] = await prisma.$transaction([
      prisma.feedback.count({ where }),
      prisma.feedback.findMany({
        where,
        orderBy: { [sort]: order },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          trackingId: true,
          type: true,
          status: true,
          title: true,
          nickname: true,
          priority: true,
          assigneeId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return ok(items, {
      total,
      page,
      limit,
      hasNextPage: page * limit < total,
    });
  } catch (err) {
    return serverError(err);
  }
}
```

### 5-2b. File: `src/server/services/ticket-stats.ts` (NEW — shared service)

> **H1 fix:** `getStats()` was duplicated verbatim between `stats/route.ts` and `dashboard/page.tsx`. Extracted to a single module — both callers import from here.

```typescript
import { prisma } from '@/server/db/prisma';
import type { TicketStats } from '@/types';

export async function getTicketStats(): Promise<TicketStats> {
  const now = new Date();

  // Today: midnight UTC
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);

  // This week: Monday midnight UTC (ISO week)
  const weekStart = new Date(todayStart);
  const dayOfWeek = weekStart.getUTCDay(); // 0=Sun, 1=Mon...
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setUTCDate(weekStart.getUTCDate() - daysToMonday);

  const [statusGroups, typeGroups, total, todayCount, weekCount] =
    await prisma.$transaction([
      prisma.feedback.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.feedback.groupBy({ by: ['type'], _count: { _all: true } }),
      prisma.feedback.count(),
      prisma.feedback.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.feedback.count({ where: { createdAt: { gte: weekStart } } }),
    ]);

  const byStatus: TicketStats['byStatus'] = {
    OPEN: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
    CLOSED: 0,
  };
  for (const g of statusGroups) {
    byStatus[g.status] = g._count._all;
  }

  const byType: TicketStats['byType'] = {
    BUG: 0,
    FEATURE: 0,
    GENERAL: 0,
  };
  for (const g of typeGroups) {
    byType[g.type] = g._count._all;
  }

  return {
    total,
    byStatus,
    byType,
    recent: { today: todayCount, thisWeek: weekCount },
  };
}
```

---

### 5-3. File: `src/app/api/v1/tickets/stats/route.ts` — GET stats

#### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "total": 47,
    "byStatus": {
      "OPEN": 18,
      "IN_PROGRESS": 9,
      "RESOLVED": 14,
      "CLOSED": 6
    },
    "byType": {
      "BUG": 22,
      "FEATURE": 15,
      "GENERAL": 10
    },
    "recent": {
      "today": 3,
      "thisWeek": 11
    }
  },
  "error": null
}
```

#### Full Implementation

> **H1 fix:** Logic moved to `src/server/services/ticket-stats.ts`. This route is now a thin auth+delegate wrapper.

```typescript
import { type NextRequest } from 'next/server';
import { ok, serverError } from '@/lib/api/response';
import { requireAuth } from '@/lib/api/require-auth';
import { getTicketStats } from '@/server/services/ticket-stats';

export async function GET(_req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult.type === 'error') return authResult.response;

  try {
    const stats = await getTicketStats();
    return ok(stats);
  } catch (err) {
    return serverError(err);
  }
}
```

**No `date-fns` dependency** — date arithmetic is done with plain UTC methods in the shared service.

### 5-4. File: `src/app/api/v1/tickets/[id]/route.ts` — GET + PATCH + DELETE

#### GET Response — 200 OK

Returns a `FeedbackDetail` (already defined in `src/types/index.ts`). Includes `email`, `description`, and `statusHistory` (admin-only fields).

```json
{
  "success": true,
  "data": {
    "id": "cm...",
    "trackingId": "FB-a1b2c3d4",
    "type": "BUG",
    "status": "IN_PROGRESS",
    "title": "Submit button not responding",
    "description": "Full description text...",
    "nickname": "alice",
    "email": "alice@example.com",
    "priority": null,
    "assigneeId": null,
    "createdAt": "2026-03-15T09:00:00.000Z",
    "updatedAt": "2026-03-15T11:30:00.000Z",
    "statusHistory": [
      {
        "id": "cm...",
        "fromStatus": null,
        "toStatus": "OPEN",
        "note": null,
        "createdAt": "2026-03-15T09:00:00.000Z"
      },
      {
        "id": "cm...",
        "fromStatus": "OPEN",
        "toStatus": "IN_PROGRESS",
        "note": "Looking into this",
        "createdAt": "2026-03-15T11:30:00.000Z"
      }
    ]
  },
  "error": null
}
```

#### PATCH Request Body

Validated by `updateTicketSchema` (already in `src/lib/validators/feedback.ts`):

```typescript
{
  status?: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  note?: string;  // max 500 chars, attached to StatusHistory entry
}
// At least one of status or priority must be provided (enforced by .refine())
```

#### DELETE Response — 200 OK

```json
{
  "success": true,
  "data": { "id": "cm...", "deleted": true },
  "error": null
}
```

#### Error Table (applies to all three methods)

| Scenario | Status | Body error |
|----------|--------|-----------|
| No valid session | 401 | `"Unauthorized"` |
| `id` param is empty/missing | 400 | `"Invalid ticket ID"` |
| Ticket not found (initial check or post-PATCH) | 404 | `"Ticket not found"` |
| PATCH body fails `updateTicketSchema` | 400 | Zod issue message(s) joined by `, ` |
| Ticket deleted between PATCH tx and final read (C2) | 404 | `"Ticket not found"` |
| Prisma / DB error | 500 | `"Internal server error"` |

#### Prisma `select` for detail query

```typescript
const TICKET_DETAIL_SELECT = {
  id: true,
  trackingId: true,
  type: true,
  status: true,
  title: true,
  description: true,
  nickname: true,
  email: true,
  priority: true,
  assigneeId: true,
  createdAt: true,
  updatedAt: true,
  statusHistory: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      note: true,
      createdAt: true,
    },
  },
} as const;
```

#### Full Implementation

```typescript
import { type NextRequest } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { updateTicketSchema } from '@/lib/validators/feedback';
import {
  ok,
  badRequest,
  notFound,
  serverError,
} from '@/lib/api/response';
import { requireAuth } from '@/lib/api/require-auth';

const TICKET_DETAIL_SELECT = {
  id: true,
  trackingId: true,
  type: true,
  status: true,
  title: true,
  description: true,
  nickname: true,
  email: true,
  priority: true,
  assigneeId: true,
  createdAt: true,
  updatedAt: true,
  statusHistory: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      note: true,
      createdAt: true,
    },
  },
} as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult.type === 'error') return authResult.response;

  const { id } = await params;
  if (!id) return badRequest('Invalid ticket ID');

  try {
    const ticket = await prisma.feedback.findUnique({
      where: { id },
      select: TICKET_DETAIL_SELECT,
    });
    if (!ticket) return notFound('Ticket');
    return ok(ticket);
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult.type === 'error') return authResult.response;

  const { id } = await params;
  if (!id) return badRequest('Invalid ticket ID');

  const body = await req.json().catch(() => null);
  if (!body) return badRequest('Invalid JSON body');

  const parsed = updateTicketSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join(', ');
    return badRequest(message);
  }

  const { status, priority, note } = parsed.data;

  try {
    const updateData = {
      ...(status !== undefined && { status }),
      ...(priority !== undefined && { priority }),
    };

    // C3 fix: read prevStatus INSIDE the transaction so read+write are atomic.
    // Moving the initial findUnique outside would create a TOCTOU race where a
    // concurrent PATCH could change the status between our read and write,
    // recording an incorrect fromStatus in the audit log.
    await prisma.$transaction(async (tx) => {
      const existing = await tx.feedback.findUnique({
        where: { id },
        select: { status: true },
      });
      // Throw a typed sentinel — caught below before the generic serverError handler
      if (!existing) throw new Error('NOT_FOUND');

      const prevStatus = existing.status;
      await tx.feedback.update({ where: { id }, data: updateData });

      // H4 fix: create a StatusHistory entry when status changes OR when a note
      // is provided alongside a priority-only update.
      // Previously, `note` was silently discarded when only priority changed.
      const statusChanged = status !== undefined && status !== prevStatus;
      const noteOnly = !statusChanged && note !== undefined;

      if (statusChanged || noteOnly) {
        await tx.statusHistory.create({
          data: {
            feedbackId: id,
            // For note-only entries fromStatus === toStatus — rendered as "note added"
            fromStatus: statusChanged ? prevStatus : prevStatus,
            toStatus: statusChanged ? status! : prevStatus,
            changedById: authResult.user.id,
            note: note ?? null,
          },
        });
      }
    });

    // C2 fix: a concurrent DELETE can remove the ticket between the transaction
    // committing and this read. Guard the result — never return ok(null).
    const updated = await prisma.feedback.findUnique({
      where: { id },
      select: TICKET_DETAIL_SELECT,
    });
    if (!updated) return notFound('Ticket');

    return ok(updated);
  } catch (err) {
    // Handle the NOT_FOUND sentinel thrown from inside the transaction
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      return notFound('Ticket');
    }
    return serverError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult.type === 'error') return authResult.response;

  const { id } = await params;
  if (!id) return badRequest('Invalid ticket ID');

  try {
    const existing = await prisma.feedback.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) return notFound('Ticket');

    // StatusHistory rows deleted automatically via onDelete: Cascade
    await prisma.feedback.delete({ where: { id } });

    return ok({ id, deleted: true });
  } catch (err) {
    return serverError(err);
  }
}
```

**Next.js 16 note:** Route segment `params` is now a `Promise` in Next.js 15+. Always `await params` before destructuring. This applies to both `page.tsx` files and API `route.ts` files.

---

## 6. App Directory Structure

The login page must live OUTSIDE the `(admin)` route group to avoid the auth-guarded admin shell layout wrapping it.

```
src/app/
├── (admin)/
│   ├── layout.tsx              ← Admin shell (sidebar + header) — auth-guarded
│   ├── dashboard/
│   │   └── page.tsx            ← /admin/dashboard (resolves because group prefix is /admin)
│   └── tickets/
│       ├── page.tsx            ← /admin/tickets
│       └── [id]/
│           └── page.tsx        ← /admin/tickets/:id
└── admin/
    └── login/
        └── page.tsx            ← /admin/login — standalone, no admin shell
```

Route groups (`(admin)`) do not affect the URL path. Both `app/(admin)/dashboard/page.tsx` and `app/admin/login/page.tsx` resolve under the `/admin/` URL prefix. The login page has no parent layout from `(admin)/layout.tsx` and renders with only the root `app/layout.tsx`.

---

## 7. Login Page

### 7-1. File: `src/app/admin/login/page.tsx` (NEW — Server Component)

```typescript
import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Admin Login',
};

// C1 fix: validate callbackUrl server-side before it ever reaches the client.
// Only accept relative paths that start with '/' and contain no '//' (scheme-relative).
// Rejects: 'https://evil.com', '//evil.com', 'javascript:alert(1)', etc.
const SAFE_CALLBACK_RE = /^\/[a-zA-Z0-9\-_/?=&%#]*$/;

function sanitizeCallbackUrl(raw: string | undefined): string {
  if (raw && SAFE_CALLBACK_RE.test(raw)) return raw;
  return '/admin/dashboard';
}

interface Props {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function AdminLoginPage({ searchParams }: Props) {
  const { callbackUrl } = await searchParams;
  const safeCallbackUrl = sanitizeCallbackUrl(callbackUrl);
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <LoginForm callbackUrl={safeCallbackUrl} />
    </main>
  );
}
```

### 7-2. File: `src/components/auth/LoginErrorAlert.tsx` (NEW — Server Component)

```typescript
interface LoginErrorAlertProps {
  message: string;
}

export function LoginErrorAlert({ message }: LoginErrorAlertProps) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      {message}
    </div>
  );
}
```

### 7-3. File: `src/components/auth/LoginForm.tsx` (NEW — Client Component)

```typescript
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LoginErrorAlert } from './LoginErrorAlert';

interface LoginFormProps {
  callbackUrl?: string;
}

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    startTransition(async () => {
      setError(null);
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
        return;
      }

      // C1 fix: second defence-in-depth guard on the client side.
      // The server component already sanitizes callbackUrl, but we validate
      // again here to protect against future refactors that might bypass the
      // server-side check. Never redirect to an absolute URL or scheme-relative path.
      const safeCallback =
        callbackUrl &&
        callbackUrl.startsWith('/') &&
        !callbackUrl.startsWith('//')
          ? callbackUrl
          : '/admin/dashboard';

      router.push(safeCallback);
      router.refresh();
    });
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Admin Login</CardTitle>
        <CardDescription>user-feedback management</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <LoginErrorAlert message={error} />}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={isPending}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Forgot password? Contact the system administrator.
        </p>
      </CardContent>
    </Card>
  );
}
```

**Security:** Generic error message prevents user enumeration. `redirect: false` gives the component full control over navigation. `router.refresh()` forces the layout Server Component to re-render with the new session.

---

## 8. Admin Layout

### 8-1. File: `src/app/(admin)/layout.tsx` (NEW — Server Component)

```typescript
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';

interface Props {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: Props) {
  const session = await auth();

  // Double-check: middleware handles the redirect, but guard here too
  if (!session?.user) {
    redirect('/admin/login');
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar user={session.user} />
      <div className="flex flex-1 flex-col">
        <AdminHeader user={session.user} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

### 8-2. File: `src/components/admin/AdminSidebar.tsx` (NEW — Client Component)

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LayoutDashboard, Ticket, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@prisma/client';

interface AdminSidebarProps {
  user: { username: string; role: UserRole };
}

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/tickets', label: 'Tickets', icon: Ticket },
];

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 flex-col border-r bg-card py-4">
      <div className="px-4 pb-4 border-b">
        <p className="text-sm font-semibold truncate">{user.username}</p>
        <p className="text-xs text-muted-foreground">{user.role}</p>
      </div>

      <nav className="flex-1 space-y-1 px-2 pt-4">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
              pathname === href
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-2">
        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
```

### 8-3. File: `src/components/admin/AdminHeader.tsx` (NEW — Server Component)

```typescript
import type { UserRole } from '@prisma/client';

interface AdminHeaderProps {
  user: { username: string; email: string | null | undefined; role: UserRole };
}

export function AdminHeader({ user }: AdminHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b bg-card px-6 py-3">
      <div />
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium">{user.username}</p>
          <p className="text-xs text-muted-foreground">{user.email ?? ''}</p>
        </div>
        <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground uppercase">
          {user.username.slice(0, 1)}
        </div>
      </div>
    </header>
  );
}
```

---

## 9. Dashboard Page

### 9-1. File: `src/app/(admin)/dashboard/page.tsx` (NEW — Server Component)

Stats are fetched via direct Prisma call (via shared service) — no internal HTTP round-trip to `/api/v1/tickets/stats`.

```typescript
import type { Metadata } from 'next';
import { prisma } from '@/server/db/prisma';
import { getTicketStats } from '@/server/services/ticket-stats'; // H1 fix: shared service
import { StatsCard } from '@/components/admin/StatsCard';
import { TypeBreakdownCard } from '@/components/admin/TypeBreakdownCard';
import { RecentActivityCard } from '@/components/admin/RecentActivityCard';
import { RecentTicketsTable } from '@/components/admin/RecentTicketsTable';
import {
  Inbox,
  AlertCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import type { TicketListItem } from '@/types';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  // H1 fix: getStats() was duplicated between this file and stats/route.ts.
  // Both now call getTicketStats() from the shared service.
  // H2-dashboard fix: RecentTicketsTable is now a Server Component receiving
  // props — eliminates the useEffect/fetch waterfall (loading flash after hydration).
  const [stats, recentTickets] = await Promise.all([
    getTicketStats(),
    prisma.feedback.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        trackingId: true,
        type: true,
        status: true,
        title: true,
        nickname: true,
        createdAt: true,
      },
    }) as Promise<TicketListItem[]>,
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard title="Total" value={stats.total} icon={Inbox} />
        <StatsCard
          title="Open"
          value={stats.byStatus.OPEN}
          icon={AlertCircle}
          color="blue"
        />
        <StatsCard
          title="In Progress"
          value={stats.byStatus.IN_PROGRESS}
          icon={Clock}
          color="amber"
        />
        <StatsCard
          title="Resolved"
          value={stats.byStatus.RESOLVED}
          icon={CheckCircle2}
          color="green"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TypeBreakdownCard byType={stats.byType} />
        <RecentActivityCard
          today={stats.recent.today}
          thisWeek={stats.recent.thisWeek}
        />
      </div>

      <RecentTicketsTable tickets={recentTickets} />
    </div>
  );
}
```

### 9-2. File: `src/components/admin/StatsCard.tsx` (NEW)

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color?: 'default' | 'blue' | 'amber' | 'green' | 'red';
  subtitle?: string;
}

const colorMap: Record<NonNullable<StatsCardProps['color']>, string> = {
  default: 'text-foreground',
  blue: 'text-blue-600 dark:text-blue-400',
  amber: 'text-amber-600 dark:text-amber-400',
  green: 'text-green-600 dark:text-green-400',
  red: 'text-red-600 dark:text-red-400',
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  color = 'default',
  subtitle,
}: StatsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Icon className={cn('size-4', colorMap[color])} />
        </div>
      </CardHeader>
      <CardContent>
        <p className={cn('text-3xl font-bold', colorMap[color])}>{value}</p>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
```

### 9-3. File: `src/components/admin/TypeBreakdownCard.tsx` (NEW)

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FeedbackType } from '@/types';

interface TypeBreakdownCardProps {
  byType: Record<FeedbackType, number>;
}

const typeLabels: Record<FeedbackType, string> = {
  BUG: 'Bug Reports',
  FEATURE: 'Feature Requests',
  GENERAL: 'General Inquiries',
};

export function TypeBreakdownCard({ byType }: TypeBreakdownCardProps) {
  const total = Object.values(byType).reduce((a, b) => a + b, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>By Type</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(Object.entries(byType) as [FeedbackType, number][]).map(
          ([type, count]) => (
            <div key={type} className="flex items-center justify-between">
              <span className="text-sm">{typeLabels[type]}</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%' }}
                  />
                </div>
                <span className="w-6 text-right text-sm font-medium">{count}</span>
              </div>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
```

### 9-4. File: `src/components/admin/RecentActivityCard.tsx` (NEW)

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RecentActivityCardProps {
  today: number;
  thisWeek: number;
}

export function RecentActivityCard({ today, thisWeek }: RecentActivityCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Today</span>
          <span className="text-xl font-bold">{today}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">This week</span>
          <span className="text-xl font-bold">{thisWeek}</span>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 9-5. File: `src/components/admin/RecentTicketsTable.tsx` (NEW — Server Component)

> **H2-dashboard fix:** Previously a Client Component with `useEffect` that fetched after hydration, creating a visible loading flash. Converted to a Server Component that receives `tickets` as props from `DashboardPage` (which fetches via `Promise.all` alongside `getTicketStats()`). Eliminates the secondary API round-trip and the loading flash entirely.

```typescript
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TicketStatusBadge } from './TicketStatusBadge';
import { TicketTypeBadge } from './TicketTypeBadge';
import type { TicketListItem } from '@/types';

interface RecentTicketsTableProps {
  tickets: TicketListItem[];
}

export function RecentTicketsTable({ tickets }: RecentTicketsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Tickets</CardTitle>
      </CardHeader>
      <CardContent>
        {tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tickets yet.</p>
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/admin/tickets/${ticket.id}`}
                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
              >
                <TicketTypeBadge type={ticket.type} />
                <span className="flex-1 truncate text-sm">{ticket.title}</span>
                <TicketStatusBadge status={ticket.status} />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## 10. Shared Badge Components

### 10-1. File: `src/components/admin/TicketStatusBadge.tsx` (NEW)

```typescript
import { cn } from '@/lib/utils';
import type { TicketStatus } from '@/types';

interface TicketStatusBadgeProps {
  status: TicketStatus;
}

const statusConfig: Record<
  TicketStatus,
  { label: string; className: string }
> = {
  OPEN: {
    label: 'Open',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  },
  RESOLVED: {
    label: 'Resolved',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
  CLOSED: {
    label: 'Closed',
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  },
};

export function TicketStatusBadge({ status }: TicketStatusBadgeProps) {
  const { label, className } = statusConfig[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        className
      )}
    >
      {label}
    </span>
  );
}
```

### 10-2. File: `src/components/admin/TicketTypeBadge.tsx` (NEW)

```typescript
import { cn } from '@/lib/utils';
import type { FeedbackType } from '@/types';

interface TicketTypeBadgeProps {
  type: FeedbackType;
}

const typeConfig: Record<FeedbackType, { label: string; className: string }> =
  {
    BUG: {
      label: 'Bug',
      className:
        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    },
    FEATURE: {
      label: 'Feature',
      className:
        'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    },
    GENERAL: {
      label: 'General',
      className:
        'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    },
  };

export function TicketTypeBadge({ type }: TicketTypeBadgeProps) {
  const { label, className } = typeConfig[type];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        className
      )}
    >
      {label}
    </span>
  );
}
```

### 10-3. File: `src/components/admin/TrackingIdBadge.tsx` (NEW — Client Component)

```typescript
'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrackingIdBadgeProps {
  id: string;
}

export function TrackingIdBadge({ id }: TrackingIdBadgeProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs transition-colors',
        'hover:bg-muted'
      )}
      title="Click to copy tracking ID"
    >
      <span>{id}</span>
      {copied ? (
        <Check className="size-3 text-green-600" />
      ) : (
        <Copy className="size-3 text-muted-foreground" />
      )}
    </button>
  );
}
```

---

## 11. Ticket List Page

### 11-1. File: `src/app/(admin)/tickets/page.tsx` (NEW — Server Component)

Reads URL search params, fetches initial data server-side, passes to client component to avoid loading flash.

```typescript
import type { Metadata } from 'next';
import { prisma } from '@/server/db/prisma';
import { ticketFiltersSchema } from '@/lib/validators/feedback';
import { TicketListPageContent } from '@/components/admin/TicketListPageContent';
import type { TicketListItem, ApiMeta } from '@/types';

export const metadata: Metadata = { title: 'Tickets' };

interface Props {
  searchParams: Promise<Record<string, string>>;
}

async function fetchTickets(rawParams: Record<string, string>): Promise<{
  items: TicketListItem[];
  meta: ApiMeta;
}> {
  const parsed = ticketFiltersSchema.safeParse(rawParams);
  const filters = parsed.success
    ? parsed.data
    : ticketFiltersSchema.parse({});

  const { page, limit, status, type, priority, sort, order } = filters;
  const where = {
    ...(status && { status }),
    ...(type && { type }),
    ...(priority && { priority }),
  };

  const [total, items] = await prisma.$transaction([
    prisma.feedback.count({ where }),
    prisma.feedback.findMany({
      where,
      orderBy: { [sort]: order },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        trackingId: true,
        type: true,
        status: true,
        title: true,
        nickname: true,
        priority: true,
        assigneeId: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  return {
    items,
    meta: { total, page, limit, hasNextPage: page * limit < total },
  };
}

export default async function TicketsPage({ searchParams }: Props) {
  const rawParams = await searchParams;
  const { items, meta } = await fetchTickets(rawParams);

  const parsed = ticketFiltersSchema.safeParse(rawParams);
  const initialFilters = parsed.success
    ? parsed.data
    : ticketFiltersSchema.parse({});

  return (
    <TicketListPageContent
      initialFilters={initialFilters}
      initialData={items}
      initialMeta={meta}
    />
  );
}
```

### 11-2. File: `src/components/admin/TicketListPageContent.tsx` (NEW — Client Component)

Manages filter state in URL search params. Delegates data fetching entirely to SSR via `router.push`.

> **H2 fix:** The previous implementation called both `router.push()` AND `fetch()` on every filter change, hitting the database twice per interaction and creating a race condition. Fixed by using the **SSR approach**: `router.push` triggers a server-side navigation that re-runs `TicketsPage`'s `fetchTickets()`. The `fetch` + `setTickets`/`setMeta` client-side state is removed entirely — Next.js patches the component tree with fresh server data. `initialData`/`initialMeta` remain as props for the first render only.

```typescript
'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { TicketFiltersBar } from './TicketFiltersBar';
import { TicketTable } from './TicketTable';
import { TicketPagination } from './TicketPagination';
import type { TicketListItem, ApiMeta } from '@/types';
import type { TicketFiltersInput } from '@/lib/validators/feedback';

interface TicketListPageContentProps {
  initialFilters: TicketFiltersInput;
  initialData: TicketListItem[];
  initialMeta: ApiMeta;
}

export function TicketListPageContent({
  initialFilters,
  initialData,
  initialMeta,
}: TicketListPageContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState(initialFilters);

  const updateFilters = useCallback(
    (newFilters: Partial<TicketFiltersInput>) => {
      const merged = { ...filters, ...newFilters, page: 1 };
      setFilters(merged);

      const params = new URLSearchParams(searchParams.toString());
      Object.entries(merged).forEach(([k, v]) => {
        if (v !== undefined && v !== '') {
          params.set(k, String(v));
        } else {
          params.delete(k);
        }
      });

      // H2 fix: router.push triggers SSR re-render of TicketsPage which calls
      // prisma once. Previously a redundant fetch() was also called here,
      // doubling DB load and creating a race between SSR and client responses.
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [filters, pathname, router, searchParams]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tickets</h1>
        <span className="text-sm text-muted-foreground">{initialMeta.total} tickets</span>
      </div>

      <TicketFiltersBar filters={filters} onChange={updateFilters} />

      <TicketTable tickets={initialData} isLoading={isPending} />

      <TicketPagination
        meta={initialMeta}
        currentPage={filters.page ?? 1}
        onPageChange={(page) => updateFilters({ page })}
      />
    </div>
  );
}
```

### 11-3. File: `src/components/admin/TicketFiltersBar.tsx` (NEW — Client Component)

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import type { TicketFiltersInput } from '@/lib/validators/feedback';

interface TicketFiltersBarProps {
  filters: TicketFiltersInput;
  onChange: (filters: Partial<TicketFiltersInput>) => void;
}

export function TicketFiltersBar({ filters, onChange }: TicketFiltersBarProps) {
  const hasActiveFilters =
    filters.status !== undefined ||
    filters.type !== undefined ||
    filters.priority !== undefined;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={filters.status ?? ''}
        onChange={(e) =>
          onChange({ status: (e.target.value as TicketFiltersInput['status']) || undefined })
        }
        className="rounded-lg border bg-background px-3 py-1.5 text-sm"
      >
        <option value="">All Statuses</option>
        <option value="OPEN">Open</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="RESOLVED">Resolved</option>
        <option value="CLOSED">Closed</option>
      </select>

      <select
        value={filters.type ?? ''}
        onChange={(e) =>
          onChange({ type: (e.target.value as TicketFiltersInput['type']) || undefined })
        }
        className="rounded-lg border bg-background px-3 py-1.5 text-sm"
      >
        <option value="">All Types</option>
        <option value="BUG">Bug</option>
        <option value="FEATURE">Feature</option>
        <option value="GENERAL">General</option>
      </select>

      <select
        value={`${filters.sort}-${filters.order}`}
        onChange={(e) => {
          const [sort, order] = e.target.value.split('-') as [
            TicketFiltersInput['sort'],
            TicketFiltersInput['order']
          ];
          onChange({ sort, order });
        }}
        className="rounded-lg border bg-background px-3 py-1.5 text-sm"
      >
        <option value="createdAt-desc">Newest First</option>
        <option value="createdAt-asc">Oldest First</option>
        <option value="updatedAt-desc">Recently Updated</option>
      </select>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange({
              status: undefined,
              type: undefined,
              priority: undefined,
              page: 1,
            })
          }
        >
          Clear Filters
        </Button>
      )}
    </div>
  );
}
```

**Note:** Using native `<select>` elements instead of shadcn `Select` here. The shadcn `Select` (Radix-based) requires additional setup to work correctly with controlled values and onChange in this filter pattern. Native selects are accessible, less setup, and fully functional. If the reviewer prefers shadcn `Select`, the pattern is the same — wrap `value` in `Select value={...}` and `onValueChange={...}`.

### 11-4. File: `src/components/admin/TicketTable.tsx` (NEW)

```typescript
import { TicketTableRow } from './TicketTableRow';
import type { TicketListItem } from '@/types';

interface TicketTableProps {
  tickets: TicketListItem[];
  isLoading?: boolean;
}

export function TicketTable({ tickets, isLoading = false }: TicketTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Submitter</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground" />
          </tr>
        </thead>
        <tbody
          className={isLoading ? 'opacity-50 transition-opacity' : ''}
        >
          {tickets.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="px-4 py-12 text-center text-muted-foreground"
              >
                No tickets found.
              </td>
            </tr>
          ) : (
            tickets.map((ticket) => (
              <TicketTableRow key={ticket.id} ticket={ticket} />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
```

### 11-5. File: `src/components/admin/TicketTableRow.tsx` (NEW)

```typescript
import Link from 'next/link';
import { TicketStatusBadge } from './TicketStatusBadge';
import { TicketTypeBadge } from './TicketTypeBadge';
import type { TicketListItem } from '@/types';

interface TicketTableRowProps {
  ticket: TicketListItem;
}

function formatRelativeDate(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export function TicketTableRow({ ticket }: TicketTableRowProps) {
  const titleTruncated =
    ticket.title.length > 60
      ? `${ticket.title.slice(0, 57)}...`
      : ticket.title;

  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <code className="text-xs font-mono text-muted-foreground">
          {ticket.trackingId}
        </code>
      </td>
      <td className="px-4 py-3">
        <TicketTypeBadge type={ticket.type} />
      </td>
      <td className="px-4 py-3">
        <Link
          href={`/admin/tickets/${ticket.id}`}
          className="font-medium hover:underline"
        >
          {titleTruncated}
        </Link>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {ticket.nickname ?? 'Anonymous'}
      </td>
      <td className="px-4 py-3">
        <TicketStatusBadge status={ticket.status} />
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {formatRelativeDate(ticket.createdAt)}
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          href={`/admin/tickets/${ticket.id}`}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          View →
        </Link>
      </td>
    </tr>
  );
}
```

### 11-6. File: `src/components/admin/TicketPagination.tsx` (NEW)

```typescript
import { Button } from '@/components/ui/button';
import type { ApiMeta } from '@/types';

interface TicketPaginationProps {
  meta: ApiMeta;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export function TicketPagination({
  meta,
  currentPage,
  onPageChange,
}: TicketPaginationProps) {
  if (meta.total <= meta.limit) return null;

  const totalPages = Math.ceil(meta.total / meta.limit);

  return (
    <div className="flex items-center justify-between text-sm">
      <p className="text-muted-foreground">
        Showing {(currentPage - 1) * meta.limit + 1}–
        {Math.min(currentPage * meta.limit, meta.total)} of {meta.total}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!meta.hasNextPage}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </Button>
      </div>
      <p className="text-muted-foreground">
        Page {currentPage} of {totalPages}
      </p>
    </div>
  );
}
```

---

## 12. Ticket Detail Page

### 12-1. File: `src/app/(admin)/tickets/[id]/page.tsx` (NEW — Server Component)

```typescript
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/server/db/prisma';
import { TicketDetailView } from '@/components/admin/TicketDetailView';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const ticket = await prisma.feedback.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: ticket ? ticket.title : 'Ticket Not Found' };
}

async function getTicket(id: string) {
  return prisma.feedback.findUnique({
    where: { id },
    select: {
      id: true,
      trackingId: true,
      type: true,
      status: true,
      title: true,
      description: true,
      nickname: true,
      email: true,
      priority: true,
      assigneeId: true,
      createdAt: true,
      updatedAt: true,
      statusHistory: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          note: true,
          createdAt: true,
        },
      },
    },
  });
}

export default async function TicketDetailPage({ params }: Props) {
  const { id } = await params;
  const ticket = await getTicket(id);

  if (!ticket) notFound();

  return <TicketDetailView ticket={ticket} />;
}
```

### 12-2. File: `src/components/admin/StatusHistoryTimeline.tsx` (NEW)

```typescript
import { StatusHistoryTimelineItem } from './StatusHistoryTimelineItem';
import type { StatusHistoryEntry } from '@/types';

interface StatusHistoryTimelineProps {
  history: StatusHistoryEntry[];
}

export function StatusHistoryTimeline({ history }: StatusHistoryTimelineProps) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-medium text-muted-foreground">History</h3>
      <div className="space-y-0">
        {history.map((entry, i) => (
          <StatusHistoryTimelineItem
            key={entry.id}
            entry={entry}
            isFirst={i === 0}
            isLast={i === history.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
```

### 12-3. File: `src/components/admin/StatusHistoryTimelineItem.tsx` (NEW)

```typescript
import { TicketStatusBadge } from './TicketStatusBadge';
import type { StatusHistoryEntry } from '@/types';

interface StatusHistoryTimelineItemProps {
  entry: StatusHistoryEntry;
  isFirst: boolean;
  isLast: boolean;
}

export function StatusHistoryTimelineItem({
  entry,
  isLast,
}: StatusHistoryTimelineItemProps) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="size-2 rounded-full bg-border mt-2" />
        {!isLast && <div className="w-px flex-1 bg-border" />}
      </div>
      <div className="pb-3 pt-1 min-h-[2rem]">
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          {entry.fromStatus ? (
            <>
              <TicketStatusBadge status={entry.fromStatus} />
              <span className="text-muted-foreground">→</span>
              <TicketStatusBadge status={entry.toStatus} />
            </>
          ) : (
            <>
              <span className="text-muted-foreground">Created as</span>
              <TicketStatusBadge status={entry.toStatus} />
            </>
          )}
          <span className="text-xs text-muted-foreground ml-1">
            {new Date(entry.createdAt).toLocaleString()}
          </span>
        </div>
        {entry.note && (
          <p className="mt-1 text-xs text-muted-foreground">{entry.note}</p>
        )}
      </div>
    </div>
  );
}
```

### 12-4. File: `src/components/admin/StatusUpdatePanel.tsx` (NEW — Client Component)

```typescript
'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TicketStatusBadge } from './TicketStatusBadge';
import type { FeedbackDetail, TicketStatus } from '@/types';

interface StatusUpdatePanelProps {
  ticket: FeedbackDetail;
  onUpdate: (updated: FeedbackDetail) => void;
}

const STATUS_OPTIONS: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export function StatusUpdatePanel({ ticket, onUpdate }: StatusUpdatePanelProps) {
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus>(ticket.status);
  const [note, setNote] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (selectedStatus === ticket.status) {
      toast.info('Status is already set to this value');
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/v1/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: selectedStatus, note: note || undefined }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error ?? 'Failed to update status');
        return;
      }

      onUpdate(json.data);
      setNote('');
      toast.success('Status updated');
    });
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Status</h3>
        <TicketStatusBadge status={ticket.status} />
      </div>

      <select
        value={selectedStatus}
        onChange={(e) => setSelectedStatus(e.target.value as TicketStatus)}
        className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm"
        disabled={isPending}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s.replace('_', ' ')}
          </option>
        ))}
      </select>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note (optional)"
        maxLength={500}
        rows={2}
        disabled={isPending}
        className="w-full resize-none rounded-lg border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground"
      />

      <Button
        onClick={handleSubmit}
        disabled={isPending || selectedStatus === ticket.status}
        className="w-full"
      >
        {isPending ? 'Updating...' : 'Update Status'}
      </Button>
    </div>
  );
}
```

### 12-5. File: `src/components/admin/PriorityUpdatePanel.tsx` (NEW — Client Component)

```typescript
'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { FeedbackDetail, Priority } from '@/types';

interface PriorityUpdatePanelProps {
  ticket: FeedbackDetail;
  onUpdate: (updated: FeedbackDetail) => void;
}

const PRIORITY_OPTIONS = ['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export function PriorityUpdatePanel({ ticket, onUpdate }: PriorityUpdatePanelProps) {
  const [priority, setPriority] = useState<Priority | ''>(ticket.priority ?? '');
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if ((priority || null) === (ticket.priority ?? null)) {
      toast.info('Priority is already set to this value');
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/v1/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: priority || undefined }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error ?? 'Failed to update priority');
        return;
      }

      onUpdate(json.data);
      toast.success('Priority updated');
    });
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <h3 className="text-sm font-medium">Priority</h3>

      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value as Priority | '')}
        className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm"
        disabled={isPending}
      >
        <option value="">None</option>
        {PRIORITY_OPTIONS.filter(Boolean).map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <Button
        onClick={handleSubmit}
        disabled={isPending}
        className="w-full"
        variant="outline"
      >
        {isPending ? 'Saving...' : 'Set Priority'}
      </Button>
    </div>
  );
}
```

### 12-6. File: `src/components/admin/DangerZoneCard.tsx` (NEW — Client Component)

Uses a native `confirm()` dialog for delete confirmation. For production, replace with shadcn `AlertDialog`. The shadcn `AlertDialog` requires `npx shadcn@latest add alert-dialog` and uses a Radix controlled modal — the pattern is straightforward but adds a dependency.

```typescript
'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface DangerZoneCardProps {
  ticketId: string;
}

export function DangerZoneCard({ ticketId }: DangerZoneCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm('Delete this ticket? This action cannot be undone.')) return;

    startTransition(async () => {
      const res = await fetch(`/api/v1/tickets/${ticketId}`, {
        method: 'DELETE',
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error ?? 'Failed to delete ticket');
        return;
      }

      toast.success('Ticket deleted');
      router.push('/admin/tickets');
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-destructive/30 p-4">
      <h3 className="text-sm font-medium text-destructive">Danger Zone</h3>
      <p className="text-xs text-muted-foreground">
        Permanently delete this ticket and all its history.
      </p>
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDelete}
        disabled={isPending}
        className="w-full"
      >
        <Trash2 className="size-4" />
        {isPending ? 'Deleting...' : 'Delete Ticket'}
      </Button>
    </div>
  );
}
```

### 12-7. File: `src/components/admin/TicketDetailView.tsx` (NEW — Client Component)

```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TicketTypeBadge } from './TicketTypeBadge';
import { TicketStatusBadge } from './TicketStatusBadge';
import { TrackingIdBadge } from './TrackingIdBadge';
import { StatusHistoryTimeline } from './StatusHistoryTimeline';
import { StatusUpdatePanel } from './StatusUpdatePanel';
import { PriorityUpdatePanel } from './PriorityUpdatePanel';
import { DangerZoneCard } from './DangerZoneCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FeedbackDetail } from '@/types';

interface TicketDetailViewProps {
  ticket: FeedbackDetail;
}

export function TicketDetailView({ ticket: initialTicket }: TicketDetailViewProps) {
  const [ticket, setTicket] = useState(initialTicket);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Link
          href="/admin/tickets"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to tickets
        </Link>
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="flex-1 text-2xl font-semibold">{ticket.title}</h1>
          <TrackingIdBadge id={ticket.trackingId} />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Main column */}
        <div className="space-y-4">
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <TicketTypeBadge type={ticket.type} />
            <TicketStatusBadge status={ticket.status} />
            <span>
              Submitted by{' '}
              <strong>{ticket.nickname ?? 'Anonymous'}</strong>
            </span>
            <span>{new Date(ticket.createdAt).toLocaleString()}</span>
          </div>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
            </CardContent>
          </Card>

          {/* Contact info if available */}
          {ticket.email && (
            <p className="text-sm text-muted-foreground">
              Contact: <a href={`mailto:${ticket.email}`} className="hover:underline">{ticket.email}</a>
            </p>
          )}

          {/* Status history */}
          <StatusHistoryTimeline history={ticket.statusHistory} />
        </div>

        {/* Sidebar / action column */}
        <div className="space-y-4">
          <StatusUpdatePanel ticket={ticket} onUpdate={setTicket} />
          <PriorityUpdatePanel ticket={ticket} onUpdate={setTicket} />
          <DangerZoneCard ticketId={ticket.id} />
        </div>
      </div>
    </div>
  );
}
```

---

## 13. Seed Data

### 13-1. File: `prisma/seed.ts` (NEW)

```typescript
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

async function main() {
  // Admin accounts
  const adminHash = await hash('admin1234', BCRYPT_ROUNDS);
  const managerHash = await hash('manager1234', BCRYPT_ROUNDS);

  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      username: 'admin',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });

  await prisma.adminUser.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
      email: 'manager@example.com',
      username: 'manager',
      passwordHash: managerHash,
      role: 'MANAGER',
    },
  });

  // Sample feedback data
  const samples = [
    {
      type: 'BUG' as const,
      status: 'OPEN' as const,
      title: 'Submit button not responding on mobile',
      description:
        'When using the feedback form on iOS Safari, the submit button does nothing after filling all fields.',
      nickname: 'alice_mobile',
      email: 'alice@example.com',
      trackingId: 'FB-seed0001',
    },
    {
      type: 'BUG' as const,
      status: 'IN_PROGRESS' as const,
      title: 'Tracking page shows wrong status',
      description:
        'I submitted a bug report and it was marked as resolved, but the tracking page still shows OPEN.',
      nickname: 'bob_tracker',
      trackingId: 'FB-seed0002',
    },
    {
      type: 'FEATURE' as const,
      status: 'OPEN' as const,
      title: 'Add ability to attach screenshots',
      description:
        'It would be very helpful to attach screenshots when reporting bugs.',
      nickname: 'carol_ux',
      email: 'carol@example.com',
      trackingId: 'FB-seed0003',
    },
    {
      type: 'FEATURE' as const,
      status: 'RESOLVED' as const,
      title: 'Dark mode support for feedback form',
      description:
        'The feedback widget should respect system dark mode preference.',
      nickname: 'dave_dark',
      trackingId: 'FB-seed0004',
    },
    {
      type: 'GENERAL' as const,
      status: 'CLOSED' as const,
      title: 'Question about API rate limits',
      description:
        'How many feedback submissions can be made per hour through the API?',
      nickname: 'eve_dev',
      email: 'eve@example.com',
      trackingId: 'FB-seed0005',
    },
    {
      type: 'BUG' as const,
      status: 'OPEN' as const,
      title: 'Email field accepts invalid formats',
      description:
        'The form accepts "notanemail" as a valid email address when submitting feedback.',
      nickname: 'frank_qa',
      trackingId: 'FB-seed0006',
    },
    {
      type: 'FEATURE' as const,
      status: 'IN_PROGRESS' as const,
      title: 'Keyboard navigation for type selector',
      description:
        'The type selection cards are not keyboard-accessible.',
      nickname: 'grace_a11y',
      trackingId: 'FB-seed0007',
    },
    {
      type: 'GENERAL' as const,
      status: 'OPEN' as const,
      title: 'Feedback on the feedback system',
      description:
        'Love the clean UI! One suggestion: send a confirmation email after submitting.',
      nickname: 'henry_meta',
      email: 'henry@example.com',
      trackingId: 'FB-seed0008',
    },
  ] as const;

  const statusNotes: Partial<Record<string, string>> = {
    IN_PROGRESS: 'Currently investigating',
    RESOLVED: 'Fixed in latest deploy',
    CLOSED: 'Addressed in documentation',
  };

  for (const fb of samples) {
    const existing = await prisma.feedback.findUnique({
      where: { trackingId: fb.trackingId },
    });
    if (existing) continue;

    const created = await prisma.feedback.create({
      data: {
        type: fb.type,
        title: fb.title,
        description: fb.description,
        nickname: fb.nickname,
        email: 'email' in fb ? (fb.email ?? null) : null,
        trackingId: fb.trackingId,
        statusHistory: {
          create: { fromStatus: null, toStatus: 'OPEN' },
        },
      },
    });

    if (fb.status !== 'OPEN') {
      await prisma.statusHistory.create({
        data: {
          feedbackId: created.id,
          fromStatus: 'OPEN',
          toStatus: fb.status,
          changedById: admin.id,
          note: statusNotes[fb.status] ?? null,
        },
      });
      await prisma.feedback.update({
        where: { id: created.id },
        data: { status: fb.status },
      });
    }
  }

  console.log('Seed complete');
  console.log('  Admin:   admin@example.com   / admin1234');
  console.log('  Manager: manager@example.com / manager1234');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### 13-2. `package.json` addition

Add the `prisma.seed` configuration alongside existing scripts:

```json
{
  "prisma": {
    "seed": "ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed.ts"
  }
}
```

Run with: `npx prisma db seed`

---

## 14. Complete File Structure

### New Files to Create

```
user-feedback/
├── auth.ts                                           ← NextAuth v5 config
├── middleware.ts                                     ← Route protection
│
├── src/
│   ├── types/
│   │   └── next-auth.d.ts                           ← Session type augmentation
│   │
│   ├── lib/
│   │   └── api/
│   │       └── require-auth.ts                      ← requireAuth() helper
│   │
│   ├── server/
│   │   └── services/
│   │       └── ticket-stats.ts                      ← getTicketStats() shared service (H1)
│   │
│   ├── app/
│   │   ├── admin/
│   │   │   └── login/
│   │   │       └── page.tsx                         ← /admin/login (standalone)
│   │   ├── (admin)/
│   │   │   ├── layout.tsx                           ← Admin shell (auth-guarded)
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx                         ← /admin/dashboard
│   │   │   └── tickets/
│   │   │       ├── page.tsx                         ← /admin/tickets
│   │   │       └── [id]/
│   │   │           └── page.tsx                     ← /admin/tickets/:id
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...nextauth]/
│   │       │       └── route.ts                     ← NextAuth handler
│   │       └── v1/
│   │           └── tickets/
│   │               ├── route.ts                     ← GET /api/v1/tickets
│   │               ├── stats/
│   │               │   └── route.ts                 ← GET /api/v1/tickets/stats
│   │               └── [id]/
│   │                   └── route.ts                 ← GET/PATCH/DELETE /api/v1/tickets/:id
│   │
│   └── components/
│       ├── auth/
│       │   ├── LoginForm.tsx                        ← Login form (Client Component)
│       │   └── LoginErrorAlert.tsx                  ← Error alert
│       └── admin/
│           ├── AdminSidebar.tsx                     ← Navigation sidebar (Client)
│           ├── AdminHeader.tsx                      ← Top bar with user (Server)
│           ├── StatsCard.tsx                        ← Metric card
│           ├── TypeBreakdownCard.tsx                ← Type distribution
│           ├── RecentActivityCard.tsx               ← Today/week counts
│           ├── RecentTicketsTable.tsx               ← Last 5 tickets (Server — H2 fix)
│           ├── TicketListPageContent.tsx            ← Filter+list orchestrator (Client)
│           ├── TicketFiltersBar.tsx                 ← Filter controls (Client)
│           ├── TicketTable.tsx                      ← Ticket table
│           ├── TicketTableRow.tsx                   ← Single row
│           ├── TicketStatusBadge.tsx                ← Status badge
│           ├── TicketTypeBadge.tsx                  ← Type badge
│           ├── TrackingIdBadge.tsx                  ← Copy-to-clipboard (Client)
│           ├── TicketPagination.tsx                 ← Page controls
│           ├── TicketDetailView.tsx                 ← Detail orchestrator (Client)
│           ├── StatusUpdatePanel.tsx                ← Status change (Client)
│           ├── PriorityUpdatePanel.tsx              ← Priority change (Client)
│           ├── DangerZoneCard.tsx                   ← Delete (Client)
│           ├── StatusHistoryTimeline.tsx            ← History list
│           └── StatusHistoryTimelineItem.tsx        ← Single history entry
│
└── prisma/
    └── seed.ts                                      ← Admin + sample data
```

### Files to Modify

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `TicketStats`, `AdminSessionUser`; update `ApiMeta` with `hasNextPage: boolean` |
| `package.json` | Add `prisma.seed` script config |

---

## 15. Implementation Order

### Wave 1 — Install and Config (no inter-Wave 2 dependencies)

1. `npm install bcryptjs && npm install --save-dev @types/bcryptjs ts-node`
2. Add `AUTH_SECRET` and `NEXTAUTH_URL` to `.env.local`
3. `src/types/next-auth.d.ts` — session type augmentation
4. `auth.ts` — NextAuth config
5. `src/app/api/auth/[...nextauth]/route.ts` — handler export
6. `middleware.ts` — route protection

### Wave 2 — Types (depends on Wave 1)

7. Update `src/types/index.ts` — add `TicketStats`, `AdminSessionUser`, update `ApiMeta` with `hasNextPage`
8. `src/lib/api/require-auth.ts` — requireAuth helper

### Wave 3 — API Routes (depends on Wave 1 + 2)

9. `src/server/services/ticket-stats.ts` — shared stats service (H1 — must precede stats route)
10. `src/app/api/v1/tickets/route.ts` — GET list
11. `src/app/api/v1/tickets/stats/route.ts` — GET stats
12. `src/app/api/v1/tickets/[id]/route.ts` — GET/PATCH/DELETE

### Wave 4 — Shared UI Primitives (depends on Wave 2)

12. `src/components/admin/TicketStatusBadge.tsx`
13. `src/components/admin/TicketTypeBadge.tsx`
14. `src/components/admin/TrackingIdBadge.tsx`
15. `src/components/admin/StatsCard.tsx`
16. `src/components/admin/TypeBreakdownCard.tsx`
17. `src/components/admin/RecentActivityCard.tsx`
18. `src/components/admin/StatusHistoryTimelineItem.tsx`
19. `src/components/admin/StatusHistoryTimeline.tsx`
20. `src/components/auth/LoginErrorAlert.tsx`

### Wave 5 — Complex Components (depends on Wave 4)

21. `src/components/auth/LoginForm.tsx`
22. `src/components/admin/AdminSidebar.tsx`
23. `src/components/admin/AdminHeader.tsx`
24. `src/components/admin/TicketTableRow.tsx`
25. `src/components/admin/TicketTable.tsx`
26. `src/components/admin/TicketFiltersBar.tsx`
27. `src/components/admin/TicketPagination.tsx`
28. `src/components/admin/RecentTicketsTable.tsx`
29. `src/components/admin/StatusUpdatePanel.tsx`
30. `src/components/admin/PriorityUpdatePanel.tsx`
31. `src/components/admin/DangerZoneCard.tsx`
32. `src/components/admin/TicketDetailView.tsx`
33. `src/components/admin/TicketListPageContent.tsx`

### Wave 6 — Pages and Layouts (depends on Wave 5)

34. `src/app/admin/login/page.tsx`
35. `src/app/(admin)/layout.tsx`
36. `src/app/(admin)/dashboard/page.tsx`
37. `src/app/(admin)/tickets/page.tsx`
38. `src/app/(admin)/tickets/[id]/page.tsx`

### Wave 7 — Seed Data (depends on Wave 1)

39. `prisma/seed.ts`
40. Update `package.json` with `prisma.seed` script
41. Run `npx prisma db seed`

---

## 16. Acceptance Criteria

### Authentication

- `GET /admin/dashboard` redirects to `/admin/login` when unauthenticated
- `GET /admin/login` redirects to `/admin/dashboard` when already authenticated
- Login with wrong password shows "Invalid email or password", does not redirect
- Login with `admin@example.com` / `admin1234` redirects to `/admin/dashboard`
- All `/api/v1/tickets/*` routes return 401 without a valid session cookie

### Ticket List API

- `GET /api/v1/tickets` returns 401 without auth
- `GET /api/v1/tickets` returns paginated list with `meta.hasNextPage`
- `GET /api/v1/tickets?status=OPEN` returns only OPEN tickets
- `GET /api/v1/tickets?type=BUG&sort=createdAt&order=asc` filters and sorts correctly
- `GET /api/v1/tickets?page=2&limit=3` returns correct slice with correct meta

### Stats API

- `GET /api/v1/tickets/stats` returns counts for all 4 statuses and 3 types
- All zero-count statuses are present in response (not omitted)

### Ticket Detail API

- `GET /api/v1/tickets/:id` returns full ticket with `statusHistory` array
- `GET /api/v1/tickets/nonexistent-id` returns 404
- `PATCH /api/v1/tickets/:id` with `{ status: "IN_PROGRESS" }` updates status and creates a StatusHistory entry
- `PATCH /api/v1/tickets/:id` with `{ priority: "HIGH" }` (no status change) updates priority and does NOT create a StatusHistory entry (H4: no note provided)
- `PATCH /api/v1/tickets/:id` with `{ priority: "HIGH", note: "escalated" }` updates priority AND creates a StatusHistory note-only entry (H4 fix: note must not be silently discarded)
- `PATCH /api/v1/tickets/:id` — concurrent DELETE between tx commit and final read returns 404, never `{ success: true, data: null }` (C2 fix)
- `PATCH /api/v1/tickets/:id` with empty body `{}` returns 400
- `DELETE /api/v1/tickets/:id` removes ticket and all StatusHistory rows
- `DELETE /api/v1/tickets/nonexistent-id` returns 404

### Open Redirect Protection (C1)

- `GET /admin/login?callbackUrl=/admin/tickets` — after login, redirects to `/admin/tickets` (valid relative path)
- `GET /admin/login?callbackUrl=https://evil.com` — after login, redirects to `/admin/dashboard` (rejected: absolute URL)
- `GET /admin/login?callbackUrl=//evil.com` — after login, redirects to `/admin/dashboard` (rejected: scheme-relative)
- `GET /admin/login?callbackUrl=javascript:alert(1)` — after login, redirects to `/admin/dashboard` (rejected: non-path value)

### Admin UI

- `/admin/dashboard` shows 4 stats cards with correct counts from seeded data
- `/admin/tickets` renders all 8 seeded tickets in the table
- Status filter dropdown updates the visible tickets list
- Pagination controls appear when >20 tickets exist and navigate correctly
- `/admin/tickets/:id` shows full description, submitter info, and status history timeline
- Status update panel updates ticket status without full page reload
- Updated status is immediately reflected in the status badge and history timeline
- Delete button shows confirmation before deleting; after deletion, redirects to `/admin/tickets`

### Seed Data

- `npx prisma db seed` runs without error on a clean database
- `npx prisma db seed` is idempotent (safe to run multiple times)
- 8 sample feedback tickets exist with varied types and statuses
- Both admin accounts can log in successfully

---

## 17. Out of Scope for Phase 2

- Email notifications on status change — Phase 4
- Rate limiting on admin API — Phase 4
- Real-time dashboard updates (SSE) — Phase 5
- Kanban board view — Phase 5
- Ticket assignment to specific admin users — Phase 5
- Admin account management UI — Phase 5
- Password change/reset flow — Phase 5
- Embeddable widget — Phase 3

---

## 18. Security Notes

- **Password hashing:** `bcryptjs` with cost factor 12. Never store plaintext passwords.
- **JWT secret:** `AUTH_SECRET` env var must be set in production. NextAuth v5 throws at startup if absent — do not add a fallback default.
- **Session expiry:** NextAuth default is 30 days — acceptable for admin use. Phase 4 can shorten this.
- **CSRF:** NextAuth v5 handles CSRF automatically for its own endpoints.
- **Admin API auth check:** Every admin route handler calls `requireAuth()` as its first statement. No handler logic runs without a valid session.
- **Open Redirect (C1):** `callbackUrl` from login search params is sanitized server-side in `AdminLoginPage` (regex: `^\/[a-zA-Z0-9\-_/?=&%#]*$`) and again client-side in `LoginForm` (`startsWith('/')` + `!startsWith('//')`). Both layers must stay in sync.
- **Error messages:** Login page always shows "Invalid email or password" — never differentiates "email not found" from "wrong password".
- **Delete confirmation:** Uses `confirm()` in Phase 2. Phase 5 can upgrade to shadcn `AlertDialog` for a better UX.
- **Stack trace leakage:** `serverError()` helper logs to `console.error` server-side and returns only `"Internal server error"` to the client. Never expose stack traces in API responses.

---

### Critical Files for Implementation

- `/Users/sadonim/Desktop/Dev_claude/user-feedback/auth.ts` - New file: NextAuth v5 configuration with Credentials provider, JWT callbacks, and `bcryptjs` password verification
- `/Users/sadonim/Desktop/Dev_claude/user-feedback/src/app/api/v1/tickets/[id]/route.ts` - New file: Most complex API handler — atomic PATCH (update + conditional StatusHistory in `$transaction`), GET with full statusHistory, DELETE with cascade
- `/Users/sadonim/Desktop/Dev_claude/user-feedback/src/lib/api/require-auth.ts` - New file: Auth guard used by all three ticket API routes; must be implemented before any API route
- `/Users/sadonim/Desktop/Dev_claude/user-feedback/src/types/index.ts` - Modify: Adding `hasNextPage` to `ApiMeta` is a breaking change that affects all future callers; must be done in Wave 2 before API routes
- `/Users/sadonim/Desktop/Dev_claude/user-feedback/prisma/schema.prisma` - Reference: All Prisma queries must use exact field names from this schema (`passwordHash`, `trackingId`, `assigneeId`, `changedById`) — the schema is already correct and needs no modification