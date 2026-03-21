import { parseConfigFromScript } from './config';
import { createWidgetRoot, setupThemeObserver } from './ui/root';
import { createTriggerButton, setButtonExpanded } from './ui/button';
import { createPopup } from './ui/popup';
import { createOverlay } from './ui/overlay';
import { INITIAL_STATE, transitions } from './state';
import type { WidgetState, FormData as WidgetFormData } from './state';
import { submitFeedback } from './api';

// [C1] IIFE 실행 중 — document.currentScript 가 유효한 유일한 시점에 캡처
const _scriptTag = document.currentScript as HTMLScriptElement | null;

function init(): (() => void) | null {
  // 중복 초기화 방지
  if (document.querySelector('[data-ufb-widget]')) return null;

  // [C1] 캡처된 _scriptTag 주입 — DOMContentLoaded 콜백에서도 동작
  const config = parseConfigFromScript(_scriptTag);
  if (!config) return null;

  const { host, shadow, container } = createWidgetRoot(config);

  // [H3] cleanup 함수 수집
  const themeCleanup = setupThemeObserver(host, config.theme);

  let state: WidgetState = INITIAL_STATE;

  const triggerBtn = createTriggerButton(
    config,
    // click: 오버레이 토글 (팝업이 열려있으면 팝업 닫기)
    () => {
      if (state.isOpen) {
        dispatch(transitions.close(state));
      } else if (state.isOverlayOpen) {
        dispatch(transitions.closeOverlay(state));
      } else {
        dispatch(transitions.openOverlay(state));
      }
    },
    // mouseenter: 아무것도 열려있지 않으면 오버레이 표시
    () => {
      if (!state.isOpen && !state.isOverlayOpen) {
        dispatch(transitions.openOverlay(state));
      }
    }
  );

  const overlay = createOverlay({
    onCollapse: () => dispatch(transitions.closeOverlay(state)),
    onSelectType: (type) => dispatch(transitions.selectTypeFromOverlay(state, type)),
  });

  // [H1][H2][H3][H4] shadow 전달, destroy 반환받음
  const popup = createPopup(shadow, {
    onClose: () => dispatch(transitions.close(state)),
    onSelectType: (type) => dispatch(transitions.selectType(state, type)),
    onBackToType: () => dispatch(transitions.backToOverlay(state)),
    // [H4] field: keyof WidgetFormData — as any 없음
    onFormChange: (field: keyof WidgetFormData, value: string) =>
      dispatch(transitions.updateForm(state, { [field]: value })),
    onSubmit: async () => {
      if (!state.selectedType) return;
      dispatch(transitions.submit(state));
      try {
        const result = await submitFeedback(
          config.apiUrl,
          state.selectedType,
          state.formData
        );
        dispatch(transitions.submitSuccess(state, result.trackingId));
      } catch (err: unknown) {
        const msg =
          (err as { message?: string })?.message ?? 'Submission failed. Try again.';
        dispatch(transitions.submitError(state, msg));
      }
    },
  });

  const render = (): void => {
    popup.update(state, triggerBtn);
    overlay.update(state.isOverlayOpen);
    setButtonExpanded(triggerBtn, state.isOpen || state.isOverlayOpen);
  };

  const dispatch = (nextState: WidgetState): void => {
    state = nextState;
    render();
  };

  container.appendChild(popup.el);
  container.appendChild(overlay.el);
  container.appendChild(triggerBtn);
  document.body.appendChild(host);

  render();

  // [H3] destroy: DOM 제거 + 모든 리스너 정리
  return function destroy(): void {
    popup.destroy();
    themeCleanup();
    host.remove();
  };
}

// DOM 준비 시 자동 실행
let widgetDestroy: (() => void) | null = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    widgetDestroy = init();
  });
} else {
  widgetDestroy = init();
}

// [H3] SPA 환경을 위한 전역 API 노출
(window as unknown as Record<string, unknown>)['UserFeedbackWidget'] = {
  destroy: () => widgetDestroy?.(),
};
