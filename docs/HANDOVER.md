# 인계 문서 — 세션 재개용

## 현재 상태 (2026-03-16)

### 완료된 작업
- ✅ Phase 1 — 전체 완료
- ✅ Phase 2 — Admin Dashboard 전체 완료 + git push
  - 빌드 성공, 테스트 212/212 통과, 커버리지 90.69%
  - 보안 이슈 전부 수정 (C1/C2/C3/H2/H3)
  - GitHub master 브랜치 반영 완료
- ✅ Phase 3 — Embeddable Widget 전체 완료
  - 빌드 성공, 테스트 434/434 통과
  - widget.js 번들: 26.6kB (gzip 6.8kB) — 목표 50kB 이하 ✅
  - 보안 이슈 수정 (H1 sanitizeCallbackUrl, H2 DUMMY_HASH, H3 CORS env guard, H4 sort 타입가드)
  - RUNNER STATUS: PASS

### 미완료
- 🔲 Phase 4 — Notifications + Rate Limiting (Upstash)
- 🔲 Phase 5 — Advanced Features

---

## Phase 3 구현 내용 요약

### 새로 추가된 파일
```
src/widget/
├── index.ts          # 엔트리포인트 — Shadow DOM 마운트, data-* 초기화
├── api.ts            # POST /api/v1/feedback fetch 클라이언트
├── config.ts         # parseConfigFromScript() — data-* 속성 파싱
├── state.ts          # 상태 머신 (IDLE→TYPE_SELECT→CONTENT→SUBMITTING→SUCCESS/ERROR)
├── styles.ts         # Shadow DOM 스타일 (다크모드 포함)
├── utils/
│   └── focus-trap.ts
└── ui/
    ├── button.ts     # 플로팅 버튼
    ├── root.ts       # Shadow DOM root
    └── steps/
        ├── index.ts
        ├── type-select.ts  # Step 1 — 피드백 타입 선택
        ├── form.ts         # Step 2 — 내용 입력
        └── success.ts      # Step 3 — 제출 완료

src/lib/api/cors.ts              # CORS 헬퍼 (origin whitelist + env guard)
src/lib/auth/sanitize-callback-url.ts  # Open redirect 방지
```

### 테스트 추가
```
src/__tests__/unit/
├── widget-config.test.ts
├── widget-api.test.ts
├── widget-state.test.ts
└── widget-ui.test.ts
```

---

## 다음 세션 시작 방법

```
user-feedback Phase 4 Notifications & Rate Limiting 시작해줘.
docs/DEVELOPMENT_PLAN.md 와 CLAUDE.md 참고해서 진행해.
멀티에이전트 오케스트레이션으로 ARCHITECT → CRITIC → 구현 순으로.
```

### Phase 4 구현 범위
- 4-1. 피드백 제출 시 관리자 이메일 알림 (Resend 또는 Nodemailer)
- 4-2. 티켓 상태 변경 시 제출자 이메일 알림
- 4-3. Rate Limiting — Upstash Redis (공개 API 엔드포인트)
- 4-4. Webhook 지원 (선택)

---

## tmux 세션 재개
```bash
# 세션 살아있으면:
tmux attach -t uf-agents

# 세션 죽었으면 — 8개 에이전트 재시작:
PROJECT="/Users/sadonim/Desktop/Dev_claude/user-feedback"
SESSION="uf-agents"
AGENTS=(ARCHITECT CRITIC DESIGNER TESTER SECURITY REFACTOR RUNNER BACKEND)
tmux new-session -d -s "$SESSION"
for AGENT in "${AGENTS[@]}"; do
  tmux new-window -t "$SESSION" -n "$AGENT" -d
  tmux send-keys -t "$SESSION:$AGENT" "cd $PROJECT && claude --system-prompt \"\$(cat docs/agents/${AGENT}.md)\"" Enter
done
cd ~/.claude/claude-tmux-grid && bash auto-layout.sh -s "$SESSION" -w overview "${AGENTS[@]}"
```

## 환경
- 프로젝트: `~/Desktop/Dev_claude/user-feedback`
- DB: Supabase (마이그레이션 + 시드 완료)
- 관리자 계정: admin@example.com / admin1234
- tmux 세션: `uf-agents` (8개 창 + overview)

## 기술 스택
| 패키지 | 버전 | 비고 |
|--------|------|------|
| Next.js | 16.1.6 | Turbopack |
| Prisma | 5.22.0 | v7 아님 주의 |
| Zod | 4.3.6 | v4 API |
| shadcn/ui | 4.0.7 | @base-ui/react 기반 |
| Tailwind | v4 | |
| next-auth | 5.0.0-beta.30 | |
| bcryptjs | 3.0.3 | |
