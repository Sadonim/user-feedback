# Handoffs

에이전트 간 통신 디렉토리입니다.

## 파일 네이밍

| 파일 | 작성자 | 내용 |
|------|--------|------|
| `design_[feature].md` | ARCHITECT | API 계약, DB 스키마, 컴포넌트 구조 |
| `critique_[feature].md` | CRITIC | 설계 검토 결과 및 개선안 |
| `security_[feature].md` | SECURITY | 보안 검토 결과 |

## STATUS 흐름

```
READY_FOR_CRITIC → REVIEWED → REVISED → READY_FOR_IMPL → DESIGN_DONE → SECURITY_REVIEWED → DONE
```

## 현재 진행 중인 Feature

| Feature | 설계 | 리뷰 | 상태 |
|---------|------|------|------|
| Phase 1 Foundation | `design_phase1_foundation.md` | `critique_phase1_foundation.md` | REVIEWED |
| Phase 2 Admin Dashboard | `design_phase2_admin.md` | — | READY_FOR_CRITIC |
