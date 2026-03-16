const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * 컨테이너 내 포커스를 가두는 트랩 설정.
 * WCAG 2.1 SC 2.1.2 — Tab/Shift+Tab이 dialog 내부에서만 순환.
 * 팝업 열릴 때 첫 포커서블 요소에 자동 포커스.
 *
 * @returns cleanup 함수 — 팝업 닫힐 때 반드시 호출
 */
export function trapFocus(container: HTMLElement): () => void {
  const getFocusable = (): HTMLElement[] =>
    Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));

  // 첫 포커서블 요소에 자동 포커스 (딜레이 없이 즉시)
  const focusables = getFocusable();
  focusables[0]?.focus();

  const handler = (e: KeyboardEvent): void => {
    if (e.key !== 'Tab') return;

    // 매번 재계산 — DOM이 변경될 수 있음 (step 전환 시)
    const els = getFocusable();
    if (els.length === 0) return;

    const first = els[0];
    const last = els[els.length - 1];

    // [H2] Shadow DOM 내에서 document.activeElement는 Shadow Host를 반환하므로
    // container.getRootNode()로 ShadowRoot 또는 Document를 취득한 뒤
    // shadowRoot.activeElement를 사용해 실제 포커스 요소를 얻는다.
    const root = container.getRootNode() as ShadowRoot | Document;
    const active = root.activeElement;

    if (e.shiftKey) {
      // Shift+Tab: 첫 요소에서 순환 → 마지막 요소로
      if (active === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab: 마지막 요소에서 순환 → 첫 요소로
      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  container.addEventListener('keydown', handler);
  return () => container.removeEventListener('keydown', handler);
}
