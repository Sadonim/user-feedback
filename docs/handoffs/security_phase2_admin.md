# Security Review — Phase 2: Admin Dashboard

**날짜**: 2026-03-15
**검토 대상**: Phase 2에서 구현된 인증/관리자 관련 파일
**검토자**: Security Agent

---

## 검토 파일 목록

| 파일 | 역할 |
|------|------|
| `auth.ts` | NextAuth v5 설정, CredentialsProvider, JWT/세션 콜백 |
| `middleware.ts` | Admin 경로 보호 미들웨어 |
| `src/lib/api/require-auth.ts` | API 핸들러용 인증 헬퍼 |
| `src/app/api/v1/tickets/route.ts` | 티켓 목록 조회 (GET) |
| `src/app/api/v1/tickets/[id]/route.ts` | 티켓 상세/수정/삭제 (GET/PATCH/DELETE) |
| `src/app/api/v1/tickets/stats/route.ts` | 통계 조회 (GET) |
| `src/app/admin/login/page.tsx` | 로그인 서버 컴포넌트, callbackUrl 검증 |
| `src/components/auth/LoginForm.tsx` | 로그인 클라이언트 컴포넌트 |

---

```
STATUS: REVIEWED
SEVERITY_SUMMARY: CRITICAL:0 / HIGH:3 / MEDIUM:6 / LOW:5
```

---

## CRITICAL (없음)

Phase 2 구현에서 즉시 중단을 요구하는 CRITICAL 취약점은 발견되지 않았습니다.
✅ 하드코딩된 시크릿 없음
✅ SQL Injection 없음 (Prisma parameterized query 사용)
✅ Auth bypass 없음 (모든 Admin 엔드포인트에 `requireAuth()` 적용 확인)

---

## HIGH (다음 배포 전 수정 필수)

### H1 — 로그인 엔드포인트 Rate Limiting 부재 (Brute Force 위험)

**파일**: `auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`
**위치**: `authorize()` 콜백 내부

**문제**:
`/api/auth/callback/credentials`로 향하는 POST 요청에 Rate Limiting이 없습니다.
`authorize()` 함수는 매 요청마다 DB 조회 + bcrypt.compare를 수행하며, 이를 제한하는 장치가 없습니다.
`middleware.ts`의 matcher는 `/admin/:path*`만 커버하므로 `/api/auth/*`는 무방비 상태입니다.

```typescript
// auth.ts - 제한 없이 무한 반복 가능
async authorize(credentials) {
  // DB 조회 + bcrypt.compare → 응답 무한 반복 가능
}
```

**영향**: 관리자 계정에 대한 비밀번호 무차별 대입 공격 가능
**수정 방법**:
- Upstash Rate Limiter를 `authorize()` 내부 또는 NextAuth `signIn` 이벤트에 적용
- IP당 10분 내 5회 실패 시 잠금
- NextAuth `events.signInFailure` 콜백 활용 고려

---

### H2 — JWT 세션 만료 시간 미설정 (30일 기본값)

**파일**: `auth.ts`
**위치**: `session: { strategy: 'jwt' }` 설정

**문제**:
`maxAge`가 설정되지 않아 NextAuth 기본값인 **30일**이 적용됩니다.
관리자 JWT 토큰이 탈취될 경우 30일간 유효합니다.

```typescript
// 현재: maxAge 미설정 → 기본 30일
session: { strategy: 'jwt' },

// 권장: 8시간으로 단축
session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
```

**영향**: 세션 토큰 탈취 시 공격자가 최대 30일간 관리자 권한 유지
**수정 방법**: `session.maxAge`를 `8 * 60 * 60` (8시간)으로 설정

---

### H3 — 이메일 열거 공격 가능 (Timing Attack)

**파일**: `auth.ts`
**위치**: `authorize()` 함수, 35~37번 라인

**문제**:
존재하지 않는 이메일로 로그인 시도 시 bcrypt.compare를 **건너뛰고** 즉시 `null`을 반환합니다.
bcrypt.compare는 CPU 집약적 연산(~100ms)이므로, 응답 시간 차이로 유효한 이메일 여부를 판별할 수 있습니다.

```typescript
// 현재
const admin = await prisma.adminUser.findUnique({ where: { email } });
if (!admin) return null;  // ← 빠른 응답 (~5ms) → 이메일 없음 노출

const passwordValid = await compare(password, admin.passwordHash);
if (!passwordValid) return null;  // ← 느린 응답 (~100ms) → 이메일 존재 노출
```

**영향**: 응답 시간 측정으로 등록된 관리자 이메일 목록 추출 가능
**수정 방법**: 사용자가 없을 때도 더미 해시로 bcrypt.compare를 실행하여 응답 시간 균일화

```typescript
// 수정 예시
const DUMMY_HASH = '$2a$10$dummy.hash.for.timing.attack.prevention.only';
if (!admin) {
  await compare(password, DUMMY_HASH); // 타이밍 균일화
  return null;
}
```

---

## MEDIUM (이번 Phase 내 수정)

### M1 — 미들웨어 Matcher가 API 경로 제외 (Defense-in-Depth 공백)

**파일**: `middleware.ts`
**위치**: `export const config = { matcher: ['/admin/:path*'] }`

**문제**:
`/api/v1/tickets/*`는 미들웨어 보호 범위 밖입니다.
모든 Admin API는 핸들러 레벨의 `requireAuth()` 호출에만 의존합니다.
향후 개발자가 `requireAuth()` 호출을 빠뜨리는 경우 미들웨어가 백업으로 작동하지 않습니다.

**수정 방법**:
```typescript
export const config = {
  matcher: ['/admin/:path*', '/api/v1/tickets/:path*', '/api/v1/tickets/stats'],
};
```

---

### M2 — In-Memory Rate Limiter의 서버리스 환경 비효과성

**파일**: `src/lib/rate-limit.ts`

**문제**:
현재 `Map`을 사용하는 인메모리 Rate Limiter는 Vercel 서버리스 환경에서 **사실상 무력화**됩니다.
- 각 서버리스 인스턴스가 독립적인 Map을 유지
- 콜드 스타트 시 Map 초기화 → 이전 요청 기록 소실
- 여러 인스턴스에 요청이 분산되면 제한 횟수가 인스턴스 수에 비례해 증가

**현재 상태**: Phase 4에서 Upstash 전환 예정이라고 주석 있음 → **Phase 4 전 프로덕션 배포 시 주의 필요**
**수정 방법**: Phase 3 완료 전 Upstash Redis Rate Limiter로 전환 권장

---

### M3 — RBAC 미적용 (역할별 권한 구분 없음)

**파일**: `src/lib/api/require-auth.ts`, 전체 tickets API

**문제**:
Prisma 스키마에 `SUPER_ADMIN` / `ADMIN` 등의 역할이 정의되고, `requireAuth()`가 `role`을 반환하지만,
실제 티켓 API에서 역할별 접근 제어가 전혀 이루어지지 않습니다.

```typescript
// require-auth.ts
return { type: 'ok', user: { id, email, username, role } }; // role 반환하지만

// tickets/[id]/route.ts - DELETE
const authResult = await requireAuth();
if (authResult.type === 'error') return authResult.response;
// role 확인 없이 모든 인증된 사용자가 삭제 가능
await prisma.feedback.delete({ where: { id } });
```

**영향**: `ADMIN` 역할 사용자도 `SUPER_ADMIN` 전용 기능(삭제, 권한 변경 등) 수행 가능
**수정 방법**: DELETE, 권한 변경 등 민감한 작업에 `requireRole('SUPER_ADMIN')` 헬퍼 추가

---

### M4 — callbackUrl 퍼센트 인코딩 우회 가능성

**파일**: `src/app/admin/login/page.tsx`
**위치**: `sanitizeCallbackUrl()`, 10번 라인

**문제**:
`SAFE_CALLBACK_RE = /^\/[a-zA-Z0-9\-_/?=&%#]*$/` 정규식이 `%` 문자를 허용합니다.
`/%2F%2F`로 슬래시를 인코딩하면 정규식을 통과하고, 일부 환경에서 `//evil.com`으로 디코딩될 수 있습니다.

```
// 우회 시도 예시
callbackUrl = "/%2F%2Fevil%2Ecom"
// 정규식: 통과 (', %, 2, F, E 등 허용)
// decodeURIComponent 후: //evil.com → 오픈 리다이렉트 위험
```

**현재 완화 요인**: Next.js의 `router.push()`는 `history.pushState`를 사용하므로 실제 외부 리다이렉트 가능성은 낮음.
단, 서버 사이드 리다이렉트 로직이 추가되거나 다른 컨텍스트에서 사용 시 위험.
**수정 방법**: 정규식에서 `%` 제거하거나, 정규식 통과 후 `decodeURIComponent` 결과를 재검증

```typescript
// 권장 수정
const SAFE_CALLBACK_RE = /^\/[a-zA-Z0-9\-_/?=&#]*$/; // % 제거
```

---

### M5 — StatusHistory `note` 필드 HTML 미검증

**파일**: `src/lib/validators/feedback.ts`, `src/app/api/v1/tickets/[id]/route.ts`

**문제**:
`note` 필드 (`max: 500`자)에 HTML/스크립트 태그 입력이 허용됩니다.
React가 JSX에서 자동 이스케이프하므로 현재 관리자 대시보드 UI에서는 XSS 위험이 낮습니다.
그러나 Phase 4에서 이메일 알림 등에 `note`를 포함할 경우 XSS/HTML Injection 위험이 발생합니다.

**수정 방법**: `note` 스키마에 `.regex(/^[^<>]*$/, 'HTML tags not allowed')` 추가 또는 저장 전 sanitize

---

### M6 — 관리자 로그인 감사 로그 부재

**파일**: `auth.ts`

**문제**:
로그인 성공/실패 이벤트가 어디에도 기록되지 않습니다.
보안 침해 발생 시 사후 분석이 불가능합니다.

**수정 방법**: NextAuth `events` 콜백 활용

```typescript
events: {
  async signIn({ user }) {
    console.log(`[AUTH] Login success: ${user.email} at ${new Date().toISOString()}`);
  },
  async signInFailure({ error }) {
    console.error(`[AUTH] Login failure: ${error} at ${new Date().toISOString()}`);
  },
},
```

---

## PASS (정상 확인된 항목)

| 항목 | 상태 | 근거 |
|------|------|------|
| 모든 Admin API에 `requireAuth()` 적용 | ✅ | tickets/, tickets/[id], tickets/stats 전체 확인 |
| Prisma parameterized query | ✅ | raw query 없음, 모든 DB 접근이 Prisma ORM 경유 |
| Zod 스키마 검증 | ✅ | 요청 body, query params 모두 검증 |
| 응답에서 passwordHash 제거 | ✅ | `authorize()`가 세션에 passwordHash 포함 않음 |
| CORS 허용 도메인 화이트리스트 | ✅ | `cors.ts`에서 env var 기반 화이트리스트 적용 |
| Open Redirect (1차 방어) | ✅ | 서버: 정규식 검증, 클라이언트: `startsWith('/')` 이중 방어 |
| 에러 응답에서 스택 트레이스 제거 | ✅ | `serverError()`가 "Internal server error"만 반환 |
| 제네릭 로그인 에러 메시지 | ✅ | "Invalid email or password"로 통일 |
| TOCTOU 방지 (PATCH 트랜잭션) | ✅ | 트랜잭션 내 read-then-write로 race condition 방지 |
| AUTH_SECRET 길이 | ✅ | 44자 (32자 이상 권장 기준 충족) |
| .env gitignore 설정 | ✅ | `.env`가 `.gitignore`에 포함됨 |
| .env.example 실제 값 없음 | ✅ | 모든 값이 빈 문자열 |
| CORS `Access-Control-Allow-Methods` | ✅ | tickets API는 CORS 미적용 (admin-only 적절) |
| XSS — `LoginErrorAlert` | ✅ | React JSX 자동 이스케이프, innerHTML 미사용 |

---

## 권고사항 (LOW)

1. **Content-Security-Policy 헤더 추가**
   `next.config.ts`의 `headers()` 설정으로 CSP 추가
   ```
   Content-Security-Policy: default-src 'self'; script-src 'self'; ...
   ```

2. **환경변수 시작 시 검증**
   앱 시작 시 필수 환경변수 누락을 early-fail로 감지
   ```typescript
   // src/lib/env.ts
   if (!process.env.AUTH_SECRET) throw new Error('AUTH_SECRET is required');
   if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
   ```

3. **NextAuth 쿠키 설정 명시적 지정**
   현재 NextAuth 기본값에 의존 중. 프로덕션 배포 전 명시적 설정 권장:
   ```typescript
   cookies: {
     sessionToken: {
       options: { httpOnly: true, secure: true, sameSite: 'lax' }
     }
   }
   ```

4. **로그인 폼 CAPTCHA / Honeypot 필드**
   H1 (Rate Limiting)이 구현되기 전 임시 방어로 고려

5. **Supabase Row Level Security (RLS) 검토**
   현재 Prisma를 통한 서버 레이어 보호만 존재.
   DB 직접 접근 시나리오 대비 RLS 정책 설정 권장

---

## 조치 우선순위 요약

| 우선순위 | 이슈 | 담당 파일 |
|---------|------|----------|
| 🔴 HIGH-1 | 로그인 Rate Limiting 추가 | `auth.ts`, `/api/auth/*` |
| 🔴 HIGH-2 | JWT maxAge 8시간으로 단축 | `auth.ts` |
| 🔴 HIGH-3 | Timing Attack 방지 (더미 bcrypt) | `auth.ts` |
| 🟡 MEDIUM-1 | 미들웨어 matcher에 `/api/v1/tickets/*` 추가 | `middleware.ts` |
| 🟡 MEDIUM-2 | Upstash Rate Limiter 조기 전환 | `src/lib/rate-limit.ts` |
| 🟡 MEDIUM-3 | RBAC 역할 기반 접근 제어 구현 | `require-auth.ts`, tickets API |
| 🟡 MEDIUM-4 | callbackUrl에서 `%` 제거 | `login/page.tsx` |
| 🟡 MEDIUM-5 | `note` 필드 HTML 차단 | `validators/feedback.ts` |
| 🟡 MEDIUM-6 | 감사 로그 추가 | `auth.ts` |
