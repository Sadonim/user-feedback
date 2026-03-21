/**
 * Widget Shadow DOM CSS.
 *
 * 클래스명은 실제 컴포넌트 파일의 사용과 1:1 매칭해야 함:
 *   ui/button.ts        → .wfb-trigger, .wfb-trigger-label
 *   ui/popup.ts         → .wfb-popup, .wfb-popup-header, .wfb-popup-title,
 *                         .wfb-close-btn, .wfb-popup-content
 *   steps/type-select.ts → .wfb-step-type, .wfb-type-card, .wfb-type-emoji,
 *                          .wfb-type-info, .wfb-type-name, .wfb-type-desc
 *   steps/form.ts       → .wfb-form, .wfb-form-header, .wfb-back-btn,
 *                         .wfb-form-type-badge, .wfb-error-banner, .wfb-field,
 *                         .wfb-label, .wfb-required, .wfb-input, .wfb-textarea,
 *                         .wfb-submit-btn
 *   steps/success.ts    → .wfb-success, .wfb-success-icon, .wfb-success-title,
 *                         .wfb-success-desc, .wfb-tracking-wrapper, .wfb-tracking-id,
 *                         .wfb-copy-btn, .wfb-close-success-btn
 *   ui/root.ts          → .wfb-wrap (container)
 */
export const WIDGET_CSS = `
  /* ── 테마 토큰: 라이트 모드 기본값 ──────────────────────────────────────── */
  :host {
    --wfb-bg:             #ffffff;
    --wfb-bg-secondary:   #f9fafb;
    --wfb-bg-hover:       #f3f4f6;
    --wfb-border:         #e5e7eb;
    --wfb-text:           #111827;
    --wfb-text-muted:     #6b7280;
    --wfb-primary:        var(--wfb-accent, #4F46E5);
    --wfb-primary-hover:  #4338CA;
    --wfb-primary-text:   #ffffff;
    --wfb-error:          #DC2626;
    --wfb-error-bg:       #fef2f2;
    --wfb-success:        #16A34A;
    --wfb-radius:         12px;
    --wfb-radius-sm:      8px;
    --wfb-shadow:         0 20px 60px rgba(0,0,0,.12), 0 4px 16px rgba(0,0,0,.08);
    --wfb-font:           -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --wfb-transition:     0.15s ease;
  }

  /* ── 다크 모드 오버라이드 ────────────────────────────────────────────────── */
  :host([data-theme="dark"]) {
    --wfb-bg:           #1f2937;
    --wfb-bg-secondary: #374151;
    --wfb-bg-hover:     #4b5563;
    --wfb-border:       #4b5563;
    --wfb-text:         #f9fafb;
    --wfb-text-muted:   #9ca3af;
    --wfb-error-bg:     #450a0a;
    --wfb-shadow:       0 20px 60px rgba(0,0,0,.5), 0 4px 16px rgba(0,0,0,.3);
  }

  /* ── 리셋 ────────────────────────────────────────────────────────────────── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── 접근성: 모션 감소 ──────────────────────────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { transition: none !important; animation: none !important; }
  }

  /* ── 위젯 컨테이너 (.wfb-wrap) ───────────────────────────────────────────── */
  .wfb-wrap {
    position: relative;
    display: inline-flex;
    flex-direction: column;
    align-items: flex-end;
  }

  :host([data-position^="top"]) .wfb-wrap {
    flex-direction: column-reverse;
  }
  :host([data-position="top-left"]) .wfb-wrap,
  :host([data-position="bottom-left"]) .wfb-wrap {
    align-items: flex-start;
  }

  /* ── 플로팅 트리거 버튼 (원형 아이콘) ──────────────────────────────────── */
  .wfb-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    background: var(--wfb-primary);
    color: var(--wfb-primary-text);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(79,70,229,.35);
    transition: background var(--wfb-transition), transform var(--wfb-transition), box-shadow var(--wfb-transition);
    outline: none;
    flex-shrink: 0;
  }
  .wfb-trigger:hover  { background: var(--wfb-primary-hover); transform: translateY(-2px); box-shadow: 0 6px 20px rgba(79,70,229,.45); }
  .wfb-trigger:active { transform: translateY(0); }
  .wfb-trigger:focus-visible { outline: 2px solid var(--wfb-primary); outline-offset: 3px; }

  /* ── 미니 오버레이 (.wfb-overlay) ────────────────────────────────────── */
  .wfb-overlay {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 220px;
    background: var(--wfb-bg);
    border: 1px solid var(--wfb-border);
    border-radius: var(--wfb-radius);
    box-shadow: var(--wfb-shadow);
    padding: 12px;
    margin-bottom: 10px;
    font-family: var(--wfb-font);
    animation: wfb-slide-up 0.15s ease;
  }
  :host([data-position^="top"]) .wfb-overlay {
    margin-bottom: 0;
    margin-top: 10px;
    animation: wfb-slide-down 0.15s ease;
  }

  .wfb-overlay-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .wfb-overlay-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--wfb-text-muted);
    letter-spacing: .02em;
    text-transform: uppercase;
  }

  /* ── 오버레이 ↓ 접기 버튼 ─────────────────────────────────────────────── */
  .wfb-collapse-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: var(--wfb-text-muted);
    cursor: pointer;
    transition: background var(--wfb-transition), color var(--wfb-transition);
    outline: none;
    flex-shrink: 0;
  }
  .wfb-collapse-btn:hover         { background: var(--wfb-bg-hover); color: var(--wfb-text); }
  .wfb-collapse-btn:focus-visible { outline: 2px solid var(--wfb-primary); outline-offset: 2px; }

  /* ── 오버레이 타입 버튼 행 ────────────────────────────────────────────── */
  .wfb-overlay-types {
    display: flex;
    gap: 6px;
  }
  .wfb-overlay-type-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px 4px;
    background: var(--wfb-bg-secondary);
    border: 1.5px solid var(--wfb-border);
    border-radius: var(--wfb-radius-sm);
    cursor: pointer;
    transition: border-color var(--wfb-transition), background var(--wfb-transition), transform var(--wfb-transition);
    outline: none;
  }
  .wfb-overlay-type-btn:hover         { background: var(--wfb-bg-hover); border-color: var(--wfb-primary); transform: translateY(-1px); }
  .wfb-overlay-type-btn:focus-visible { outline: 2px solid var(--wfb-primary); outline-offset: 2px; }
  .wfb-overlay-type-icon { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; color: var(--wfb-text-muted); transition: color var(--wfb-transition); }
  .wfb-overlay-type-btn:hover .wfb-overlay-type-icon { color: var(--wfb-primary); }
  .wfb-overlay-type-label {
    font-size: 10px;
    font-weight: 500;
    color: var(--wfb-text-muted);
    font-family: var(--wfb-font);
    white-space: nowrap;
  }

  /* ── 팝업 래퍼 (.wfb-popup) ─────────────────────────────────────────────── */
  .wfb-popup {
    width: 360px;
    max-width: calc(100vw - 48px);
    background: var(--wfb-bg);
    border: 1px solid var(--wfb-border);
    border-radius: var(--wfb-radius);
    box-shadow: var(--wfb-shadow);
    font-family: var(--wfb-font);
    color: var(--wfb-text);
    overflow: hidden;
    margin-bottom: 12px;
    flex-direction: column;
    animation: wfb-slide-up 0.2s ease;
  }
  :host([data-position^="top"]) .wfb-popup {
    margin-bottom: 0;
    margin-top: 12px;
    animation: wfb-slide-down 0.2s ease;
  }
  @keyframes wfb-slide-up   { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes wfb-slide-down { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }

  /* ── 접근성 숨김 (.wfb-visually-hidden) ─────────────────────────────────── */
  .wfb-visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0,0,0,0);
    white-space: nowrap;
    border: 0;
  }

  /* ── 공통 step 헤더 (.wfb-step-header) ──────────────────────────────────── */
  .wfb-step-header {
    display: flex;
    align-items: center;
    padding: 12px 14px;
    border-bottom: 1px solid var(--wfb-border);
    gap: 8px;
  }
  .wfb-step-title {
    flex: 1;
    font-family: var(--wfb-font);
    font-size: 14px;
    font-weight: 600;
    color: var(--wfb-text);
  }

  /* ── 닫기 버튼 (.wfb-close-btn) ─────────────────────────────────────────── */
  .wfb-close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: transparent;
    border: none;
    border-radius: var(--wfb-radius-sm);
    color: var(--wfb-text-muted);
    cursor: pointer;
    transition: background var(--wfb-transition), color var(--wfb-transition);
    outline: none;
  }
  .wfb-close-btn:hover        { background: var(--wfb-bg-hover); color: var(--wfb-text); }
  .wfb-close-btn:focus-visible{ outline: 2px solid var(--wfb-primary); outline-offset: 2px; }

  /* ── 팝업 콘텐츠 영역 (.wfb-popup-content) ──────────────────────────────── */
  .wfb-popup-content {
    overflow-y: auto;
    max-height: 520px;
  }

  /* ── Step 1: 타입 선택 (.wfb-step-type) ─────────────────────────────────── */
  .wfb-step-type {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .wfb-step-type .wfb-type-cards {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px;
  }
  .wfb-type-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    background: var(--wfb-bg-secondary);
    border: 1.5px solid var(--wfb-border);
    border-radius: var(--wfb-radius-sm);
    cursor: pointer;
    transition: border-color var(--wfb-transition), background var(--wfb-transition), transform var(--wfb-transition);
    outline: none;
  }
  .wfb-type-card:hover        { background: var(--wfb-bg-hover); border-color: var(--wfb-primary); transform: translateX(2px); }
  .wfb-type-card:focus-visible{ outline: 2px solid var(--wfb-primary); outline-offset: 2px; }
  .wfb-type-card[aria-pressed="true"] {
    border-color: var(--wfb-primary);
    background: color-mix(in srgb, var(--wfb-primary) 8%, var(--wfb-bg));
  }
  .wfb-type-emoji { font-size: 20px; flex-shrink: 0; line-height: 1; }
  .wfb-type-info  { display: flex; flex-direction: column; gap: 2px; flex: 1; }
  .wfb-type-name  { font-size: 14px; font-weight: 600; color: var(--wfb-text); font-family: var(--wfb-font); }
  .wfb-type-desc  { font-size: 12px; color: var(--wfb-text-muted); font-family: var(--wfb-font); }

  /* ── Step 2: 폼 (.wfb-form) ─────────────────────────────────────────────── */
  .wfb-form {
    display: flex;
    flex-direction: column;
  }
  .wfb-form-fields {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px;
  }
  .wfb-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: transparent;
    border: none;
    color: var(--wfb-text-muted);
    font-family: var(--wfb-font);
    font-size: 13px;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 6px;
    transition: background var(--wfb-transition), color var(--wfb-transition);
    outline: none;
  }
  .wfb-back-btn:hover        { background: var(--wfb-bg-hover); color: var(--wfb-text); }
  .wfb-back-btn:focus-visible{ outline: 2px solid var(--wfb-primary); outline-offset: 2px; }
  .wfb-form-type-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    background: color-mix(in srgb, var(--wfb-primary) 10%, var(--wfb-bg));
    color: var(--wfb-primary);
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 600;
    font-family: var(--wfb-font);
  }
  .wfb-error-banner {
    padding: 10px 12px;
    background: var(--wfb-error-bg);
    border: 1px solid var(--wfb-error);
    border-radius: var(--wfb-radius-sm);
    color: var(--wfb-error);
    font-size: 13px;
    font-family: var(--wfb-font);
    line-height: 1.4;
  }
  .wfb-field  { display: flex; flex-direction: column; gap: 5px; }
  .wfb-label  { font-size: 13px; font-weight: 500; color: var(--wfb-text); font-family: var(--wfb-font); }
  .wfb-required { color: var(--wfb-error); }
  .wfb-input,
  .wfb-textarea {
    width: 100%;
    padding: 8px 11px;
    background: var(--wfb-bg-secondary);
    border: 1.5px solid var(--wfb-border);
    border-radius: var(--wfb-radius-sm);
    color: var(--wfb-text);
    font-family: var(--wfb-font);
    font-size: 14px;
    line-height: 1.5;
    transition: border-color var(--wfb-transition), box-shadow var(--wfb-transition);
    outline: none;
    appearance: none;
    -webkit-appearance: none;
  }
  .wfb-input::placeholder,
  .wfb-textarea::placeholder { color: var(--wfb-text-muted); }
  .wfb-input:focus,
  .wfb-textarea:focus {
    border-color: var(--wfb-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--wfb-primary) 18%, transparent);
    background: var(--wfb-bg);
  }
  .wfb-textarea { resize: vertical; min-height: 86px; }
  .wfb-submit-btn {
    width: 100%;
    padding: 10px 20px;
    background: var(--wfb-primary);
    color: var(--wfb-primary-text);
    border: none;
    border-radius: var(--wfb-radius-sm);
    font-family: var(--wfb-font);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background var(--wfb-transition), transform var(--wfb-transition);
    outline: none;
  }
  .wfb-submit-btn:hover:not(:disabled) { background: var(--wfb-primary-hover); transform: translateY(-1px); }
  .wfb-submit-btn:focus-visible         { outline: 2px solid var(--wfb-primary); outline-offset: 3px; }
  .wfb-submit-btn:disabled              { opacity: .65; cursor: not-allowed; transform: none; }

  /* ── Step 3: 성공 (.wfb-success) ────────────────────────────────────────── */
  .wfb-success {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 24px 20px 20px;
    text-align: center;
  }
  .wfb-success-icon  { font-size: 40px; line-height: 1; }
  .wfb-success-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--wfb-text);
    font-family: var(--wfb-font);
  }
  .wfb-success-desc {
    font-size: 13px;
    color: var(--wfb-text-muted);
    font-family: var(--wfb-font);
  }
  .wfb-tracking-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    background: var(--wfb-bg-secondary);
    border: 1.5px solid var(--wfb-border);
    border-radius: var(--wfb-radius-sm);
    padding: 10px 12px;
  }
  .wfb-tracking-id {
    flex: 1;
    font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace;
    font-size: 14px;
    font-weight: 700;
    color: var(--wfb-primary);
    letter-spacing: .04em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    word-break: break-all;
  }
  .wfb-copy-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 10px;
    background: var(--wfb-bg);
    border: 1.5px solid var(--wfb-border);
    border-radius: 6px;
    color: var(--wfb-text-muted);
    font-family: var(--wfb-font);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--wfb-transition);
    outline: none;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .wfb-copy-btn:hover        { background: var(--wfb-bg-hover); border-color: var(--wfb-primary); color: var(--wfb-primary); }
  .wfb-copy-btn:focus-visible{ outline: 2px solid var(--wfb-primary); outline-offset: 2px; }
  .wfb-close-success-btn {
    width: 100%;
    padding: 9px 20px;
    background: var(--wfb-bg-secondary);
    border: 1.5px solid var(--wfb-border);
    border-radius: var(--wfb-radius-sm);
    color: var(--wfb-text-muted);
    font-family: var(--wfb-font);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background var(--wfb-transition), color var(--wfb-transition);
    outline: none;
  }
  .wfb-close-success-btn:hover        { background: var(--wfb-bg-hover); color: var(--wfb-text); }
  .wfb-close-success-btn:focus-visible{ outline: 2px solid var(--wfb-primary); outline-offset: 2px; }

  /* ── Submitting: 스피너 ──────────────────────────────────────────────────── */
  @keyframes wfb-spin { to { transform: rotate(360deg); } }
`;
