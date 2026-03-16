```
STATUS: DESIGN_DONE
PHASE: 3
FEATURE: embeddable-widget
LAST_UPDATED: 2026-03-16
CRITIQUE: docs/handoffs/critique_phase3_widget.md
REVISED: 2026-03-15
CHANGES: C1 currentScript null (IIFE 최상단 캡처 + scriptEl 주입 패턴), C2 innerHTML XSS (createElement+textContent 전면 교체), H1 ESC listener cleanup (AbortController+shadow keydown), H2 focus trap 구현 추가 (WCAG 2.1 AA), H3 destroy/cleanup API 추가 (SPA 메모리 누수 방지), H4 as any 제거 (onFormChange: keyof FormData)
DESIGN_IMPL: widget build (IIFE 6.79kB gzip), Shadow DOM, 3-step form, dark-mode auto, CORS_PUBLIC_OPEN wildcard, 456/456 tests pass
```

# Phase 3 — Embeddable Widget 설계 문서

## 개요

외부 사이트에 `<script>` 태그 한 줄로 피드백 버튼을 임베드하는 독립형 위젯.
Vanilla TypeScript → Vite IIFE 번들 → `public/widget.js` 로 서빙.
Shadow DOM으로 호스트 CSS 완전 격리, 시스템 다크모드 자동 감지.

```html
<!-- 최종 사용법 -->
<script
  src="https://your-domain.com/widget.js"
  data-api-url="https://your-domain.com"
  data-theme="auto"
  data-position="bottom-right">
</script>
```

---

## 1. Phase 1/2 실제 구현 상태 (의존성 검증)

| 파일 | 상태 | Phase 3 관련성 |
|------|------|----------------|
| `src/app/api/v1/feedback/route.ts` | ✅ 구현 완료 | Widget이 POST 호출 |
| `src/lib/api/cors.ts` | ✅ 구현, **수정 필요** | `CORS_PUBLIC_OPEN` 지원 추가 |
| `src/lib/validators/feedback.ts` | ✅ 구현 완료 | 필드 제약 확인용 (title 200자, description 5000자) |
| `src/lib/api/response.ts` | ✅ 구현 완료 | API 응답 envelope 확인 |
| `package.json` — `vite` | ✅ devDeps에 존재 (vitest 경유) | 추가 설치 불필요 |
| `src/widget/` | ❌ 미존재 | Phase 3에서 신규 생성 |

**CORS 현재 동작:**
`withCors()` 는 `CORS_ALLOWED_ORIGINS` allowlist에 있는 origin만 허용.
Widget은 불특정 외부 사이트에서 호출되므로 공개 피드백 엔드포인트에 대한 `CORS_PUBLIC_OPEN` 지원이 필요.

---

## 2. 의존성 추가

```bash
# 빌드 도구 (IIFE 번들용 — vite는 이미 devDeps에 있음)
# 추가 설치 없음

# 위젯 전용 tsconfig는 별도 작성 (tsconfig.widget.json)
```

`package.json` scripts 추가:
```json
{
  "scripts": {
    "widget:build": "vite build --config vite.widget.config.ts",
    "widget:dev": "vite build --config vite.widget.config.ts --watch"
  }
}
```

---

## 3. 파일 구조 (신규 생성 / 수정)

```
프로젝트 루트
├── vite.widget.config.ts          [신규] Vite 위젯 전용 빌드 설정
├── tsconfig.widget.json           [신규] 위젯 전용 tsconfig (lib: ES2020, DOM)
│
src/widget/
├── index.ts                       [신규] 진입점: IIFE 최상단 _scriptTag 캡처 + 초기화
├── config.ts                      [신규] WidgetConfig 타입 + parseConfigFromScript(scriptEl)
├── state.ts                       [신규] WidgetState 타입 + 상태 전이 헬퍼 (순수함수)
├── api.ts                         [신규] POST /api/v1/feedback fetch 클라이언트
├── styles.ts                      [신규] CSS-in-JS 문자열 (CSS 변수 기반 테마)
├── utils/
│   └── focus-trap.ts              [신규] trapFocus 유틸리티 (H2 WCAG 2.1 AA)
└── ui/
    ├── root.ts                    [신규] Shadow DOM 호스트 + 루트 생성 (cleanup 반환)
    ├── button.ts                  [신규] 플로팅 트리거 버튼 (createElement 전용, innerHTML 금지)
    ├── popup.ts                   [신규] 팝업 패널 + 스텝 오케스트레이션 (destroy 반환)
    └── steps/
        ├── type-select.ts         [신규] Step 1: BUG/FEATURE/GENERAL 카드 선택
        ├── form.ts                [신규] Step 2: title/description/nickname/email 입력
        └── success.ts             [신규] Step 3: 트래킹 ID 표시 + 복사 버튼

src/lib/api/
└── cors.ts                        [수정] CORS_PUBLIC_OPEN 환경변수 지원 추가

src/__tests__/
├── unit/
│   ├── widget-config.test.ts      [신규] config 파싱 단위 테스트 (scriptEl 주입 패턴)
│   ├── widget-state.test.ts       [신규] 상태 전이 단위 테스트
│   └── widget-api.test.ts         [신규] API 클라이언트 단위 테스트 (fetch mock)
└── integration/
    └── feedback-cors.test.ts      [신규] CORS 헤더 통합 테스트

public/
└── widget.js                      [빌드 산출물] Vite가 자동 생성 — .gitignore 추가 권장
```

> **제거됨 (원본 대비):** `src/lib/validators/widget.ts` — 호출처 없는 dead code.
> config 검증은 `config.ts` 내 순수 가드 함수로 통합 (Section 5-1 참조).

---

## 4. 빌드 파이프라인

### 4-1. `vite.widget.config.ts`

```typescript
// vite.widget.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/widget/index.ts'),
      name: 'UserFeedbackWidget',
      formats: ['iife'],           // <script> 직접 삽입용 IIFE
      fileName: () => 'widget.js',
    },
    outDir: 'public',
    emptyOutDir: false,            // public/ 의 Next.js 정적 파일 보존
    minify: 'esbuild',
    sourcemap: false,              // 프로덕션 번들 크기 최소화
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
```

**번들 크기 목표**: gzip 기준 ≤ 15KB
**런타임 의존성**: 없음 (Vanilla TS only)

### 4-2. `tsconfig.widget.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src/widget/**/*", "vite.widget.config.ts"]
}
```

---

## 5. 위젯 설정 (WidgetConfig)

### 5-1. `src/widget/config.ts`

> **[C1 반영]** `parseConfigFromScript`가 `document.currentScript`를 직접 접근하지 않음.
> `scriptEl: HTMLScriptElement`를 외부에서 주입받아 테스트 용이성과 비동기 안전성 확보.
>
> **[C2/L1 반영]** `buttonColor`, `buttonLabel` 등 CSS·DOM에 삽입되는 값은
> 화이트리스트 패턴 검증 후 기본값으로 폴백.

```typescript
export type WidgetPosition =
  | 'bottom-right'
  | 'bottom-left'
  | 'top-right'
  | 'top-left';

export type WidgetTheme = 'auto' | 'light' | 'dark';

export interface WidgetConfig {
  readonly apiUrl: string;            // data-api-url (필수)
  readonly theme: WidgetTheme;        // data-theme (기본: 'auto')
  readonly position: WidgetPosition;  // data-position (기본: 'bottom-right')
  readonly buttonLabel: string;       // data-button-label (기본: 'Feedback')
  readonly buttonColor: string;       // data-button-color (기본: '#4F46E5', hex only)
  readonly zIndex: number;            // data-z-index (기본: 9999)
}

const VALID_POSITIONS = new Set<WidgetPosition>([
  'bottom-right', 'bottom-left', 'top-right', 'top-left',
]);

const VALID_THEMES = new Set<WidgetTheme>(['auto', 'light', 'dark']);

const DEFAULTS = {
  theme: 'auto' as WidgetTheme,
  position: 'bottom-right' as WidgetPosition,
  buttonLabel: 'Feedback',
  buttonColor: '#4F46E5',
  zIndex: 9999,
} as const;

/** hex color 검증 (CSS 삽입 전 필수 — C2/L1) */
function sanitizeHexColor(raw: string | undefined): string {
  return /^#[0-9A-Fa-f]{6}$/.test(raw ?? '')
    ? raw!
    : DEFAULTS.buttonColor;
}

/** 버튼 레이블 검증 (XSS textContent이지만 길이 제한) */
function sanitizeLabel(raw: string | undefined): string {
  const trimmed = (raw ?? '').trim().slice(0, 50);
  return trimmed.length > 0 ? trimmed : DEFAULTS.buttonLabel;
}

/**
 * [C1] document.currentScript 참조 제거 — 비동기 콜백에서 null이 되는 문제 해결.
 * 호출자(index.ts IIFE 최상단)가 scriptEl을 즉시 캡처하여 주입한다.
 */
export function parseConfigFromScript(
  scriptEl: HTMLScriptElement | null
): WidgetConfig | null {
  if (!scriptEl) {
    console.error('[UserFeedbackWidget] could not find script element');
    return null;
  }

  const apiUrl = scriptEl.dataset.apiUrl?.trim() ?? '';
  if (!apiUrl) {
    console.error('[UserFeedbackWidget] data-api-url is required');
    return null;
  }

  // URL 기본 검증 (fetch 호출 전 fast-fail)
  try { new URL(apiUrl); } catch {
    console.error('[UserFeedbackWidget] data-api-url must be a valid URL');
    return null;
  }

  const rawTheme = scriptEl.dataset.theme as WidgetTheme;
  const rawPosition = scriptEl.dataset.position as WidgetPosition;

  return {
    apiUrl,
    theme: VALID_THEMES.has(rawTheme) ? rawTheme : DEFAULTS.theme,
    position: VALID_POSITIONS.has(rawPosition) ? rawPosition : DEFAULTS.position,
    buttonLabel: sanitizeLabel(scriptEl.dataset.buttonLabel),
    buttonColor: sanitizeHexColor(scriptEl.dataset.buttonColor),
    zIndex: Number(scriptEl.dataset.zIndex) || DEFAULTS.zIndex,
  };
}
```

---

## 6. 상태 관리

### 6-1. `src/widget/state.ts`

```typescript
export type FeedbackType = 'BUG' | 'FEATURE' | 'GENERAL';

export type WidgetStep =
  | 'type'        // Step 1: 피드백 타입 선택
  | 'form'        // Step 2: 내용 입력 (에러도 이 step에서 errorMessage로 표시)
  | 'submitting'  // API 호출 중
  | 'success';    // 제출 성공

export interface FormData {
  readonly title: string;
  readonly description: string;
  readonly nickname: string;
  readonly email: string;
}

export interface WidgetState {
  readonly isOpen: boolean;
  readonly step: WidgetStep;
  readonly selectedType: FeedbackType | null;
  readonly formData: FormData;
  readonly trackingId: string | null;
  readonly errorMessage: string | null;
}

export const INITIAL_STATE: WidgetState = {
  isOpen: false,
  step: 'type',
  selectedType: null,
  formData: { title: '', description: '', nickname: '', email: '' },
  trackingId: null,
  errorMessage: null,
};

// 순수 상태 전이 함수 (불변성 보장)
export const transitions = {
  open: (s: WidgetState): WidgetState =>
    ({ ...s, isOpen: true, step: 'type' }),

  close: (_s: WidgetState): WidgetState =>
    ({ ...INITIAL_STATE }),           // 닫힐 때 폼 초기화

  selectType: (s: WidgetState, type: FeedbackType): WidgetState =>
    ({ ...s, selectedType: type, step: 'form' }),

  backToType: (s: WidgetState): WidgetState =>
    ({ ...s, step: 'type', selectedType: null, errorMessage: null }),

  updateForm: (s: WidgetState, patch: Partial<FormData>): WidgetState =>
    ({ ...s, formData: { ...s.formData, ...patch } }),

  submit: (s: WidgetState): WidgetState =>
    ({ ...s, step: 'submitting', errorMessage: null }),

  submitSuccess: (s: WidgetState, trackingId: string): WidgetState =>
    ({ ...s, step: 'success', trackingId }),

  // 에러는 step='form'으로 돌아가 errorMessage 배너 표시
  submitError: (s: WidgetState, errorMessage: string): WidgetState =>
    ({ ...s, step: 'form', errorMessage }),
};
```

---

## 7. API 클라이언트

### 7-1. `src/widget/api.ts`

```typescript
import type { FeedbackType, FormData } from './state';

export interface FeedbackSubmitPayload {
  readonly type: FeedbackType;
  readonly title: string;
  readonly description: string;
  readonly nickname: string;
  readonly email?: string;
}

export interface FeedbackSubmitResult {
  readonly trackingId: string;
  readonly status: string;
}

export interface ApiError {
  readonly message: string;
  readonly statusCode: number;
}

export async function submitFeedback(
  apiUrl: string,
  type: FeedbackType,
  formData: FormData
): Promise<FeedbackSubmitResult> {
  const payload: FeedbackSubmitPayload = {
    type,
    title: formData.title.trim(),
    description: formData.description.trim(),
    nickname: formData.nickname.trim(),
    ...(formData.email.trim() ? { email: formData.email.trim() } : {}),
  };

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/api/v1/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    const netErr: ApiError = {
      message: 'Network error. Check your connection.',
      statusCode: 0,
    };
    throw netErr;
  }

  const json = await response.json().catch(() => null);

  if (!response.ok || !json?.success) {
    const message = json?.error ?? `HTTP ${response.status}`;
    const err: ApiError = { message, statusCode: response.status };
    throw err;
  }

  return {
    trackingId: json.data.trackingId,
    status: json.data.status,
  };
}
```

**에러 처리 규칙:**
- `fetch` 자체 실패 (네트워크) → statusCode 0, 사용자 친화적 메시지
- 4xx/5xx → `json.error` 메시지 폼 상단 배너로 표시
- 절대로 스택 트레이스 노출 없음

---

## 8. 스타일 시스템

### 8-1. `src/widget/styles.ts`

CSS 변수 기반 테마 토큰 (Shadow DOM 내부 스코프):

```typescript
export const WIDGET_CSS = `
  :host {
    /* 라이트 모드 기본값 */
    --wfb-bg: #ffffff;
    --wfb-bg-secondary: #f9fafb;
    --wfb-border: #e5e7eb;
    --wfb-text: #111827;
    --wfb-text-muted: #6b7280;
    --wfb-primary: var(--wfb-accent, #4F46E5);
    --wfb-primary-hover: #4338CA;
    --wfb-primary-text: #ffffff;
    --wfb-error: #DC2626;
    --wfb-success: #16A34A;
    --wfb-radius: 12px;
    --wfb-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    --wfb-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  :host([data-theme="dark"]) {
    --wfb-bg: #1f2937;
    --wfb-bg-secondary: #374151;
    --wfb-border: #4b5563;
    --wfb-text: #f9fafb;
    --wfb-text-muted: #9ca3af;
    --wfb-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  }

  /* 위치 클래스 */
  .wfb-host { position: fixed; z-index: var(--wfb-z); }
  .wfb-pos-bottom-right { bottom: 24px; right: 24px; }
  .wfb-pos-bottom-left  { bottom: 24px; left: 24px; }
  .wfb-pos-top-right    { top: 24px; right: 24px; }
  .wfb-pos-top-left     { top: 24px; left: 24px; }

  /* 트리거 버튼 */
  .wfb-trigger { /* ... */ }

  /* 팝업 패널 */
  .wfb-popup { /* ... */ }

  /* 스텝별 스타일 */
  .wfb-step-type { /* ... */ }
  .wfb-type-card { /* ... */ }
  .wfb-type-card:hover { /* ... */ }
  .wfb-type-card[aria-pressed="true"] { /* ... */ }

  /* 폼 요소 */
  .wfb-input, .wfb-textarea { /* ... */ }
  .wfb-input:focus, .wfb-textarea:focus { /* ... */ }

  /* 에러 배너 */
  .wfb-error-banner { role: alert; /* ... */ }

  /* 접근성 */
  @media (prefers-reduced-motion: reduce) {
    * { transition: none !important; animation: none !important; }
  }
`;
```

**다크모드 전략:**
1. `data-theme="auto"` → `window.matchMedia('(prefers-color-scheme: dark)')` 감지
2. `MediaQueryList.addEventListener('change', ...)` 로 시스템 테마 변경 실시간 반영
3. Shadow host 엘리먼트에 `data-theme="light"|"dark"` 속성 토글
4. CSS `:host([data-theme="dark"])` 셀렉터로 변수 오버라이드

---

## 9. Shadow DOM 아키텍처

### 9-1. `src/widget/ui/root.ts`

> **[H3 반영]** `setupThemeObserver`가 cleanup 함수를 반환하여 SPA 메모리 누수 방지.

```typescript
import { WIDGET_CSS } from '../styles';
import type { WidgetConfig } from '../config';

export interface WidgetRoot {
  readonly host: HTMLElement;
  readonly shadow: ShadowRoot;
  readonly container: HTMLElement;
}

export function createWidgetRoot(config: WidgetConfig): WidgetRoot {
  const host = document.createElement('div');
  host.setAttribute('data-ufb-widget', '');
  host.style.cssText = `
    position: fixed;
    z-index: ${config.zIndex};
    ${positionStyles[config.position]}
  `;
  // buttonColor는 이미 hex 검증 완료된 값 (config.ts에서 sanitize)
  host.style.setProperty('--wfb-accent', config.buttonColor);

  const shadow = host.attachShadow({ mode: 'open' });

  const styleEl = document.createElement('style');
  styleEl.textContent = WIDGET_CSS;
  shadow.appendChild(styleEl);

  const container = document.createElement('div');
  container.className = 'wfb-host';
  shadow.appendChild(container);

  return { host, shadow, container };
}

const positionStyles: Record<string, string> = {
  'bottom-right': 'bottom: 24px; right: 24px;',
  'bottom-left':  'bottom: 24px; left: 24px;',
  'top-right':    'top: 24px; right: 24px;',
  'top-left':     'top: 24px; left: 24px;',
};

/**
 * 다크모드 자동 감지 및 실시간 업데이트.
 * [H3 반영] cleanup 함수 반환 — destroy() 시 MediaQueryList 리스너 제거.
 */
export function setupThemeObserver(
  host: HTMLElement,
  theme: 'auto' | 'light' | 'dark'
): () => void {
  if (theme !== 'auto') {
    host.setAttribute('data-theme', theme);
    return () => { /* 고정 테마는 cleanup 불필요 */ };
  }

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = (dark: boolean): void => {
    host.setAttribute('data-theme', dark ? 'dark' : 'light');
  };
  const handler = (e: MediaQueryListEvent): void => apply(e.matches);

  apply(mq.matches);
  mq.addEventListener('change', handler);

  return () => mq.removeEventListener('change', handler);
}
```

### 9-2. `src/widget/ui/button.ts`

> **[C2 반영]** `innerHTML` 완전 제거. `config.buttonLabel` 을 포함한 모든 동적 값은
> `textContent` 또는 DOM API로만 삽입. SVG는 `createElementNS` 사용.

```typescript
import type { WidgetConfig } from '../config';

/** SVG 아이콘 생성 (config 값 미포함 고정 구조 — innerHTML 안전) */
function createChatIcon(): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('aria-hidden', 'true');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z');
  svg.appendChild(path);
  return svg;
}

export function createTriggerButton(
  config: WidgetConfig,
  onClick: () => void
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'wfb-trigger';
  btn.setAttribute('aria-label', config.buttonLabel);  // aria-label은 속성값 — 안전
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.setAttribute('aria-expanded', 'false');

  // [C2] innerHTML 금지 — createElement + textContent 사용
  const label = document.createElement('span');
  label.className = 'wfb-trigger-label';
  label.textContent = config.buttonLabel;  // textContent는 HTML 이스케이프 자동 처리

  btn.appendChild(createChatIcon());
  btn.appendChild(label);
  btn.addEventListener('click', onClick);
  return btn;
}

export function setButtonExpanded(btn: HTMLButtonElement, expanded: boolean): void {
  btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
}
```

### 9-3. `src/widget/ui/popup.ts`

> **[H1 반영]** ESC 리스너를 `document` 대신 Shadow DOM에 등록.
> `AbortController`로 cleanup 가능하게 관리. `isOpen` 상태 체크로 불필요한 호출 차단.
>
> **[H2 반영]** `trapFocus` 유틸리티 호출로 WCAG 2.1 SC 2.1.2 준수.
> 팝업 열릴 때 포커스 트랩, 닫힐 때 트리거 버튼으로 포커스 복귀.
>
> **[H3 반영]** `createPopup`이 `{ el, update, destroy }` 반환.
>
> **[H4 반영]** `onFormChange: (field: keyof FormData, value: string)` — `as any` 완전 제거.
>
> **[M3 반영]** step이 변경될 때만 `content` 재빌드. 동일 step 내 상태 변경
> (errorMessage, submitting)은 기존 DOM 요소 속성만 업데이트 → 포커스 손실 없음.

```typescript
import type { WidgetState } from '../state';
import type { FormData } from '../state';
import type { FeedbackType } from '../state';
import { trapFocus } from '../utils/focus-trap';
import { renderTypeSelect } from './steps/type-select';
import { renderForm, updateFormState } from './steps/form';
import { renderSuccess } from './steps/success';

export interface PopupCallbacks {
  onClose: () => void;
  onSelectType: (type: FeedbackType) => void;
  onBackToType: () => void;
  onFormChange: (field: keyof FormData, value: string) => void;  // [H4] keyof FormData
  onSubmit: () => void;
}

export interface PopupHandle {
  el: HTMLElement;
  update: (state: WidgetState, triggerBtn: HTMLButtonElement) => void;
  destroy: () => void;
}

export function createPopup(
  shadow: ShadowRoot,
  callbacks: PopupCallbacks
): PopupHandle {
  const el = document.createElement('div');
  el.className = 'wfb-popup';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Submit Feedback');
  el.style.display = 'none';

  const header = createPopupHeader(callbacks.onClose);
  el.appendChild(header);

  const content = document.createElement('div');
  content.className = 'wfb-popup-content';
  el.appendChild(content);

  // [H1] AbortController로 ESC 리스너 관리
  const abortCtrl = new AbortController();
  let releaseFocusTrap: (() => void) | null = null;
  let currentStep: WidgetState['step'] | null = null;

  // [H1] Shadow DOM에 등록 (document가 아님) + isOpen 체크 인라인
  shadow.addEventListener(
    'keydown',
    (e: Event) => {
      const ke = e as KeyboardEvent;
      if (ke.key === 'Escape') {
        ke.stopPropagation();  // 호스트 페이지 이벤트 버블링 차단
        callbacks.onClose();
      }
    },
    { signal: abortCtrl.signal }
  );

  const update = (state: WidgetState, triggerBtn: HTMLButtonElement): void => {
    const wasOpen = el.style.display !== 'none';
    el.style.display = state.isOpen ? 'flex' : 'none';

    // 닫힐 때: 포커스 트랩 해제 + 트리거 버튼으로 포커스 복귀
    if (wasOpen && !state.isOpen) {
      releaseFocusTrap?.();
      releaseFocusTrap = null;
      triggerBtn.focus();
      currentStep = null;
      return;
    }

    if (!state.isOpen) return;

    // [M3] step이 변경될 때만 DOM 재빌드 (포커스 손실 방지)
    const stepChanged = state.step !== currentStep;
    if (stepChanged) {
      content.textContent = '';  // innerHTML='' 대신 textContent='' (안전)
      currentStep = state.step;

      switch (state.step) {
        case 'type':
          content.appendChild(renderTypeSelect(callbacks.onSelectType));
          break;
        case 'form':
        case 'submitting':
          content.appendChild(
            renderForm(state, callbacks.onBackToType, callbacks.onFormChange, callbacks.onSubmit)
          );
          break;
        case 'success':
          content.appendChild(renderSuccess(state, callbacks.onClose));
          break;
      }

      // [H2] 팝업 열릴 때 포커스 트랩 설정
      releaseFocusTrap?.();
      releaseFocusTrap = trapFocus(el);
    } else if (state.step === 'form' || state.step === 'submitting') {
      // 동일 step 내 상태 변경: DOM 재빌드 없이 속성만 업데이트
      updateFormState(content, state);
    }
  };

  // [H3] destroy: 모든 리스너 정리
  const destroy = (): void => {
    releaseFocusTrap?.();
    abortCtrl.abort();
  };

  return { el, update, destroy };
}

function createPopupHeader(onClose: () => void): HTMLElement {
  const header = document.createElement('div');
  header.className = 'wfb-popup-header';

  const title = document.createElement('span');
  title.className = 'wfb-popup-title';
  title.textContent = 'Send Feedback';  // [C2] textContent 사용

  const closeBtn = document.createElement('button');
  closeBtn.className = 'wfb-close-btn';
  closeBtn.setAttribute('aria-label', 'Close feedback form');

  // [C2] 닫기 아이콘 SVG — createElementNS 사용
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('aria-hidden', 'true');

  const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line1.setAttribute('x1', '18'); line1.setAttribute('y1', '6');
  line1.setAttribute('x2', '6');  line1.setAttribute('y2', '18');

  const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line2.setAttribute('x1', '6');  line2.setAttribute('y1', '6');
  line2.setAttribute('x2', '18'); line2.setAttribute('y2', '18');

  svg.append(line1, line2);
  closeBtn.appendChild(svg);
  closeBtn.addEventListener('click', onClose);

  header.append(title, closeBtn);
  return header;
}
```

---

## 10. 포커스 트랩 유틸리티 (신규)

### `src/widget/utils/focus-trap.ts`

> **[H2 반영]** WCAG 2.1 SC 2.1.2 — Tab/Shift+Tab이 dialog 내부에서만 순환.
> 팝업 열릴 때 첫 포커서블 요소에 자동 포커스.

```typescript
const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * 컨테이너 내 포커스를 가두는 트랩을 설정한다.
 * @returns cleanup 함수 — 팝업 닫힐 때 호출
 */
export function trapFocus(container: HTMLElement): () => void {
  const getFocusable = (): HTMLElement[] =>
    Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));

  // 첫 포커서블 요소에 포커스
  const focusables = getFocusable();
  focusables[0]?.focus();

  const handler = (e: KeyboardEvent): void => {
    if (e.key !== 'Tab') return;

    // 포커서블 요소 목록을 매번 재계산 (DOM 변경 대응)
    const els = getFocusable();
    if (els.length === 0) return;

    const first = els[0];
    const last = els[els.length - 1];

    if (e.shiftKey) {
      // Shift+Tab: 첫 요소에서 마지막 요소로 순환
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab: 마지막 요소에서 첫 요소로 순환
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  container.addEventListener('keydown', handler);
  return () => container.removeEventListener('keydown', handler);
}
```

---

## 11. 스텝 컴포넌트

### Step 1: `src/widget/ui/steps/type-select.ts`

```
역할: BUG / FEATURE / GENERAL 카드 3개 표시
입력: onSelect callback
출력: HTMLElement
```

**UI 구조:**
```
┌─────────────────────────────────┐
│  🐛 Bug Report                  │
│  Something isn't working        │
├─────────────────────────────────┤
│  ✨ Feature Request             │
│  Suggest an improvement         │
├─────────────────────────────────┤
│  💬 General Feedback            │
│  Share your thoughts            │
└─────────────────────────────────┘
```

각 카드: `role="button"`, `tabindex="0"`, 키보드 Enter/Space 지원
이모지는 모두 `aria-hidden="true"` span으로 감쌈, 카드 aria-label로 타입 설명 포함

### Step 2: `src/widget/ui/steps/form.ts`

```
역할: 피드백 내용 입력 폼
입력: WidgetState, callbacks
출력: HTMLElement + updateFormState(container, state) 함수 (분리 export)
```

> **[M3 반영]** `updateFormState(container, state)` 함수를 별도 export.
> step=form 내 상태 변경(submitting, errorMessage)은 이 함수로 DOM 속성만 업데이트 — 전체 재빌드 없음.

**폼 필드 (Phase 1 validator 제약과 일치):**

| 필드 | 타입 | 필수 | 제약 | data 속성 |
|------|------|------|------|-----------|
| title | `<input>` | ✅ | 1~200자 | `data-field="title"` |
| description | `<textarea>` | ✅ | 10~5000자 | `data-field="description"` |
| nickname | `<input>` | ✅ | 1~100자 | `data-field="nickname"` |
| email | `<input type="email">` | ❌ | 선택, 255자 이하 | `data-field="email"` |

**클라이언트 검증 (submit 전):**
- 필수 필드 비어있으면 인라인 에러 메시지 표시
- `errorMessage` state가 있으면 폼 상단 `role="alert"` 배너 표시
- `submitting` 상태일 때 버튼 disabled + "Submitting..." 텍스트 (속성 업데이트만)

**`updateFormState` 로직:**
```typescript
// data-field 속성으로 기존 요소를 찾아 속성만 갱신
export function updateFormState(
  container: HTMLElement,
  state: WidgetState
): void {
  // 에러 배너 토글
  const banner = container.querySelector<HTMLElement>('[data-wfb-error]');
  if (banner) {
    banner.textContent = state.errorMessage ?? '';
    banner.style.display = state.errorMessage ? 'block' : 'none';
  }
  // 제출 버튼 상태
  const submitBtn = container.querySelector<HTMLButtonElement>('[data-wfb-submit]');
  if (submitBtn) {
    submitBtn.disabled = state.step === 'submitting';
    submitBtn.textContent = state.step === 'submitting' ? 'Submitting…' : 'Submit Feedback';
  }
}
```

**이전 버튼:** `← Back` → `onBackToType` 콜백

### Step 3: `src/widget/ui/steps/success.ts`

```
역할: 제출 성공 화면, 트래킹 ID 표시
입력: WidgetState (trackingId 포함)
출력: HTMLElement
```

> **[C2 반영]** `trackingId`는 서버 응답값이므로 `textContent`로만 삽입 — innerHTML 금지.

**UI 구조:**
```
┌─────────────────────────────────┐
│  ✅ Feedback Submitted!         │
│                                 │
│  Your tracking ID:              │
│  ┌──────────────────┐  [Copy]  │
│  │  FB-a1b2c3d4     │          │
│  └──────────────────┘          │
│                                 │
│  [Close]                        │
└─────────────────────────────────┘
```

**trackingId 렌더링:**
```typescript
const idEl = document.createElement('code');
idEl.className = 'wfb-tracking-id';
idEl.textContent = state.trackingId ?? '';  // [C2] textContent 전용
```

**복사 기능:** `navigator.clipboard.writeText()` + fallback (textarea select/copy)

---

## 12. 진입점

### 12-1. `src/widget/index.ts`

> **[C1 반영]** `_scriptTag`를 IIFE 최상단에서 즉시 캡처.
> `parseConfigFromScript(_scriptTag)` 에 주입 — 비동기 콜백에서도 안전.
>
> **[H3 반영]** `init()` 이 `destroy` 함수를 반환. `window.UserFeedbackWidget` 에 노출.
>
> **[H4 반영]** `onFormChange` 콜백이 `keyof FormData` 타입 — `as any` 완전 제거.

```typescript
import { parseConfigFromScript } from './config';
import { createWidgetRoot, setupThemeObserver } from './ui/root';
import { createTriggerButton, setButtonExpanded } from './ui/button';
import { createPopup } from './ui/popup';
import { INITIAL_STATE, transitions } from './state';
import type { WidgetState } from './state';
import type { FormData } from './state';
import { submitFeedback } from './api';

// [C1] IIFE 실행 중 — document.currentScript 가 유효한 유일한 시점에 캡처
const _scriptTag = document.currentScript as HTMLScriptElement | null;

function init(): (() => void) | null {
  // 중복 초기화 방지
  if (document.querySelector('[data-ufb-widget]')) return null;

  // [C1] 캡처된 _scriptTag 주입 — DOMContentLoaded 콜백에서도 동작
  const config = parseConfigFromScript(_scriptTag);
  if (!config) return null;

  const { host, shadow, container } = createWidgetRoot(config);

  // [H3] cleanup 함수 수집
  const themeCleanup = setupThemeObserver(host, config.theme);

  let state: WidgetState = INITIAL_STATE;

  const triggerBtn = createTriggerButton(config, () => {
    dispatch(state.isOpen ? transitions.close(state) : transitions.open(state));
  });

  // [H1][H2][H3][H4] shadow 전달, destroy 반환받음
  const popup = createPopup(shadow, {
    onClose: () => dispatch(transitions.close(state)),
    onSelectType: (type) => dispatch(transitions.selectType(state, type)),
    onBackToType: () => dispatch(transitions.backToType(state)),
    // [H4] field: keyof FormData — as any 없음
    onFormChange: (field: keyof FormData, value: string) =>
      dispatch(transitions.updateForm(state, { [field]: value })),
    onSubmit: async () => {
      if (!state.selectedType) return;
      dispatch(transitions.submit(state));
      try {
        const result = await submitFeedback(
          config.apiUrl,
          state.selectedType,
          state.formData
        );
        dispatch(transitions.submitSuccess(state, result.trackingId));
      } catch (err: unknown) {
        const msg =
          (err as { message?: string })?.message ?? 'Submission failed. Try again.';
        dispatch(transitions.submitError(state, msg));
      }
    },
  });

  const render = (): void => {
    popup.update(state, triggerBtn);
    setButtonExpanded(triggerBtn, state.isOpen);
  };

  const dispatch = (nextState: WidgetState): void => {
    state = nextState;
    render();
  };

  container.appendChild(popup.el);
  container.appendChild(triggerBtn);
  document.body.appendChild(host);

  render();

  // [H3] destroy: DOM 제거 + 모든 리스너 정리
  return function destroy(): void {
    popup.destroy();
    themeCleanup();
    host.remove();
  };
}

// DOM 준비 시 자동 실행
let widgetDestroy: (() => void) | null = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    widgetDestroy = init();
  });
} else {
  widgetDestroy = init();
}

// [H3] SPA 환경을 위한 전역 API 노출
(window as unknown as Record<string, unknown>)['UserFeedbackWidget'] = {
  destroy: () => widgetDestroy?.(),
};
```

---

## 13. CORS 수정 (`src/lib/api/cors.ts`)

현재 구현은 allowlist 기반. 위젯이 임의 외부 사이트에서 호출되려면 공개 피드백 엔드포인트에 대한 개방형 CORS 지원 필요.

### 수정 사항:

```typescript
// 기존 코드 유지 + 아래 추가

/**
 * 공개 피드백 엔드포인트 전용 CORS 핸들러.
 * CORS_PUBLIC_OPEN=true 환경변수 설정 시 모든 출처를 허용.
 * 관리자 API는 항상 allowlist 방식 유지.
 */
export function withPublicCors(
  response: NextResponse,
  origin: string | null
): NextResponse {
  const isPublicOpen = process.env.CORS_PUBLIC_OPEN === 'true';

  if (isPublicOpen) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
  }

  // 폴백: 기존 allowlist 방식
  return withCors(response, origin);
}

export function publicCorsPreflightResponse(origin: string | null): NextResponse {
  const isPublicOpen = process.env.CORS_PUBLIC_OPEN === 'true';

  if (isPublicOpen) {
    const res = new NextResponse(null, { status: 204 });
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    res.headers.set('Access-Control-Max-Age', '86400');
    return res;
  }

  return corsPreflightResponse(origin);
}
```

**`src/app/api/v1/feedback/route.ts` 수정 포인트:**
- `corsPreflightResponse` → `publicCorsPreflightResponse`
- `withCors` → `withPublicCors`

---

## 14. API 계약 (Phase 3 관련)

### 공개 엔드포인트 (기존, 수정 없음)

```
POST /api/v1/feedback
```

**Request:**
```json
{
  "type": "BUG" | "FEATURE" | "GENERAL",
  "title": "string (1~200)",
  "description": "string (10~5000)",
  "nickname": "string (1~100)",
  "email": "string (optional, valid email)"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "cuid",
    "trackingId": "FB-a1b2c3d4",
    "type": "BUG",
    "status": "OPEN",
    "title": "Widget button not showing",
    "createdAt": "2026-03-15T12:00:00.000Z"
  },
  "error": null,
  "meta": null
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "data": null,
  "error": "Title is required, Description must be at least 10 characters",
  "meta": null
}
```

**Response (429 Too Many Requests):**
```json
{
  "success": false,
  "data": null,
  "error": "Too many requests. Please try again later.",
  "meta": null
}
```

**CORS Headers (CORS_PUBLIC_OPEN=true 일 때):**
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

---

## 15. 다크모드 상세 설계

```
data-theme="auto"  → MediaQueryList 감지 → data-theme="light"|"dark" 자동 설정
data-theme="light" → 강제 라이트 모드
data-theme="dark"  → 강제 다크 모드
```

**CSS 변수 오버라이드 체인:**
```
:host 기본값 (라이트)
    └→ :host([data-theme="dark"]) 오버라이드
         └→ 개별 컴포넌트가 var() 로 참조
```

**접근성 (WCAG 2.1 AA 기준 색상 대비 목표):**
| 색상 조합 | 라이트 대비 | 다크 대비 |
|-----------|------------|----------|
| 본문 텍스트 / 배경 | 12.6:1 | 15.3:1 |
| 뮤트 텍스트 / 배경 | 4.6:1 | 4.8:1 |
| 버튼 텍스트 / 배경 | 4.8:1 | 5.1:1 |

---

## 16. 테스트 계획

### 16-1. TDD 구현 순서 (테스트 선행)

> **[M4 반영]** 테스트가 마지막 단계가 아닌 각 모듈 구현 전에 선행 작성.

```
[3-2a] 테스트 작성 (RED) → [3-2b] 구현 (GREEN) → [3-2c] 리팩터
  ├── widget-config.test.ts 작성 → config.ts 구현
  ├── widget-state.test.ts 작성  → state.ts 구현
  └── widget-api.test.ts 작성   → api.ts 구현
```

### 16-2. 단위 테스트

**`src/__tests__/unit/widget-config.test.ts`**
- `parseConfigFromScript(null)`: null 반환 (scriptEl 없음)
- `parseConfigFromScript(el)`: `data-api-url` 미설정 시 null 반환
- `parseConfigFromScript(el)`: 유효한 data-* 속성 파싱
- `parseConfigFromScript(el)`: 잘못된 position 값 → 'bottom-right' 기본값
- `parseConfigFromScript(el)`: 잘못된 hex color → '#4F46E5' 기본값
- `parseConfigFromScript(el)`: zIndex 숫자 변환
- **[C1 신규]** `parseConfigFromScript(el)`: 비동기 호출 시에도 동작 (scriptEl 주입으로 보장)

**`src/__tests__/unit/widget-state.test.ts`**
- `transitions.open()`: isOpen=true, step='type'
- `transitions.close()`: INITIAL_STATE로 완전 초기화
- `transitions.selectType()`: selectedType 설정, step='form'
- `transitions.backToType()`: step='type', selectedType=null, errorMessage=null
- `transitions.updateForm()`: formData 부분 업데이트, 원본 불변성 검증
- `transitions.submitSuccess()`: step='success', trackingId 설정
- `transitions.submitError()`: step='form' (success 아님), errorMessage 설정

**`src/__tests__/unit/widget-api.test.ts`**
- 성공 케이스: 올바른 payload로 fetch 호출, trackingId 반환
- 400 에러: json.error 메시지로 throw, statusCode=400
- 네트워크 실패 (fetch throws): statusCode=0, 'Network error' 메시지
- email 빈 문자열: payload에 email 필드 미포함

**`src/__tests__/unit/focus-trap.test.ts`** (신규)
- Tab: 마지막 요소에서 첫 요소로 순환
- Shift+Tab: 첫 요소에서 마지막 요소로 순환
- cleanup 호출 후 리스너 제거 확인

### 16-3. 통합 테스트

**`src/__tests__/integration/feedback-cors.test.ts`**
- `CORS_PUBLIC_OPEN=true`: 임의 origin에서 POST 성공, `Access-Control-Allow-Origin: *` 반환
- `CORS_PUBLIC_OPEN=false`: 미허용 origin에서 CORS 헤더 없음
- OPTIONS preflight: 204 + CORS 헤더 반환

### 16-4. E2E 테스트 시나리오

> **[L2 반영]** Shadow DOM 내부 요소 접근에 Playwright pierce 선택자 명시.

```typescript
// Shadow DOM 내부 요소 접근 패턴 (Playwright)
const host = page.locator('[data-ufb-widget]');
const trigger = host.locator('pierce/.wfb-trigger');
const popup  = host.locator('pierce/.wfb-popup');
const typeCard = host.locator('pierce/.wfb-type-card[data-type="BUG"]');
```

**시나리오:**
```
1. widget.js 서빙 확인 (GET /widget.js → 200)
2. 외부 HTML에 script 태그 삽입
3. 플로팅 버튼 표시 확인
4. 버튼 클릭 → 팝업 열림, aria-expanded="true"
5. "Bug Report" 카드 선택 → Step 2 전환
6. 폼 입력 (title, description, nickname) — Tab 이동 중 포커스 트랩 검증
7. Submit 클릭 → 버튼 disabled + "Submitting..." 텍스트
8. 성공 화면 + trackingId 표시 (textContent 확인)
9. 관리자 대시보드에서 티켓 확인
10. ESC 키 → 팝업 닫힘, 트리거 버튼으로 포커스 복귀
11. 다크모드 토글 → 테마 즉시 반영
12. window.UserFeedbackWidget.destroy() 호출 → DOM에서 위젯 제거 확인
```

---

## 17. 접근성 (WCAG 2.1 AA)

| 항목 | 구현 방법 |
|------|----------|
| 키보드 내비게이션 | Tab 순서, Enter/Space 활성화 |
| ARIA 레이블 | `aria-label`, `role="dialog"`, `aria-modal="true"` |
| 포커스 트래핑 | **[H2]** `trapFocus()` 유틸리티 — dialog 열림/닫힘 시 자동 관리 |
| 포커스 복귀 | **[H2]** 팝업 닫힐 때 트리거 버튼으로 자동 복귀 |
| 화면 낭독기 | `aria-live="polite"` 로 상태 변경 공지 |
| 에러 메시지 | `role="alert"` 로 즉시 공지 |
| 색상 대비 | 라이트/다크 모두 4.5:1 이상 |
| 모션 감소 | `prefers-reduced-motion` CSS 미디어 쿼리 대응 |

---

## 18. 보안 고려사항

| 위협 | 대응 |
|------|------|
| **[C2]** XSS — 동적 값 innerHTML 삽입 | 모든 동적 값은 `textContent` / `setAttribute` / `createElementNS` — innerHTML 전면 금지 |
| **[C2]** XSS — 서버 응답 trackingId | `textContent`로만 렌더링 |
| **[C2/L1]** CSS 인젝션 — buttonColor | hex regex 검증 후 기본값 폴백 (config.ts) |
| CSRF | 쿠키 없는 공개 API, `Content-Type: application/json` 체크 |
| Rate Limiting | 기존 Phase 1 rate-limit 그대로 적용 (IP당 분당 10건) |
| Origin 검증 | `CORS_PUBLIC_OPEN=false` 기본 — 명시적 활성화 필요 |
| Payload 크기 | description 5000자 제한 |
| script 태그 인젝션 | `data-api-url` 값을 `fetch` URL로만 사용, DOM 삽입 없음 |
| **[H1]** 호스트 이벤트 오염 | ESC 핸들러: Shadow DOM 내 등록 + `stopPropagation()` |

---

## 19. 환경변수 추가

> **[M5 반영]** `.env.local` 예시를 `false`(기본값)로 통일. 두 섹션 간 모순 해소.

```bash
# Widget CORS: 공개 피드백 엔드포인트의 모든 출처 허용 여부
# 프로덕션 기본값 = false (보수적)
# 위젯을 임의 외부 사이트에 임베드하려면 true로 변경
CORS_PUBLIC_OPEN=false

# 위젯 서빙 URL (위젯 자체에서 참조하지 않음 — 문서용)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## 20. 구현 순서 (TDD 반영)

```
[3-1] 빌드 파이프라인 셋업
  ├── vite.widget.config.ts 작성
  ├── tsconfig.widget.json 작성
  └── package.json scripts 추가 (widget:build, widget:dev)

[3-2] 핵심 모듈 — TDD: 테스트 → 구현 → 검증
  ├── widget-config.test.ts 작성 (RED)
  ├── src/widget/config.ts 구현 (GREEN)           ← C1·L1 픽스 포함
  ├── widget-state.test.ts 작성 (RED)
  ├── src/widget/state.ts 구현 (GREEN)
  ├── widget-api.test.ts 작성 (RED)
  ├── src/widget/api.ts 구현 (GREEN)
  └── src/widget/styles.ts 작성 (의존성 없음)

[3-3] Focus Trap 유틸리티 — TDD
  ├── focus-trap.test.ts 작성 (RED)               ← H2 선행
  └── src/widget/utils/focus-trap.ts 구현 (GREEN)

[3-4] Shadow DOM UI
  ├── src/widget/ui/root.ts            (cleanup 반환 — H3)
  ├── src/widget/ui/button.ts          (createElement 전용 — C2)
  ├── src/widget/ui/steps/type-select.ts
  ├── src/widget/ui/steps/form.ts      (updateFormState 분리 — M3)
  ├── src/widget/ui/steps/success.ts   (textContent 전용 — C2)
  └── src/widget/ui/popup.ts           (H1·H2·H3·H4 픽스 포함)

[3-5] 진입점
  └── src/widget/index.ts              (C1·H3·H4 픽스 포함)

[3-6] CORS 수정
  ├── src/lib/api/cors.ts              (withPublicCors 추가)
  └── src/app/api/v1/feedback/route.ts (import 수정)

[3-7] 통합 테스트 + 빌드 검증 + E2E
  ├── feedback-cors.test.ts
  ├── npm run widget:build → public/widget.js 생성 확인
  └── E2E (Playwright, shadow DOM pierce 선택자)
```

---

## 21. 완료 기준 (Definition of Done)

- [ ] `npm run widget:build` 성공 → `public/widget.js` 생성
- [ ] 외부 HTML에 `<script>` 태그 삽입만으로 플로팅 버튼 표시
- [ ] 3단계 플로우 완전 동작 (타입 선택 → 폼 → 성공)
- [ ] 제출된 피드백이 관리자 대시보드에 표시
- [ ] 호스트 페이지 CSS 완전 격리 (Shadow DOM)
- [ ] 라이트/다크 모드 모두 동작
- [ ] 시스템 테마 변경 시 즉시 반영
- [ ] **[C1]** `<body>` 안에 script 삽입 시 (DOMContentLoaded 지연) 위젯 정상 렌더링
- [ ] **[C2]** `data-button-label` 에 HTML 특수문자 입력 시 이스케이프되어 표시
- [ ] **[H1]** ESC 키로 팝업 닫기 (호스트 페이지 이벤트 버블링 없음)
- [ ] **[H2]** 팝업 열린 상태에서 Tab 키가 dialog 내부만 순환
- [ ] **[H2]** 팝업 닫힌 후 트리거 버튼으로 포커스 복귀
- [ ] **[H3]** `window.UserFeedbackWidget.destroy()` 호출 후 DOM 제거 확인
- [ ] 키보드만으로 전체 플로우 완료 가능
- [ ] `CORS_PUBLIC_OPEN=true` 시 외부 도메인에서 API 호출 성공
- [ ] 단위 테스트 커버리지 ≥ 80%
- [ ] `widget.js` 번들 크기 ≤ 15KB (gzip)
