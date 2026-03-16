/**
 * Unit: src/widget/state.ts — 상태 전이 순수 함수
 *
 * [TDD RED PHASE] src/widget/state.ts가 존재하지 않으므로 전체 실패 예상.
 *
 * 대상:
 *   - INITIAL_STATE
 *   - transitions.{ open, close, selectType, backToType, updateForm,
 *                   submit, submitSuccess, submitError }
 *
 * 설계 문서 참조: docs/handoffs/design_phase3_widget.md §6-1, §16-2
 *
 * 전략:
 *   - 순수 함수 → DOM·fetch 불필요, node 환경 실행
 *   - 모든 transition은 새 객체를 반환해야 함 (불변성 필수 검증)
 *   - 스텝 전이 경로: type → form → submitting → success | form(error)
 */
import { describe, it, expect } from 'vitest';
import { INITIAL_STATE, transitions } from '@/widget/state';
import type { WidgetState } from '@/widget/state';

// ─────────────────────────────────────────────────────────────────────────────
describe('INITIAL_STATE (src/widget/state.ts)', () => {
  it('isOpen 이 false 여야 한다', () => {
    expect(INITIAL_STATE.isOpen).toBe(false);
  });

  it('step 이 type 이어야 한다', () => {
    expect(INITIAL_STATE.step).toBe('type');
  });

  it('selectedType 이 null 이어야 한다', () => {
    expect(INITIAL_STATE.selectedType).toBeNull();
  });

  it('formData 가 빈 문자열로 초기화되어야 한다', () => {
    expect(INITIAL_STATE.formData).toEqual({
      title: '',
      description: '',
      nickname: '',
      email: '',
    });
  });

  it('trackingId 가 null 이어야 한다', () => {
    expect(INITIAL_STATE.trackingId).toBeNull();
  });

  it('errorMessage 가 null 이어야 한다', () => {
    expect(INITIAL_STATE.errorMessage).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('transitions (src/widget/state.ts)', () => {
  // ── open() ──────────────────────────────────────────────────────────────
  describe('transitions.open()', () => {
    it('isOpen 을 true 로 설정해야 한다', () => {
      expect(transitions.open(INITIAL_STATE).isOpen).toBe(true);
    });

    it('step 을 type 으로 설정해야 한다', () => {
      expect(transitions.open(INITIAL_STATE).step).toBe('type');
    });

    it('새 객체를 반환해야 한다 (불변성)', () => {
      expect(transitions.open(INITIAL_STATE)).not.toBe(INITIAL_STATE);
    });

    it('원본 INITIAL_STATE 를 변경하지 않아야 한다', () => {
      transitions.open(INITIAL_STATE);
      expect(INITIAL_STATE.isOpen).toBe(false);
    });
  });

  // ── close() ─────────────────────────────────────────────────────────────
  describe('transitions.close()', () => {
    it('isOpen 을 false 로 설정해야 한다', () => {
      const opened = transitions.open(INITIAL_STATE);
      expect(transitions.close(opened).isOpen).toBe(false);
    });

    it('INITIAL_STATE 와 동일한 값으로 완전 초기화해야 한다', () => {
      const opened = transitions.open(INITIAL_STATE);
      expect(transitions.close(opened)).toEqual(INITIAL_STATE);
    });

    it('폼 데이터가 초기화되어야 한다', () => {
      const dirty: WidgetState = {
        ...INITIAL_STATE,
        isOpen: true,
        formData: { title: 'crash', description: 'desc', nickname: 'bob', email: 'b@c.com' },
      };
      expect(transitions.close(dirty).formData).toEqual(INITIAL_STATE.formData);
    });

    it('errorMessage 가 null 로 초기화되어야 한다', () => {
      const withError: WidgetState = { ...INITIAL_STATE, errorMessage: '제출 실패' };
      expect(transitions.close(withError).errorMessage).toBeNull();
    });

    it('trackingId 가 null 로 초기화되어야 한다', () => {
      const withId: WidgetState = { ...INITIAL_STATE, trackingId: 'FB-abc12345' };
      expect(transitions.close(withId).trackingId).toBeNull();
    });

    it('새 객체를 반환해야 한다 (불변성)', () => {
      const opened = transitions.open(INITIAL_STATE);
      expect(transitions.close(opened)).not.toBe(opened);
    });

    it('원본 상태를 변경하지 않아야 한다', () => {
      const opened: WidgetState = { ...INITIAL_STATE, isOpen: true };
      transitions.close(opened);
      expect(opened.isOpen).toBe(true);
    });
  });

  // ── selectType() ────────────────────────────────────────────────────────
  describe('transitions.selectType()', () => {
    const opened = transitions.open(INITIAL_STATE);

    it('selectedType 을 BUG 로 설정해야 한다', () => {
      expect(transitions.selectType(opened, 'BUG').selectedType).toBe('BUG');
    });

    it('selectedType 을 FEATURE 로 설정해야 한다', () => {
      expect(transitions.selectType(opened, 'FEATURE').selectedType).toBe('FEATURE');
    });

    it('selectedType 을 GENERAL 로 설정해야 한다', () => {
      expect(transitions.selectType(opened, 'GENERAL').selectedType).toBe('GENERAL');
    });

    it('step 을 form 으로 전환해야 한다', () => {
      expect(transitions.selectType(opened, 'BUG').step).toBe('form');
    });

    it('isOpen 값이 유지되어야 한다', () => {
      expect(transitions.selectType(opened, 'BUG').isOpen).toBe(opened.isOpen);
    });

    it('formData 가 유지되어야 한다', () => {
      expect(transitions.selectType(opened, 'BUG').formData).toEqual(opened.formData);
    });

    it('새 객체를 반환해야 한다 (불변성)', () => {
      expect(transitions.selectType(opened, 'BUG')).not.toBe(opened);
    });
  });

  // ── backToType() ────────────────────────────────────────────────────────
  describe('transitions.backToType()', () => {
    const inForm: WidgetState = {
      ...INITIAL_STATE,
      isOpen: true,
      step: 'form',
      selectedType: 'BUG',
      errorMessage: '이전 오류',
    };

    it('step 을 type 으로 되돌려야 한다', () => {
      expect(transitions.backToType(inForm).step).toBe('type');
    });

    it('selectedType 을 null 로 초기화해야 한다', () => {
      expect(transitions.backToType(inForm).selectedType).toBeNull();
    });

    it('errorMessage 를 null 로 초기화해야 한다', () => {
      expect(transitions.backToType(inForm).errorMessage).toBeNull();
    });

    it('isOpen 이 유지되어야 한다', () => {
      expect(transitions.backToType(inForm).isOpen).toBe(true);
    });

    it('새 객체를 반환해야 한다 (불변성)', () => {
      expect(transitions.backToType(inForm)).not.toBe(inForm);
    });
  });

  // ── updateForm() ────────────────────────────────────────────────────────
  describe('transitions.updateForm()', () => {
    it('title 만 업데이트해야 한다', () => {
      const next = transitions.updateForm(INITIAL_STATE, { title: 'New title' });
      expect(next.formData.title).toBe('New title');
      expect(next.formData.description).toBe('');
      expect(next.formData.nickname).toBe('');
    });

    it('여러 필드를 동시에 업데이트해야 한다', () => {
      const next = transitions.updateForm(INITIAL_STATE, { title: 'T', nickname: 'Alice' });
      expect(next.formData.title).toBe('T');
      expect(next.formData.nickname).toBe('Alice');
      expect(next.formData.description).toBe('');
    });

    it('email 필드도 업데이트해야 한다', () => {
      const next = transitions.updateForm(INITIAL_STATE, { email: 'a@b.com' });
      expect(next.formData.email).toBe('a@b.com');
    });

    it('원본 formData 를 변경하지 않아야 한다', () => {
      const originalRef = INITIAL_STATE.formData;
      transitions.updateForm(INITIAL_STATE, { title: 'changed' });
      expect(INITIAL_STATE.formData).toBe(originalRef);
      expect(INITIAL_STATE.formData.title).toBe('');
    });

    it('새 formData 객체를 반환해야 한다', () => {
      const next = transitions.updateForm(INITIAL_STATE, { title: 'x' });
      expect(next.formData).not.toBe(INITIAL_STATE.formData);
    });

    it('새 state 객체를 반환해야 한다', () => {
      const next = transitions.updateForm(INITIAL_STATE, { title: 'x' });
      expect(next).not.toBe(INITIAL_STATE);
    });

    it('step 등 나머지 상태는 유지해야 한다', () => {
      const inForm: WidgetState = { ...INITIAL_STATE, step: 'form', selectedType: 'BUG' };
      const next = transitions.updateForm(inForm, { title: 'x' });
      expect(next.step).toBe('form');
      expect(next.selectedType).toBe('BUG');
    });
  });

  // ── submit() ────────────────────────────────────────────────────────────
  describe('transitions.submit()', () => {
    const inForm: WidgetState = {
      ...INITIAL_STATE,
      isOpen: true,
      step: 'form',
      selectedType: 'BUG',
      errorMessage: '이전 오류',
    };

    it('step 을 submitting 으로 변경해야 한다', () => {
      expect(transitions.submit(inForm).step).toBe('submitting');
    });

    it('errorMessage 를 null 로 초기화해야 한다 (재시도 시 이전 오류 제거)', () => {
      expect(transitions.submit(inForm).errorMessage).toBeNull();
    });

    it('selectedType 을 유지해야 한다', () => {
      expect(transitions.submit(inForm).selectedType).toBe('BUG');
    });

    it('formData 를 유지해야 한다', () => {
      expect(transitions.submit(inForm).formData).toEqual(inForm.formData);
    });

    it('새 객체를 반환해야 한다 (불변성)', () => {
      expect(transitions.submit(inForm)).not.toBe(inForm);
    });
  });

  // ── submitSuccess() ─────────────────────────────────────────────────────
  describe('transitions.submitSuccess()', () => {
    const submitting: WidgetState = {
      ...INITIAL_STATE,
      isOpen: true,
      step: 'submitting',
      selectedType: 'BUG',
    };

    it('step 을 success 로 변경해야 한다', () => {
      expect(transitions.submitSuccess(submitting, 'FB-abc12345').step).toBe('success');
    });

    it('trackingId 를 설정해야 한다', () => {
      expect(transitions.submitSuccess(submitting, 'FB-abc12345').trackingId).toBe('FB-abc12345');
    });

    it('step 이 form 이 아니어야 한다 (success 여야 함)', () => {
      expect(transitions.submitSuccess(submitting, 'FB-x').step).not.toBe('form');
    });

    it('errorMessage 가 null 이어야 한다', () => {
      expect(transitions.submitSuccess(submitting, 'FB-x').errorMessage).toBeNull();
    });

    it('새 객체를 반환해야 한다 (불변성)', () => {
      expect(transitions.submitSuccess(submitting, 'FB-x')).not.toBe(submitting);
    });
  });

  // ── submitError() ───────────────────────────────────────────────────────
  describe('transitions.submitError()', () => {
    const submitting: WidgetState = {
      ...INITIAL_STATE,
      isOpen: true,
      step: 'submitting',
      selectedType: 'FEATURE',
    };

    it('step 을 form 으로 되돌려야 한다 (success 아님)', () => {
      expect(transitions.submitError(submitting, '오류').step).toBe('form');
    });

    it('step 이 success 가 아니어야 한다', () => {
      expect(transitions.submitError(submitting, '오류').step).not.toBe('success');
    });

    it('errorMessage 를 설정해야 한다', () => {
      expect(transitions.submitError(submitting, '네트워크 오류').errorMessage).toBe('네트워크 오류');
    });

    it('trackingId 는 null 이어야 한다 (성공하지 않았으므로)', () => {
      expect(transitions.submitError(submitting, '오류').trackingId).toBeNull();
    });

    it('selectedType 을 유지해야 한다 (다시 제출할 수 있어야 함)', () => {
      expect(transitions.submitError(submitting, '오류').selectedType).toBe('FEATURE');
    });

    it('새 객체를 반환해야 한다 (불변성)', () => {
      expect(transitions.submitError(submitting, '오류')).not.toBe(submitting);
    });
  });

  // ── 전체 플로우 시나리오 ─────────────────────────────────────────────────
  describe('전체 플로우 시나리오', () => {
    it('정상 제출: IDLE → open → selectType → updateForm → submit → success', () => {
      let s: WidgetState = INITIAL_STATE;

      s = transitions.open(s);
      expect(s.isOpen).toBe(true);
      expect(s.step).toBe('type');

      s = transitions.selectType(s, 'BUG');
      expect(s.selectedType).toBe('BUG');
      expect(s.step).toBe('form');

      s = transitions.updateForm(s, {
        title: 'Button crash',
        description: 'Clicking submit causes an exception.',
        nickname: 'alice',
      });
      expect(s.formData.title).toBe('Button crash');

      s = transitions.submit(s);
      expect(s.step).toBe('submitting');
      expect(s.errorMessage).toBeNull();

      s = transitions.submitSuccess(s, 'FB-abcd1234');
      expect(s.step).toBe('success');
      expect(s.trackingId).toBe('FB-abcd1234');
    });

    it('에러 후 재시도: submitting → error → submit → success', () => {
      let s: WidgetState = {
        ...INITIAL_STATE,
        isOpen: true,
        step: 'form',
        selectedType: 'FEATURE',
        formData: {
          title: 'Dark mode',
          description: 'Please add dark mode support for the dashboard.',
          nickname: 'carol',
          email: '',
        },
      };

      s = transitions.submit(s);
      expect(s.step).toBe('submitting');

      s = transitions.submitError(s, 'Network error. Check your connection.');
      expect(s.step).toBe('form');
      expect(s.errorMessage).toBe('Network error. Check your connection.');

      // 재시도: errorMessage 사라져야 함
      s = transitions.submit(s);
      expect(s.errorMessage).toBeNull();
      expect(s.step).toBe('submitting');

      s = transitions.submitSuccess(s, 'FB-efgh5678');
      expect(s.step).toBe('success');
      expect(s.trackingId).toBe('FB-efgh5678');
    });

    it('닫기 후 재열기: 모든 상태가 초기화되어야 한다', () => {
      let s: WidgetState = INITIAL_STATE;

      s = transitions.open(s);
      s = transitions.selectType(s, 'BUG');
      s = transitions.updateForm(s, { title: 'test', nickname: 'bob' });

      s = transitions.close(s);
      expect(s).toEqual(INITIAL_STATE);

      // 다시 열면 이전 데이터 없어야 함
      s = transitions.open(s);
      expect(s.formData.title).toBe('');
      expect(s.selectedType).toBeNull();
      expect(s.step).toBe('type');
    });

    it('뒤로 가기 후 다른 타입 선택: 이전 타입 교체되어야 한다', () => {
      let s: WidgetState = transitions.open(INITIAL_STATE);

      s = transitions.selectType(s, 'BUG');
      expect(s.selectedType).toBe('BUG');

      s = transitions.backToType(s);
      expect(s.selectedType).toBeNull();

      s = transitions.selectType(s, 'FEATURE');
      expect(s.selectedType).toBe('FEATURE');
      expect(s.step).toBe('form');
    });
  });
});
