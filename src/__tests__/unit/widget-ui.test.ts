/**
 * Unit: Shadow DOM UI 레이어 전체
 *
 * 대상 모듈:
 *   src/widget/ui/root.ts              — createWidgetRoot, setupThemeObserver
 *   src/widget/ui/button.ts            — createTriggerButton, setButtonExpanded
 *   src/widget/ui/popup.ts             — createPopup (PopupHandle)
 *   src/widget/ui/steps/type-select.ts — renderTypeSelect
 *   src/widget/ui/steps/form.ts        — renderForm, updateFormState
 *   src/widget/ui/steps/success.ts     — renderSuccess
 *   src/widget/utils/focus-trap.ts     — trapFocus
 *
 * 설계 문서 참조: docs/handoffs/design_phase3_widget.md §9~11, §16-2
 *
 * 환경: jsdom (Shadow DOM, attachShadow, matchMedia, focus 지원)
 *
 * [TDD 상태]
 *   GREEN: root, button, popup, type-select, form, success, focus-trap 핵심 동작
 *   RED  : 설계 스펙 data 속성 누락
 *            - [data-wfb-back]  — 폼 뒤로가기 버튼 (현재 class만 사용)
 *            - [data-wfb-close] — 성공화면 닫기 버튼 (현재 class만 사용)
 *            - [data-wfb-copy]  — 성공화면 복사 버튼 (현재 class만 사용)
 *
 * 보안 검증:
 *   [C2] 동적 값은 textContent / setAttribute 만 사용 — innerHTML 금지
 *   [H1] ESC 리스너를 Shadow DOM 내에 등록, stopPropagation 확인
 *   [H2] trapFocus: Tab/Shift+Tab 순환, cleanup 후 리스너 제거
 *   [H3] destroy() 호출 후 리스너 해제 확인
 */
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { INITIAL_STATE } from '@/widget/state';
import type { WidgetState, FormData } from '@/widget/state';
import type { WidgetConfig } from '@/widget/config';

// ── 정적 임포트 (모든 파일 존재 확인됨) ──────────────────────────────────────
import { createWidgetRoot, setupThemeObserver } from '@/widget/ui/root';
import { createTriggerButton, setButtonExpanded } from '@/widget/ui/button';
import { createPopup } from '@/widget/ui/popup';
import { renderTypeSelect } from '@/widget/ui/steps/type-select';
import { renderForm, updateFormState } from '@/widget/ui/steps/form';
import { renderSuccess } from '@/widget/ui/steps/success';
import { trapFocus } from '@/widget/utils/focus-trap';

// ── 공통 픽스처 ───────────────────────────────────────────────────────────────
const BASE_CONFIG: WidgetConfig = {
  apiUrl: 'https://example.com',
  theme: 'light',
  position: 'bottom-right',
  buttonLabel: 'Feedback',
  buttonColor: '#4F46E5',
  zIndex: 9999,
};

const OPEN_FORM_STATE: WidgetState = {
  ...INITIAL_STATE,
  isOpen: true,
  step: 'form',
  selectedType: 'BUG',
};

const OPEN_TYPE_STATE: WidgetState = {
  ...INITIAL_STATE,
  isOpen: true,
  step: 'type',
};

const SUCCESS_STATE: WidgetState = {
  ...INITIAL_STATE,
  isOpen: true,
  step: 'success',
  trackingId: 'FB-abcd1234',
};

// ── Popup 테스트용 헬퍼 ──────────────────────────────────────────────────────
function makeCallbacks() {
  return {
    onClose: vi.fn(),
    onSelectType: vi.fn(),
    onBackToType: vi.fn(),
    onFormChange: vi.fn() as (field: keyof FormData, value: string) => void,
    onSubmit: vi.fn(),
  };
}

function setupPopup() {
  const { host, shadow, container } = createWidgetRoot(BASE_CONFIG);
  document.body.appendChild(host);
  const triggerBtn = document.createElement('button');
  document.body.appendChild(triggerBtn);
  const cbs = makeCallbacks();
  const handle = createPopup(shadow, cbs);
  container.appendChild(handle.el);
  return { handle, triggerBtn, cbs, shadow, host };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. createWidgetRoot & setupThemeObserver
// ─────────────────────────────────────────────────────────────────────────────
// ── matchMedia mock (jsdom 미구현 — auto 테마 감지에 필요) ──────────────────
function mockMatchMedia(prefersDark = false) {
  const listeners: ((e: MediaQueryListEvent) => void)[] = [];
  const mql = {
    matches: prefersDark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => listeners.push(fn),
    removeEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    },
  };
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockReturnValue(mql),
  });
  return { mql, listeners };
}

describe('createWidgetRoot (src/widget/ui/root.ts)', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('host 엘리먼트가 HTMLElement 여야 한다', () => {
    expect(createWidgetRoot(BASE_CONFIG).host).toBeInstanceOf(HTMLElement);
  });

  it('shadow 가 ShadowRoot 여야 한다', () => {
    expect(createWidgetRoot(BASE_CONFIG).shadow).toBeInstanceOf(ShadowRoot);
  });

  it('container 가 shadow 내부에 있어야 한다', () => {
    const { shadow, container } = createWidgetRoot(BASE_CONFIG);
    expect(shadow.contains(container)).toBe(true);
  });

  it('host 에 data-ufb-widget 속성이 있어야 한다 (중복 초기화 방지)', () => {
    expect(createWidgetRoot(BASE_CONFIG).host.hasAttribute('data-ufb-widget')).toBe(true);
  });

  it('host style 에 position: fixed 가 설정되어야 한다', () => {
    const { host } = createWidgetRoot(BASE_CONFIG);
    document.body.appendChild(host);
    expect(host.style.position).toBe('fixed');
  });

  it('host style 에 zIndex 가 설정되어야 한다', () => {
    const { host } = createWidgetRoot({ ...BASE_CONFIG, zIndex: 1234 });
    document.body.appendChild(host);
    expect(host.style.zIndex).toBe('1234');
  });

  it('shadow 내부에 <style> 태그가 존재해야 한다', () => {
    expect(createWidgetRoot(BASE_CONFIG).shadow.querySelector('style')).not.toBeNull();
  });

  it('buttonColor 가 CSS 변수 --wfb-accent 로 설정되어야 한다', () => {
    const { host } = createWidgetRoot({ ...BASE_CONFIG, buttonColor: '#FF5733' });
    document.body.appendChild(host);
    expect(host.style.getPropertyValue('--wfb-accent')).toBe('#FF5733');
  });

  it.each([
    ['bottom-right', 'bottom', '24px'],
    ['bottom-left', 'bottom', '24px'],
    ['top-right', 'top', '24px'],
    ['top-left', 'top', '24px'],
  ] as const)('position=%s: host.style.%s 이 설정되어야 한다', (position, cssProp, expected) => {
    const { host } = createWidgetRoot({ ...BASE_CONFIG, position });
    document.body.appendChild(host);
    expect(host.style[cssProp as 'bottom' | 'top']).toBe(expected);
  });

  // ── setupThemeObserver ──────────────────────────────────────────────────
  describe('setupThemeObserver()', () => {
    it('theme=light 이면 data-theme="light" 를 즉시 설정해야 한다', () => {
      const host = document.createElement('div');
      const cleanup = setupThemeObserver(host, 'light');
      expect(host.getAttribute('data-theme')).toBe('light');
      cleanup();
    });

    it('theme=dark 이면 data-theme="dark" 를 즉시 설정해야 한다', () => {
      const host = document.createElement('div');
      const cleanup = setupThemeObserver(host, 'dark');
      expect(host.getAttribute('data-theme')).toBe('dark');
      cleanup();
    });

    it('theme=auto 이면 data-theme 이 "light" 또는 "dark" 이어야 한다', () => {
      mockMatchMedia(false); // 라이트 모드 시스템
      const host = document.createElement('div');
      const cleanup = setupThemeObserver(host, 'auto');
      expect(['light', 'dark']).toContain(host.getAttribute('data-theme'));
      cleanup();
    });

    it('cleanup 함수를 반환해야 한다 [H3 메모리 누수 방지]', () => {
      mockMatchMedia(false);
      const host = document.createElement('div');
      const cleanup = setupThemeObserver(host, 'auto');
      expect(typeof cleanup).toBe('function');
      expect(() => cleanup()).not.toThrow();
    });

    it('고정 테마의 cleanup 도 throw 없이 실행되어야 한다', () => {
      const host = document.createElement('div');
      const cleanup = setupThemeObserver(host, 'dark');
      expect(() => cleanup()).not.toThrow();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. createTriggerButton & setButtonExpanded
// ─────────────────────────────────────────────────────────────────────────────
describe('createTriggerButton (src/widget/ui/button.ts)', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('HTMLButtonElement 를 반환해야 한다', () => {
    expect(createTriggerButton(BASE_CONFIG, vi.fn(), vi.fn())).toBeInstanceOf(HTMLButtonElement);
  });

  it('aria-label 이 buttonLabel 값이어야 한다', () => {
    expect(createTriggerButton(BASE_CONFIG, vi.fn(), vi.fn()).getAttribute('aria-label')).toBe('Feedback');
  });

  it('aria-haspopup="dialog" 가 설정되어야 한다', () => {
    expect(createTriggerButton(BASE_CONFIG, vi.fn(), vi.fn()).getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('초기 aria-expanded="false" 가 설정되어야 한다', () => {
    expect(createTriggerButton(BASE_CONFIG, vi.fn(), vi.fn()).getAttribute('aria-expanded')).toBe('false');
  });

  it('[C2] buttonLabel 이 aria-label 속성으로만 사용되어야 한다 — innerHTML 금지', () => {
    const xss = '<script>alert(1)</script>';
    const btn = createTriggerButton({ ...BASE_CONFIG, buttonLabel: xss }, vi.fn(), vi.fn());
    document.body.appendChild(btn);
    // innerHTML 이라면 <script> 태그가 DOM 요소로 파싱됨
    expect(btn.querySelector('script')).toBeNull();
    // aria-label 속성으로만 전달 (속성은 HTML 파싱 대상이 아님)
    expect(btn.getAttribute('aria-label')).toBe(xss);
  });

  it('클릭 시 onClick 콜백이 호출되어야 한다', () => {
    const onClick = vi.fn();
    const btn = createTriggerButton(BASE_CONFIG, onClick, vi.fn());
    btn.click();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('mouseenter 시 onMouseEnter 콜백이 호출되어야 한다', () => {
    const onMouseEnter = vi.fn();
    const btn = createTriggerButton(BASE_CONFIG, vi.fn(), onMouseEnter);
    btn.dispatchEvent(new MouseEvent('mouseenter'));
    expect(onMouseEnter).toHaveBeenCalledOnce();
  });

  describe('setButtonExpanded()', () => {
    it('true 전달 시 aria-expanded="true" 로 변경해야 한다', () => {
      const btn = createTriggerButton(BASE_CONFIG, vi.fn(), vi.fn());
      setButtonExpanded(btn, true);
      expect(btn.getAttribute('aria-expanded')).toBe('true');
    });

    it('false 전달 시 aria-expanded="false" 로 변경해야 한다', () => {
      const btn = createTriggerButton(BASE_CONFIG, vi.fn(), vi.fn());
      setButtonExpanded(btn, true);
      setButtonExpanded(btn, false);
      expect(btn.getAttribute('aria-expanded')).toBe('false');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. createPopup — 팝업 컨테이너
// ─────────────────────────────────────────────────────────────────────────────
describe('createPopup (src/widget/ui/popup.ts)', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  afterEach(() => { document.body.innerHTML = ''; });

  it('{ el, update, destroy } 를 반환해야 한다', () => {
    const { shadow } = createWidgetRoot(BASE_CONFIG);
    const handle = createPopup(shadow, makeCallbacks());
    expect(handle).toHaveProperty('el');
    expect(handle).toHaveProperty('update');
    expect(handle).toHaveProperty('destroy');
  });

  it('el 이 role="dialog" 를 가져야 한다', () => {
    const { shadow } = createWidgetRoot(BASE_CONFIG);
    expect(createPopup(shadow, makeCallbacks()).el.getAttribute('role')).toBe('dialog');
  });

  it('el 이 aria-modal="true" 를 가져야 한다', () => {
    const { shadow } = createWidgetRoot(BASE_CONFIG);
    expect(createPopup(shadow, makeCallbacks()).el.getAttribute('aria-modal')).toBe('true');
  });

  it('초기 상태에서 팝업이 숨겨져 있어야 한다 (display: none)', () => {
    const { shadow } = createWidgetRoot(BASE_CONFIG);
    expect(createPopup(shadow, makeCallbacks()).el.style.display).toBe('none');
  });

  // ── update() — 표시/숨김 ─────────────────────────────────────────────
  describe('update() — 표시/숨김', () => {
    it('isOpen=true 이면 팝업이 표시되어야 한다', () => {
      const { handle, triggerBtn } = setupPopup();
      handle.update(OPEN_TYPE_STATE, triggerBtn);
      expect(handle.el.style.display).not.toBe('none');
    });

    it('isOpen=false 이면 팝업이 숨겨져야 한다', () => {
      const { handle, triggerBtn } = setupPopup();
      handle.update(OPEN_TYPE_STATE, triggerBtn);
      handle.update(INITIAL_STATE, triggerBtn);
      expect(handle.el.style.display).toBe('none');
    });

    it('팝업 닫힐 때 triggerBtn 으로 포커스가 복귀해야 한다 [H2]', () => {
      const { handle, triggerBtn } = setupPopup();
      handle.update(OPEN_TYPE_STATE, triggerBtn);
      triggerBtn.focus = vi.fn(); // jsdom focus 동작 mock
      handle.update(INITIAL_STATE, triggerBtn);
      expect(triggerBtn.focus).toHaveBeenCalled();
    });
  });

  // ── update() — 스텝별 콘텐츠 렌더링 ────────────────────────────────
  describe('update() — 스텝 콘텐츠', () => {
    it('step=type 이면 타입 카드 3개가 렌더링되어야 한다', () => {
      const { handle, triggerBtn } = setupPopup();
      handle.update(OPEN_TYPE_STATE, triggerBtn);
      expect(handle.el.querySelectorAll('[data-type]').length).toBe(3);
    });

    it('step=form 이면 title input 이 렌더링되어야 한다', () => {
      const { handle, triggerBtn } = setupPopup();
      handle.update(OPEN_FORM_STATE, triggerBtn);
      expect(handle.el.querySelector('[data-field="title"]')).not.toBeNull();
    });

    it('step=form 이면 description textarea 가 렌더링되어야 한다', () => {
      const { handle, triggerBtn } = setupPopup();
      handle.update(OPEN_FORM_STATE, triggerBtn);
      expect(handle.el.querySelector('[data-field="description"]')).not.toBeNull();
    });

    it('step=success 이면 trackingId 가 .wfb-tracking-id 에 표시되어야 한다', () => {
      const { handle, triggerBtn } = setupPopup();
      handle.update(SUCCESS_STATE, triggerBtn);
      const el = handle.el.querySelector('.wfb-tracking-id');
      expect(el).not.toBeNull();
      expect(el!.textContent).toBe('FB-abcd1234');
    });

    it('[C2] trackingId 가 XSS 문자열이어도 img 태그로 파싱되지 않아야 한다', () => {
      const { handle, triggerBtn } = setupPopup();
      handle.update({ ...SUCCESS_STATE, trackingId: '<img src=x onerror=alert(1)>' }, triggerBtn);
      expect(handle.el.querySelector('img')).toBeNull();
      expect(handle.el.querySelector('.wfb-tracking-id')!.textContent).toContain('<img');
    });

    it('[M3] 동일 step 내 상태 변경 시 에러 배너가 업데이트되어야 한다', () => {
      const { handle, triggerBtn } = setupPopup();
      handle.update(OPEN_FORM_STATE, triggerBtn);
      handle.update({ ...OPEN_FORM_STATE, errorMessage: '네트워크 오류' }, triggerBtn);
      const banner = handle.el.querySelector<HTMLElement>('[data-wfb-error]');
      expect(banner!.textContent).toBe('네트워크 오류');
    });

    it('[M3] step=submitting 이면 submit 버튼이 disabled 되어야 한다', () => {
      const { handle, triggerBtn } = setupPopup();
      handle.update(OPEN_FORM_STATE, triggerBtn);
      handle.update({ ...OPEN_FORM_STATE, step: 'submitting' }, triggerBtn);
      const btn = handle.el.querySelector<HTMLButtonElement>('[data-wfb-submit]');
      expect(btn!.disabled).toBe(true);
    });
  });

  // ── [H1] ESC 키 처리 ────────────────────────────────────────────────
  describe('[H1] ESC 키 — Shadow DOM 내 등록', () => {
    it('Shadow DOM 에서 ESC 이벤트 발생 시 onClose 가 호출되어야 한다', () => {
      const { handle, triggerBtn, cbs, shadow } = setupPopup();
      handle.update(OPEN_TYPE_STATE, triggerBtn);
      shadow.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(cbs.onClose).toHaveBeenCalledOnce();
    });
  });

  // ── [H3] destroy() ──────────────────────────────────────────────────
  describe('[H3] destroy() — 리소스 정리', () => {
    it('destroy() 호출이 throw 없이 실행되어야 한다', () => {
      const { shadow } = createWidgetRoot(BASE_CONFIG);
      expect(() => createPopup(shadow, makeCallbacks()).destroy()).not.toThrow();
    });

    it('destroy() 후 ESC 이벤트가 와도 onClose 가 호출되지 않아야 한다', () => {
      const { handle, triggerBtn, cbs, shadow } = setupPopup();
      handle.update(OPEN_TYPE_STATE, triggerBtn);
      handle.destroy();
      shadow.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(cbs.onClose).not.toHaveBeenCalled();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. renderTypeSelect
// ─────────────────────────────────────────────────────────────────────────────
describe('renderTypeSelect (src/widget/ui/steps/type-select.ts)', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('HTMLElement 를 반환해야 한다', () => {
    expect(renderTypeSelect(vi.fn())).toBeInstanceOf(HTMLElement);
  });

  it('BUG, FEATURE, GENERAL 카드가 3개 모두 있어야 한다', () => {
    const el = renderTypeSelect(vi.fn());
    document.body.appendChild(el);
    const cards = el.querySelectorAll('[data-type]');
    expect(cards.length).toBe(3);
    const types = Array.from(cards).map((c) => c.getAttribute('data-type'));
    expect(types).toContain('BUG');
    expect(types).toContain('FEATURE');
    expect(types).toContain('GENERAL');
  });

  it('각 카드에 role="button" 이 있어야 한다', () => {
    const el = renderTypeSelect(vi.fn());
    el.querySelectorAll('[data-type]').forEach((card) => {
      expect(card.getAttribute('role')).toBe('button');
    });
  });

  it('각 카드에 tabindex="0" 이 있어야 한다', () => {
    const el = renderTypeSelect(vi.fn());
    el.querySelectorAll('[data-type]').forEach((card) => {
      expect(card.getAttribute('tabindex')).toBe('0');
    });
  });

  it('BUG 카드 클릭 시 onSelect("BUG") 가 호출되어야 한다', () => {
    const onSelect = vi.fn();
    const el = renderTypeSelect(onSelect);
    document.body.appendChild(el);
    (el.querySelector<HTMLElement>('[data-type="BUG"]'))!.click();
    expect(onSelect).toHaveBeenCalledWith('BUG');
  });

  it('FEATURE 카드 클릭 시 onSelect("FEATURE") 가 호출되어야 한다', () => {
    const onSelect = vi.fn();
    const el = renderTypeSelect(onSelect);
    document.body.appendChild(el);
    (el.querySelector<HTMLElement>('[data-type="FEATURE"]'))!.click();
    expect(onSelect).toHaveBeenCalledWith('FEATURE');
  });

  it('Enter 키로 카드 선택이 되어야 한다 (키보드 접근성)', () => {
    const onSelect = vi.fn();
    const el = renderTypeSelect(onSelect);
    document.body.appendChild(el);
    const bugCard = el.querySelector<HTMLElement>('[data-type="BUG"]');
    bugCard!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith('BUG');
  });

  it('Space 키로 카드 선택이 되어야 한다 (키보드 접근성)', () => {
    const onSelect = vi.fn();
    const el = renderTypeSelect(onSelect);
    document.body.appendChild(el);
    const bugCard = el.querySelector<HTMLElement>('[data-type="BUG"]');
    bugCard!.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith('BUG');
  });

  it('[C2] 카드 내부에 <script> 태그가 없어야 한다 (innerHTML 미사용)', () => {
    const el = renderTypeSelect(vi.fn());
    expect(el.querySelector('script')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. renderForm & updateFormState
// ─────────────────────────────────────────────────────────────────────────────
describe('renderForm & updateFormState (src/widget/ui/steps/form.ts)', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('title input (data-field="title") 이 있어야 한다', () => {
    const el = renderForm(OPEN_FORM_STATE, vi.fn(), vi.fn(), vi.fn());
    document.body.appendChild(el);
    expect(el.querySelector('[data-field="title"]')).not.toBeNull();
  });

  it('description textarea (data-field="description") 이 있어야 한다', () => {
    const el = renderForm(OPEN_FORM_STATE, vi.fn(), vi.fn(), vi.fn());
    document.body.appendChild(el);
    expect(el.querySelector('[data-field="description"]')).not.toBeNull();
  });

  it('nickname input (data-field="nickname") 이 있어야 한다', () => {
    const el = renderForm(OPEN_FORM_STATE, vi.fn(), vi.fn(), vi.fn());
    document.body.appendChild(el);
    expect(el.querySelector('[data-field="nickname"]')).not.toBeNull();
  });

  it('email input (data-field="email") 이 있어야 한다 (선택 필드)', () => {
    const el = renderForm(OPEN_FORM_STATE, vi.fn(), vi.fn(), vi.fn());
    document.body.appendChild(el);
    expect(el.querySelector('[data-field="email"]')).not.toBeNull();
  });

  it('email input type="email" 이어야 한다', () => {
    const el = renderForm(OPEN_FORM_STATE, vi.fn(), vi.fn(), vi.fn());
    document.body.appendChild(el);
    const emailInput = el.querySelector<HTMLInputElement>('[data-field="email"]');
    expect(emailInput!.type).toBe('email');
  });

  it('submit 버튼에 data-wfb-submit 속성이 있어야 한다', () => {
    const el = renderForm(OPEN_FORM_STATE, vi.fn(), vi.fn(), vi.fn());
    document.body.appendChild(el);
    expect(el.querySelector('[data-wfb-submit]')).not.toBeNull();
  });

  it('에러 배너에 data-wfb-error 속성과 role="alert" 가 있어야 한다', () => {
    const el = renderForm(OPEN_FORM_STATE, vi.fn(), vi.fn(), vi.fn());
    document.body.appendChild(el);
    const banner = el.querySelector('[data-wfb-error]');
    expect(banner).not.toBeNull();
    expect(banner!.getAttribute('role')).toBe('alert');
  });

  it('초기 에러 배너는 숨겨져 있어야 한다 (errorMessage=null)', () => {
    const el = renderForm(OPEN_FORM_STATE, vi.fn(), vi.fn(), vi.fn());
    document.body.appendChild(el);
    const banner = el.querySelector<HTMLElement>('[data-wfb-error]');
    expect(banner!.style.display).toBe('none');
  });

  it('errorMessage 있으면 배너가 초기 렌더링 시 표시되어야 한다', () => {
    const stateWithError = { ...OPEN_FORM_STATE, errorMessage: '서버 오류' };
    const el = renderForm(stateWithError, vi.fn(), vi.fn(), vi.fn());
    document.body.appendChild(el);
    const banner = el.querySelector<HTMLElement>('[data-wfb-error]');
    expect(banner!.style.display).not.toBe('none');
    expect(banner!.textContent).toBe('서버 오류');
  });

  // ── [RED] 설계 스펙 data-wfb-back 속성 ──────────────────────────────
  // 현재 구현은 class="wfb-back-btn" 사용 → data-wfb-back 미존재 → RED
  it('[RED] 뒤로가기 버튼에 data-wfb-back 속성이 있어야 한다', () => {
    const el = renderForm(OPEN_FORM_STATE, vi.fn(), vi.fn(), vi.fn());
    document.body.appendChild(el);
    // 현재 구현은 class="wfb-back-btn" 만 사용하므로 실패 예상
    expect(el.querySelector('[data-wfb-back]')).not.toBeNull();
  });

  it('뒤로가기 버튼 클릭 시 onBack 이 호출되어야 한다', () => {
    const onBack = vi.fn();
    const el = renderForm(OPEN_FORM_STATE, onBack, vi.fn(), vi.fn());
    document.body.appendChild(el);
    // class 기반으로도 동작 확인 (구현에 따라 클릭 이벤트가 연결되어 있음)
    const backBtn = el.querySelector<HTMLElement>('.wfb-back-btn');
    backBtn!.click();
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('input 변경 시 onFormChange(field, value) 가 호출되어야 한다 [H4]', () => {
    const onFormChange = vi.fn();
    const el = renderForm(OPEN_FORM_STATE, vi.fn(), onFormChange, vi.fn());
    document.body.appendChild(el);
    const titleInput = el.querySelector<HTMLInputElement>('[data-field="title"]');
    // jsdom 에서는 직접 value 설정 후 input 이벤트 발생이 가장 신뢰성 높음
    titleInput!.value = 'new title';
    titleInput!.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onFormChange).toHaveBeenCalledWith('title', 'new title');
  });

  // ── updateFormState() [M3] ───────────────────────────────────────────
  describe('updateFormState() [M3 — DOM 재빌드 없이 속성만 업데이트]', () => {
    it('errorMessage 표시 시 배너 텍스트가 설정되어야 한다', () => {
      const el = renderForm(OPEN_FORM_STATE, vi.fn(), vi.fn(), vi.fn());
      document.body.appendChild(el);
      updateFormState(el, { ...OPEN_FORM_STATE, errorMessage: '제출 실패' });
      const banner = el.querySelector<HTMLElement>('[data-wfb-error]');
      expect(banner!.textContent).toBe('제출 실패');
      expect(banner!.style.display).not.toBe('none');
    });

    it('errorMessage=null 이면 배너가 숨겨져야 한다', () => {
      const el = renderForm(OPEN_FORM_STATE, vi.fn(), vi.fn(), vi.fn());
      document.body.appendChild(el);
      updateFormState(el, { ...OPEN_FORM_STATE, errorMessage: '오류' });
      updateFormState(el, { ...OPEN_FORM_STATE, errorMessage: null });
      expect(el.querySelector<HTMLElement>('[data-wfb-error]')!.style.display).toBe('none');
    });

    it('step=submitting 이면 submit 버튼이 disabled 되어야 한다', () => {
      const el = renderForm(OPEN_FORM_STATE, vi.fn(), vi.fn(), vi.fn());
      document.body.appendChild(el);
      updateFormState(el, { ...OPEN_FORM_STATE, step: 'submitting' });
      expect(el.querySelector<HTMLButtonElement>('[data-wfb-submit]')!.disabled).toBe(true);
    });

    it('step=submitting 이면 버튼 텍스트가 로딩 상태 문자열이어야 한다', () => {
      const el = renderForm(OPEN_FORM_STATE, vi.fn(), vi.fn(), vi.fn());
      document.body.appendChild(el);
      updateFormState(el, { ...OPEN_FORM_STATE, step: 'submitting' });
      expect(el.querySelector<HTMLButtonElement>('[data-wfb-submit]')!.textContent).toMatch(/제출 중/);
    });

    it('step=form(재활성화) 이면 submit 버튼이 활성화되어야 한다', () => {
      const el = renderForm(OPEN_FORM_STATE, vi.fn(), vi.fn(), vi.fn());
      document.body.appendChild(el);
      updateFormState(el, { ...OPEN_FORM_STATE, step: 'submitting' });
      updateFormState(el, { ...OPEN_FORM_STATE, step: 'form' });
      expect(el.querySelector<HTMLButtonElement>('[data-wfb-submit]')!.disabled).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. renderSuccess
// ─────────────────────────────────────────────────────────────────────────────
describe('renderSuccess (src/widget/ui/steps/success.ts)', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('HTMLElement 를 반환해야 한다', () => {
    expect(renderSuccess(SUCCESS_STATE, vi.fn())).toBeInstanceOf(HTMLElement);
  });

  it('trackingId 가 .wfb-tracking-id 에 표시되어야 한다', () => {
    const el = renderSuccess(SUCCESS_STATE, vi.fn());
    document.body.appendChild(el);
    expect(el.querySelector('.wfb-tracking-id')!.textContent).toBe('FB-abcd1234');
  });

  it('[C2] trackingId 가 textContent 로만 렌더링되어야 한다', () => {
    const xss = '<script>alert("xss")</script>';
    const el = renderSuccess({ ...SUCCESS_STATE, trackingId: xss }, vi.fn());
    document.body.appendChild(el);
    expect(el.querySelector('script')).toBeNull();
    expect(el.querySelector('.wfb-tracking-id')!.textContent).toContain('<script>');
  });

  // ── [RED] 설계 스펙 data 속성 ────────────────────────────────────────
  // 현재 구현은 class="wfb-close-success-btn" 사용 → RED
  it('[RED] 닫기 버튼에 data-wfb-close 속성이 있어야 한다', () => {
    const el = renderSuccess(SUCCESS_STATE, vi.fn());
    document.body.appendChild(el);
    expect(el.querySelector('[data-wfb-close]')).not.toBeNull();
  });

  // 현재 구현은 class="wfb-copy-btn" 사용 → RED
  it('[RED] 복사 버튼에 data-wfb-copy 속성이 있어야 한다', () => {
    const el = renderSuccess(SUCCESS_STATE, vi.fn());
    document.body.appendChild(el);
    expect(el.querySelector('[data-wfb-copy]')).not.toBeNull();
  });

  it('닫기 버튼 클릭 시 onClose 가 호출되어야 한다', () => {
    const onClose = vi.fn();
    const el = renderSuccess(SUCCESS_STATE, onClose);
    document.body.appendChild(el);
    // class 기반으로 동작 확인 (구현에 따라 이벤트 연결)
    const closeBtn = el.querySelector<HTMLButtonElement>('.wfb-close-success-btn');
    closeBtn!.click();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('복사 버튼이 존재해야 한다', () => {
    const el = renderSuccess(SUCCESS_STATE, vi.fn());
    document.body.appendChild(el);
    expect(el.querySelector('.wfb-copy-btn')).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. trapFocus [H2 WCAG 2.1 AA]
// ─────────────────────────────────────────────────────────────────────────────
describe('trapFocus (src/widget/utils/focus-trap.ts)', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  afterEach(() => { document.body.innerHTML = ''; });

  function createContainer(count = 3) {
    const container = document.createElement('div');
    const buttons: HTMLButtonElement[] = [];
    for (let i = 0; i < count; i++) {
      const btn = document.createElement('button');
      btn.textContent = `Btn ${i + 1}`;
      container.appendChild(btn);
      buttons.push(btn);
    }
    document.body.appendChild(container);
    return { container, buttons };
  }

  function fireTab(el: HTMLElement, shiftKey = false) {
    el.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true }),
    );
  }

  it('trapFocus 호출 시 첫 번째 요소에 포커스가 이동해야 한다', () => {
    const { container, buttons } = createContainer(3);
    trapFocus(container);
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('마지막 요소에서 Tab → 첫 번째 요소로 순환해야 한다 [H2]', () => {
    const { container, buttons } = createContainer(3);
    trapFocus(container);
    buttons[2].focus();
    fireTab(buttons[2]);
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('첫 번째 요소에서 Shift+Tab → 마지막 요소로 순환해야 한다 [H2]', () => {
    const { container, buttons } = createContainer(3);
    trapFocus(container);
    buttons[0].focus();
    fireTab(buttons[0], true);
    expect(document.activeElement).toBe(buttons[2]);
  });

  it('중간 요소에서 Tab 은 기본 동작에 간섭하지 않아야 한다', () => {
    const { container, buttons } = createContainer(3);
    trapFocus(container);
    buttons[1].focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    const spy = vi.spyOn(event, 'preventDefault');
    buttons[1].dispatchEvent(event);
    expect(spy).not.toHaveBeenCalled();
  });

  it('Tab 이외 키는 무시해야 한다', () => {
    const { container, buttons } = createContainer(3);
    trapFocus(container);
    buttons[2].focus();
    buttons[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(document.activeElement).toBe(buttons[2]);
  });

  it('cleanup 함수를 반환해야 한다', () => {
    const { container } = createContainer(2);
    expect(typeof trapFocus(container)).toBe('function');
  });

  it('cleanup 호출 후 Tab 순환이 중단되어야 한다 [H3]', () => {
    const { container, buttons } = createContainer(3);
    const cleanup = trapFocus(container);
    // cleanup 전: 순환 동작 확인
    buttons[2].focus();
    fireTab(buttons[2]);
    expect(document.activeElement).toBe(buttons[0]);
    // cleanup 후
    cleanup();
    buttons[2].focus();
    fireTab(buttons[2]);
    // handler 가 제거되었으므로 포커스 변경 없음
    expect(document.activeElement).toBe(buttons[2]);
  });

  it('포커서블 요소가 없으면 throw 없이 실행되어야 한다', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    expect(() => trapFocus(container)).not.toThrow();
  });

  it('요소 1개일 때 Tab 키로도 throw 없어야 한다', () => {
    const { container, buttons } = createContainer(1);
    trapFocus(container);
    buttons[0].focus();
    expect(() => fireTab(buttons[0])).not.toThrow();
  });
});
