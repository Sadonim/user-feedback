/**
 * Unit: src/widget/api.ts — submitFeedback
 *
 * [TDD RED PHASE] src/widget/api.ts가 존재하지 않으므로 전체 실패 예상.
 *
 * 대상 함수:
 *   submitFeedback(apiUrl, type, formData): Promise<FeedbackSubmitResult>
 *
 * 설계 문서 참조: docs/handoffs/design_phase3_widget.md §7-1, §14, §16-2
 *
 * 전략:
 *   - fetch 를 vi.stubGlobal 로 mock — 실제 네트워크 호출 없음
 *   - DB mock 금지 원칙 적용 대상 아님 (위젯 클라이언트 단위 테스트)
 *   - 에러는 ApiError { message, statusCode } 형태로 throw되어야 함
 *   - email 빈 문자열 → payload 에서 완전 제거
 *   - title / description / nickname trim 검증
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { submitFeedback } from '@/widget/api';
import type { FormData } from '@/widget/state';

// ── fetch 모킹 헬퍼 ──────────────────────────────────────────────────────────
type MockResponseInit = {
  ok: boolean;
  status: number;
  jsonData: unknown;
};

function stubFetch({ ok, status, jsonData }: MockResponseInit) {
  return vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: vi.fn().mockResolvedValue(jsonData),
    }),
  );
}

function stubFetchNetworkError() {
  return vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
}

function stubFetchJsonParseError(status: number) {
  return vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
    }),
  );
}

// ── 공통 픽스처 ──────────────────────────────────────────────────────────────
const API_URL = 'https://feedback.example.com';

const VALID_FORM: FormData = {
  title: 'Widget button not showing',
  description: 'The feedback button does not appear on mobile browsers.',
  nickname: 'test-user',
  email: 'test@example.com',
};

const SUCCESS_RESPONSE = {
  success: true,
  data: { trackingId: 'FB-abc12345', status: 'OPEN' },
  error: null,
  meta: null,
};

// ─────────────────────────────────────────────────────────────────────────────
describe('submitFeedback (src/widget/api.ts)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  // ── 성공 케이스 ─────────────────────────────────────────────────────────
  describe('성공 케이스 (2xx)', () => {
    it('trackingId 와 status 를 반환해야 한다', async () => {
      stubFetch({ ok: true, status: 201, jsonData: SUCCESS_RESPONSE });

      const result = await submitFeedback(API_URL, 'BUG', VALID_FORM);
      expect(result.trackingId).toBe('FB-abc12345');
      expect(result.status).toBe('OPEN');
    });

    it('올바른 엔드포인트 POST /api/v1/feedback 으로 요청해야 한다', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: vi.fn().mockResolvedValue(SUCCESS_RESPONSE),
      });
      vi.stubGlobal('fetch', fetchMock);

      await submitFeedback(API_URL, 'BUG', VALID_FORM);

      expect(fetchMock).toHaveBeenCalledWith(
        `${API_URL}/api/v1/feedback`,
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('Content-Type: application/json 헤더를 전송해야 한다', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true, status: 201, json: vi.fn().mockResolvedValue(SUCCESS_RESPONSE),
      });
      vi.stubGlobal('fetch', fetchMock);

      await submitFeedback(API_URL, 'BUG', VALID_FORM);

      const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect((opts.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });

    it('body 가 JSON 직렬화된 문자열이어야 한다', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true, status: 201, json: vi.fn().mockResolvedValue(SUCCESS_RESPONSE),
      });
      vi.stubGlobal('fetch', fetchMock);

      await submitFeedback(API_URL, 'BUG', VALID_FORM);

      const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(() => JSON.parse(opts.body as string)).not.toThrow();
    });
  });

  // ── payload 구조 검증 ────────────────────────────────────────────────────
  describe('payload 구조 검증', () => {
    async function capturePayload(form: FormData, type: Parameters<typeof submitFeedback>[1] = 'BUG') {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true, status: 201, json: vi.fn().mockResolvedValue(SUCCESS_RESPONSE),
      });
      vi.stubGlobal('fetch', fetchMock);
      await submitFeedback(API_URL, type, form);
      const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
      return JSON.parse(opts.body as string) as Record<string, unknown>;
    }

    it('payload 에 type=BUG 가 포함되어야 한다', async () => {
      const body = await capturePayload(VALID_FORM, 'BUG');
      expect(body.type).toBe('BUG');
    });

    it('payload 에 type=FEATURE 가 포함되어야 한다', async () => {
      const body = await capturePayload(VALID_FORM, 'FEATURE');
      expect(body.type).toBe('FEATURE');
    });

    it('payload 에 type=GENERAL 이 포함되어야 한다', async () => {
      const body = await capturePayload(VALID_FORM, 'GENERAL');
      expect(body.type).toBe('GENERAL');
    });

    it('payload 에 title, description, nickname 이 포함되어야 한다', async () => {
      const body = await capturePayload(VALID_FORM);
      expect(body.title).toBe('Widget button not showing');
      expect(body.description).toBe('The feedback button does not appear on mobile browsers.');
      expect(body.nickname).toBe('test-user');
    });

    it('title 앞뒤 공백을 trim 해야 한다', async () => {
      const body = await capturePayload({ ...VALID_FORM, title: '  spaced title  ' });
      expect(body.title).toBe('spaced title');
    });

    it('description 앞뒤 공백을 trim 해야 한다', async () => {
      const body = await capturePayload({ ...VALID_FORM, description: '  spaced desc  ' });
      expect(body.description).toBe('spaced desc');
    });

    it('nickname 앞뒤 공백을 trim 해야 한다', async () => {
      const body = await capturePayload({ ...VALID_FORM, nickname: '  alice  ' });
      expect(body.nickname).toBe('alice');
    });
  });

  // ── email 필드 조건부 포함 ───────────────────────────────────────────────
  describe('email 필드 조건부 처리', () => {
    async function capturePayload(form: FormData) {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true, status: 201, json: vi.fn().mockResolvedValue(SUCCESS_RESPONSE),
      });
      vi.stubGlobal('fetch', fetchMock);
      await submitFeedback(API_URL, 'BUG', form);
      const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
      return JSON.parse(opts.body as string) as Record<string, unknown>;
    }

    it('email 이 있으면 payload 에 포함해야 한다', async () => {
      const body = await capturePayload(VALID_FORM);
      expect(body.email).toBe('test@example.com');
    });

    it('email 이 빈 문자열이면 payload 에서 제외해야 한다', async () => {
      const body = await capturePayload({ ...VALID_FORM, email: '' });
      expect(body).not.toHaveProperty('email');
    });

    it('email 이 공백만 있으면 payload 에서 제외해야 한다', async () => {
      const body = await capturePayload({ ...VALID_FORM, email: '   ' });
      expect(body).not.toHaveProperty('email');
    });

    it('email trim 후 비어있으면 payload 에서 제외해야 한다', async () => {
      const body = await capturePayload({ ...VALID_FORM, email: '\t\n' });
      expect(body).not.toHaveProperty('email');
    });
  });

  // ── HTTP 에러 처리 ───────────────────────────────────────────────────────
  describe('HTTP 에러 처리 (4xx / 5xx)', () => {
    it('400 응답: json.error 메시지로 ApiError throw 해야 한다', async () => {
      stubFetch({
        ok: false,
        status: 400,
        jsonData: { success: false, data: null, error: 'Title is required', meta: null },
      });

      await expect(submitFeedback(API_URL, 'BUG', VALID_FORM)).rejects.toMatchObject({
        message: 'Title is required',
        statusCode: 400,
      });
    });

    it('400 응답: statusCode=400 이어야 한다', async () => {
      stubFetch({
        ok: false,
        status: 400,
        jsonData: { success: false, data: null, error: 'bad request', meta: null },
      });

      await expect(submitFeedback(API_URL, 'BUG', VALID_FORM)).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('429 응답: rate limit 에러로 throw 해야 한다', async () => {
      stubFetch({
        ok: false,
        status: 429,
        jsonData: { success: false, data: null, error: 'Too many requests. Please try again later.', meta: null },
      });

      await expect(submitFeedback(API_URL, 'BUG', VALID_FORM)).rejects.toMatchObject({
        statusCode: 429,
      });
    });

    it('500 응답: statusCode=500 으로 throw 해야 한다', async () => {
      stubFetch({
        ok: false,
        status: 500,
        jsonData: { success: false, data: null, error: 'Internal server error', meta: null },
      });

      await expect(submitFeedback(API_URL, 'BUG', VALID_FORM)).rejects.toMatchObject({
        statusCode: 500,
      });
    });

    it('ok=true 이지만 success=false 이면 에러로 처리해야 한다', async () => {
      stubFetch({
        ok: true,
        status: 200,
        jsonData: { success: false, data: null, error: 'Validation failed', meta: null },
      });

      await expect(submitFeedback(API_URL, 'BUG', VALID_FORM)).rejects.toMatchObject({
        message: 'Validation failed',
      });
    });

    it('json.error 없으면 HTTP 상태 코드로 폴백 메시지를 만들어야 한다', async () => {
      stubFetch({
        ok: false,
        status: 503,
        jsonData: { success: false, data: null, error: null, meta: null },
      });

      await expect(submitFeedback(API_URL, 'BUG', VALID_FORM)).rejects.toMatchObject({
        statusCode: 503,
      });
    });

    it('json 파싱 실패 시에도 statusCode 를 포함해 throw 해야 한다', async () => {
      stubFetchJsonParseError(503);

      await expect(submitFeedback(API_URL, 'BUG', VALID_FORM)).rejects.toMatchObject({
        statusCode: 503,
      });
    });
  });

  // ── 네트워크 에러 처리 ───────────────────────────────────────────────────
  describe('네트워크 에러 처리 (fetch 자체 실패)', () => {
    it('fetch 실패 시 statusCode=0 으로 throw 해야 한다', async () => {
      stubFetchNetworkError();

      await expect(submitFeedback(API_URL, 'BUG', VALID_FORM)).rejects.toMatchObject({
        statusCode: 0,
      });
    });

    it('fetch 실패 시 사용자 친화적 메시지가 포함되어야 한다', async () => {
      stubFetchNetworkError();

      await expect(submitFeedback(API_URL, 'BUG', VALID_FORM)).rejects.toMatchObject({
        message: expect.stringMatching(/network error/i),
      });
    });

    it('throw 된 ApiError 에 stack trace 가 포함되지 않아야 한다 (보안)', async () => {
      stubFetchNetworkError();

      try {
        await submitFeedback(API_URL, 'BUG', VALID_FORM);
        expect.fail('should have thrown');
      } catch (err: unknown) {
        // ApiError 는 plain object 이어야 함 — Error 인스턴스가 아님
        expect((err as Record<string, unknown>).stack).toBeUndefined();
      }
    });
  });

  // ── ApiError 타입 구조 ───────────────────────────────────────────────────
  describe('throw 되는 ApiError 구조', () => {
    it('message 와 statusCode 프로퍼티를 포함해야 한다', async () => {
      stubFetch({
        ok: false,
        status: 400,
        jsonData: { success: false, data: null, error: 'bad', meta: null },
      });

      try {
        await submitFeedback(API_URL, 'BUG', VALID_FORM);
        expect.fail('should have thrown');
      } catch (err: unknown) {
        expect(err).toHaveProperty('message');
        expect(err).toHaveProperty('statusCode');
      }
    });

    it('네트워크 에러도 message 와 statusCode 를 포함해야 한다', async () => {
      stubFetchNetworkError();

      try {
        await submitFeedback(API_URL, 'BUG', VALID_FORM);
        expect.fail('should have thrown');
      } catch (err: unknown) {
        expect(err).toHaveProperty('message');
        expect(err).toHaveProperty('statusCode');
      }
    });
  });
});
