import type { FeedbackType } from '../state';

export interface OverlayCallbacks {
  onCollapse: () => void;
  onSelectType: (type: FeedbackType) => void;
}

export interface OverlayHandle {
  el: HTMLElement;
  update: (isVisible: boolean) => void;
}

const TYPE_OPTIONS: { type: FeedbackType; emoji: string; label: string }[] = [
  { type: 'BUG',     emoji: '🐛', label: '버그' },
  { type: 'FEATURE', emoji: '✨', label: '기능 제안' },
  { type: 'GENERAL', emoji: '💬', label: '문의' },
];

/**
 * 아이콘 hover 시 나타나는 미니 오버레이.
 * [C2] innerHTML 전면 금지 — createElement + textContent / createElementNS 전용.
 */
export function createOverlay(callbacks: OverlayCallbacks): OverlayHandle {
  const el = document.createElement('div');
  el.className = 'wfb-overlay';
  el.setAttribute('role', 'menu');
  el.setAttribute('aria-label', '피드백 유형 선택');
  el.style.display = 'none';

  // 헤더: 타이틀 + ↓ 접기 버튼
  const header = document.createElement('div');
  header.className = 'wfb-overlay-header';

  const title = document.createElement('span');
  title.className = 'wfb-overlay-title';
  title.textContent = '어떤 피드백인가요?';

  const collapseBtn = document.createElement('button');
  collapseBtn.className = 'wfb-collapse-btn';
  collapseBtn.setAttribute('type', 'button');
  collapseBtn.setAttribute('aria-label', '오버레이 닫기');
  collapseBtn.appendChild(createChevronDownIcon());
  collapseBtn.addEventListener('click', callbacks.onCollapse);

  header.append(title, collapseBtn);

  // 타입 버튼 행
  const typesRow = document.createElement('div');
  typesRow.className = 'wfb-overlay-types';

  for (const opt of TYPE_OPTIONS) {
    const btn = document.createElement('button');
    btn.className = 'wfb-overlay-type-btn';
    btn.setAttribute('type', 'button');
    btn.setAttribute('role', 'menuitem');
    btn.setAttribute('aria-label', opt.label);

    const emoji = document.createElement('span');
    emoji.className = 'wfb-overlay-type-emoji';
    emoji.textContent = opt.emoji;
    emoji.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.className = 'wfb-overlay-type-label';
    label.textContent = opt.label;

    btn.append(emoji, label);
    btn.addEventListener('click', () => callbacks.onSelectType(opt.type));
    typesRow.appendChild(btn);
  }

  el.append(header, typesRow);

  const update = (isVisible: boolean): void => {
    el.style.display = isVisible ? 'flex' : 'none';
  };

  return { el, update };
}

function createChevronDownIcon(): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');

  const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  polyline.setAttribute('points', '6 9 12 15 18 9');
  svg.appendChild(polyline);

  return svg;
}
