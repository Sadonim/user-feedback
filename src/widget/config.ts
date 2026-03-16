export type WidgetPosition =
  | 'bottom-right'
  | 'bottom-left'
  | 'top-right'
  | 'top-left';

export type WidgetTheme = 'auto' | 'light' | 'dark';

export interface WidgetConfig {
  readonly apiUrl: string;
  readonly theme: WidgetTheme;
  readonly position: WidgetPosition;
  readonly buttonLabel: string;
  readonly buttonColor: string;
  readonly zIndex: number;
}

const VALID_POSITIONS = new Set<WidgetPosition>([
  'bottom-right',
  'bottom-left',
  'top-right',
  'top-left',
]);

const VALID_THEMES = new Set<WidgetTheme>(['auto', 'light', 'dark']);

const DEFAULTS = {
  theme: 'auto' as WidgetTheme,
  position: 'bottom-right' as WidgetPosition,
  buttonLabel: 'Feedback',
  buttonColor: '#4F46E5',
  zIndex: 9999,
} as const;

/** hex color 검증 (CSS 삽입 전 필수 — XSS 방어) */
function sanitizeHexColor(raw: string | undefined): string {
  return /^#[0-9A-Fa-f]{6}$/.test(raw ?? '') ? (raw as string) : DEFAULTS.buttonColor;
}

/** 버튼 레이블 검증 (길이 제한으로 DOM overflow 방지) */
function sanitizeLabel(raw: string | undefined): string {
  const trimmed = (raw ?? '').trim().slice(0, 50);
  return trimmed.length > 0 ? trimmed : DEFAULTS.buttonLabel;
}

/**
 * [C1] document.currentScript 직접 접근 제거.
 * 호출자(index.ts IIFE 최상단)가 scriptEl을 즉시 캡처하여 주입한다.
 * 비동기 콜백에서 null이 되는 문제 해결.
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

  // URL 기본 검증 (fetch 호출 전 fast-fail) + 프로토콜 화이트리스트 (XSS 방어)
  try {
    const parsed = new URL(apiUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      console.error('[UserFeedbackWidget] data-api-url must use http or https protocol');
      return null;
    }
  } catch {
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
