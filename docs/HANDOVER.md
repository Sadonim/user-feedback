# 인계 문서 — 맥북 이어받기

## 현재 상태 (2026-03-15)

### 완료된 작업
- ✅ **Phase 1 Foundation** — Next.js 16, Prisma 5, 피드백 API, 공개 페이지 전체 완성
- ✅ 빌드 통과, 타입 에러 0, CRITIC 이슈 모두 반영

### 미완료 (이어서 할 작업)
- ⏳ **DB 마이그레이션 미실행** — Supabase DIRECT_URL 설정 후 실행 필요
- 🔲 Phase 2 — Admin Dashboard (NextAuth + 티켓 관리 UI)
- 🔲 Phase 3 — Embeddable Widget
- 🔲 Phase 4 — Notifications + Rate Limiting (Upstash)
- 🔲 Phase 5 — Advanced Features

---

## 맥북 셋업

```bash
git clone https://github.com/Sadonim/user-feedback.git
cd user-feedback
npm install
cp .env.example .env
# .env 파일에 아래 값 채우기 (아래 참고)
npx prisma generate
```

### .env 설정

```bash
# Supabase Dashboard → Settings → Database → Connection string

# Transaction Mode (pooler) — 앱 런타임용
DATABASE_URL="postgresql://postgres.[프로젝트ref]:[비밀번호]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection — 마이그레이션 전용 (db.xxx.supabase.co 형식)
DIRECT_URL="postgresql://postgres.[프로젝트ref]:[비밀번호]@db.[프로젝트ref].supabase.co:5432/postgres"

# Auth
AUTH_SECRET="최소32자이상랜덤문자열"   # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### DB 마이그레이션 실행 (첫 번째로 할 것)

```bash
npx prisma migrate dev --name init_phase1
```

성공하면:
```
✔ Generated Prisma Client
✔ Applied migration init_phase1
```

---

## Phase 2 시작 프롬프트

마이그레이션 완료 후 Claude에게:

```
user-feedback 프로젝트 Phase 2 Admin Dashboard 구현해줘.
docs/DEVELOPMENT_PLAN.md 와 CLAUDE.md 참고해서 진행해.
멀티에이전트 오케스트레이션 유지하면서 ARCHITECT → CRITIC → 구현 → RUNNER 순으로.
```

---

## 멀티에이전트 터미널 세팅

```bash
# 터미널 1 — ARCHITECT
claude --system-prompt "$(cat docs/agents/ARCHITECT.md)"

# 터미널 2 — CRITIC
claude --system-prompt "$(cat docs/agents/CRITIC.md)"

# 터미널 3 — DESIGNER
claude --system-prompt "$(cat docs/agents/DESIGNER.md)"

# 터미널 4 — TESTER
claude --system-prompt "$(cat docs/agents/TESTER.md)"

# 터미널 5 — SECURITY
claude --system-prompt "$(cat docs/agents/SECURITY.md)"

# 터미널 6 — REFACTOR
claude --system-prompt "$(cat docs/agents/REFACTOR.md)"

# 터미널 7 — RUNNER
claude --system-prompt "$(cat docs/agents/RUNNER.md)"
```

---

## Phase 2 구현 범위 (다음 작업)

```
2-1. NextAuth v5 설정 (Credentials Provider, JWT)
2-2. /admin/login 페이지
2-3. GET/PATCH/DELETE /api/v1/tickets 엔드포인트
2-4. /admin/dashboard — 통계 카드
2-5. /admin/tickets — 목록 (필터/정렬/페이지네이션)
2-6. /admin/tickets/[id] — 상세 + 상태 변경
2-7. 시드 데이터 (관리자 계정 + 샘플 피드백)
```

---

## 주요 파일 구조 (현재)

```
src/
├── app/
│   ├── api/v1/
│   │   ├── feedback/route.ts          ← POST (공개)
│   │   ├── feedback/[trackingId]/route.ts ← GET (공개)
│   │   └── status/route.ts            ← Health check
│   ├── (public)/
│   │   ├── submit/page.tsx            ← 피드백 제출
│   │   └── track/page.tsx             ← 상태 추적
│   └── layout.tsx
├── components/feedback/               ← FeedbackForm, TrackingView
├── lib/
│   ├── api/response.ts                ← API 응답 헬퍼
│   ├── api/cors.ts                    ← CORS 설정
│   ├── rate-limit.ts                  ← IP 레이트리미터
│   ├── tracking.ts                    ← trackingId 생성
│   └── validators/feedback.ts         ← Zod 스키마
├── server/db/prisma.ts                ← Prisma 클라이언트
└── types/index.ts                     ← 공통 타입
```

---

## 기술 스택 확정 버전

| 패키지 | 버전 | 비고 |
|--------|------|------|
| Next.js | 16.1.6 | Turbopack |
| Prisma | 5.22.0 | v7 아님 주의 |
| Zod | 4.3.6 | v4 API 사용 |
| shadcn/ui | 4.0.7 | @base-ui/react 기반 |
| Tailwind | v4 | |
| next-auth | 5.0.0-beta.30 | |
| nanoid | 5.1.6 | |
