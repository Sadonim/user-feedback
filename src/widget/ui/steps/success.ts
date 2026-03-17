import type { WidgetState } from '../../state';

const COPY_IDLE = 'Copy';
const COPY_DONE = 'Copied!';
const COPY_RESET_MS = 2000;

/** 복사 성공 피드백: 버튼 텍스트를 잠시 변경 후 원복 */
function showCopiedFeedback(btn: HTMLButtonElement): void {
  btn.textContent = COPY_DONE;
  setTimeout(() => { btn.textContent = COPY_IDLE; }, COPY_RESET_MS);
}

export function renderSuccess(
  state: WidgetState,
  onClose: () => void
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'wfb-success';

  // 성공 아이콘 (aria-hidden)
  const icon = document.createElement('span');
  icon.className = 'wfb-success-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '✅';

  const title = document.createElement('h3');
  title.className = 'wfb-success-title';
  title.textContent = 'Feedback Submitted!';
  /* WGT-04 step 1: tabindex=-1 makes the heading programmatically focusable
     so popup.ts can move focus here before trapFocus is set */
  title.setAttribute('tabindex', '-1');

  const desc = document.createElement('p');
  desc.className = 'wfb-success-desc';
  desc.textContent = 'Your tracking ID:';

  // 트래킹 ID 래퍼
  const trackingWrapper = document.createElement('div');
  trackingWrapper.className = 'wfb-tracking-wrapper';

  // [C2] trackingId는 textContent로만 렌더링 (서버 응답값 — innerHTML 금지)
  const idEl = document.createElement('code');
  idEl.className = 'wfb-tracking-id';
  idEl.textContent = state.trackingId ?? '';

  // 복사 버튼
  const copyBtn = document.createElement('button');
  copyBtn.className = 'wfb-copy-btn';
  copyBtn.setAttribute('data-wfb-copy', '');
  copyBtn.textContent = COPY_IDLE;
  copyBtn.setAttribute('aria-label', 'Copy tracking ID');

  copyBtn.addEventListener('click', () => {
    const id = state.trackingId ?? '';
    if (navigator.clipboard) {
      // [H1] navigator.clipboard는 Shadow DOM 외부(document.body) 접근 없이 동작
      navigator.clipboard.writeText(id)
        .then(() => showCopiedFeedback(copyBtn))
        .catch(() => {
          // [H1] fallback 제거: clipboard API 실패 시 사용자에게 수동 복사 안내.
          // document.body 변이는 Shadow DOM 격리 위반이므로 사용하지 않음.
          copyBtn.textContent = 'Copy manually';
          setTimeout(() => { copyBtn.textContent = COPY_IDLE; }, COPY_RESET_MS);
        });
    } else {
      // [H1] clipboard API 미지원 브라우저: 수동 복사 안내 (document.execCommand 제거)
      copyBtn.textContent = 'Copy manually';
      setTimeout(() => { copyBtn.textContent = COPY_IDLE; }, COPY_RESET_MS);
    }
  });

  trackingWrapper.append(idEl, copyBtn);

  // 닫기 버튼
  const closeBtn = document.createElement('button');
  closeBtn.className = 'wfb-close-success-btn';
  closeBtn.setAttribute('data-wfb-close', '');
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', onClose);

  container.append(icon, title, desc, trackingWrapper, closeBtn);
  return container;
}
