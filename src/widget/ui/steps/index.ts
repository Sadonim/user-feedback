/**
 * Widget step UI renderer.
 *
 * 규칙:
 * - innerHTML 사용 금지 (XSS 방어) — createElement / textContent 전용
 * - 동적 값은 모두 textContent / setAttribute 로만 삽입
 * - 이모지는 aria-hidden="true" span으로 분리
 */
import type { WidgetState, FeedbackType } from '../../state';
import type { WidgetConfig } from '../../config';

export interface StepActions {
  readonly onClose: () => void;
  readonly onSelectType: (type: FeedbackType) => void;
  readonly onBack: () => void;
  readonly onUpdateField: (field: string, value: string) => void;
  readonly onSubmit: () => void;
}

// ── 타입 메타 ────────────────────────────────────────────────────────────────
const TYPE_META: Record<FeedbackType, { label: string; icon: string; desc: string }> = {
  BUG:     { label: 'Bug Report',      icon: '🐛', desc: 'Something is broken' },
  FEATURE: { label: 'Feature Request', icon: '✨', desc: 'An idea or suggestion' },
  GENERAL: { label: 'General',         icon: '💬', desc: 'Anything else' },
};

// ── DOM 헬퍼 ─────────────────────────────────────────────────────────────────
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

function clearChildren(container: HTMLElement): void {
  while (container.firstChild) container.removeChild(container.firstChild);
}

// ── 닫기 버튼 (재사용) ───────────────────────────────────────────────────────
function createCloseBtn(onClose: () => void): HTMLButtonElement {
  const btn = el('button', { class: 'wfb-close', type: 'button', 'aria-label': 'Close' }, '✕');
  btn.addEventListener('click', onClose);
  return btn;
}

// ── Step 1: 타입 선택 ─────────────────────────────────────────────────────────
function renderTypeStep(
  container: HTMLElement,
  actions: Pick<StepActions, 'onClose' | 'onSelectType'>
): void {
  clearChildren(container);

  const dialog = el('div', {
    class: 'wfb-dialog',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'wfb-dlg-title',
  });

  // 헤더
  const header = el('div', { class: 'wfb-header' });
  const title  = el('h2',  { class: 'wfb-title', id: 'wfb-dlg-title' }, 'Send Feedback');
  header.appendChild(title);
  header.appendChild(createCloseBtn(actions.onClose));
  dialog.appendChild(header);

  // 타입 카드 목록
  const list = el('div', { class: 'wfb-type-list' });
  for (const [type, meta] of Object.entries(TYPE_META) as [FeedbackType, typeof TYPE_META[FeedbackType]][]) {
    const btn = el('button', { class: 'wfb-type-btn', type: 'button' });

    const iconSpan  = el('span', { class: 'wfb-type-icon', 'aria-hidden': 'true' }, meta.icon);
    const textWrap  = el('span', { class: 'wfb-type-text' });
    const labelSpan = el('span', { class: 'wfb-type-label' }, meta.label);
    const descSpan  = el('span', { class: 'wfb-type-desc'  }, meta.desc);

    textWrap.appendChild(labelSpan);
    textWrap.appendChild(descSpan);
    btn.appendChild(iconSpan);
    btn.appendChild(textWrap);

    btn.addEventListener('click', () => actions.onSelectType(type));
    list.appendChild(btn);
  }

  dialog.appendChild(list);
  container.appendChild(dialog);
}

// ── Step 2: 폼 입력 ───────────────────────────────────────────────────────────
function renderFormStep(
  container: HTMLElement,
  state: WidgetState,
  actions: Pick<StepActions, 'onClose' | 'onBack' | 'onUpdateField' | 'onSubmit'>
): void {
  clearChildren(container);

  const typeMeta = TYPE_META[state.selectedType!];
  const dialog = el('div', {
    class: 'wfb-dialog',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'wfb-dlg-title',
  });

  // 헤더
  const header = el('div', { class: 'wfb-header' });
  const back   = el('button', { class: 'wfb-back', type: 'button', 'aria-label': 'Back to type selection' }, '← Back');
  back.addEventListener('click', actions.onBack);

  const titleText = `${typeMeta.icon} ${typeMeta.label}`;
  const title = el('h2', { class: 'wfb-title', id: 'wfb-dlg-title' });
  title.textContent = titleText; // textContent로 안전하게 삽입

  header.appendChild(back);
  header.appendChild(title);
  header.appendChild(createCloseBtn(actions.onClose));
  dialog.appendChild(header);

  // 폼
  const form = el('form', { class: 'wfb-form', novalidate: '' });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    actions.onSubmit();
  });

  // 에러 배너 (초기 errorMessage 있을 때만 삽입)
  if (state.errorMessage) {
    const banner = el('div', {
      class: 'wfb-error-banner',
      role: 'alert',
      'data-wfb-error': '',
    });
    banner.textContent = state.errorMessage;
    form.appendChild(banner);
  }

  // 제목 필드
  const titleGroup = el('div', { class: 'wfb-field' });
  const titleLabel = el('label', { class: 'wfb-label', for: 'wfb-f-title' }, 'Title *');
  const titleInput = el('input', {
    class: 'wfb-input',
    id: 'wfb-f-title',
    type: 'text',
    placeholder: 'Brief summary',
    required: '',
    maxlength: '200',
  }) as HTMLInputElement;
  titleInput.value = state.formData.title;
  // [M3] onUpdateField은 render() 를 호출하지 않으므로 포커스 보존
  titleInput.addEventListener('input', (e) =>
    actions.onUpdateField('title', (e.target as HTMLInputElement).value)
  );
  titleGroup.appendChild(titleLabel);
  titleGroup.appendChild(titleInput);

  // 설명 필드
  const descGroup = el('div', { class: 'wfb-field' });
  const descLabel = el('label', { class: 'wfb-label', for: 'wfb-f-desc' }, 'Description *');
  const descInput = el('textarea', {
    class: 'wfb-textarea',
    id: 'wfb-f-desc',
    placeholder: 'Provide more details…',
    required: '',
    rows: '4',
    maxlength: '5000',
  });
  descInput.textContent = state.formData.description;
  descInput.addEventListener('input', (e) =>
    actions.onUpdateField('description', (e.target as HTMLTextAreaElement).value)
  );
  descGroup.appendChild(descLabel);
  descGroup.appendChild(descInput);

  // 닉네임 필드
  const nickGroup = el('div', { class: 'wfb-field' });
  const nickLabel = el('label', { class: 'wfb-label', for: 'wfb-f-nick' }, 'Nickname *');
  const nickInput = el('input', {
    class: 'wfb-input',
    id: 'wfb-f-nick',
    type: 'text',
    placeholder: 'How should we call you?',
    required: '',
    maxlength: '100',
  }) as HTMLInputElement;
  nickInput.value = state.formData.nickname;
  nickInput.addEventListener('input', (e) =>
    actions.onUpdateField('nickname', (e.target as HTMLInputElement).value)
  );
  nickGroup.appendChild(nickLabel);
  nickGroup.appendChild(nickInput);

  // 이메일 필드 (선택)
  const emailGroup = el('div', { class: 'wfb-field' });
  const emailLabel = el('label', { class: 'wfb-label', for: 'wfb-f-email' }, 'Email (optional)');
  const emailInput = el('input', {
    class: 'wfb-input',
    id: 'wfb-f-email',
    type: 'email',
    placeholder: 'For status updates',
    maxlength: '255',
  }) as HTMLInputElement;
  emailInput.value = state.formData.email;
  emailInput.addEventListener('input', (e) =>
    actions.onUpdateField('email', (e.target as HTMLInputElement).value)
  );
  emailGroup.appendChild(emailLabel);
  emailGroup.appendChild(emailInput);

  // 제출 버튼
  const submitBtn = el('button', {
    class: 'wfb-submit',
    type: 'submit',
    'data-wfb-submit': '',
  }, 'Submit Feedback');

  form.appendChild(titleGroup);
  form.appendChild(descGroup);
  form.appendChild(nickGroup);
  form.appendChild(emailGroup);
  form.appendChild(submitBtn);

  dialog.appendChild(form);
  container.appendChild(dialog);
}

// ── Step: 제출 중 ─────────────────────────────────────────────────────────────
function renderSubmittingStep(container: HTMLElement): void {
  clearChildren(container);

  const dialog = el('div', {
    class: 'wfb-dialog',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-live': 'polite',
    'aria-label': 'Submitting feedback',
  });

  const wrap  = el('div', { class: 'wfb-spinner-wrap' });
  const spin  = el('div', { class: 'wfb-spinner', 'aria-hidden': 'true' });
  const txt   = el('p',   { class: 'wfb-spinner-text' }, 'Submitting…');

  wrap.appendChild(spin);
  wrap.appendChild(txt);
  dialog.appendChild(wrap);
  container.appendChild(dialog);
}

// ── Step 3: 성공 ──────────────────────────────────────────────────────────────
function renderSuccessStep(
  container: HTMLElement,
  state: WidgetState,
  actions: Pick<StepActions, 'onClose'>
): void {
  clearChildren(container);

  const dialog = el('div', {
    class: 'wfb-dialog wfb-dialog--success',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-live': 'polite',
  });

  const icon     = el('div', { class: 'wfb-success-icon', 'aria-hidden': 'true' }, '✅');
  const heading  = el('h2',  { class: 'wfb-success-title'    }, 'Thank you!');
  const subtitle = el('p',   { class: 'wfb-success-subtitle' }, 'Your feedback has been received.');

  const tracking = el('div', { class: 'wfb-tracking' });
  const tLabel   = el('p',   { class: 'wfb-tracking-label'   }, 'Your tracking ID:');
  const tCode    = el('code',{ class: 'wfb-tracking-id'      });
  // [C2] trackingId는 서버 응답값 — textContent로만 삽입 (innerHTML 금지)
  tCode.textContent = state.trackingId ?? '';
  tracking.appendChild(tLabel);
  tracking.appendChild(tCode);

  const closeBtn = el('button', { class: 'wfb-submit', type: 'button' }, 'Close');
  closeBtn.addEventListener('click', actions.onClose);

  dialog.appendChild(icon);
  dialog.appendChild(heading);
  dialog.appendChild(subtitle);
  dialog.appendChild(tracking);
  dialog.appendChild(closeBtn);
  container.appendChild(dialog);
}

// ── 메인 렌더 디스패처 ────────────────────────────────────────────────────────
export function renderStep(
  container: HTMLElement,
  state: WidgetState,
  config: WidgetConfig,
  actions: StepActions
): void {
  void config; // 향후 per-step 커스터마이징용으로 보존

  switch (state.step) {
    case 'type':
      renderTypeStep(container, actions);
      break;
    case 'form':
      renderFormStep(container, state, actions);
      break;
    case 'submitting':
      renderSubmittingStep(container);
      break;
    case 'success':
      renderSuccessStep(container, state, actions);
      break;
  }
}
