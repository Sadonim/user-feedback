(function(){var e=new Set([`bottom-right`,`bottom-left`,`top-right`,`top-left`]),t=new Set([`auto`,`light`,`dark`]),n={theme:`auto`,position:`bottom-right`,buttonLabel:`Feedback`,buttonColor:`#4F46E5`,zIndex:9999};function r(e){return/^#[0-9A-Fa-f]{6}$/.test(e??``)?e:n.buttonColor}function i(e){let t=(e??``).trim().slice(0,50);return t.length>0?t:n.buttonLabel}function a(a){if(!a)return console.error(`[UserFeedbackWidget] could not find script element`),null;let o=a.dataset.apiUrl?.trim()??``;if(!o)return console.error(`[UserFeedbackWidget] data-api-url is required`),null;try{let e=new URL(o);if(e.protocol!==`http:`&&e.protocol!==`https:`)return console.error(`[UserFeedbackWidget] data-api-url must use http or https protocol`),null}catch{return console.error(`[UserFeedbackWidget] data-api-url must be a valid URL`),null}let s=a.dataset.theme,c=a.dataset.position;return{apiUrl:o,theme:t.has(s)?s:n.theme,position:e.has(c)?c:n.position,buttonLabel:i(a.dataset.buttonLabel),buttonColor:r(a.dataset.buttonColor),zIndex:Number(a.dataset.zIndex)||n.zIndex}}var o=`
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

  /* ── 팝업 헤더 (.wfb-popup-header) ─────────────────────────────────────── */
  .wfb-popup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid var(--wfb-border);
    background: var(--wfb-bg);
    flex-shrink: 0;
  }
  .wfb-popup-title {
    font-family: var(--wfb-font);
    font-size: 15px;
    font-weight: 600;
    color: var(--wfb-text);
  }
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
    max-height: 480px;
  }

  /* ── Step 1: 타입 선택 (.wfb-step-type) ─────────────────────────────────── */
  .wfb-step-type {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
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
    gap: 12px;
    padding: 16px;
  }
  .wfb-form-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
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
`,s={"bottom-right":`bottom: 24px; right: 24px;`,"bottom-left":`bottom: 24px; left: 24px;`,"top-right":`top: 24px; right: 24px;`,"top-left":`top: 24px; left: 24px;`};function c(e){let t=document.createElement(`div`);t.setAttribute(`data-ufb-widget`,``),t.setAttribute(`data-position`,e.position),t.style.cssText=`
    position: fixed;
    z-index: ${e.zIndex};
    ${s[e.position]??s[`bottom-right`]}
  `,t.style.setProperty(`--wfb-accent`,e.buttonColor);let n=t.attachShadow({mode:`open`}),r=document.createElement(`style`);r.textContent=o,n.appendChild(r);let i=document.createElement(`div`);return i.className=`wfb-wrap`,n.appendChild(i),{host:t,shadow:n,container:i}}function l(e,t){if(t!==`auto`)return e.setAttribute(`data-theme`,t),()=>{};if(typeof window.matchMedia!=`function`)return e.setAttribute(`data-theme`,`light`),()=>{};let n=window.matchMedia(`(prefers-color-scheme: dark)`),r=t=>{e.setAttribute(`data-theme`,t?`dark`:`light`)},i=e=>r(e.matches);return r(n.matches),n.addEventListener(`change`,i),()=>n.removeEventListener(`change`,i)}function u(){let e=document.createElementNS(`http://www.w3.org/2000/svg`,`svg`);e.setAttribute(`width`,`18`),e.setAttribute(`height`,`18`),e.setAttribute(`viewBox`,`0 0 24 24`),e.setAttribute(`fill`,`none`),e.setAttribute(`stroke`,`currentColor`),e.setAttribute(`stroke-width`,`2`),e.setAttribute(`stroke-linecap`,`round`),e.setAttribute(`stroke-linejoin`,`round`),e.setAttribute(`aria-hidden`,`true`),e.setAttribute(`focusable`,`false`);let t=document.createElementNS(`http://www.w3.org/2000/svg`,`path`);return t.setAttribute(`d`,`M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z`),e.appendChild(t),e}function d(e,t,n){let r=document.createElement(`button`);return r.className=`wfb-trigger`,r.setAttribute(`type`,`button`),r.setAttribute(`aria-label`,e.buttonLabel),r.setAttribute(`aria-haspopup`,`dialog`),r.setAttribute(`aria-expanded`,`false`),r.appendChild(u()),r.addEventListener(`click`,t),r.addEventListener(`mouseenter`,n),r}function f(e,t){e.setAttribute(`aria-expanded`,t?`true`:`false`)}var p=[`button:not([disabled])`,`input:not([disabled])`,`textarea:not([disabled])`,`select:not([disabled])`,`[tabindex]:not([tabindex="-1"])`].join(`, `);function m(e){let t=()=>Array.from(e.querySelectorAll(p));t()[0]?.focus();let n=n=>{if(n.key!==`Tab`)return;let r=t();if(r.length===0)return;let i=r[0],a=r[r.length-1],o=e.getRootNode().activeElement;n.shiftKey?o===i&&(n.preventDefault(),a.focus()):o===a&&(n.preventDefault(),i.focus())};return e.addEventListener(`keydown`,n),()=>e.removeEventListener(`keydown`,n)}var h=[{type:`BUG`,emoji:`🐛`,name:`버그 신고`,description:`제대로 작동하지 않는 기능`},{type:`FEATURE`,emoji:`✨`,name:`기능 제안`,description:`개선 아이디어 공유`},{type:`GENERAL`,emoji:`💬`,name:`일반 문의`,description:`기타 의견 남기기`}];function g(e){let t=document.createElement(`div`);return t.className=`wfb-step-type`,h.forEach(n=>{let r=document.createElement(`div`);r.className=`wfb-type-card`,r.setAttribute(`role`,`button`),r.setAttribute(`tabindex`,`0`),r.setAttribute(`aria-pressed`,`false`),r.setAttribute(`data-type`,n.type),r.setAttribute(`aria-label`,`${n.name}: ${n.description}`);let i=document.createElement(`span`);i.className=`wfb-type-emoji`,i.setAttribute(`aria-hidden`,`true`),i.textContent=n.emoji;let a=document.createElement(`div`);a.className=`wfb-type-info`;let o=document.createElement(`span`);o.className=`wfb-type-name`,o.textContent=n.name;let s=document.createElement(`span`);s.className=`wfb-type-desc`,s.textContent=n.description,a.append(o,s),r.append(i,a);let c=()=>{r.setAttribute(`aria-pressed`,`true`),e(n.type)};r.addEventListener(`click`,c),r.addEventListener(`keydown`,e=>{(e.key===`Enter`||e.key===` `)&&(e.preventDefault(),c())}),t.appendChild(r)}),t}var _={BUG:`겪고 계신 증상을 설명해주세요`,FEATURE:`어떤 기능이 있으면 좋을지 알려주세요`,GENERAL:`궁금한 점을 편하게 남겨주세요`},v=`피드백 제출`,y=`제출 중…`,b={BUG:`버그 신고`,FEATURE:`기능 제안`,GENERAL:`일반 문의`},x={BUG:`🐛`,FEATURE:`✨`,GENERAL:`💬`};function S(e,t,n,r){let i=document.createElement(`div`);i.className=`wfb-form`;let a=document.createElement(`div`);a.className=`wfb-form-header`;let o=document.createElement(`button`);o.className=`wfb-back-btn`,o.setAttribute(`data-wfb-back`,``),o.setAttribute(`aria-label`,`유형 선택으로 돌아가기`);let s=document.createElement(`span`);s.setAttribute(`aria-hidden`,`true`),s.textContent=`← 돌아가기`,o.appendChild(s),o.addEventListener(`click`,t);let c=document.createElement(`span`);c.className=`wfb-form-type-badge`;let l=e.selectedType??``;if(l){let e=document.createElement(`span`);e.setAttribute(`aria-hidden`,`true`),e.textContent=(x[l]??``)+` `;let t=document.createElement(`span`);t.textContent=b[l]??l,c.appendChild(e),c.appendChild(t)}a.append(o,c),i.appendChild(a);let u=document.createElement(`div`);u.className=`wfb-error-banner`,u.setAttribute(`role`,`alert`),u.setAttribute(`data-wfb-error`,``),u.style.display=e.errorMessage?`block`:`none`,u.textContent=e.errorMessage??``,i.appendChild(u);let d=_[l]??`내용을 입력해주세요`,f=document.createElement(`textarea`);f.className=`wfb-textarea`,f.id=`wfb-content`,f.placeholder=d,f.maxLength=5e3,f.required=!0,f.setAttribute(`data-field`,`content`),f.setAttribute(`aria-label`,d),f.value=e.formData.content,f.addEventListener(`input`,()=>n(`content`,f.value)),i.appendChild(f);let p=document.createElement(`input`);p.className=`wfb-input`,p.id=`wfb-nickname`,p.type=`text`,p.placeholder=`닉네임`,p.maxLength=100,p.required=!0,p.setAttribute(`data-field`,`nickname`),p.setAttribute(`aria-label`,`닉네임`),p.value=e.formData.nickname,p.addEventListener(`input`,()=>n(`nickname`,p.value)),i.appendChild(p);let m=document.createElement(`button`);return m.className=`wfb-submit-btn`,m.setAttribute(`data-wfb-submit`,``),m.setAttribute(`aria-busy`,e.step===`submitting`?`true`:`false`),m.disabled=e.step===`submitting`,m.textContent=e.step===`submitting`?y:v,m.addEventListener(`click`,r),i.appendChild(m),i}function C(e,t){let n=e.querySelector(`[data-wfb-error]`);n&&(n.textContent=t.errorMessage??``,n.style.display=t.errorMessage?`block`:`none`);let r=e.querySelector(`[data-wfb-submit]`);r&&(r.disabled=t.step===`submitting`,r.textContent=t.step===`submitting`?y:v,r.setAttribute(`aria-busy`,t.step===`submitting`?`true`:`false`))}var w=`복사`,T=`복사됨!`,E=2e3;function D(e){e.textContent=T,setTimeout(()=>{e.textContent=w},E)}function O(e,t){let n=document.createElement(`div`);n.className=`wfb-success`;let r=document.createElement(`span`);r.className=`wfb-success-icon`,r.setAttribute(`aria-hidden`,`true`),r.textContent=`✅`;let i=document.createElement(`h3`);i.className=`wfb-success-title`,i.textContent=`피드백이 제출되었습니다!`,i.setAttribute(`tabindex`,`-1`);let a=document.createElement(`p`);a.className=`wfb-success-desc`,a.textContent=`트래킹 ID:`;let o=document.createElement(`div`);o.className=`wfb-tracking-wrapper`;let s=document.createElement(`code`);s.className=`wfb-tracking-id`,s.textContent=e.trackingId??``;let c=document.createElement(`button`);c.className=`wfb-copy-btn`,c.setAttribute(`data-wfb-copy`,``),c.textContent=w,c.setAttribute(`aria-label`,`트래킹 ID 복사`),c.addEventListener(`click`,()=>{let t=e.trackingId??``;navigator.clipboard?navigator.clipboard.writeText(t).then(()=>D(c)).catch(()=>{c.textContent=`직접 복사`,setTimeout(()=>{c.textContent=w},E)}):(c.textContent=`직접 복사`,setTimeout(()=>{c.textContent=w},E))}),o.append(s,c);let l=document.createElement(`button`);return l.className=`wfb-close-success-btn`,l.setAttribute(`data-wfb-close`,``),l.textContent=`닫기`,l.addEventListener(`click`,t),n.append(r,i,a,o,l),n}function k(e,t){let n=document.createElement(`div`);n.className=`wfb-popup`,n.setAttribute(`role`,`dialog`),n.setAttribute(`aria-modal`,`true`),n.setAttribute(`aria-labelledby`,`wfb-popup-title`),n.style.display=`none`;let r=A(t.onClose);n.appendChild(r);let i=document.createElement(`div`);i.className=`wfb-popup-content`,n.appendChild(i);let a=new AbortController,o=null,s=null;return e.addEventListener(`keydown`,e=>{let n=e;n.key===`Escape`&&(n.stopPropagation(),t.onClose())},{signal:a.signal}),{el:n,update:(e,r)=>{let a=n.style.display!==`none`;if(n.style.display=e.isOpen?`flex`:`none`,a&&!e.isOpen){o?.(),o=null,r.focus(),s=null;return}if(e.isOpen)if(e.step!==s){switch(i.textContent=``,s=e.step,e.step){case`type`:i.appendChild(g(t.onSelectType));break;case`form`:case`submitting`:i.appendChild(S(e,t.onBackToType,t.onFormChange,t.onSubmit));break;case`success`:i.appendChild(O(e,t.onClose)),requestAnimationFrame(()=>{i.querySelector(`.wfb-success-title`)?.focus()});break}o?.(),o=m(n)}else (e.step===`form`||e.step===`submitting`)&&C(i,e)},destroy:()=>{o?.(),a.abort()}}}function A(e){let t=document.createElement(`div`);t.className=`wfb-popup-header`;let n=document.createElement(`span`);n.className=`wfb-popup-title`,n.id=`wfb-popup-title`,n.textContent=`피드백 보내기`;let r=document.createElement(`button`);r.className=`wfb-close-btn`,r.setAttribute(`aria-label`,`피드백 폼 닫기`);let i=document.createElementNS(`http://www.w3.org/2000/svg`,`svg`);i.setAttribute(`width`,`16`),i.setAttribute(`height`,`16`),i.setAttribute(`viewBox`,`0 0 24 24`),i.setAttribute(`fill`,`none`),i.setAttribute(`stroke`,`currentColor`),i.setAttribute(`stroke-width`,`2`),i.setAttribute(`aria-hidden`,`true`);let a=document.createElementNS(`http://www.w3.org/2000/svg`,`line`);a.setAttribute(`x1`,`18`),a.setAttribute(`y1`,`6`),a.setAttribute(`x2`,`6`),a.setAttribute(`y2`,`18`);let o=document.createElementNS(`http://www.w3.org/2000/svg`,`line`);return o.setAttribute(`x1`,`6`),o.setAttribute(`y1`,`6`),o.setAttribute(`x2`,`18`),o.setAttribute(`y2`,`18`),i.append(a,o),r.appendChild(i),r.addEventListener(`click`,e),t.append(n,r),t}var j=[{type:`BUG`,createIcon:F,label:`버그`},{type:`FEATURE`,createIcon:I,label:`기능 제안`},{type:`GENERAL`,createIcon:L,label:`문의`}];function M(e){let t=document.createElement(`div`);t.className=`wfb-overlay`,t.setAttribute(`role`,`menu`),t.setAttribute(`aria-label`,`피드백 유형 선택`),t.style.display=`none`;let n=document.createElement(`div`);n.className=`wfb-overlay-header`;let r=document.createElement(`span`);r.className=`wfb-overlay-title`,r.textContent=`어떤 피드백인가요?`;let i=document.createElement(`button`);i.className=`wfb-collapse-btn`,i.setAttribute(`type`,`button`),i.setAttribute(`aria-label`,`오버레이 닫기`),i.appendChild(R()),i.addEventListener(`click`,e.onCollapse),n.append(r,i);let a=document.createElement(`div`);a.className=`wfb-overlay-types`;for(let t of j){let n=document.createElement(`button`);n.className=`wfb-overlay-type-btn`,n.setAttribute(`type`,`button`),n.setAttribute(`role`,`menuitem`),n.setAttribute(`aria-label`,t.label);let r=document.createElement(`span`);r.className=`wfb-overlay-type-icon`,r.setAttribute(`aria-hidden`,`true`),r.appendChild(t.createIcon());let i=document.createElement(`span`);i.className=`wfb-overlay-type-label`,i.textContent=t.label,n.append(r,i),n.addEventListener(`click`,()=>e.onSelectType(t.type)),a.appendChild(n)}return t.append(n,a),{el:t,update:e=>{t.style.display=e?`flex`:`none`}}}function N(e){return document.createElementNS(`http://www.w3.org/2000/svg`,e)}function P(e){let t=N(`svg`);return t.setAttribute(`width`,`28`),t.setAttribute(`height`,`28`),t.setAttribute(`viewBox`,e),t.setAttribute(`fill`,`none`),t.setAttribute(`aria-hidden`,`true`),t}function F(){let e=P(`0 0 256 256`);e.setAttribute(`fill`,`currentColor`);let t=N(`path`);return t.setAttribute(`d`,`M144,92a12,12,0,1,1,12,12A12,12,0,0,1,144,92ZM100,80a12,12,0,1,0,12,12A12,12,0,0,0,100,80Zm116,64A87.76,87.76,0,0,1,213,167l22.24,9.72A8,8,0,0,1,232,192a7.89,7.89,0,0,1-3.2-.67L207.38,182a88,88,0,0,1-158.76,0L27.2,191.33A7.89,7.89,0,0,1,24,192a8,8,0,0,1-3.2-15.33L43,167A87.76,87.76,0,0,1,40,144v-8H16a8,8,0,0,1,0-16H40v-8a87.76,87.76,0,0,1,3-23L20.8,79.33a8,8,0,1,1,6.4-14.66L48.62,74a88,88,0,0,1,158.76,0l21.42-9.36a8,8,0,0,1,6.4,14.66L213,89.05a87.76,87.76,0,0,1,3,23v8h24a8,8,0,0,1,0,16H216ZM56,120H200v-8a72,72,0,0,0-144,0Zm64,95.54V136H56v8A72.08,72.08,0,0,0,120,215.54ZM200,144v-8H136v79.54A72.08,72.08,0,0,0,200,144Z`),e.appendChild(t),e}function I(){let e=P(`0 0 256 256`);e.setAttribute(`fill`,`currentColor`);let t=N(`path`);return t.setAttribute(`d`,`M176,232a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,232Zm40-128a87.55,87.55,0,0,1-33.64,69.21A16.24,16.24,0,0,0,176,186v6a16,16,0,0,1-16,16H96a16,16,0,0,1-16-16v-6a16,16,0,0,0-6.23-12.66A87.59,87.59,0,0,1,40,104.49C39.74,56.83,78.26,17.14,125.88,16A88,88,0,0,1,216,104Zm-16,0a72,72,0,0,0-73.74-72c-39,.92-70.47,33.39-70.26,72.39a71.65,71.65,0,0,0,27.64,56.3A32,32,0,0,1,96,186v6h64v-6a32.15,32.15,0,0,1,12.47-25.35A71.65,71.65,0,0,0,200,104Zm-16.11-9.34a57.6,57.6,0,0,0-46.56-46.55,8,8,0,0,0-2.66,15.78c16.57,2.79,30.63,16.85,33.44,33.45A8,8,0,0,0,176,104a9,9,0,0,0,1.35-.11A8,8,0,0,0,183.89,94.66Z`),e.appendChild(t),e}function L(){let e=P(`0 0 256 256`);e.setAttribute(`fill`,`currentColor`);let t=N(`path`);return t.setAttribute(`d`,`M168,112a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,112Zm-8,24H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16Zm72-8A104,104,0,0,1,79.12,219.82L45.07,231.17a16,16,0,0,1-20.24-20.24l11.35-34.05A104,104,0,1,1,232,128Zm-16,0A88,88,0,1,0,51.81,172.06a8,8,0,0,1,.66,6.54L40,216,77.4,203.53a7.85,7.85,0,0,1,2.53-.42,8,8,0,0,1,4,1.08A88,88,0,0,0,216,128Z`),e.appendChild(t),e}function R(){let e=document.createElementNS(`http://www.w3.org/2000/svg`,`svg`);e.setAttribute(`width`,`14`),e.setAttribute(`height`,`14`),e.setAttribute(`viewBox`,`0 0 24 24`),e.setAttribute(`fill`,`none`),e.setAttribute(`stroke`,`currentColor`),e.setAttribute(`stroke-width`,`2.5`),e.setAttribute(`stroke-linecap`,`round`),e.setAttribute(`stroke-linejoin`,`round`),e.setAttribute(`aria-hidden`,`true`);let t=document.createElementNS(`http://www.w3.org/2000/svg`,`polyline`);return t.setAttribute(`points`,`6 9 12 15 18 9`),e.appendChild(t),e}var z={isOpen:!1,isOverlayOpen:!1,step:`type`,selectedType:null,formData:{content:``,nickname:``},trackingId:null,errorMessage:null},B={open:e=>({...e,isOpen:!0,isOverlayOpen:!1,step:`type`}),close:e=>({...z}),openOverlay:e=>({...e,isOverlayOpen:!0}),closeOverlay:e=>({...e,isOverlayOpen:!1}),selectTypeFromOverlay:(e,t)=>({...e,isOverlayOpen:!1,isOpen:!0,selectedType:t,step:`form`}),backToOverlay:e=>({...z,isOverlayOpen:!0}),selectType:(e,t)=>({...e,selectedType:t,step:`form`}),backToType:e=>({...e,step:`type`,selectedType:null,errorMessage:null}),updateForm:(e,t)=>({...e,formData:{...e.formData,...t}}),submit:e=>({...e,step:`submitting`,errorMessage:null}),submitSuccess:(e,t)=>({...e,step:`success`,trackingId:t}),submitError:(e,t)=>({...e,step:`form`,errorMessage:t})};async function V(e,t,n){let r={type:t,content:n.content.trim(),nickname:n.nickname.trim()},i;try{i=await fetch(`${e}/api/v1/feedback`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify(r)})}catch{throw{message:`Network error. Please check your connection.`,statusCode:0}}let a=await i.json().catch(()=>null);if(!i.ok||!a?.success)throw{message:a?.error??`Request failed (HTTP ${i.status})`,statusCode:i.status};return{trackingId:a.data.trackingId,status:a.data.status}}var H=document.currentScript;function U(){if(document.querySelector(`[data-ufb-widget]`))return null;let e=a(H);if(!e)return null;let{host:t,shadow:n,container:r}=c(e),i=l(t,e.theme),o=z,s=d(e,()=>{o.isOpen?h(B.close(o)):o.isOverlayOpen?h(B.closeOverlay(o)):h(B.openOverlay(o))},()=>{!o.isOpen&&!o.isOverlayOpen&&h(B.openOverlay(o))}),u=M({onCollapse:()=>h(B.closeOverlay(o)),onSelectType:e=>h(B.selectTypeFromOverlay(o,e))}),p=k(n,{onClose:()=>h(B.close(o)),onSelectType:e=>h(B.selectType(o,e)),onBackToType:()=>h(B.backToOverlay(o)),onFormChange:(e,t)=>h(B.updateForm(o,{[e]:t})),onSubmit:async()=>{if(o.selectedType){h(B.submit(o));try{let t=await V(e.apiUrl,o.selectedType,o.formData);h(B.submitSuccess(o,t.trackingId))}catch(e){let t=e?.message??`Submission failed. Try again.`;h(B.submitError(o,t))}}}}),m=()=>{p.update(o,s),u.update(o.isOverlayOpen),f(s,o.isOpen||o.isOverlayOpen)},h=e=>{o=e,m()};return r.appendChild(p.el),r.appendChild(u.el),r.appendChild(s),document.body.appendChild(t),m(),function(){p.destroy(),i(),t.remove()}}var W=null;document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,()=>{W=U()}):W=U(),window.UserFeedbackWidget={destroy:()=>W?.()}})();