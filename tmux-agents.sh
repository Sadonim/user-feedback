#!/bin/zsh
# user-feedback 멀티에이전트 tmux 세션 시작 스크립트

PROJECT="$HOME/Desktop/Dev_claude/user-feedback"
SESSION="uf-agents"

# 기존 세션 있으면 종료
tmux kill-session -t $SESSION 2>/dev/null

# 새 세션 생성 (ARCHITECT)
tmux new-session -d -s $SESSION -n "ARCHITECT" -x 220 -y 50
tmux send-keys -t $SESSION:ARCHITECT "cd $PROJECT && claude --system-prompt \"\$(cat docs/agents/ARCHITECT.md)\"" Enter

# CRITIC
tmux new-window -t $SESSION -n "CRITIC"
tmux send-keys -t $SESSION:CRITIC "cd $PROJECT && claude --system-prompt \"\$(cat docs/agents/CRITIC.md)\"" Enter

# DESIGNER
tmux new-window -t $SESSION -n "DESIGNER"
tmux send-keys -t $SESSION:DESIGNER "cd $PROJECT && claude --system-prompt \"\$(cat docs/agents/DESIGNER.md)\"" Enter

# TESTER
tmux new-window -t $SESSION -n "TESTER"
tmux send-keys -t $SESSION:TESTER "cd $PROJECT && claude --system-prompt \"\$(cat docs/agents/TESTER.md)\"" Enter

# SECURITY
tmux new-window -t $SESSION -n "SECURITY"
tmux send-keys -t $SESSION:SECURITY "cd $PROJECT && claude --system-prompt \"\$(cat docs/agents/SECURITY.md)\"" Enter

# REFACTOR
tmux new-window -t $SESSION -n "REFACTOR"
tmux send-keys -t $SESSION:REFACTOR "cd $PROJECT && claude --system-prompt \"\$(cat docs/agents/REFACTOR.md)\"" Enter

# RUNNER
tmux new-window -t $SESSION -n "RUNNER"
tmux send-keys -t $SESSION:RUNNER "cd $PROJECT && claude --system-prompt \"\$(cat docs/agents/RUNNER.md)\"" Enter

# BACKEND
tmux new-window -t $SESSION -n "BACKEND"
tmux send-keys -t $SESSION:BACKEND "cd $PROJECT && claude --system-prompt \"\$(cat docs/agents/BACKEND.md)\"" Enter

# ARCHITECT 창으로 포커스
tmux select-window -t $SESSION:ARCHITECT
tmux attach-session -t $SESSION
