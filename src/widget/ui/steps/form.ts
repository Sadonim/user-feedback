import type { WidgetState, FormData as WidgetFormData } from '../../state';

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

const FORM_FIELDS: readonly FormField[] = [
  {
    id: 'wfb-title',
    field: 'title',
    label: 'Title',
    type: 'input',
    required: true,
    placeholder: 'Brief summary',
    maxLength: 200,
  },
  {
    id: 'wfb-description',
    field: 'description',
    label: 'Description',
    type: 'textarea',
    required: true,
    placeholder: 'Describe in detail (at least 10 characters)',
    maxLength: 5000,
  },
  {
    id: 'wfb-nickname',
    field: 'nickname',
    label: 'Nickname',
    type: 'input',
    required: true,
    placeholder: 'Your name',
    maxLength: 100,
  },
  {
    id: 'wfb-email',
    field: 'email',
    label: 'Email',
    type: 'input',
    inputType: 'email',
    required: false,
    placeholder: 'Optional — for follow-up',
    maxLength: 255,
  },
] as const;

const SUBMIT_BTN_IDLE = 'Submit Feedback';
const SUBMIT_BTN_LOADING = 'Submitting…';

/* WGT-03: text-only labels for the type badge (emoji rendered separately) */
const TYPE_TEXT: Record<string, string> = {
  BUG: 'Bug Report',
  FEATURE: 'Feature Request',
  GENERAL: 'General',
};

const TYPE_EMOJI: Record<string, string> = {
  BUG: '🐛',
  FEATURE: '✨',
  GENERAL: '💬',
};

export function renderForm(
  state: WidgetState,
  onBack: () => void,
  onFieldChange: (field: keyof WidgetFormData, value: string) => void,
  onSubmit: () => void
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'wfb-form';

  // 헤더: 뒤로가기 + 타입 배지
  const header = document.createElement('div');
  header.className = 'wfb-form-header';

  /* WGT-01: accessible back button — aria-label replaces raw arrow announcement */
  const backBtn = document.createElement('button');
  backBtn.className = 'wfb-back-btn';
  backBtn.setAttribute('data-wfb-back', '');
  backBtn.setAttribute('aria-label', 'Go back to type selection');
  // Visible arrow text is decorative
  const arrowSpan = document.createElement('span');
  arrowSpan.setAttribute('aria-hidden', 'true');
  arrowSpan.textContent = '← Back';
  backBtn.appendChild(arrowSpan);
  backBtn.addEventListener('click', onBack);

  /* WGT-03: type badge — emoji in aria-hidden span, text in separate span */
  const typeBadge = document.createElement('span');
  typeBadge.className = 'wfb-form-type-badge';
  const selectedType = state.selectedType ?? '';
  if (selectedType) {
    const emojiSpan = document.createElement('span');
    emojiSpan.setAttribute('aria-hidden', 'true');
    emojiSpan.textContent = (TYPE_EMOJI[selectedType] ?? '') + ' ';
    const textSpan = document.createElement('span');
    textSpan.textContent = TYPE_TEXT[selectedType] ?? selectedType;
    typeBadge.appendChild(emojiSpan);
    typeBadge.appendChild(textSpan);
  }

  header.append(backBtn, typeBadge);
  container.appendChild(header);

  // 에러 배너
  const errorBanner = document.createElement('div');
  errorBanner.className = 'wfb-error-banner';
  errorBanner.setAttribute('role', 'alert');
  errorBanner.setAttribute('data-wfb-error', '');
  errorBanner.style.display = state.errorMessage ? 'block' : 'none';
  errorBanner.textContent = state.errorMessage ?? '';
  container.appendChild(errorBanner);

  // 폼 필드
  FORM_FIELDS.forEach((fieldDef) => {
    const fieldWrapper = document.createElement('div');
    fieldWrapper.className = 'wfb-field';

    const label = document.createElement('label');
    label.className = 'wfb-label';
    label.setAttribute('for', fieldDef.id);
    label.textContent = fieldDef.label;

    if (fieldDef.required) {
      const req = document.createElement('span');
      req.className = 'wfb-required';
      req.setAttribute('aria-hidden', 'true');
      req.textContent = ' *';
      label.appendChild(req);
    }

    let inputEl: HTMLInputElement | HTMLTextAreaElement;

    if (fieldDef.type === 'textarea') {
      const ta = document.createElement('textarea');
      ta.className = 'wfb-textarea';
      ta.id = fieldDef.id;
      ta.placeholder = fieldDef.placeholder;
      ta.maxLength = fieldDef.maxLength;
      ta.required = fieldDef.required;
      ta.setAttribute('data-field', fieldDef.field);
      ta.value = state.formData[fieldDef.field];
      ta.addEventListener('input', () => onFieldChange(fieldDef.field, ta.value));
      inputEl = ta;
    } else {
      const inp = document.createElement('input');
      inp.className = 'wfb-input';
      inp.id = fieldDef.id;
      inp.type = fieldDef.inputType ?? 'text';
      inp.placeholder = fieldDef.placeholder;
      inp.maxLength = fieldDef.maxLength;
      inp.required = fieldDef.required;
      inp.setAttribute('data-field', fieldDef.field);
      inp.value = state.formData[fieldDef.field];
      inp.addEventListener('input', () => onFieldChange(fieldDef.field, inp.value));
      inputEl = inp;
    }

    fieldWrapper.append(label, inputEl);
    container.appendChild(fieldWrapper);
  });

  // 제출 버튼
  const submitBtn = document.createElement('button');
  submitBtn.className = 'wfb-submit-btn';
  submitBtn.setAttribute('data-wfb-submit', '');
  /* WGT-02: initial aria-busy state */
  submitBtn.setAttribute('aria-busy', state.step === 'submitting' ? 'true' : 'false');
  submitBtn.disabled = state.step === 'submitting';
  submitBtn.textContent = state.step === 'submitting' ? SUBMIT_BTN_LOADING : SUBMIT_BTN_IDLE;
  submitBtn.addEventListener('click', onSubmit);
  container.appendChild(submitBtn);

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
    /* WGT-02: aria-busy reflects submitting state without relying on text change alone */
    submitBtn.setAttribute('aria-busy', state.step === 'submitting' ? 'true' : 'false');
  }
}
