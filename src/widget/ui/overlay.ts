import type { FeedbackType } from '../state';

export interface OverlayCallbacks {
  onCollapse: () => void;
  onSelectType: (type: FeedbackType) => void;
}

export interface OverlayHandle {
  el: HTMLElement;
  update: (isVisible: boolean) => void;
}

const TYPE_OPTIONS: { type: FeedbackType; createIcon: () => SVGElement; label: string }[] = [
  { type: 'BUG',     createIcon: createBugIcon,     label: '버그' },
  { type: 'FEATURE', createIcon: createFeatureIcon,  label: '기능 제안' },
  { type: 'GENERAL', createIcon: createGeneralIcon,  label: '문의' },
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

    const iconWrapper = document.createElement('span');
    iconWrapper.className = 'wfb-overlay-type-icon';
    iconWrapper.setAttribute('aria-hidden', 'true');
    iconWrapper.appendChild(opt.createIcon());

    const label = document.createElement('span');
    label.className = 'wfb-overlay-type-label';
    label.textContent = opt.label;

    btn.append(iconWrapper, label);
    btn.addEventListener('click', () => callbacks.onSelectType(opt.type));
    typesRow.appendChild(btn);
  }

  el.append(header, typesRow);

  const update = (isVisible: boolean): void => {
    el.style.display = isVisible ? 'flex' : 'none';
  };

  return { el, update };
}

// ── SVG 헬퍼 ─────────────────────────────────────────────────────────────────

function svgEl(tag: string): SVGElement {
  return document.createElementNS('http://www.w3.org/2000/svg', tag) as SVGElement;
}

function makePath(d: string, attrs: Record<string, string> = {}): SVGElement {
  const p = svgEl('path');
  p.setAttribute('d', d);
  for (const [k, v] of Object.entries(attrs)) p.setAttribute(k, v);
  return p;
}

function makeBaseSvg(viewBox: string): SVGElement {
  const svg = svgEl('svg');
  svg.setAttribute('width', '28');
  svg.setAttribute('height', '28');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');
  return svg;
}

// ── 버그 아이콘 (Phosphor Icons / Regular) ───────────────────────────────────

function createBugIcon(): SVGElement {
  const svg = makeBaseSvg('0 0 256 256');
  svg.setAttribute('fill', 'currentColor');

  const path = svgEl('path');
  path.setAttribute('d', 'M144,92a12,12,0,1,1,12,12A12,12,0,0,1,144,92ZM100,80a12,12,0,1,0,12,12A12,12,0,0,0,100,80Zm116,64A87.76,87.76,0,0,1,213,167l22.24,9.72A8,8,0,0,1,232,192a7.89,7.89,0,0,1-3.2-.67L207.38,182a88,88,0,0,1-158.76,0L27.2,191.33A7.89,7.89,0,0,1,24,192a8,8,0,0,1-3.2-15.33L43,167A87.76,87.76,0,0,1,40,144v-8H16a8,8,0,0,1,0-16H40v-8a87.76,87.76,0,0,1,3-23L20.8,79.33a8,8,0,1,1,6.4-14.66L48.62,74a88,88,0,0,1,158.76,0l21.42-9.36a8,8,0,0,1,6.4,14.66L213,89.05a87.76,87.76,0,0,1,3,23v8h24a8,8,0,0,1,0,16H216ZM56,120H200v-8a72,72,0,0,0-144,0Zm64,95.54V136H56v8A72.08,72.08,0,0,0,120,215.54ZM200,144v-8H136v79.54A72.08,72.08,0,0,0,200,144Z');
  svg.appendChild(path);

  return svg;
}

// ── 기능 제안 아이콘 (Phosphor Icons / Regular) ──────────────────────────────

function createFeatureIcon(): SVGElement {
  const svg = makeBaseSvg('0 0 256 256');
  svg.setAttribute('fill', 'currentColor');

  const path = svgEl('path');
  path.setAttribute('d', 'M176,232a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,232Zm40-128a87.55,87.55,0,0,1-33.64,69.21A16.24,16.24,0,0,0,176,186v6a16,16,0,0,1-16,16H96a16,16,0,0,1-16-16v-6a16,16,0,0,0-6.23-12.66A87.59,87.59,0,0,1,40,104.49C39.74,56.83,78.26,17.14,125.88,16A88,88,0,0,1,216,104Zm-16,0a72,72,0,0,0-73.74-72c-39,.92-70.47,33.39-70.26,72.39a71.65,71.65,0,0,0,27.64,56.3A32,32,0,0,1,96,186v6h64v-6a32.15,32.15,0,0,1,12.47-25.35A71.65,71.65,0,0,0,200,104Zm-16.11-9.34a57.6,57.6,0,0,0-46.56-46.55,8,8,0,0,0-2.66,15.78c16.57,2.79,30.63,16.85,33.44,33.45A8,8,0,0,0,176,104a9,9,0,0,0,1.35-.11A8,8,0,0,0,183.89,94.66Z');
  svg.appendChild(path);

  return svg;
}

// ── 문의 아이콘 (Phosphor Icons / Regular) ───────────────────────────────────

function createGeneralIcon(): SVGElement {
  const svg = makeBaseSvg('0 0 256 256');
  svg.setAttribute('fill', 'currentColor');

  const path = svgEl('path');
  path.setAttribute('d', 'M168,112a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,112Zm-8,24H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16Zm72-8A104,104,0,0,1,79.12,219.82L45.07,231.17a16,16,0,0,1-20.24-20.24l11.35-34.05A104,104,0,1,1,232,128Zm-16,0A88,88,0,1,0,51.81,172.06a8,8,0,0,1,.66,6.54L40,216,77.4,203.53a7.85,7.85,0,0,1,2.53-.42,8,8,0,0,1,4,1.08A88,88,0,0,0,216,128Z');
  svg.appendChild(path);

  return svg;
}

// ── Chevron ───────────────────────────────────────────────────────────────────

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
