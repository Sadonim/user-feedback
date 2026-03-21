import type { WidgetState, FormData as WidgetFormData } from '../../state';
import { createCloseBtn } from '../popup';

interface FormField {
  readonly id: string;
  readonly field: keyof WidgetFormData;
  readonly label: string;
  readonly type: 'input' | 'textarea';
  readonly inputType?: string;
  readonly required: boolean;
  readonly placeholder: string;
  readonly maxLength: number;
}

const CONTENT_PLACEHOLDER: Record<string, string> = {
  BUG:     '겪고 계신 증상을 설명해주세요',
  FEATURE: '어떤 기능이 있으면 좋을지 알려주세요',
  GENERAL: '궁금한 점을 편하게 남겨주세요',
};

const SUBMIT_BTN_IDLE = '피드백 제출';
const SUBMIT_BTN_LOADING = '제출 중…';

/* WGT-03: text-only labels for the type badge */
const TYPE_TEXT: Record<string, string> = {
  BUG: '버그 신고',
  FEATURE: '기능 제안',
  GENERAL: '일반 문의',
};

export function renderForm(
  state: WidgetState,
  onBack: () => void,
  onFieldChange: (field: keyof WidgetFormData, value: string) => void,
  onSubmit: () => void,
  onClose: () => void
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'wfb-form';

  // 헤더: [← 돌아가기] [버그 신고] [×] — 한 줄
  const header = document.createElement('div');
  header.className = 'wfb-step-header';

  const backBtn = document.createElement('button');
  backBtn.className = 'wfb-back-btn';
  backBtn.setAttribute('data-wfb-back', '');
  backBtn.setAttribute('aria-label', '유형 선택으로 돌아가기');
  const arrowSpan = document.createElement('span');
  arrowSpan.setAttribute('aria-hidden', 'true');
  arrowSpan.textContent = '← 돌아가기';
  backBtn.appendChild(arrowSpan);
  backBtn.addEventListener('click', onBack);

  const selectedType = state.selectedType ?? '';
  const typeBadge = document.createElement('span');
  typeBadge.className = 'wfb-form-type-badge';
  typeBadge.textContent = TYPE_TEXT[selectedType] ?? selectedType;

  header.append(backBtn, typeBadge, createCloseBtn(onClose));
  container.appendChild(header);

  // 필드 영역 (패딩 분리)
  const fields = document.createElement('div');
  fields.className = 'wfb-form-fields';

  // 에러 배너
  const errorBanner = document.createElement('div');
  errorBanner.className = 'wfb-error-banner';
  errorBanner.setAttribute('role', 'alert');
  errorBanner.setAttribute('data-wfb-error', '');
  errorBanner.style.display = state.errorMessage ? 'block' : 'none';
  errorBanner.textContent = state.errorMessage ?? '';
  fields.appendChild(errorBanner);

  // 닉네임 input
  const nicknameInput = document.createElement('input');
  nicknameInput.className = 'wfb-input';
  nicknameInput.id = 'wfb-nickname';
  nicknameInput.type = 'text';
  nicknameInput.placeholder = '닉네임';
  nicknameInput.maxLength = 100;
  nicknameInput.required = true;
  nicknameInput.setAttribute('data-field', 'nickname');
  nicknameInput.setAttribute('aria-label', '닉네임');
  nicknameInput.value = state.formData.nickname;
  nicknameInput.addEventListener('input', () => onFieldChange('nickname', nicknameInput.value));
  fields.appendChild(nicknameInput);

  // 내용 textarea
  const contentPlaceholder = CONTENT_PLACEHOLDER[selectedType] ?? '내용을 입력해주세요';
  const contentArea = document.createElement('textarea');
  contentArea.className = 'wfb-textarea';
  contentArea.id = 'wfb-content';
  contentArea.placeholder = contentPlaceholder;
  contentArea.maxLength = 5000;
  contentArea.required = true;
  contentArea.setAttribute('data-field', 'content');
  contentArea.setAttribute('aria-label', contentPlaceholder);
  contentArea.value = state.formData.content;
  contentArea.addEventListener('input', () => onFieldChange('content', contentArea.value));
  fields.appendChild(contentArea);

  // 제출 버튼
  const submitBtn = document.createElement('button');
  submitBtn.className = 'wfb-submit-btn';
  submitBtn.setAttribute('data-wfb-submit', '');
  submitBtn.setAttribute('aria-busy', state.step === 'submitting' ? 'true' : 'false');
  submitBtn.disabled = state.step === 'submitting';
  submitBtn.textContent = state.step === 'submitting' ? SUBMIT_BTN_LOADING : SUBMIT_BTN_IDLE;
  submitBtn.addEventListener('click', onSubmit);
  fields.appendChild(submitBtn);

  container.appendChild(fields);

  return container;
}

/**
 * [M3] step=form 내 상태 변경(submitting, errorMessage)을 DOM 재빌드 없이 속성만 업데이트.
 * 포커스 손실 없이 UI 상태를 반영한다.
 */
export function updateFormState(
  container: HTMLElement,
  state: WidgetState
): void {
  // 에러 배너 토글
  const banner = container.querySelector<HTMLElement>('[data-wfb-error]');
  if (banner) {
    banner.textContent = state.errorMessage ?? '';
    banner.style.display = state.errorMessage ? 'block' : 'none';
  }

  // 제출 버튼 상태
  const submitBtn = container.querySelector<HTMLButtonElement>('[data-wfb-submit]');
  if (submitBtn) {
    submitBtn.disabled = state.step === 'submitting';
    submitBtn.textContent = state.step === 'submitting' ? SUBMIT_BTN_LOADING : SUBMIT_BTN_IDLE;
    submitBtn.setAttribute('aria-busy', state.step === 'submitting' ? 'true' : 'false');
  }
}
