#!/bin/zsh
# 8개 에이전트를 한 화면에서 모니터링하는 tmux 뷰
# 사용법: ./tmux-overview.sh

SESSION="uf-agents"
OVERVIEW="uf-overview"

# uf-agents 세션이 없으면 경고
if ! tmux has-session -t $SESSION 2>/dev/null; then
  echo "uf-agents 세션이 없습니다. 먼저 ./tmux-agents.sh 를 실행하세요."
  exit 1
fi

# 기존 overview 세션 종료 후 재생성
tmux kill-session -t $OVERVIEW 2>/dev/null

# overview 세션 — 8분할 레이아웃
# 가로 4, 세로 2 = 8칸
tmux new-session -d -s $OVERVIEW -x 280 -y 70

# 상단 4칸 만들기
tmux split-window -t $OVERVIEW -h          # 좌/우 2칸
tmux split-window -t $OVERVIEW:0.0 -h      # 왼쪽 반 → 3칸
tmux split-window -t $OVERVIEW:0.1 -h      # 오른쪽 반 → 4칸

# 하단 4칸 만들기 (각 칸 수직 분할)
tmux split-window -t $OVERVIEW:0.0 -v
tmux split-window -t $OVERVIEW:0.2 -v
tmux split-window -t $OVERVIEW:0.4 -v
tmux split-window -t $OVERVIEW:0.6 -v

# 각 칸에 에이전트 창 미러링 (watch 모드)
# pane 0 → ARCHITECT
tmux send-keys -t $OVERVIEW:0.0 "tmux attach-session -t $SESSION:ARCHITECT -r" Enter
# pane 1 → ARCHITECT 하단 여백 (선택: CRITIC 미러)
tmux send-keys -t $OVERVIEW:0.1 "tmux attach-session -t $SESSION:CRITIC -r" Enter
# pane 2 → CRITIC 오른쪽
tmux send-keys -t $OVERVIEW:0.2 "tmux attach-session -t $SESSION:DESIGNER -r" Enter
# pane 3 → DESIGNER 하단
tmux send-keys -t $OVERVIEW:0.3 "tmux attach-session -t $SESSION:BACKEND -r" Enter
# pane 4 → TESTER
tmux send-keys -t $OVERVIEW:0.4 "tmux attach-session -t $SESSION:TESTER -r" Enter
# pane 5 → TESTER 하단
tmux send-keys -t $OVERVIEW:0.5 "tmux attach-session -t $SESSION:SECURITY -r" Enter
# pane 6 → REFACTOR
tmux send-keys -t $OVERVIEW:0.6 "tmux attach-session -t $SESSION:REFACTOR -r" Enter
# pane 7 → RUNNER
tmux send-keys -t $OVERVIEW:0.7 "tmux attach-session -t $SESSION:RUNNER -r" Enter

# overview 세션에 연결
tmux attach-session -t $OVERVIEW
