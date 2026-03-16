/**
 * Unit: src/widget/config.ts — parseConfigFromScript
 *
 * [TDD RED PHASE] src/widget/config.ts가 존재하지 않으므로 전체 실패 예상.
 *
 * 대상 함수:
 *   parseConfigFromScript(scriptEl: HTMLScriptElement | null): WidgetConfig | null
 *
 * 설계 문서 참조: docs/handoffs/design_phase3_widget.md §5-1, §16-2
 *
 * 전략:
 *   - HTMLScriptElement 전체 mock 불필요 — dataset 객체만 모사
 *   - DOM 없이 node 환경에서 실행 가능 (순수 데이터 파싱 함수)
 *   - [C1] scriptEl 주입 패턴 검증 (document.currentScript 비동기 null 문제 해결)
 *   - [C2/L1] CSS·DOM 삽입값 whitelist 검증 (hex color, label 길이)
 */
import { describe, it, expect } from 'vitest';
import { parseConfigFromScript } from '@/widget/config';

// ── 헬퍼: HTMLScriptElement 최소 모킹 ────────────────────────────────────────
// parseConfigFromScript 는 scriptEl.dataset.* 만 접근하므로
// { dataset: Record<string, string> } 으로 충분히 모킹 가능.
function makeScriptEl(data: Record<string, string> = {}): HTMLScriptElement {
  return { dataset: data } as unknown as HTMLScriptElement;
}

// ─────────────────────────────────────────────────────────────────────────────
describe('parseConfigFromScript (src/widget/config.ts)', () => {
  // ── null scriptEl ────────────────────────────────────────────────────────
  describe('scriptEl이 null일 때', () => {
    it('null을 반환해야 한다', () => {
      expect(parseConfigFromScript(null)).toBeNull();
    });
  });

  // ── data-api-url 누락 ────────────────────────────────────────────────────
  describe('data-api-url이 없거나 비어있을 때', () => {
    it('apiUrl 없음 → null을 반환해야 한다', () => {
      expect(parseConfigFromScript(makeScriptEl({}))).toBeNull();
    });

    it('apiUrl 빈 문자열 → null을 반환해야 한다', () => {
      expect(parseConfigFromScript(makeScriptEl({ apiUrl: '' }))).toBeNull();
    });

    it('apiUrl 공백만 있음 → null을 반환해야 한다', () => {
      expect(parseConfigFromScript(makeScriptEl({ apiUrl: '   ' }))).toBeNull();
    });
  });

  // ── 잘못된 URL ────────────────────────────────────────────────────────────
  describe('data-api-url이 유효하지 않은 URL일 때', () => {
    it('프로토콜 없는 URL → null을 반환해야 한다', () => {
      expect(parseConfigFromScript(makeScriptEl({ apiUrl: 'example.com' }))).toBeNull();
    });

    it('임의 문자열 URL → null을 반환해야 한다', () => {
      expect(parseConfigFromScript(makeScriptEl({ apiUrl: 'not-a-url' }))).toBeNull();
    });

    it('js: 프로토콜 → null을 반환해야 한다 (보안)', () => {
      expect(parseConfigFromScript(makeScriptEl({ apiUrl: 'javascript:alert(1)' }))).toBeNull();
    });
  });

  // ── 정상 파싱: 기본값 ─────────────────────────────────────────────────────
  describe('apiUrl만 있을 때 — 기본값 적용', () => {
    const el = () => makeScriptEl({ apiUrl: 'https://example.com' });

    it('null이 아닌 WidgetConfig를 반환해야 한다', () => {
      expect(parseConfigFromScript(el())).not.toBeNull();
    });

    it('apiUrl이 올바르게 파싱되어야 한다', () => {
      expect(parseConfigFromScript(el())!.apiUrl).toBe('https://example.com');
    });

    it('theme 기본값은 auto 여야 한다', () => {
      expect(parseConfigFromScript(el())!.theme).toBe('auto');
    });

    it('position 기본값은 bottom-right 여야 한다', () => {
      expect(parseConfigFromScript(el())!.position).toBe('bottom-right');
    });

    it('buttonLabel 기본값은 Feedback 이어야 한다', () => {
      expect(parseConfigFromScript(el())!.buttonLabel).toBe('Feedback');
    });

    it('buttonColor 기본값은 #4F46E5 여야 한다', () => {
      expect(parseConfigFromScript(el())!.buttonColor).toBe('#4F46E5');
    });

    it('zIndex 기본값은 9999 여야 한다', () => {
      expect(parseConfigFromScript(el())!.zIndex).toBe(9999);
    });
  });

  // ── 정상 파싱: 전체 속성 ──────────────────────────────────────────────────
  describe('모든 data-* 속성이 설정되었을 때', () => {
    const fullEl = makeScriptEl({
      apiUrl: 'https://feedback.example.com',
      theme: 'dark',
      position: 'top-left',
      buttonLabel: 'Send Feedback',
      buttonColor: '#FF5733',
      zIndex: '1000',
    });

    it('apiUrl을 정확히 파싱해야 한다', () => {
      expect(parseConfigFromScript(fullEl)!.apiUrl).toBe('https://feedback.example.com');
    });

    it('theme을 dark로 파싱해야 한다', () => {
      expect(parseConfigFromScript(fullEl)!.theme).toBe('dark');
    });

    it('position을 top-left로 파싱해야 한다', () => {
      expect(parseConfigFromScript(fullEl)!.position).toBe('top-left');
    });

    it('buttonLabel을 Send Feedback으로 파싱해야 한다', () => {
      expect(parseConfigFromScript(fullEl)!.buttonLabel).toBe('Send Feedback');
    });

    it('buttonColor를 #FF5733으로 파싱해야 한다', () => {
      expect(parseConfigFromScript(fullEl)!.buttonColor).toBe('#FF5733');
    });

    it('zIndex를 1000(number)으로 파싱해야 한다', () => {
      expect(parseConfigFromScript(fullEl)!.zIndex).toBe(1000);
    });
  });

  // ── apiUrl 공백 trim ──────────────────────────────────────────────────────
  describe('apiUrl 앞뒤 공백 처리', () => {
    it('apiUrl 앞뒤 공백을 trim해야 한다', () => {
      const el = makeScriptEl({ apiUrl: '  https://example.com  ' });
      expect(parseConfigFromScript(el)!.apiUrl).toBe('https://example.com');
    });
  });

  // ── position 검증 ─────────────────────────────────────────────────────────
  describe('position 값 검증', () => {
    it.each(['bottom-right', 'bottom-left', 'top-right', 'top-left'] as const)(
      'position=%s 는 허용되어야 한다',
      (pos) => {
        const el = makeScriptEl({ apiUrl: 'https://example.com', position: pos });
        expect(parseConfigFromScript(el)!.position).toBe(pos);
      },
    );

    it('유효하지 않은 position은 bottom-right로 폴백해야 한다', () => {
      const el = makeScriptEl({ apiUrl: 'https://example.com', position: 'center' });
      expect(parseConfigFromScript(el)!.position).toBe('bottom-right');
    });

    it('빈 position은 bottom-right로 폴백해야 한다', () => {
      const el = makeScriptEl({ apiUrl: 'https://example.com', position: '' });
      expect(parseConfigFromScript(el)!.position).toBe('bottom-right');
    });
  });

  // ── theme 검증 ────────────────────────────────────────────────────────────
  describe('theme 값 검증', () => {
    it.each(['auto', 'light', 'dark'] as const)(
      'theme=%s 는 허용되어야 한다',
      (theme) => {
        const el = makeScriptEl({ apiUrl: 'https://example.com', theme });
        expect(parseConfigFromScript(el)!.theme).toBe(theme);
      },
    );

    it('유효하지 않은 theme은 auto로 폴백해야 한다', () => {
      const el = makeScriptEl({ apiUrl: 'https://example.com', theme: 'rainbow' });
      expect(parseConfigFromScript(el)!.theme).toBe('auto');
    });
  });

  // ── buttonColor hex 검증 [C2/L1] ──────────────────────────────────────────
  describe('buttonColor hex 검증 [C2/L1 — CSS 인젝션 방어]', () => {
    it('유효한 6자리 소문자 hex는 허용해야 한다', () => {
      const el = makeScriptEl({ apiUrl: 'https://example.com', buttonColor: '#ff5733' });
      expect(parseConfigFromScript(el)!.buttonColor).toBe('#ff5733');
    });

    it('유효한 6자리 대문자 hex는 허용해야 한다', () => {
      const el = makeScriptEl({ apiUrl: 'https://example.com', buttonColor: '#FF5733' });
      expect(parseConfigFromScript(el)!.buttonColor).toBe('#FF5733');
    });

    it('3자리 hex는 거부하고 기본값으로 폴백해야 한다', () => {
      const el = makeScriptEl({ apiUrl: 'https://example.com', buttonColor: '#FFF' });
      expect(parseConfigFromScript(el)!.buttonColor).toBe('#4F46E5');
    });

    it('named color(red)는 거부하고 기본값으로 폴백해야 한다', () => {
      const el = makeScriptEl({ apiUrl: 'https://example.com', buttonColor: 'red' });
      expect(parseConfigFromScript(el)!.buttonColor).toBe('#4F46E5');
    });

    it('XSS 시도 문자열은 기본값으로 폴백해야 한다', () => {
      const el = makeScriptEl({ apiUrl: 'https://example.com', buttonColor: '"><script>alert(1)</script>' });
      expect(parseConfigFromScript(el)!.buttonColor).toBe('#4F46E5');
    });

    it('CSS 함수 표현식은 거부해야 한다', () => {
      const el = makeScriptEl({ apiUrl: 'https://example.com', buttonColor: 'rgb(255,0,0)' });
      expect(parseConfigFromScript(el)!.buttonColor).toBe('#4F46E5');
    });

    it('buttonColor 미설정 시 기본값 #4F46E5를 사용해야 한다', () => {
      const el = makeScriptEl({ apiUrl: 'https://example.com' });
      expect(parseConfigFromScript(el)!.buttonColor).toBe('#4F46E5');
    });
  });

  // ── buttonLabel 검증 ──────────────────────────────────────────────────────
  describe('buttonLabel 검증', () => {
    it('빈 레이블은 기본값 Feedback으로 폴백해야 한다', () => {
      const el = makeScriptEl({ apiUrl: 'https://example.com', buttonLabel: '' });
      expect(parseConfigFromScript(el)!.buttonLabel).toBe('Feedback');
    });

    it('공백만 있는 레이블은 기본값으로 폴백해야 한다', () => {
      const el = makeScriptEl({ apiUrl: 'https://example.com', buttonLabel: '   ' });
      expect(parseConfigFromScript(el)!.buttonLabel).toBe('Feedback');
    });

    it('50자 초과 레이블은 50자로 잘라야 한다', () => {
      const long = 'X'.repeat(60);
      const el = makeScriptEl({ apiUrl: 'https://example.com', buttonLabel: long });
      expect(parseConfigFromScript(el)!.buttonLabel).toHaveLength(50);
    });

    it('정확히 50자인 레이블은 그대로 허용해야 한다', () => {
      const exactly50 = 'A'.repeat(50);
      const el = makeScriptEl({ apiUrl: 'https://example.com', buttonLabel: exactly50 });
      expect(parseConfigFromScript(el)!.buttonLabel).toBe(exactly50);
    });

    it('HTML 특수문자는 textContent에서 이스케이프되므로 값 그대로 저장해야 한다', () => {
      // textContent 방식으로 렌더링되므로 storage는 raw 값, DOM 삽입 시 자동 이스케이프
      const el = makeScriptEl({ apiUrl: 'https://example.com', buttonLabel: '<b>Send</b>' });
      expect(parseConfigFromScript(el)!.buttonLabel).toBe('<b>Send</b>');
    });
  });

  // ── zIndex 변환 ───────────────────────────────────────────────────────────
  describe('zIndex 숫자 변환', () => {
    it('문자열 숫자를 number 타입으로 변환해야 한다', () => {
      const el = makeScriptEl({ apiUrl: 'https://example.com', zIndex: '5000' });
      const config = parseConfigFromScript(el)!;
      expect(typeof config.zIndex).toBe('number');
      expect(config.zIndex).toBe(5000);
    });

    it('NaN 변환 시 기본값 9999를 사용해야 한다', () => {
      const el = makeScriptEl({ apiUrl: 'https://example.com', zIndex: 'abc' });
      expect(parseConfigFromScript(el)!.zIndex).toBe(9999);
    });

    it('0은 falsy라 기본값 9999로 폴백해야 한다 (|| 연산자)', () => {
      // 설계: Number(zIndex) || 9999 — 0도 기본값으로 폴백됨
      const el = makeScriptEl({ apiUrl: 'https://example.com', zIndex: '0' });
      expect(parseConfigFromScript(el)!.zIndex).toBe(9999);
    });

    it('zIndex 미설정 시 기본값 9999를 사용해야 한다', () => {
      const el = makeScriptEl({ apiUrl: 'https://example.com' });
      expect(parseConfigFromScript(el)!.zIndex).toBe(9999);
    });
  });

  // ── [C1] 비동기 안전성 (scriptEl 주입 패턴) ──────────────────────────────
  describe('[C1] 비동기 안전성 — scriptEl 주입으로 document.currentScript 미사용', () => {
    it('Promise 내에서 호출해도 scriptEl이 유효해야 한다', async () => {
      const el = makeScriptEl({ apiUrl: 'https://example.com' });
      const config = await Promise.resolve().then(() => parseConfigFromScript(el));
      expect(config).not.toBeNull();
      expect(config!.apiUrl).toBe('https://example.com');
    });

    it('setTimeout 콜백에서 호출해도 scriptEl이 유효해야 한다', async () => {
      const el = makeScriptEl({ apiUrl: 'https://example.com' });
      const config = await new Promise<ReturnType<typeof parseConfigFromScript>>((resolve) => {
        setTimeout(() => resolve(parseConfigFromScript(el)), 0);
      });
      expect(config).not.toBeNull();
    });

    it('DOMContentLoaded 콜백 시뮬레이션: 미리 캡처된 el 주입 → 정상 동작', async () => {
      // C1: IIFE 최상단에서 캡처된 _scriptTag를 DOMContentLoaded 콜백에 주입
      const capturedEl = makeScriptEl({ apiUrl: 'https://example.com' });
      const result = await new Promise<ReturnType<typeof parseConfigFromScript>>((resolve) => {
        // DOMContentLoaded 시뮬레이션
        queueMicrotask(() => resolve(parseConfigFromScript(capturedEl)));
      });
      expect(result).not.toBeNull();
    });
  });

  // ── 반환값 불변성 ─────────────────────────────────────────────────────────
  describe('반환값 불변성', () => {
    it('같은 el로 2번 호출 시 독립된 객체를 반환해야 한다', () => {
      const el = makeScriptEl({ apiUrl: 'https://example.com' });
      const c1 = parseConfigFromScript(el);
      const c2 = parseConfigFromScript(el);
      expect(c1).not.toBe(c2);
      expect(c1).toEqual(c2);
    });
  });
});
