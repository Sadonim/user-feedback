export type FeedbackType = 'BUG' | 'FEATURE' | 'GENERAL';

export type WidgetStep =
  | 'type'        // Step 1: 피드백 타입 선택
  | 'form'        // Step 2: 내용 입력 (에러도 이 step에서 errorMessage로 표시)
  | 'submitting'  // API 호출 중
  | 'success';    // 제출 성공

export interface FormData {
  readonly title: string;
  readonly description: string;
  readonly nickname: string;
  readonly email: string;
}

export interface WidgetState {
  readonly isOpen: boolean;
  readonly step: WidgetStep;
  readonly selectedType: FeedbackType | null;
  readonly formData: FormData;
  readonly trackingId: string | null;
  readonly errorMessage: string | null;
}

export const INITIAL_STATE: WidgetState = {
  isOpen: false,
  step: 'type',
  selectedType: null,
  formData: { title: '', description: '', nickname: '', email: '' },
  trackingId: null,
  errorMessage: null,
};

/** 순수 상태 전이 함수 (불변성 보장 — 항상 새 객체 반환) */
export const transitions = {
  open: (s: WidgetState): WidgetState =>
    ({ ...s, isOpen: true, step: 'type' }),

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  close: (_s: WidgetState): WidgetState =>
    ({ ...INITIAL_STATE }), // 닫힐 때 폼 완전 초기화

  selectType: (s: WidgetState, type: FeedbackType): WidgetState =>
    ({ ...s, selectedType: type, step: 'form' }),

  backToType: (s: WidgetState): WidgetState =>
    ({ ...s, step: 'type', selectedType: null, errorMessage: null }),

  updateForm: (s: WidgetState, patch: Partial<FormData>): WidgetState =>
    ({ ...s, formData: { ...s.formData, ...patch } }),

  submit: (s: WidgetState): WidgetState =>
    ({ ...s, step: 'submitting', errorMessage: null }),

  submitSuccess: (s: WidgetState, trackingId: string): WidgetState =>
    ({ ...s, step: 'success', trackingId }),

  // 에러는 step='form'으로 되돌아가 errorMessage 배너로 표시
  submitError: (s: WidgetState, errorMessage: string): WidgetState =>
    ({ ...s, step: 'form', errorMessage }),
};
