# User Feedback — 개발 계획서

## 프로젝트 개요

**user-feedback**는 독립형 유저 피드백 접수 및 티켓 관리 시스템입니다.
어떤 웹사이트에서든 REST API 또는 임베드 위젯으로 연동 가능하며,
최종적으로 lol-community 프로젝트에 통합 예정입니다.

---

## 기술 스택

| 영역 | 기술 | 선택 이유 |
|------|------|-----------|
| Framework | Next.js 16 (App Router) | 익숙함 + API Routes로 REST 제공 |
| API | REST (Route Handlers) | tRPC 제외 — 외부 클라이언트 범용성 확보 |
| Validation | Zod | 입력 검증, 타입 추론 |
| ORM | Prisma 5 | 타입 안전, 마이그레이션 관리 |
| DB | PostgreSQL (Supabase) | 무료, connection pooling |
| Auth | NextAuth v5 (JWT) | 관리자 대시보드 전용 |
| UI | shadcn/ui + Tailwind CSS v4 | 접근성, 빠른 개발 |
| State | Zustand | 클라이언트 상태 관리 |
| Widget | Vanilla TS (번들) | 의존성 0, 어디든 임베드 |
| Rate Limit | Upstash Redis | API 남용 방지 |
| Deploy | Vercel | 기존 경험 |

---

## 데이터 모델 설계

### Feedback (피드백/티켓)
```
id            String    @id @default(cuid())
type          FeedbackType (BUG | FEATURE | GENERAL)
status        TicketStatus (OPEN | IN_PROGRESS | RESOLVED | CLOSED)
title         String
description   String
nickname      String?       — 비로그인 유저용
email         String?       — 선택적 이메일 (상태 알림용)
userId        String?       — 로그인 유저 연결 (nullable)
trackingId    String @unique — 공개 추적 ID (예: FB-a1b2c3)
priority      Priority?     — Phase 5에서 추가 (LOW | MEDIUM | HIGH | CRITICAL)
assigneeId    String?       — Phase 5에서 추가
createdAt     DateTime
updatedAt     DateTime
```

### User (관리자)
```
id            String    @id @default(cuid())
email         String    @unique
username      String    @unique
passwordHash  String
role          UserRole  (ADMIN | MANAGER)
createdAt     DateTime
```

### StatusHistory (상태 변경 기록)
```
id            String    @id @default(cuid())
feedbackId    String
fromStatus    TicketStatus?
toStatus      TicketStatus
changedById   String?       — 관리자 ID
note          String?       — 변경 사유
createdAt     DateTime
```

### Notification (알림 — Phase 4)
```
id            String    @id @default(cuid())
feedbackId    String
type          NotifType (STATUS_CHANGED | NEW_FEEDBACK | ASSIGNED)
recipient     String        — 이메일 또는 userId
message       String
isRead        Boolean   @default(false)
createdAt     DateTime
```

---

## REST API 설계

### Public (인증 불필요)
```
POST   /api/v1/feedback              피드백 제출
  Body: { type, title, description, nickname?, email? }
  Response: { trackingId, status }

GET    /api/v1/feedback/:trackingId   피드백 상태 조회 (추적 ID로)
  Response: { type, title, status, statusHistory[], createdAt }
```

### Admin (인증 필요)
```
GET    /api/v1/tickets                티켓 목록 (페이지네이션, 필터)
  Query: ?page=1&limit=20&status=OPEN&type=BUG&sort=createdAt
  Response: { data: [...], meta: { total, page, limit } }

GET    /api/v1/tickets/:id            티켓 상세
PATCH  /api/v1/tickets/:id            상태/우선순위 변경
  Body: { status?, priority?, note? }
DELETE /api/v1/tickets/:id            티켓 삭제
GET    /api/v1/tickets/stats          통계 (타입별/상태별 카운트)
```

### 응답 형식 (공통)
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": { "total": 100, "page": 1, "limit": 20 }
}
```

---

## 개발 Phase 상세

### Phase 1 — Foundation (기반 구축)

**목표:** 프로젝트 셋업 + DB + 핵심 API + 피드백 제출 폼

| 단계 | 작업 | 세부 내용 |
|------|------|-----------|
| 1-1 | 프로젝트 초기화 | `npx create-next-app`, Tailwind, shadcn/ui, Prisma 설치 |
| 1-2 | Prisma 스키마 | Feedback, User, StatusHistory 모델 정의 |
| 1-3 | DB 셋업 | Supabase 프로젝트 생성, 환경변수 설정, 마이그레이션 |
| 1-4 | API 유틸리티 | 응답 envelope 헬퍼, 에러 핸들러, Zod 스키마 |
| 1-5 | 피드백 API | POST /api/v1/feedback, GET /api/v1/feedback/:trackingId |
| 1-6 | 피드백 제출 폼 | 공개 페이지 /submit — 타입 선택 → 내용 작성 → 제출 |
| 1-7 | 추적 페이지 | /track — trackingId로 상태 조회 |

**완료 기준:**
- 비로그인 유저가 피드백 제출 가능 (닉네임 필수)
- trackingId로 상태 조회 가능
- API가 외부에서 fetch로 호출 가능

---

### Phase 2 — Admin Dashboard (관리자 대시보드)

**목표:** 관리자 인증 + 티켓 관리 UI

| 단계 | 작업 | 세부 내용 |
|------|------|-----------|
| 2-1 | NextAuth 설정 | JWT, Credentials Provider, 관리자 전용 |
| 2-2 | 관리자 로그인 | /admin/login 페이지 |
| 2-3 | 티켓 API | GET/PATCH/DELETE /api/v1/tickets |
| 2-4 | 대시보드 홈 | /admin/dashboard — 통계 카드 (타입별, 상태별 카운트) |
| 2-5 | 티켓 목록 | /admin/tickets — 필터/정렬/페이지네이션 |
| 2-6 | 티켓 상세 | /admin/tickets/:id — 상태 변경, 상태 변경 이력 |
| 2-7 | 시드 데이터 | 테스트용 관리자 계정 + 샘플 피드백 |

**완료 기준:**
- 관리자 로그인 후 티켓 목록/상세 확인 가능
- 상태 변경 (OPEN → IN_PROGRESS → RESOLVED/CLOSED)
- 필터링 (타입, 상태, 날짜)

---

### Phase 3 — Embeddable Widget (임베드 위젯)

**목표:** 외부 사이트에 `<script>` 한 줄로 피드백 버튼 추가

| 단계 | 작업 | 세부 내용 |
|------|------|-----------|
| 3-1 | 빌드 파이프라인 | Vite/esbuild로 widget.js 단일 번들 생성 |
| 3-2 | Shadow DOM | 호스트 사이트 CSS와 격리 |
| 3-3 | 위젯 UI | 플로팅 버튼 → 팝업 폼 (타입 선택 → 내용 → 제출) |
| 3-4 | 설정 | data-* 속성으로 커스터마이징 (테마, 위치, 카테고리) |
| 3-5 | API 연동 | POST /api/v1/feedback 호출, CORS 설정 |
| 3-6 | 다크모드 | 시스템 테마 감지, 수동 토글 |

**사용법 (최종):**
```html
<script
  src="https://your-domain.com/widget.js"
  data-project="PROJECT_KEY"
  data-theme="auto"
  data-position="bottom-right">
</script>
```

**완료 기준:**
- 외부 HTML에 script 태그 삽입만으로 피드백 버튼 표시
- 제출된 피드백이 관리자 대시보드에 표시
- 호스트 사이트 CSS에 영향 없음

---

### Phase 4 — Notifications (알림)

**목표:** 상태 변경 시 제출자에게 알림

| 단계 | 작업 | 세부 내용 |
|------|------|-----------|
| 4-1 | StatusHistory | 상태 변경 시 자동 기록 |
| 4-2 | 이메일 알림 | 제출 시 이메일 입력한 유저에게 상태 변경 이메일 (Resend/Nodemailer) |
| 4-3 | 관리자 알림 | 새 피드백 접수 시 관리자에게 알림 |
| 4-4 | Rate Limiting | Upstash Redis로 공개 API 제한 (IP당 분당 10건) |
| 4-5 | 접근성 감사 | WCAG 2.1 AA 기준 점검 (ARIA, 키보드 내비게이션, 색상 대비) |

**완료 기준:**
- 상태 변경 시 이메일 발송
- 새 피드백 접수 시 관리자 알림
- API rate limit 동작

---

### Phase 5 — Advanced Features (고급 기능)

**목표:** 확장 기능 + lol-community 통합

| 단계 | 작업 | 세부 내용 |
|------|------|-----------|
| 5-1 | 우선순위 | LOW/MEDIUM/HIGH/CRITICAL 레벨 추가 |
| 5-2 | 담당자 배정 | 관리자 간 티켓 배정 |
| 5-3 | 실시간 업데이트 | SSE(Server-Sent Events)로 대시보드 실시간 갱신 |
| 5-4 | 분석 대시보드 | 피드백 트렌드, 응답 시간, 유형별 분석 차트 |
| 5-5 | lol-community 통합 | 위젯 삽입 또는 API 연동으로 lol-community에 피드백 기능 추가 |

---

## 디자인 참고

### 유저 피드백 폼 (접근성 최우선)
- 3단계 플로우: **타입 선택 → 내용 작성 → 제출**
- 최소 입력 필드 (제목, 설명, 닉네임만 필수)
- 제출 후 즉시 trackingId 표시 → 나중에 상태 추적 가능
- 모바일 최적화 필수

### 관리자 대시보드
- 상단: 통계 카드 (열린 티켓, 오늘 접수, 평균 응답 시간)
- 리스트뷰 기본, 칸반뷰 선택 가능 (Phase 5)
- 빠른 상태 변경 (드롭다운)
- 타입/상태/날짜 필터

### 디자인 레퍼런스
- **FeedbackFin** — 경량 위젯, data-* 초기화, Floating UI
- **Fider** (4.2k stars) — 성숙한 피드백 플랫폼 UI
- **Quackback** — shadcn/ui, REST API, 활동 타임라인
- **Ticketfy** — 다크 테마 관리자 대시보드

---

## 환경변수 (.env)

```bash
# Database (Supabase)
DATABASE_URL=
DIRECT_URL=

# Auth
AUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Rate Limiting (Upstash)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Email (Phase 4)
RESEND_API_KEY=

# Widget
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 작업 우선순위 요약

```
Phase 1 (Foundation)     ← 다음 작업 시작점
  └→ Phase 2 (Admin)
       └→ Phase 3 (Widget)
            └→ Phase 4 (Notifications)
                 └→ Phase 5 (Advanced + lol-community 통합)
```
