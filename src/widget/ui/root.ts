import { WIDGET_CSS } from '../styles';
import type { WidgetConfig } from '../config';

export interface WidgetRoot {
  readonly host: HTMLElement;
  readonly shadow: ShadowRoot;
  readonly container: HTMLElement;
}

const POSITION_STYLES: Record<string, string> = {
  'bottom-right': 'bottom: 24px; right: 24px;',
  'bottom-left':  'bottom: 24px; left: 24px;',
  'top-right':    'top: 24px; right: 24px;',
  'top-left':     'top: 24px; left: 24px;',
};

export function createWidgetRoot(config: WidgetConfig): WidgetRoot {
  const host = document.createElement('div');
  host.setAttribute('data-ufb-widget', '');
  // data-position 으로 CSS :host([data-position="..."]) 셀렉터 구동
  host.setAttribute('data-position', config.position);
  host.style.cssText = `
    position: fixed;
    z-index: ${config.zIndex};
    ${POSITION_STYLES[config.position] ?? POSITION_STYLES['bottom-right']}
  `;
  // buttonColor는 이미 hex 검증 완료된 값 (config.ts sanitizeHexColor)
  host.style.setProperty('--wfb-accent', config.buttonColor);

  const shadow = host.attachShadow({ mode: 'open' });

  const styleEl = document.createElement('style');
  styleEl.textContent = WIDGET_CSS;
  shadow.appendChild(styleEl);

  // wfb-wrap: position:relative 컨테이너 — 팝업 절대위치의 기준점
  const container = document.createElement('div');
  container.className = 'wfb-wrap';
  shadow.appendChild(container);

  return { host, shadow, container };
}

/**
 * 시스템 다크모드 감지 및 실시간 업데이트.
 * [H3] cleanup 함수 반환 — destroy() 호출 시 MediaQueryList 리스너 제거.
 */
export function setupThemeObserver(
  host: HTMLElement,
  theme: 'auto' | 'light' | 'dark'
): () => void {
  if (theme !== 'auto') {
    host.setAttribute('data-theme', theme);
    return () => { /* 고정 테마는 cleanup 불필요 */ };
  }

  // matchMedia 미지원 환경(jsdom, 구형 브라우저) 대응
  if (typeof window.matchMedia !== 'function') {
    host.setAttribute('data-theme', 'light');
    return () => { /* no-op */ };
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
