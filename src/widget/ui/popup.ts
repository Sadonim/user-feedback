import type { WidgetState, FormData as WidgetFormData, FeedbackType } from '../state';
import { trapFocus } from '../utils/focus-trap';
import { renderTypeSelect } from './steps/type-select';
import { renderForm, updateFormState } from './steps/form';
import { renderSuccess } from './steps/success';

export interface PopupCallbacks {
  onClose: () => void;
  onSelectType: (type: FeedbackType) => void;
  onBackToType: () => void;
  onFormChange: (field: keyof WidgetFormData, value: string) => void;
  onSubmit: () => void;
}

export interface PopupHandle {
  el: HTMLElement;
  update: (state: WidgetState, triggerBtn: HTMLButtonElement) => void;
  destroy: () => void;
}

export function createPopup(
  shadow: ShadowRoot,
  callbacks: PopupCallbacks
): PopupHandle {
  const el = document.createElement('div');
  el.className = 'wfb-popup';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Submit Feedback');
  el.style.display = 'none';

  const header = createPopupHeader(callbacks.onClose);
  el.appendChild(header);

  const content = document.createElement('div');
  content.className = 'wfb-popup-content';
  el.appendChild(content);

  // [H1] AbortController로 ESC 리스너 관리
  const abortCtrl = new AbortController();
  let releaseFocusTrap: (() => void) | null = null;
  let currentStep: WidgetState['step'] | null = null;

  // [H1] Shadow DOM에 등록 (document가 아님) + stopPropagation으로 호스트 이벤트 차단
  shadow.addEventListener(
    'keydown',
    (e: Event) => {
      const ke = e as KeyboardEvent;
      if (ke.key === 'Escape') {
        ke.stopPropagation();
        callbacks.onClose();
      }
    },
    { signal: abortCtrl.signal }
  );

  const update = (state: WidgetState, triggerBtn: HTMLButtonElement): void => {
    const wasOpen = el.style.display !== 'none';
    el.style.display = state.isOpen ? 'flex' : 'none';

    // 닫힐 때: 포커스 트랩 해제 + 트리거 버튼으로 포커스 복귀
    if (wasOpen && !state.isOpen) {
      releaseFocusTrap?.();
      releaseFocusTrap = null;
      triggerBtn.focus();
      currentStep = null;
      return;
    }

    if (!state.isOpen) return;

    // [M3] step이 변경될 때만 DOM 재빌드 (포커스 손실 방지)
    const stepChanged = state.step !== currentStep;
    if (stepChanged) {
      // innerHTML='' 대신 textContent='' (더 안전)
      content.textContent = '';
      currentStep = state.step;

      switch (state.step) {
        case 'type':
          content.appendChild(renderTypeSelect(callbacks.onSelectType));
          break;
        case 'form':
        case 'submitting':
          content.appendChild(
            renderForm(
              state,
              callbacks.onBackToType,
              callbacks.onFormChange,
              callbacks.onSubmit
            )
          );
          break;
        case 'success':
          content.appendChild(renderSuccess(state, callbacks.onClose));
          break;
      }

      // [H2] 팝업 열릴 때 포커스 트랩 설정
      releaseFocusTrap?.();
      releaseFocusTrap = trapFocus(el);
    } else if (state.step === 'form' || state.step === 'submitting') {
      // 동일 step 내 상태 변경: DOM 재빌드 없이 속성만 업데이트
      updateFormState(content, state);
    }
  };

  // [H3] destroy: 모든 리스너 정리
  const destroy = (): void => {
    releaseFocusTrap?.();
    abortCtrl.abort();
  };

  return { el, update, destroy };
}

function createPopupHeader(onClose: () => void): HTMLElement {
  const header = document.createElement('div');
  header.className = 'wfb-popup-header';

  const title = document.createElement('span');
  title.className = 'wfb-popup-title';
  title.textContent = 'Send Feedback'; // [C2] textContent 사용

  const closeBtn = document.createElement('button');
  closeBtn.className = 'wfb-close-btn';
  closeBtn.setAttribute('aria-label', 'Close feedback form');

  // [C2] 닫기 아이콘 SVG — createElementNS 사용
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('aria-hidden', 'true');

  const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line1.setAttribute('x1', '18'); line1.setAttribute('y1', '6');
  line1.setAttribute('x2', '6');  line1.setAttribute('y2', '18');

  const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line2.setAttribute('x1', '6');  line2.setAttribute('y1', '6');
  line2.setAttribute('x2', '18'); line2.setAttribute('y2', '18');

  svg.append(line1, line2);
  closeBtn.appendChild(svg);
  closeBtn.addEventListener('click', onClose);

  header.append(title, closeBtn);
  return header;
}
