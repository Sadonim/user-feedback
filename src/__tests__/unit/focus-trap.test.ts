/**
 * Unit: src/widget/utils/focus-trap.ts
 * TDD: WCAG 2.1 SC 2.1.2 Tab 포커스 트랩
 */
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { trapFocus } from '@/widget/utils/focus-trap';

function makeButton(id: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = id;
  btn.textContent = id;
  return btn;
}

function makeContainer(...children: HTMLElement[]): HTMLElement {
  const div = document.createElement('div');
  children.forEach((c) => div.appendChild(c));
  document.body.appendChild(div);
  return div;
}

describe('trapFocus', () => {
  it('컨테이너에 첫 포커서블 요소에 포커스를 이동한다', () => {
    const btn1 = makeButton('focus-first');
    const btn2 = makeButton('focus-second');
    const container = makeContainer(btn1, btn2);

    const focusSpy = vi.spyOn(btn1, 'focus');
    const cleanup = trapFocus(container);

    expect(focusSpy).toHaveBeenCalledOnce();

    cleanup();
    document.body.removeChild(container);
  });

  it('Tab: 마지막 요소에서 첫 요소로 순환한다', () => {
    const btn1 = makeButton('first');
    const btn2 = makeButton('last');
    const container = makeContainer(btn1, btn2);

    const cleanup = trapFocus(container);

    // 마지막 요소에 포커스 설정
    btn2.focus();

    const focusSpy = vi.spyOn(btn1, 'focus');

    // Tab keydown 이벤트 발생 (마지막 요소에서)
    Object.defineProperty(document, 'activeElement', {
      get: () => btn2,
      configurable: true,
    });

    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: false,
      bubbles: true,
    });
    container.dispatchEvent(tabEvent);

    expect(focusSpy).toHaveBeenCalled();

    cleanup();
    document.body.removeChild(container);
  });

  it('Shift+Tab: 첫 요소에서 마지막 요소로 순환한다', () => {
    const btn1 = makeButton('first-el');
    const btn2 = makeButton('last-el');
    const container = makeContainer(btn1, btn2);

    const cleanup = trapFocus(container);

    btn1.focus();

    const focusSpy = vi.spyOn(btn2, 'focus');

    Object.defineProperty(document, 'activeElement', {
      get: () => btn1,
      configurable: true,
    });

    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
    });
    container.dispatchEvent(shiftTabEvent);

    expect(focusSpy).toHaveBeenCalled();

    cleanup();
    document.body.removeChild(container);
  });

  it('cleanup 호출 후 리스너가 제거된다', () => {
    const btn1 = makeButton('cleanup-btn1');
    const btn2 = makeButton('cleanup-btn2');
    const container = makeContainer(btn1, btn2);

    const cleanup = trapFocus(container);
    cleanup();

    // cleanup 후 focus spy — 호출되면 안 됨
    const focusSpy = vi.spyOn(btn1, 'focus');

    Object.defineProperty(document, 'activeElement', {
      get: () => btn2,
      configurable: true,
    });

    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

    // cleanup 이후에는 내부 핸들러가 제거되어 btn1.focus()가 호출되지 않아야 함
    expect(focusSpy).not.toHaveBeenCalled();

    document.body.removeChild(container);
  });
});
