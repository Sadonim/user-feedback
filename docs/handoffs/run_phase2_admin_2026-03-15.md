```
STATUS: PARTIAL
DATE: 2026-03-15
FEATURE: phase2-admin-dashboard
```

# Phase 2 Admin Dashboard — 실행 검증 결과

## 실행 결과 요약

| 항목 | 결과 | 메모 |
|------|------|------|
| `npm install` | ✅ PASS | `@vitest/coverage-v8` 추가 설치 (누락 패키지) |
| `npm run lint` | ⚠️ WARN | 에러 0건, 경고 3건 (non-blocking) |
| `npm run build` | ✅ PASS | 컴파일 성공, 15개 라우트 생성 |
| `npm run test` | ✅ PASS | 105/105 통과 (버그 1건 수정 후) |
| `npm run test:coverage` | ❌ FAIL | 전체 커버리지 61% — 80% 미달 |

---

## 빌드 상세

```
▲ Next.js 16.1.6 (Turbopack)
✓ Compiled successfully in 1736.9ms
✓ Generating static pages (13/13) in 2.4s
```

### 생성된 라우트 목록

| 라우트 | 타입 | 비고 |
|--------|------|------|
| `/` | ○ Static | |
| `/admin/login` | ƒ Dynamic | Phase 2 신규 |
| `/api/auth/[...nextauth]` | ƒ Dynamic | Phase 2 신규 |
| `/api/v1/feedback` | ƒ Dynamic | Phase 1 |
| `/api/v1/feedback/[trackingId]` | ƒ Dynamic | Phase 1 |
| `/api/v1/status` | ƒ Dynamic | Phase 1 |
| `/api/v1/tickets` | ƒ Dynamic | Phase 2 신규 |
| `/api/v1/tickets/[id]` | ƒ Dynamic | Phase 2 신규 |
| `/api/v1/tickets/stats` | ƒ Dynamic | Phase 2 신규 |
| `/dashboard` | ƒ Dynamic | Phase 2 신규 |
| `/submit` | ○ Static | Phase 1 |
| `/tickets` | ƒ Dynamic | Phase 2 신규 |
| `/tickets/[id]` | ƒ Dynamic | Phase 2 신규 |
| `/track` | ○ Static | Phase 1 |

**경고 (non-critical):**
```
⚠ Next.js inferred your workspace root — multiple lockfiles detected.
  권고: next.config에 turbopack.root 설정 추가
```

---

## 린트 상세

```
✖ 3 problems (0 errors, 3 warnings)
```

| 파일 | 위치 | 경고 내용 |
|------|------|-----------|
| `src/__tests__/unit/sanitize-callback-url.test.ts` | L17 | Unused eslint-disable directive |
| `src/app/api/v1/feedback/route.ts` | L4 | `'ok'` is defined but never used |
| `src/app/api/v1/tickets/stats/route.ts` | L6 | `'_req'` is defined but never used |

**에러 0건 — 빌드/배포 블로킹 없음.**

---

## 테스트 상세

### 수정 전 실패 1건

**실패 항목:** `sanitizeCallbackUrl() > 거부되어야 하는 경로 > 이중 슬래시 (//로 시작) 경로를 거부해야 한다`

- **에러 메시지:**
  ```
  AssertionError: expected '//admin/dashboard' to be '/admin/dashboard'
  Expected: "/admin/dashboard"
  Received: "//admin/dashboard"
  ```
- **발생 위치:** `src/__tests__/unit/sanitize-callback-url.test.ts:99`
- **원인 분석:** `src/app/admin/login/page.tsx`의 정규식이 `//` 시작 경로를 허용하는 버그
  ```typescript
  // 버그: / 뒤에 / 도 허용됨 (프로토콜 상대 URL //evil.com 통과)
  const SAFE_CALLBACK_RE = /^\/[a-zA-Z0-9\-_/?=&%#]*$/;
  ```
- **수정 내용:** 음수 전방탐색 `(?!\/)` 추가
  ```typescript
  // 수정: // 로 시작하는 경로 차단 (Open Redirect 취약점 제거)
  const SAFE_CALLBACK_RE = /^\/(?!\/)[a-zA-Z0-9\-_/?=&%#]*$/;
  ```
- **심각도:** **HIGH** — Open Redirect 보안 취약점 (OWASP CWE-601)

### 수정 후 결과

```
Test Files  6 passed (6)
Tests       105 passed (105)
Duration    117s
```

| 테스트 파일 | 결과 | 테스트 수 |
|-------------|------|-----------|
| `unit/sanitize-callback-url.test.ts` | ✅ | 16 |
| `unit/validators.test.ts` | ✅ | ~25 |
| `unit/require-auth.test.ts` | ✅ | ~10 |
| `integration/tickets-api.test.ts` | ✅ | ~30 |
| `integration/tickets-id-api.test.ts` | ✅ | ~15 |
| `integration/tickets-stats-api.test.ts` | ✅ | ~9 |

---

## 커버리지 상세

```
ERROR: Coverage for lines (59.21%) does not meet global threshold (80%)
ERROR: Coverage for functions (55.17%) does not meet global threshold (80%)
ERROR: Coverage for statements (61.04%) does not meet global threshold (80%)
ERROR: Coverage for branches (63.54%) does not meet global threshold (80%)
```

### 파일별 커버리지

| 파일 | Stmts | Branch | Funcs | Lines | 미커버 라인 |
|------|-------|--------|-------|-------|------------|
| `api/v1/tickets/route.ts` | 93.3% | 100% | 100% | 92.3% | L56 |
| `api/v1/tickets/[id]/route.ts` | 93.4% | 88.6% | 100% | 93.7% | L50, L123, L148 |
| `api/v1/tickets/stats/route.ts` | 85.7% | 100% | 100% | 83.3% | L14 |
| `lib/validators/feedback.ts` | **100%** | **100%** | **100%** | **100%** | — |
| `lib/api/require-auth.ts` | **100%** | 75% | **100%** | **100%** | L31 |
| `server/services/ticket-stats.ts` | **100%** | 50% | **100%** | **100%** | L14 |
| **Phase 1 미커버** | | | | | |
| `api/v1/feedback/route.ts` | **0%** | **0%** | **0%** | **0%** | L10–L77 전체 |
| `api/v1/feedback/[trackingId]/route.ts` | **0%** | **0%** | **0%** | **0%** | L11–L47 전체 |
| `api/v1/status/route.ts` | **0%** | 100% | **0%** | **0%** | L4 |
| `lib/api/cors.ts` | **0%** | **0%** | **0%** | **0%** | L3–L20 전체 |
| `lib/api/response.ts` | 44.4% | 100% | 50% | 44.4% | L9, L21, L32–L40 |
| `app/api/auth/[...nextauth]/route.ts` | 0% | 100% | 100% | 0% | L3 |

### 원인 분석

- **Phase 2 코드 자체**는 85–100% 커버리지 달성 ✅
- **전체 미달의 주원인**: Phase 1 API 라우트(`feedback/route.ts`, `feedback/[trackingId]/route.ts`) 와 `cors.ts`, `response.ts` 일부에 테스트가 없음
- Phase 1은 별도 구현 단계에서 작성됐으며, 해당 파일들의 테스트가 Phase 1 구현 시 추가되지 않은 상태

---

## 실패 항목 상세

### ❌ 커버리지 미달 (61% < 80%)

- **에러 메시지:** `ERROR: Coverage for lines (59.21%) does not meet global threshold (80%)`
- **발생 위치:** `npm run test:coverage` 임계값 설정
- **원인 추정:** Phase 1 API 라우트(`feedback/route.ts`, `cors.ts` 등)에 통합 테스트 미작성. Phase 2 코드만 분리 측정 시 90%+ 달성.
- **권고 조치:** → **TESTER** 에게 전달
  - `src/app/api/v1/feedback/route.ts` POST 엔드포인트 통합 테스트 작성
  - `src/app/api/v1/feedback/[trackingId]/route.ts` GET 테스트 작성
  - `src/lib/api/cors.ts` 단위 테스트 작성
  - `src/lib/api/response.ts` 미커버 헬퍼 함수 테스트 작성

---

## 수정된 파일

| 파일 | 변경 내용 | 심각도 |
|------|-----------|--------|
| `src/app/admin/login/page.tsx` | `SAFE_CALLBACK_RE` 에 `(?!\/)` 전방탐색 추가 — Open Redirect 차단 | HIGH |
| `package.json` (dev deps) | `@vitest/coverage-v8` 추가 | LOW |

---

## 다음 단계 권고

| 우선순위 | 항목 | 담당 에이전트 |
|----------|------|--------------|
| 🔴 HIGH | Phase 1 API 라우트 통합 테스트 작성 (`feedback`, `cors`) — 커버리지 80% 달성 | **TESTER** |
| 🟡 MEDIUM | Lint 경고 3건 정리 (`unused var 'ok'`, `unused '_req'`) | **REFACTOR** |
| 🟡 MEDIUM | `next.config` 에 `turbopack.root` 설정 추가 (빌드 경고 제거) | **REFACTOR** |
| 🟢 LOW | `lib/api/require-auth.ts` Branch 커버리지 L31 (edge case 추가) | **TESTER** |
