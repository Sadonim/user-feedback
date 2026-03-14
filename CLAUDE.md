# User Feedback - Project Guidelines

## Project Overview

**user-feedback** is a standalone, embeddable user feedback and ticket management system.
Users submit feedback (bug reports, feature requests, general inquiries) via a lightweight widget or page.
Admins manage tickets through a dashboard. Designed to be integrated into any website via REST API or embed script.

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16 (App Router) | API Routes for REST, SSR for admin |
| Language | TypeScript 5 | Strict mode |
| API | REST (Next.js Route Handlers) | No tRPC — must be consumable by any client |
| Validation | Zod | Request/response validation |
| ORM | Prisma 5 | Type-safe DB access |
| Database | PostgreSQL (Supabase) | Free tier, connection pooling |
| Auth | NextAuth v5 (JWT) | Admin dashboard only |
| UI | shadcn/ui + Tailwind CSS v4 | Accessible, composable |
| State | Zustand | Client state management |
| Widget | Vanilla TS (bundled) | Zero dependencies, embeddable anywhere |
| Deploy | Vercel | Serverless, edge-ready |

## Architecture

```
src/
├── app/
│   ├── api/                    # REST API Route Handlers
│   │   └── v1/
│   │       ├── feedback/       # CRUD endpoints
│   │       ├── tickets/        # Admin ticket management
│   │       └── status/         # Health check
│   ├── (admin)/                # Admin dashboard (auth required)
│   │   ├── dashboard/          # Overview, stats
│   │   └── tickets/            # Ticket list, detail, status updates
│   ├── (public)/               # Public-facing pages
│   │   ├── submit/             # Feedback submission page
│   │   └── track/              # User ticket tracking (by ticket ID)
│   └── layout.tsx
├── components/
│   ├── admin/                  # Admin UI components
│   ├── feedback/               # Feedback form components
│   ├── layout/                 # Shared layout (Header, Footer)
│   └── ui/                     # shadcn/ui base components
├── lib/
│   ├── auth.ts                 # NextAuth config
│   ├── api/                    # API response helpers, error handling
│   └── validators/             # Zod schemas
├── server/
│   └── db/
│       └── prisma.ts           # Prisma client singleton
└── widget/                     # Embeddable widget source
    ├── index.ts                # Widget entry point
    ├── ui.ts                   # Widget DOM rendering
    └── api.ts                  # Widget API calls
```

### Embeddable Widget Strategy

The widget is a standalone JS bundle that any website can include:
```html
<script src="https://your-domain.com/widget.js" data-project="PROJECT_KEY"></script>
```
- Zero dependencies (vanilla TS compiled to single JS file)
- Shadow DOM for style isolation
- Configurable via `data-*` attributes (theme, position, categories)
- Communicates with REST API only

## API Design

REST endpoints follow this pattern:
```
POST   /api/v1/feedback          # Submit feedback (public)
GET    /api/v1/feedback/:id      # Get feedback status (public, by ticket ID)
GET    /api/v1/tickets           # List tickets (admin, paginated)
GET    /api/v1/tickets/:id       # Ticket detail (admin)
PATCH  /api/v1/tickets/:id       # Update status/priority (admin)
DELETE /api/v1/tickets/:id       # Delete ticket (admin)
GET    /api/v1/status            # Health check
```

### API Response Envelope
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": { "total": 100, "page": 1, "limit": 20 }
}
```

## Data Model

### Feedback Types
- `BUG` — Bug report
- `FEATURE` — Feature request
- `GENERAL` — General inquiry

### Ticket Statuses
- `OPEN` — New submission
- `IN_PROGRESS` — Being reviewed
- `RESOLVED` — Fixed/completed
- `CLOSED` — Closed without action

### Auth Model
- Anonymous users: must provide nickname + optional email
- Authenticated users: linked to User model, display verified badge

## Development Phases

### Phase 1 — Foundation
- Project setup (Next.js, Prisma, Supabase)
- DB schema (Feedback, User, Admin)
- REST API endpoints with Zod validation
- Basic feedback submission form

### Phase 2 — Admin Dashboard
- Admin authentication (NextAuth)
- Ticket list with filtering/sorting
- Ticket detail with status management
- Basic stats (count by type, status)

### Phase 3 — Embeddable Widget
- Vanilla TS widget build pipeline
- Shadow DOM + style isolation
- Widget configuration via data attributes
- Widget API client

### Phase 4 — Notifications & Polish
- Status change email/notification to submitter
- Admin alert on new submission
- Rate limiting (Upstash)
- Accessibility audit (WCAG 2.1 AA)

### Phase 5 — Advanced Features
- Priority levels, assignee (for future team use)
- Real-time updates (SSE or WebSocket)
- Analytics dashboard
- lol-community integration

## Skills to Use

### Required for Every Code Change
- `/code-review` — Run after writing/modifying code
- `/security-review` — Before any commit touching auth, API, or user input

### Feature Development
- `/plan` — Before starting any phase or complex feature
- `/tdd` — Write tests first for all API endpoints and business logic

### Maintenance
- `/verify` — Run verification loop before commits
- `/refactor-clean` — Clean dead code after major changes

### Research
- `/search-first` — Search for existing solutions before implementing utilities

## Design References

Use these as UI/UX inspiration:
- **FeedbackFin** (github.com/rowyio/feedbackfin) — Lightweight widget pattern, data-attribute init, floating UI positioning
- **Fider** (github.com/getfider/fider) — Mature feedback platform UI, voting, roadmap
- **Quackback** (github.com/QuackbackIO/quackback) — shadcn/ui components, REST API, activity timelines
- **Ticketfy** (github.com/Pymmdrza/ticketfy) — Dark theme admin dashboard, RBAC, analytics

### Widget Design Principles
- One-click feedback button (floating, bottom-right default)
- 3-step flow: select type → write feedback → submit (with optional nickname for anonymous)
- Instant confirmation with ticket tracking ID
- Respect system dark/light mode preference

### Admin Dashboard Principles
- Kanban or list view for tickets
- Quick status change (dropdown or drag)
- Filter by type, status, date
- Stats cards at top (open count, avg response time)

## Coding Rules

### API Routes
- Always validate request body with Zod
- Return consistent response envelope
- Use proper HTTP status codes (201 created, 400 bad request, 401/403 auth)
- Rate limit public endpoints

### Immutability
- Never mutate objects — always create new copies
- Use spread operator or structuredClone for state updates

### File Size
- Max 400 lines per file (800 absolute max)
- Extract utilities and helpers into separate modules

### Error Handling
- API: return structured error responses, never expose stack traces
- UI: show user-friendly toast messages (sonner)
- Log detailed errors server-side only

### Testing
- 80%+ coverage target
- Unit tests for validators, API handlers
- Integration tests for API endpoints (real DB)
- E2E tests for critical flows (submit feedback, admin status change)
