# 인계 문서 — 세션 재개용

## 현재 상태 (2026-03-15 저녁)

### 완료된 작업
- ✅ Phase 1 — 전체 완료
- ✅ Phase 2 — Admin Dashboard 전체 완료 + git push
  - 빌드 성공, 테스트 212/212 통과, 커버리지 90.69%
  - 보안 이슈 전부 수정 (C1/C2/C3/H2/H3)
  - GitHub master 브랜치 반영 완료

### 미완료
- 🔲 Phase 3 — Embeddable Widget
- 🔲 Phase 4 — Notifications + Rate Limiting (Upstash)
- 🔲 Phase 5 — Advanced Features

---

## 다음 세션 시작 방법

```
user-feedback Phase 3 Embeddable Widget 시작해줘.
docs/DEVELOPMENT_PLAN.md 와 CLAUDE.md 참고해서 진행해.
멀티에이전트 오케스트레이션으로 ARCHITECT → CRITIC → 구현 순으로.
```

### Phase 3 구현 범위
- 3-1. Vite/esbuild로 widget.js 단일 번들 빌드 파이프라인
- 3-2. Shadow DOM으로 호스트 CSS 격리
- 3-3. 플로팅 버튼 → 팝업 폼 (타입 선택 → 내용 → 제출)
- 3-4. data-* 속성으로 커스터마이징 (테마, 위치)
- 3-5. POST /api/v1/feedback 연동, CORS 설정
- 3-6. 다크모드 지원

---

## tmux 세션 재개
```bash
tmux attach -t uf-agents
# 세션 죽었으면:
cd ~/Desktop/Dev_claude/user-feedback && ./tmux-agents.sh
```

## 환경
- 프로젝트: `~/Desktop/Dev_claude/user-feedback`
- DB: Supabase (마이그레이션 + 시드 완료)
- 관리자 계정: admin@example.com / admin1234
- tmux 세션: `uf-agents` (7개 창)

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
