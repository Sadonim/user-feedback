# Security Review — Phase 3 Widget 구현

**Date:** 2026-03-15
**Reviewed by:** SECURITY Agent
**Scope:** Widget 전체 (index.ts, api.ts, config.ts, ui/steps/, cors.ts, next.config.ts)

---

```
STATUS: HIGH_FIXED
SEVERITY_SUMMARY: CRITICAL:0 / HIGH:3(fixed) / MEDIUM:4(phase4)
FIXED_BY: BACKEND 2026-03-16
FIXED:
  H1: fallbackCopy() - document.body/execCommand 제거, clipboard 실패 시 수동 복사 안내
  H2: focus-trap.ts - shadowRoot.activeElement 사용 (document.activeElement → Shadow DOM 호환)
  H3: next.config.ts - 빈 문자열 CORS 헤더 제거, CORS_PUBLIC_OPEN=false 시 Route Handler에 위임
  bonus_M4: next.config.ts Authorization 헤더 제거 (Content-Type만 유지)
```

---

## CRITICAL

없음. 이전 감사에서 CRITICAL으로 분류된 `.env` 자격증명 노출은 별도 조치 필요 (이번 범위 외).

---

## HIGH (다음 커밋 전 수정)

### H1. `fallbackCopy()` — Shadow DOM 격리 위반: `document.body` 직접 변이

**파일:** `src/widget/ui/steps/success.ts` (lines 65–75)

```typescript
function fallbackCopy(text: string, btn: HTMLButtonElement): void {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
  document.body.appendChild(ta);   // ← HOST 페이지 DOM 직접 변이
  ta.select();
  document.execCommand('copy');    // ← 비표준 deprecated API
  document.body.removeChild(ta);
  ...
}
```

**위험:**
- Widget의 핵심 보안 약속("호스트 페이지 DOM 접근 불가")을 직접 위반
- 호스트 페이지의 `MutationObserver`가 감지 → 의도치 않은 호스트 사이드이펙트 유발
- 호스트 페이지 CSP에 `script-src 'self'`나 DOM mutation 제한이 있을 경우 오류 발생
- `document.execCommand('copy')`는 deprecated (Chrome 117+에서 경고, 향후 제거 예정)
- Shadow DOM 내부에서 `document.body`에 접근하는 것 자체가 아키텍처 위반

**수정 방향:**
- `navigator.clipboard` 미지원 환경에서는 단순히 실패 처리하거나 "수동으로 복사하세요" 안내
- Shadow DOM 컨텍스트에서 `document.body` 변이 없이 복사를 구현하는 것은 기술적으로 어렵기 때문에 fallback 제거가 더 안전

---

### H2. `focus-trap.ts` — Shadow DOM 내 `document.activeElement` 오사용

**파일:** `src/widget/utils/focus-trap.ts` (lines 36, 42)

```typescript
if (document.activeElement === first) {   // ← Shadow DOM 내부에서 항상 false
  e.preventDefault();
  last.focus();
}
if (document.activeElement === last) {    // ← 동일 문제
  e.preventDefault();
  first.focus();
}
```

**위험:**
- Shadow DOM 내 포커스 시 `document.activeElement`는 Shadow Host 요소를 반환 (Shadow DOM 내부 요소가 아님)
- 따라서 Tab/Shift+Tab wrap-around 로직이 절대 실행되지 않음
- 사용자가 Tab 키로 Modal 밖으로 탈출 가능 → 다이얼로그 Modal 격리 파괴
- WCAG 2.1 SC 2.1.2 (포커스 트랩) 위반

**올바른 접근:**
```typescript
// Shadow DOM 내부에서는 container.getRootNode()로 shadow root 취득 후
// shadowRoot.activeElement 사용
const root = container.getRootNode() as ShadowRoot | Document;
const active = root.activeElement;
if (active === first) { ... }
```

---

### H3. `next.config.ts` — 프로덕션 환경에서 `Access-Control-Allow-Origin: ""`(빈 문자열) 정적 헤더

**파일:** `next.config.ts` (line 32)

```typescript
value: process.env.CORS_ALLOWED_ORIGINS ?? (isProd ? "" : "http://localhost:3000"),
//                                                    ↑ 프로덕션에서 빈 문자열
```

**위험:**
- `CORS_ALLOWED_ORIGINS` 미설정 + 프로덕션 환경 + `CORS_PUBLIC_OPEN !== "true"` 시
  정적 헤더로 `Access-Control-Allow-Origin: ""` (빈 문자열) 전송
- 빈 문자열은 유효하지 않은 Origin 값 → 브라우저가 CORS 거부 또는 무시
- Widget이 임베딩된 외부 사이트에서 피드백 제출 API 호출이 **전면 차단**됨
- 동적 핸들러(`cors.ts`의 `withPublicCors`)와 정적 헤더(`next.config.ts`) 간 불일치로
  어느 것이 실제 적용되는지 혼란 야기

**수정 방향:**
- 프로덕션에서 `CORS_PUBLIC_OPEN=true`를 필수 설정으로 강제하거나
- `isProd ? "" : "http://localhost:3000"` 대신 시작시 환경변수 검증으로 early fail

---

## MEDIUM (이번 Phase 내 수정)

### M1. `api.ts` — 서버 에러 메시지 직접 노출

**파일:** `src/widget/api.ts` (lines 52–53)

```typescript
const message = json?.error ?? `Request failed (HTTP ${response.status})`;
// ↑ 서버가 반환하는 error 필드를 검증 없이 사용자에게 노출
```

서버의 `/api/v1/feedback` 에러 응답에 민감한 내부 정보가 포함될 경우
(Prisma 에러 메시지, DB 상태 등) Widget UI에 그대로 노출됨.

**권고:** 서버 에러 메시지는 길이 제한 + 허용 문자 필터링 후 표시하거나,
범용 메시지("제출에 실패했습니다. 다시 시도해 주세요.")로 고정.

---

### M2. `config.ts` — `zIndex` 상한값 없음

**파일:** `src/widget/config.ts` (line 86)

```typescript
zIndex: Number(scriptEl.dataset.zIndex) || DEFAULTS.zIndex,
```

`Number('2147483647')` 또는 `Number('9999999999')` 같은 극단적 값이 CSS에 삽입됨.
악의적 페이지 임베딩 시 다른 UI를 완전히 가릴 수 있음.

**권고:** `Math.min(Math.max(parsed, 1), 2147483647)` 범위 제한.

---

### M3. `root.ts` — Shadow DOM `mode: 'open'`

**파일:** `src/widget/ui/root.ts` (line 30)

```typescript
const shadow = host.attachShadow({ mode: 'open' });
```

`mode: 'open'`이면 호스트 페이지 JS에서 `host.shadowRoot`를 통해
Shadow DOM 내부에 접근 가능. Widget 내부 DOM 조작, 이벤트 가로채기 가능.

**권고:** `mode: 'closed'`로 변경 시 외부 JS 접근 차단.
다만 일부 브라우저 확장이나 접근성 도구와 충돌 가능성 있으므로 트레이드오프 검토 필요.

---

### M4. `next.config.ts` — 공개 엔드포인트 CORS 헤더에 `Authorization` 포함

**파일:** `next.config.ts` (line 13)

```typescript
const CORS_HEADERS = "Content-Type, Authorization";
// ↑ 피드백 제출(공개) 엔드포인트에도 Authorization 허용
```

공개 피드백 제출 엔드포인트는 인증이 불필요. `Authorization` 헤더를
`Access-Control-Allow-Headers`에 포함하면 브라우저가 해당 헤더 전송을 허용하게 됨.
정보 노출 위험은 낮지만 최소 권한 원칙 위반.

**권고:** 공개 엔드포인트용 헤더를 `"Content-Type"`으로만 제한.

---

## 통과 항목 ✅

| 항목 | 파일 | 상태 |
|------|------|------|
| `innerHTML` 전면 금지 | 모든 widget UI 파일 | ✅ 코드/주석 모두 준수 |
| 동적 값 `textContent`만 삽입 | button.ts, form.ts, success.ts, type-select.ts | ✅ 완전 준수 |
| SVG 생성 `createElementNS` 사용 | button.ts, popup.ts | ✅ 안전 |
| `apiUrl` 프로토콜 화이트리스트 | config.ts | ✅ http/https만 허용 |
| hex color 정규식 검증 | config.ts | ✅ `/^#[0-9A-Fa-f]{6}$/` |
| button label 길이 제한 (50자) | config.ts | ✅ `.slice(0, 50)` |
| ESC 키 Shadow DOM 내 캡처 + 전파 차단 | popup.ts | ✅ `stopPropagation()` |
| Shadow DOM 스타일 격리 | root.ts | ✅ Shadow 내부 `<style>` |
| CORS 공개 엔드포인트 분리 | cors.ts | ✅ `withPublicCors` vs `withCors` |
| Admin API CORS allowlist 방식 | cors.ts | ✅ 환경변수 기반 제한 |
| 입력 필드 `maxLength` HTML 속성 | form.ts | ✅ 브라우저 레벨 제한 |
| `document.currentScript` 동기 캡처 | index.ts | ✅ IIFE 최상단 즉시 캡처 |
| 중복 초기화 방지 | index.ts | ✅ `[data-ufb-widget]` 체크 |
| 전역 API 최소 노출 | index.ts | ✅ `destroy()`만 노출 |
| popup DOM 초기화 `textContent = ''` | popup.ts | ✅ innerHTML 아님 |
| MediaQueryList 리스너 cleanup | root.ts | ✅ cleanup 함수 반환 |
| AbortController 이벤트 정리 | popup.ts | ✅ destroy 시 abort |

---

## 수정 우선순위 요약

```
HIGH — 다음 커밋 전:
  H1. fallbackCopy() document.body 접근 제거 (success.ts)
  H2. focus-trap에서 shadowRoot.activeElement 사용 (focus-trap.ts)
  H3. next.config.ts 프로덕션 빈 문자열 CORS 헤더 문제 수정 또는 환경변수 startup 검증

MEDIUM — Phase 4 전:
  M1. 서버 에러 메시지 길이/내용 필터링 (api.ts)
  M2. zIndex 상한값 제한 (config.ts)
  M3. Shadow DOM mode: 'closed' 검토 (root.ts)
  M4. 공개 CORS 헤더에서 Authorization 제거 (next.config.ts)
```

---

*Generated by SECURITY Agent | 2026-03-15*
