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

  /* ── 플로팅 트리거 버튼 ──────────────────────────────────────────────────── */
  .wfb-trigger {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: var(--wfb-primary);
    color: var(--wfb-primary-text);
    border: none;
    border-radius: 9999px;
    font-family: var(--wfb-font);
    font-size: 14px;
    font-weight: 600;
    letter-spacing: .01em;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(79,70,229,.35);
    transition: background var(--wfb-transition), transform var(--wfb-transition), box-shadow var(--wfb-transition);
    outline: none;
    white-space: nowrap;
  }
  .wfb-trigger:hover  { background: var(--wfb-primary-hover); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(79,70,229,.45); }
  .wfb-trigger:active { transform: translateY(0); }
  .wfb-trigger:focus-visible { outline: 2px solid var(--wfb-primary); outline-offset: 3px; }
  .wfb-trigger-label  { font-family: var(--wfb-font); }

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
  `,t.style.setProperty(`--wfb-accent`,e.buttonColor);let n=t.attachShadow({mode:`open`}),r=document.createElement(`style`);r.textContent=o,n.appendChild(r);let i=document.createElement(`div`);return i.className=`wfb-wrap`,n.appendChild(i),{host:t,shadow:n,container:i}}function l(e,t){if(t!==`auto`)return e.setAttribute(`data-theme`,t),()=>{};if(typeof window.matchMedia!=`function`)return e.setAttribute(`data-theme`,`light`),()=>{};let n=window.matchMedia(`(prefers-color-scheme: dark)`),r=t=>{e.setAttribute(`data-theme`,t?`dark`:`light`)},i=e=>r(e.matches);return r(n.matches),n.addEventListener(`change`,i),()=>n.removeEventListener(`change`,i)}function u(){let e=document.createElementNS(`http://www.w3.org/2000/svg`,`svg`);e.setAttribute(`width`,`18`),e.setAttribute(`height`,`18`),e.setAttribute(`viewBox`,`0 0 24 24`),e.setAttribute(`fill`,`none`),e.setAttribute(`stroke`,`currentColor`),e.setAttribute(`stroke-width`,`2`),e.setAttribute(`stroke-linecap`,`round`),e.setAttribute(`stroke-linejoin`,`round`),e.setAttribute(`aria-hidden`,`true`),e.setAttribute(`focusable`,`false`);let t=document.createElementNS(`http://www.w3.org/2000/svg`,`path`);return t.setAttribute(`d`,`M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z`),e.appendChild(t),e}function d(e,t){let n=document.createElement(`button`);n.className=`wfb-trigger`,n.setAttribute(`type`,`button`),n.setAttribute(`aria-label`,e.buttonLabel),n.setAttribute(`aria-haspopup`,`dialog`),n.setAttribute(`aria-expanded`,`false`);let r=document.createElement(`span`);return r.className=`wfb-trigger-label`,r.textContent=e.buttonLabel,n.appendChild(u()),n.appendChild(r),n.addEventListener(`click`,t),n}function f(e,t){e.setAttribute(`aria-expanded`,t?`true`:`false`)}var p=[`button:not([disabled])`,`input:not([disabled])`,`textarea:not([disabled])`,`select:not([disabled])`,`[tabindex]:not([tabindex="-1"])`].join(`, `);function m(e){let t=()=>Array.from(e.querySelectorAll(p));t()[0]?.focus();let n=n=>{if(n.key!==`Tab`)return;let r=t();if(r.length===0)return;let i=r[0],a=r[r.length-1],o=e.getRootNode().activeElement;n.shiftKey?o===i&&(n.preventDefault(),a.focus()):o===a&&(n.preventDefault(),i.focus())};return e.addEventListener(`keydown`,n),()=>e.removeEventListener(`keydown`,n)}var h=[{type:`BUG`,emoji:`🐛`,name:`Bug Report`,description:`Something isn't working`},{type:`FEATURE`,emoji:`✨`,name:`Feature Request`,description:`Suggest an improvement`},{type:`GENERAL`,emoji:`💬`,name:`General Feedback`,description:`Share your thoughts`}];function g(e){let t=document.createElement(`div`);return t.className=`wfb-step-type`,h.forEach(n=>{let r=document.createElement(`div`);r.className=`wfb-type-card`,r.setAttribute(`role`,`button`),r.setAttribute(`tabindex`,`0`),r.setAttribute(`aria-pressed`,`false`),r.setAttribute(`data-type`,n.type),r.setAttribute(`aria-label`,`${n.name}: ${n.description}`);let i=document.createElement(`span`);i.className=`wfb-type-emoji`,i.setAttribute(`aria-hidden`,`true`),i.textContent=n.emoji;let a=document.createElement(`div`);a.className=`wfb-type-info`;let o=document.createElement(`span`);o.className=`wfb-type-name`,o.textContent=n.name;let s=document.createElement(`span`);s.className=`wfb-type-desc`,s.textContent=n.description,a.append(o,s),r.append(i,a);let c=()=>{r.setAttribute(`aria-pressed`,`true`),e(n.type)};r.addEventListener(`click`,c),r.addEventListener(`keydown`,e=>{(e.key===`Enter`||e.key===` `)&&(e.preventDefault(),c())}),t.appendChild(r)}),t}var _=[{id:`wfb-title`,field:`title`,label:`Title`,type:`input`,required:!0,placeholder:`Brief summary`,maxLength:200},{id:`wfb-description`,field:`description`,label:`Description`,type:`textarea`,required:!0,placeholder:`Describe in detail (at least 10 characters)`,maxLength:5e3},{id:`wfb-nickname`,field:`nickname`,label:`Nickname`,type:`input`,required:!0,placeholder:`Your name`,maxLength:100},{id:`wfb-email`,field:`email`,label:`Email`,type:`input`,inputType:`email`,required:!1,placeholder:`Optional — for follow-up`,maxLength:255}],v=`Submit Feedback`,y=`Submitting…`,b={BUG:`🐛 Bug Report`,FEATURE:`✨ Feature Request`,GENERAL:`💬 General`};function x(e,t,n,r){let i=document.createElement(`div`);i.className=`wfb-form`;let a=document.createElement(`div`);a.className=`wfb-form-header`;let o=document.createElement(`button`);o.className=`wfb-back-btn`,o.setAttribute(`data-wfb-back`,``),o.textContent=`← Back`,o.addEventListener(`click`,t);let s=document.createElement(`span`);s.className=`wfb-form-type-badge`,s.textContent=b[e.selectedType??``]??``,a.append(o,s),i.appendChild(a);let c=document.createElement(`div`);c.className=`wfb-error-banner`,c.setAttribute(`role`,`alert`),c.setAttribute(`data-wfb-error`,``),c.style.display=e.errorMessage?`block`:`none`,c.textContent=e.errorMessage??``,i.appendChild(c),_.forEach(t=>{let r=document.createElement(`div`);r.className=`wfb-field`;let a=document.createElement(`label`);if(a.className=`wfb-label`,a.setAttribute(`for`,t.id),a.textContent=t.label,t.required){let e=document.createElement(`span`);e.className=`wfb-required`,e.setAttribute(`aria-hidden`,`true`),e.textContent=` *`,a.appendChild(e)}let o;if(t.type===`textarea`){let r=document.createElement(`textarea`);r.className=`wfb-textarea`,r.id=t.id,r.placeholder=t.placeholder,r.maxLength=t.maxLength,r.required=t.required,r.setAttribute(`data-field`,t.field),r.value=e.formData[t.field],r.addEventListener(`input`,()=>n(t.field,r.value)),o=r}else{let r=document.createElement(`input`);r.className=`wfb-input`,r.id=t.id,r.type=t.inputType??`text`,r.placeholder=t.placeholder,r.maxLength=t.maxLength,r.required=t.required,r.setAttribute(`data-field`,t.field),r.value=e.formData[t.field],r.addEventListener(`input`,()=>n(t.field,r.value)),o=r}r.append(a,o),i.appendChild(r)});let l=document.createElement(`button`);return l.className=`wfb-submit-btn`,l.setAttribute(`data-wfb-submit`,``),l.disabled=e.step===`submitting`,l.textContent=e.step===`submitting`?y:v,l.addEventListener(`click`,r),i.appendChild(l),i}function S(e,t){let n=e.querySelector(`[data-wfb-error]`);n&&(n.textContent=t.errorMessage??``,n.style.display=t.errorMessage?`block`:`none`);let r=e.querySelector(`[data-wfb-submit]`);r&&(r.disabled=t.step===`submitting`,r.textContent=t.step===`submitting`?y:v)}var C=`Copy`,w=`Copied!`,T=2e3;function E(e){e.textContent=w,setTimeout(()=>{e.textContent=C},T)}function D(e,t){let n=document.createElement(`div`);n.className=`wfb-success`;let r=document.createElement(`span`);r.className=`wfb-success-icon`,r.setAttribute(`aria-hidden`,`true`),r.textContent=`✅`;let i=document.createElement(`h3`);i.className=`wfb-success-title`,i.textContent=`Feedback Submitted!`;let a=document.createElement(`p`);a.className=`wfb-success-desc`,a.textContent=`Your tracking ID:`;let o=document.createElement(`div`);o.className=`wfb-tracking-wrapper`;let s=document.createElement(`code`);s.className=`wfb-tracking-id`,s.textContent=e.trackingId??``;let c=document.createElement(`button`);c.className=`wfb-copy-btn`,c.setAttribute(`data-wfb-copy`,``),c.textContent=C,c.setAttribute(`aria-label`,`Copy tracking ID`),c.addEventListener(`click`,()=>{let t=e.trackingId??``;navigator.clipboard?navigator.clipboard.writeText(t).then(()=>E(c)).catch(()=>{c.textContent=`Copy manually`,setTimeout(()=>{c.textContent=C},T)}):(c.textContent=`Copy manually`,setTimeout(()=>{c.textContent=C},T))}),o.append(s,c);let l=document.createElement(`button`);return l.className=`wfb-close-success-btn`,l.setAttribute(`data-wfb-close`,``),l.textContent=`Close`,l.addEventListener(`click`,t),n.append(r,i,a,o,l),n}function O(e,t){let n=document.createElement(`div`);n.className=`wfb-popup`,n.setAttribute(`role`,`dialog`),n.setAttribute(`aria-modal`,`true`),n.setAttribute(`aria-label`,`Submit Feedback`),n.style.display=`none`;let r=k(t.onClose);n.appendChild(r);let i=document.createElement(`div`);i.className=`wfb-popup-content`,n.appendChild(i);let a=new AbortController,o=null,s=null;return e.addEventListener(`keydown`,e=>{let n=e;n.key===`Escape`&&(n.stopPropagation(),t.onClose())},{signal:a.signal}),{el:n,update:(e,r)=>{let a=n.style.display!==`none`;if(n.style.display=e.isOpen?`flex`:`none`,a&&!e.isOpen){o?.(),o=null,r.focus(),s=null;return}if(e.isOpen)if(e.step!==s){switch(i.textContent=``,s=e.step,e.step){case`type`:i.appendChild(g(t.onSelectType));break;case`form`:case`submitting`:i.appendChild(x(e,t.onBackToType,t.onFormChange,t.onSubmit));break;case`success`:i.appendChild(D(e,t.onClose));break}o?.(),o=m(n)}else (e.step===`form`||e.step===`submitting`)&&S(i,e)},destroy:()=>{o?.(),a.abort()}}}function k(e){let t=document.createElement(`div`);t.className=`wfb-popup-header`;let n=document.createElement(`span`);n.className=`wfb-popup-title`,n.textContent=`Send Feedback`;let r=document.createElement(`button`);r.className=`wfb-close-btn`,r.setAttribute(`aria-label`,`Close feedback form`);let i=document.createElementNS(`http://www.w3.org/2000/svg`,`svg`);i.setAttribute(`width`,`16`),i.setAttribute(`height`,`16`),i.setAttribute(`viewBox`,`0 0 24 24`),i.setAttribute(`fill`,`none`),i.setAttribute(`stroke`,`currentColor`),i.setAttribute(`stroke-width`,`2`),i.setAttribute(`aria-hidden`,`true`);let a=document.createElementNS(`http://www.w3.org/2000/svg`,`line`);a.setAttribute(`x1`,`18`),a.setAttribute(`y1`,`6`),a.setAttribute(`x2`,`6`),a.setAttribute(`y2`,`18`);let o=document.createElementNS(`http://www.w3.org/2000/svg`,`line`);return o.setAttribute(`x1`,`6`),o.setAttribute(`y1`,`6`),o.setAttribute(`x2`,`18`),o.setAttribute(`y2`,`18`),i.append(a,o),r.appendChild(i),r.addEventListener(`click`,e),t.append(n,r),t}var A={isOpen:!1,step:`type`,selectedType:null,formData:{title:``,description:``,nickname:``,email:``},trackingId:null,errorMessage:null},j={open:e=>({...e,isOpen:!0,step:`type`}),close:e=>({...A}),selectType:(e,t)=>({...e,selectedType:t,step:`form`}),backToType:e=>({...e,step:`type`,selectedType:null,errorMessage:null}),updateForm:(e,t)=>({...e,formData:{...e.formData,...t}}),submit:e=>({...e,step:`submitting`,errorMessage:null}),submitSuccess:(e,t)=>({...e,step:`success`,trackingId:t}),submitError:(e,t)=>({...e,step:`form`,errorMessage:t})};async function M(e,t,n){let r=n.email.trim(),i={type:t,title:n.title.trim(),description:n.description.trim(),nickname:n.nickname.trim(),...r?{email:r}:{}},a;try{a=await fetch(`${e}/api/v1/feedback`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify(i)})}catch{throw{message:`Network error. Please check your connection.`,statusCode:0}}let o=await a.json().catch(()=>null);if(!a.ok||!o?.success)throw{message:o?.error??`Request failed (HTTP ${a.status})`,statusCode:a.status};return{trackingId:o.data.trackingId,status:o.data.status}}var N=document.currentScript;function P(){if(document.querySelector(`[data-ufb-widget]`))return null;let e=a(N);if(!e)return null;let{host:t,shadow:n,container:r}=c(e),i=l(t,e.theme),o=A,s=d(e,()=>{m(o.isOpen?j.close(o):j.open(o))}),u=O(n,{onClose:()=>m(j.close(o)),onSelectType:e=>m(j.selectType(o,e)),onBackToType:()=>m(j.backToType(o)),onFormChange:(e,t)=>m(j.updateForm(o,{[e]:t})),onSubmit:async()=>{if(o.selectedType){m(j.submit(o));try{let t=await M(e.apiUrl,o.selectedType,o.formData);m(j.submitSuccess(o,t.trackingId))}catch(e){let t=e?.message??`Submission failed. Try again.`;m(j.submitError(o,t))}}}}),p=()=>{u.update(o,s),f(s,o.isOpen)},m=e=>{o=e,p()};return r.appendChild(u.el),r.appendChild(s),document.body.appendChild(t),p(),function(){u.destroy(),i(),t.remove()}}var F=null;document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,()=>{F=P()}):F=P(),window.UserFeedbackWidget={destroy:()=>F?.()}})();