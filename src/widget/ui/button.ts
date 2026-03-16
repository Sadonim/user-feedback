import type { WidgetConfig } from '../config';

/** 채팅 버블 SVG 아이콘 생성 — 고정 구조, 동적 값 미포함 */
function createChatIcon(): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute(
    'd',
    'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'
  );
  svg.appendChild(path);
  return svg;
}

/**
 * 플로팅 트리거 버튼 생성.
 * [C2] innerHTML 전면 금지 — createElement + textContent / createElementNS 전용.
 */
export function createTriggerButton(
  config: WidgetConfig,
  onClick: () => void
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'wfb-trigger';
  btn.setAttribute('type', 'button');
  btn.setAttribute('aria-label', config.buttonLabel); // 속성값 — 안전
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.setAttribute('aria-expanded', 'false');

  // [C2] 모든 동적 값은 textContent로 삽입 (HTML 이스케이프 자동 처리)
  const label = document.createElement('span');
  label.className = 'wfb-trigger-label';
  label.textContent = config.buttonLabel;

  btn.appendChild(createChatIcon());
  btn.appendChild(label);
  btn.addEventListener('click', onClick);

  return btn;
}

export function setButtonExpanded(btn: HTMLButtonElement, expanded: boolean): void {
  btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
}
