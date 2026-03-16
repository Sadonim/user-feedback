/**
 * Open Redirect 방지 — callbackUrl 검증 유틸리티 (H1)
 *
 * 허용: 슬래시로 시작하는 상대 경로 (/admin/tickets, /admin/tickets?status=OPEN)
 * 거부: 절대 URL (https://), 프로토콜 상대 URL (//evil.com), javascript:, data:, 빈 문자열
 *
 * 규칙:
 *  1. '/'로 시작해야 한다
 *  2. 두 번째 문자가 '/'이면 거부 (//evil.com 차단)
 *  3. 허용된 문자셋: 영숫자, -, _, /, ?, =, &, %, #
 */
const SAFE_CALLBACK_RE = /^\/(?!\/)[a-zA-Z0-9\-_/?=&%#]*$/;

/** 기본 리다이렉트 경로 */
const DEFAULT_PATH = '/admin/dashboard';

/**
 * callbackUrl을 검증하여 안전한 상대 경로를 반환한다.
 * 허용되지 않는 값은 모두 기본 경로로 폴백한다.
 */
export function sanitizeCallbackUrl(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_PATH;
  if (SAFE_CALLBACK_RE.test(raw)) return raw;
  return DEFAULT_PATH;
}
