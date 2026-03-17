# 인계 문서 — 세션 재개용

## 현재 상태 (2026-03-17)

### 완료된 작업
- ✅ Phase 1 — 전체 완료
- ✅ Phase 2 — Admin Dashboard 전체 완료 + git push
- ✅ Phase 3 — Embeddable Widget 전체 완료
  - 빌드 성공, 테스트 434/434 통과
  - widget.js 번들: 26.6kB (gzip 6.8kB)
- ✅ Phase 4 — Notifications & Rate Limiting **전체 완료 + git push**
  - 523/523 테스트 통과
  - 이메일 서비스 (Resend adapter), 관리자 알림, Rate Limiting (Upstash) 구현 완료
  - 테스트 수정: rate-limit mock (화살표 함수 → 일반 함수, slidingWindow static mock 추가)
  - 테스트 수정: feedback-submit IP 추출 방향 (첫 번째 → 마지막, Vercel platform-appended)
  - 테스트 수정: feedback-track stale DB 레코드 cleanup 추가

### 미완료
- 🔲 Phase 4 — 접근성 감사 (WCAG 2.1 AA) — 4-5 미착수
- 🔲 Phase 5 — Advanced Features

---

## Phase 4 구현 내용 (2026-03-17)

### 새로 추가된 패키지
```
resend, @upstash/ratelimit, @upstash/redis
```

### 새로 추가된 파일
```
src/server/services/email/
├── email.adapter.ts          # IEmailAdapter 인터페이스
├── email.service.ts          # EmailService 구현 (IEmailService)
├── index.ts                  # 싱글톤 팩토리 (createEmailService)
├── adapters/
│   ├── resend.adapter.ts     # Resend SDK 래퍼
│   └── null.adapter.ts       # No-op (dev/test용)
└── templates/
    ├── status-changed.ts     # 제출자 상태변경 알림 템플릿
    └── new-feedback.ts       # 관리자 새 피드백 알림 템플릿

src/__tests__/unit/
├── email-templates.test.ts   # 템플릿 순수함수 테스트
├── email-service.test.ts     # EmailService + parseAdminEmails 테스트
└── rate-limit.test.ts        # Upstash mock 테스트

src/__tests__/integration/
├── ticket-notifications.test.ts         # PATCH → emailService 호출 검증
└── feedback-admin-notification.test.ts  # POST → 관리자 알림 검증
```

### 수정된 파일
| 파일 | 변경 내용 |
|------|-----------|
| `src/lib/rate-limit.ts` | in-memory → Upstash Redis slidingWindow(5, 10m), 동일 signature 유지 |
| `src/app/api/v1/tickets/[id]/route.ts` | 트랜잭션 내 email/title/trackingId 캡처, await emailService (C1/C2 fix) |
| `src/app/api/v1/feedback/route.ts` | 관리자 알림 추가, IP 추출 last-entry 방식으로 변경 (H1 fix) |
| `src/__tests__/integration/ticket-detail.test.ts` | "same status+no note → 히스토리 미생성" gap 테스트 추가 |

### 보안 수정 (SECURITY agent)
- **H1** IP 스푸핑 방지: `X-Forwarded-For` 마지막 항목 사용 + 45자 cap
- **H2** SMTP 헤더 인젝션 방지: `esc()` 함수에 `\r\n` 제거 추가 (두 템플릿 모두)

### 주요 설계 결정
- 이메일 어댑터 패턴 (Resend ↔ NullAdapter, 테스트에서 vi.mock)
- `RESEND_API_KEY` 미설정 시 NullAdapter 자동 사용 (dev 환경 무중단)
- `ADMIN_NOTIFICATION_EMAILS` 쉼표 구분, 유효성 검사 후 필터링
- await + try/catch 패턴 (void 사용 금지 — serverless에서 불안전)
- Upstash 미설정 또는 Redis 오류 시 allow=true 폴백

### 환경변수 추가 필요
```bash
RESEND_API_KEY=          # 없으면 NullAdapter 사용 (prod에서 필수)
EMAIL_FROM=              # 발신자 주소 (예: Feedback <noreply@yourapp.com>)
ADMIN_NOTIFICATION_EMAILS=  # 쉼표구분 관리자 이메일 (없으면 알림 스킵)
UPSTASH_REDIS_REST_URL=  # 없으면 rate limit 비활성화
UPSTASH_REDIS_REST_TOKEN=
```

---

## 다음 세션 시작 방법

```
user-feedback Phase 4 마무리 + Phase 5 시작해줘.
docs/HANDOVER.md 참고.
먼저 npm test 전체 통과 확인 후 git push, 그 다음 Phase 4-5 (접근성 감사) 처리,
이후 Phase 5로 넘어가.
```

### 다음 세션 즉시 할 일
1. `npm test` 전체 통과 확인 (ticket-notifications, feedback-admin-notification, rate-limit 포함)
2. `npm run build` 확인
3. `git add -A && git commit && git push` (master)
4. Phase 4-5 접근성 감사 (WCAG 2.1 AA)
5. Phase 5 착수

---

## tmux 세션 재개
```bash
tmux attach -t uf-agents

# 세션 죽었으면:
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
| resend | latest | Phase 4 추가 |
| @upstash/ratelimit | latest | Phase 4 추가 |
| @upstash/redis | latest | Phase 4 추가 |
