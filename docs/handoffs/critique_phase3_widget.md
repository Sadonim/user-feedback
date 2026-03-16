```
STATUS: REVIEWED
SEVERITY_SUMMARY: CRITICAL:2 / HIGH:4 / MEDIUM:5 / LOW:4
```

# Phase 3 Embeddable Widget — Critic Review

**Reviewed by:** CRITIC agent
**Date:** 2026-03-15
**Design file:** `docs/handoffs/design_phase3_widget.md`

---

## CRITICAL (반드시 수정 후 구현)

### C1: `document.currentScript`가 DOMContentLoaded 콜백에서 항상 null — config 파싱 전체 실패

- **위치:** Section 11-1 (`src/widget/index.ts`, 하단 초기화 블록) + Section 5-1 (`src/widget/config.ts`, `parseConfigFromScript`)
- **문제:** `document.currentScript`는 `<script>` 태그가 **파싱·실행되는 순간**에만 non-null이다. 스크립트 실행이 완료된 이후 (콜백, 타이머 등)에는 브라우저가 이 참조를 자동으로 null로 초기화한다.

  `index.ts` 하단 초기화 블록:
  ```typescript
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);  // ← 비동기 콜백
  } else {
    init();  // ← 이 경우에만 currentScript가 유효
  }
  ```

  페이지 HTML 파싱이 아직 진행 중인 경우(`readyState === 'loading'`), `init()`은 `DOMContentLoaded` 콜백 안에서 실행된다. 이 시점에는 이미 스크립트 실행 컨텍스트가 종료되어 `document.currentScript`가 `null`이다. 따라서 `parseConfigFromScript()` 내부의 `document.currentScript as HTMLScriptElement | null`은 null을 반환하고, `init()`은 `config = null`로 즉시 반환한다. **위젯이 아무것도 렌더링하지 않는다.** 가장 일반적인 사용 패턴(HTML body 안 script 태그)에서 반드시 재현되는 버그다.

  ```typescript
  // src/widget/index.ts — 현재 설계
  function init(): void {
    if (document.querySelector('[data-ufb-widget]')) return;
    const config = parseConfigFromScript();  // ← DOMContentLoaded에서 호출 시 null 반환
    if (!config) return;                      // ← 여기서 중단
    // ...이하 실행되지 않음
  }
  ```

- **해결책:** IIFE 최상위에서 `document.currentScript`를 즉시 캡처한 뒤 클로저로 사용:
  ```typescript
  // index.ts 최상단 (IIFE 실행 중, currentScript가 아직 유효)
  const _scriptTag = document.currentScript as HTMLScriptElement | null;

  function parseConfig(): WidgetConfig | null {
    if (!_scriptTag) { ... }
    // _scriptTag.dataset.apiUrl ...
  }

  function init(): void {
    const config = parseConfig();
    // ...
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  ```
  `config.ts`의 `parseConfigFromScript()`도 `scriptEl: HTMLScriptElement`를 인자로 받도록 시그니처 수정. 단위 테스트도 용이해진다.

---

### C2: `buttonLabel` HTML 인젝션 — Shadow DOM 내 XSS

- **위치:** Section 9-2 (`src/widget/ui/button.ts`, `createTriggerButton`)
- **문제:** `config.buttonLabel`(사용자/호스트가 `data-button-label` 속성으로 지정)이 `innerHTML` 템플릿 리터럴에 직접 삽입된다:

  ```typescript
  btn.innerHTML = `
    <svg ...></svg>
    <span class="wfb-trigger-label">${config.buttonLabel}</span>
  `;
  ```

  악의적인 호스트 페이지 혹은 XSS로 오염된 페이지에서 다음과 같은 값을 삽입할 수 있다:
  ```html
  <script src="https://your-domain.com/widget.js"
    data-button-label="X</span><img src=x onerror='fetch(...)'>"
  </script>
  ```

  Shadow DOM은 **외부 CSS로부터의 격리**를 제공할 뿐, Shadow DOM 내부의 `innerHTML` 실행은 동일하게 스크립트를 실행한다. Section 17 보안 고려사항에서 "Shadow DOM 내 `textContent` 사용 (innerHTML 금지)"을 명시했음에도 정작 `button.ts` 구현 설계에서는 이를 위반한다.

  동일 위험이 `success.ts`에서도 발생할 수 있다: `trackingId`를 `innerHTML`에 삽입하는 경우 서버 응답의 `trackingId`가 오염되면 XSS 경로가 된다.

- **해결책:**
  ```typescript
  // 잘못된 방식
  btn.innerHTML = `<svg>...</svg><span>${config.buttonLabel}</span>`;

  // 올바른 방식
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  // ... svg 속성 설정 ...
  const label = document.createElement('span');
  label.className = 'wfb-trigger-label';
  label.textContent = config.buttonLabel;  // textContent는 HTML 이스케이프 자동 처리
  btn.append(svg, label);
  ```
  모든 UI 렌더링 함수(`type-select.ts`, `form.ts`, `success.ts` 등)에 대해 동일 원칙 일관 적용. SVG는 `document.createElementNS` 또는 고정 리터럴(config 값 미포함)로만 처리.

---

## HIGH (가능하면 수정)

### H1: ESC 키 이벤트 리스너가 document에 등록되어 호스트 페이지 키보드 이벤트 오염

- **위치:** Section 9-3 (`src/widget/ui/popup.ts`, `createPopup` 내부)
- **문제:**
  ```typescript
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') callbacks.onClose();
  });
  ```
  이 리스너는 세 가지 문제를 동시에 가진다:

  1. **제거 불가:** 익명 함수라 `removeEventListener` 호출이 불가능하다. 위젯이 `close` 상태일 때도 모든 ESC 키 입력이 `onClose()`를 호출한다 (이미 닫혀 있어도 `transitions.close` → `render` 사이클이 매번 트리거됨).
  2. **호스트 페이지 간섭:** 위젯이 삽입된 페이지에서 모달, 드롭다운 등을 ESC로 닫는 기능이 있으면 이 리스너가 먼저 작동해 예상치 못한 상호작용이 발생한다.
  3. **Shadow DOM 외부 등록:** `shadow.addEventListener`가 아닌 `document.addEventListener`에 등록하여 Shadow DOM 격리 원칙 위반.

- **해결책:**
  ```typescript
  // AbortController로 cleanup 가능하게 관리
  const abortCtrl = new AbortController();

  shadow.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && state.isOpen) {
      e.stopPropagation();
      callbacks.onClose();
    }
  }, { signal: abortCtrl.signal });

  // destroy() 호출 시 리스너 제거
  return { el, update, destroy: () => abortCtrl.abort() };
  ```
  Shadow DOM `keydown`만으로 커버가 안 되면 document에 등록하되 `{ signal }` 옵션과 `isOpen` 상태 체크를 반드시 추가.

---

### H2: 포커스 트랩(Focus Trap) 구현 누락 — WCAG 2.1 AA 위반

- **위치:** Section 16 (접근성), Section 9-3 (`popup.ts`)
- **문제:** Section 16에서 "팝업 열릴 때 첫 요소에 포커스, 닫힐 때 트리거 버튼으로 복귀"를 명시하지만, `popup.ts` 코드 설계 어디에도 포커스 트랩 구현이 없다. WCAG 2.1 Success Criterion 2.1.2 (No Keyboard Trap)의 counterpart로서, dialog가 열렸을 때 Tab/Shift+Tab이 dialog 내부에서만 순환해야 한다. 미구현 시:
  - 키보드 사용자가 Tab을 누르면 팝업 배경의 호스트 페이지 요소로 포커스가 이동한다.
  - 스크린 리더 사용자가 dialog 밖으로 빠져나가 혼란을 겪는다.
  - WCAG 2.1 AA 준수 요건 미달로 DoC(Declaration of Conformance) 불가.

- **해결책:**
  ```typescript
  function trapFocus(container: HTMLElement): () => void {
    const focusable = container.querySelectorAll<HTMLElement>(
      'button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    };

    container.addEventListener('keydown', handler);
    first?.focus();
    return () => container.removeEventListener('keydown', handler);
  }
  ```
  팝업이 열릴 때 `trapFocus(popup.el)` 호출, 닫힐 때 반환된 cleanup 함수 실행 + `triggerBtn.focus()`.

---

### H3: 위젯 destroy/cleanup API 없음 — SPA 환경에서 메모리 누수

- **위치:** Section 11-1 (`index.ts`), Section 19 (구현 순서)
- **문제:** `init()`은 위젯을 DOM에 삽입하고 이벤트 리스너를 등록하지만 반환값이 없고 `destroy()` 함수가 없다. React, Vue, Svelte 등 SPA 프레임워크로 만든 호스트 페이지에서 라우팅으로 페이지를 벗어났다가 돌아오면:
  1. `document.querySelector('[data-ufb-widget]')` 중복 체크가 이미 삽입된 호스트 엘리먼트를 감지해 `init()` 재실행을 막지만,
  2. 기존 위젯의 이벤트 리스너(MediaQueryList `change`, `document` keydown 등)가 이미 살아있어 메모리 누수 발생.
  3. 위젯을 동적으로 제거/재삽입하는 시나리오 완전 불가.

- **해결책:** `init()`이 cleanup 핸들러를 반환하도록 설계:
  ```typescript
  function init(): (() => void) | null {
    // ...
    document.body.appendChild(host);
    return function destroy() {
      mqCleanup();         // MediaQueryList listener 제거
      popupCleanup();      // keydown listener 제거
      host.remove();
    };
  }
  // 전역에 노출
  (window as any).UserFeedbackWidget = { init, destroy: null };
  ```

---

### H4: `{ [field]: value } as any` 타입 캐스팅 — TypeScript 안전망 우회

- **위치:** Section 11-1 (`src/widget/index.ts`, `onFormChange` 콜백)
- **문제:**
  ```typescript
  onFormChange: (field, value) =>
    dispatch(transitions.updateForm(state, { [field]: value } as any)),
  ```
  `as any`는 `field`가 `keyof FormData` 범위 밖의 값(예: `"__proto__"`, `"constructor"`)일 때 TypeScript 컴파일러가 오류를 잡지 못하게 한다. `field`는 `onFormChange: (field: string, value: string)` 시그니처(`popup.ts`의 `PopupCallbacks`)에서 `string`으로 타입되어 있어, 렌더링 컴포넌트가 임의 문자열을 `field`로 넘길 수 있다.

- **해결책:** `PopupCallbacks.onFormChange` 시그니처를 `keyof FormData`로 좁히기:
  ```typescript
  export interface PopupCallbacks {
    onFormChange: (field: keyof FormData, value: string) => void;
    // ...
  }
  ```
  그러면 `index.ts`에서 `as any` 없이:
  ```typescript
  onFormChange: (field, value) =>
    dispatch(transitions.updateForm(state, { [field]: value })),
  ```

---

## MEDIUM (다음 iteration에서 처리 가능)

### M1: `src/lib/validators/widget.ts` — 실질적 Dead Code

- **위치:** Section 5-2, Section 19 구현 순서 [3-5]
- **문제:** 파일 헤더에 "빌드 외부, 서버사이드 검증용"이라고 명시하지만, widget config를 서버에서 검증하는 API 엔드포인트가 존재하지 않는다. 위젯 번들에도 포함되지 않으며, 서버에서도 호출되지 않는다면 이 Zod 스키마는 전혀 실행되지 않는 dead code다. 유지보수 부담만 늘린다 (`config.ts`의 `WidgetConfig` 타입과 동기화가 깨질 위험).
- **해결책:** 두 가지 선택지:
  1. 클라이언트 위젯 번들에 Zod 없이 `config.ts` 내부에 가드 함수(`isValidUrl`, `isValidHexColor` 등)로 검증 통합.
  2. 파일을 제거하고 필요 시 `config.ts`에서 서버/클라이언트 양쪽 사용 가능한 순수 함수 형태로 유지.

---

### M2: `'error'` WidgetStep이 도달 불가능한 Dead State

- **위치:** Section 6-1 (`src/widget/state.ts`), Section 9-3 (`popup.ts`)
- **문제:** `WidgetStep` 타입에 `'error'`가 정의되어 있고 `popup.ts`에서 `case 'error':` 분기를 처리하지만, `transitions` 객체 어디에서도 `step: 'error'`로 전환하는 함수가 없다. `transitions.submitError()`는 `step: 'form'`으로 전환한다:
  ```typescript
  submitError: (s, errorMessage) => ({ ...s, step: 'form', errorMessage }),
  ```
  `popup.ts`의 `case 'error':` 분기는 영원히 도달되지 않는 코드다. 이로 인해:
  1. `'error'` step의 전용 UI가 필요한지, 아니면 `form` step에서 `errorMessage`로 처리하는 것이 최종 설계인지 모호함.
  2. 향후 개발자가 `'error'` step을 실제로 사용하려 할 때 transitions에 없는 것을 발견하고 혼란.
- **해결책:** `WidgetStep`에서 `'error'`를 제거하거나, `transitions.setError()`를 추가하고 `popup.ts`에 전용 에러 화면 설계를 포함시켜 의도를 명확히 할 것.

---

### M3: `content.innerHTML = ''` 전체 교체로 입력 중 포커스 손실

- **위치:** Section 9-3 (`src/widget/ui/popup.ts`, `update` 함수)
- **문제:**
  ```typescript
  const update = (state: WidgetState): void => {
    content.innerHTML = '';           // ← 전체 DOM 파괴
    switch (state.step) {
      case 'form':
        content.appendChild(renderForm(...));  // ← 새 DOM 생성
    }
  };
  ```
  `onFormChange`로 입력값이 변경될 때마다 `dispatch` → `render` → `update` 사이클이 돌면서 `content.innerHTML = ''`이 실행된다. 현재 포커스된 `<input>` 또는 `<textarea>` 엘리먼트가 파괴되어 포커스가 사라진다. 결과적으로 사용자가 제목이나 설명을 입력할 때마다 포커스가 날아가 키보드 입력이 불가능해진다.
- **해결책:** `onFormChange`가 호출될 때마다 전체 DOM을 재생성하는 대신:
  1. 폼 필드에 직접 이벤트 리스너를 달고(`input` 이벤트), 상태 업데이트만 수행하되 DOM 재생성하지 않음.
  2. 또는 step이 변경될 때만 `content.innerHTML = ''` 실행하고, 동일 step 내 상태 변경은 기존 DOM 요소의 속성만 업데이트.

---

### M4: TDD 구현 순서 위반 — 테스트가 마지막에 배치

- **위치:** Section 19 구현 순서 `[3-6]`
- **문제:** CLAUDE.md와 `testing.md`에서 TDD 접근이 필수(`MANDATORY workflow`)로 요구되어 있다. 그러나 구현 순서가 `[3-1] 빌드파이프라인 → [3-2] 핵심 모듈 → [3-3] Shadow DOM UI → [3-4] 진입점 → [3-5] CORS → [3-6] 테스트`로 설계되어 있어 테스트가 구현 완료 후 마지막에 온다. 이는 단순한 순서 문제가 아니라 API 설계 불확실성이 구현 도중 드러나는 구조를 만든다.
- **해결책:** 각 모듈 구현 전 해당 테스트 작성을 선행:
  - `[3-2]` 전에 `widget-state.test.ts`, `widget-config.test.ts` 작성 (RED)
  - `[3-2]` 에서 구현 (GREEN)
  - `[3-4]` 전에 `widget-api.test.ts` 작성 (RED)

---

### M5: `.env.local` 예시에 `CORS_PUBLIC_OPEN=true` — 프로덕션 오용 유도

- **위치:** Section 18 (환경변수 추가)
- **문제:**
  ```bash
  # .env.local 및 Vercel 환경변수에 추가:
  CORS_PUBLIC_OPEN=true
  ```
  `.env.local` 예시에 `true`를 기재하면, 개발자가 Vercel 대시보드에 환경변수를 추가할 때 그대로 복붙해 프로덕션 환경에 설정할 가능성이 높다. Section 12의 `.env` 예시에는 `CORS_PUBLIC_OPEN=false  # 프로덕션 기본값 (보수적)`으로 올바르게 명시했는데, Section 18에서 `true`로 역행한다. 두 섹션이 모순된다.
- **해결책:** Section 18 예시를 Section 12와 일치하도록 수정:
  ```bash
  # 개발 환경: 외부 사이트에서 테스트하려면 true로 변경
  CORS_PUBLIC_OPEN=false  # 프로덕션 기본값 — 위젯 임베드 시 true로 설정
  ```

---

## LOW (제안사항)

### L1: `buttonColor` data 속성 값 검증 없음

- **위치:** Section 5-1 (`config.ts`, `parseConfigFromScript`)
- **문제:** `buttonColor: script.dataset.buttonColor ?? DEFAULTS.buttonColor`로 유효성 검증 없이 CSS 변수에 세팅된다. `data-button-color="invalid; content: 'x'"` 같은 값이 Shadow DOM CSS에 그대로 삽입되어 스타일 파괴 가능. (실제 스크립트 실행 경로는 아니므로 XSS는 아니나 스타일 격리 원칙 위반)
- **해결책:** `parseConfigFromScript()`에서 hex color 패턴 검증 추가:
  ```typescript
  const rawColor = script.dataset.buttonColor ?? '';
  const buttonColor = /^#[0-9A-Fa-f]{6}$/.test(rawColor)
    ? rawColor
    : DEFAULTS.buttonColor;
  ```

---

### L2: Shadow DOM 내부 요소의 E2E 테스트 방법 미언급

- **위치:** Section 15-3 (E2E 테스트 시나리오)
- **문제:** Playwright에서 Shadow DOM 내부 요소는 기본 `page.locator()` 로 접근하려면 `>>` pierce 선택자가 필요하다. E2E 시나리오에 "버튼 클릭", "팝업 열림" 등을 명시했지만 Shadow DOM 피어싱 방법을 제시하지 않아 테스트 작성자가 막힐 수 있다.
- **해결책:** 시나리오에 Playwright 코드 스니펫 예시 추가:
  ```typescript
  // Shadow DOM 내부 요소 접근
  const trigger = page.locator('[data-ufb-widget]').locator('pierce/.wfb-trigger');
  await trigger.click();
  ```

---

### L3: 팝업 외부 클릭으로 닫기(Click Outside) 미구현

- **위치:** Section 9-3 (`popup.ts`), Section 20 (완료 기준)
- **문제:** 완료 기준에 "ESC 키로 팝업 닫기"는 있지만 팝업 외부 영역 클릭 닫기가 없다. 대부분의 UI 패턴(모달, 드롭다운)에서 기본으로 제공하는 기능이 빠져 있어 UX 미완성으로 느껴진다.
- **해결책:** Shadow host에 `pointerdown` 리스너를 추가하거나, `wfb-host` 컨테이너에 backdrop 레이어를 두고 클릭 감지. 완료 기준 항목에 추가.

---

### L4: `MediaQueryList.addEventListener` 폴백 없음

- **위치:** Section 9-1 (`src/widget/ui/root.ts`, `setupThemeObserver`)
- **문제:**
  ```typescript
  mq.addEventListener('change', (e) => apply(e.matches));
  ```
  Safari 13 이하, 구형 Chrome에서는 `MediaQueryList.addEventListener`가 지원되지 않고 구형 API인 `addListener`를 사용해야 한다. 현재 프로젝트의 브라우저 지원 범위가 명시되지 않아 위험 수준을 판단하기 어렵지만, 임베드 위젯 특성상 호스트 사이트의 대상 사용자를 알 수 없다.
- **해결책:** 최소한 문서에 지원 브라우저 범위를 명시하거나, 폴백 추가:
  ```typescript
  if (mq.addEventListener) {
    mq.addEventListener('change', (e) => apply(e.matches));
  } else {
    mq.addListener((e) => apply(e.matches));  // legacy fallback
  }
  ```

---

## 승인 조건

- **CRITICAL 항목 모두 해결 시 APPROVED 가능**
- **C1 (`document.currentScript` null):** IIFE 최상단에서 `_scriptTag` 캡처 → `parseConfigFromScript`에 주입. 단위 테스트에서 `DOMContentLoaded` 지연 케이스 검증 포함.
- **C2 (`buttonLabel` XSS):** 모든 UI 렌더링 함수에서 `innerHTML` 제거 → `textContent` + `createElement` 방식으로 전환. 특히 `button.ts`, `success.ts`(trackingId 렌더링) 우선 확인.

**구현 우선순위:**

```
C1 (currentScript null) → C2 (innerHTML XSS)
  → H2 (focus trap — WCAG) → H1 (ESC listener cleanup)
  → H3 (destroy API) → H4 (as any 제거)
  → M3 (focus loss on form change) → M1 (dead code 제거)
  → M2 (error step 정리) → M5 (env 예시 수정)
  → 나머지 LOW
```
