#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=script/server-common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/server-common.sh"

PIDS=()
RECORDED_PID=""

if systemctl_user_available; then
  systemctl --user stop "$SERVICE_UNIT" --no-block 2>/dev/null || true

  for _ in $(seq 1 15); do
    if ! systemctl --user is-active --quiet "$SERVICE_UNIT" >/dev/null 2>&1; then
      break
    fi

    sleep 1
  done

  if systemctl --user is-active --quiet "$SERVICE_UNIT" >/dev/null 2>&1; then
    systemctl --user kill "$SERVICE_UNIT" --kill-who=all --signal=TERM 2>/dev/null || true
    sleep 1
  fi
fi

if [ -f "$PID_FILE" ]; then
  RECORDED_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if pid_matches_app "$RECORDED_PID" && pid_listens_on_port "$RECORDED_PID"; then
    PIDS+=("$RECORDED_PID")
  fi
fi

if command -v ss >/dev/null 2>&1; then
  while IFS= read -r pid; do
    if [ -n "$pid" ] && pid_matches_app "$pid"; then
      PIDS+=("$pid")
    fi
  done < <(ss -ltnp "sport = :$PORT" 2>/dev/null | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' | sort -u)
fi

if [ "${#PIDS[@]}" -eq 0 ]; then
  if [ -z "$RECORDED_PID" ] || ! pid_is_running "$RECORDED_PID" || ! pid_matches_app "$RECORDED_PID"; then
    rm -f "$PID_FILE"
  fi
  if systemctl_user_available; then
    systemctl --user reset-failed "$SERVICE_UNIT" 2>/dev/null || true
  fi
  echo "No NoteNest server process found."
  exit 0
fi

for pid in "${PIDS[@]}"; do
  kill "$pid" 2>/dev/null || true
done

for _ in $(seq 1 15); do
  STILL_RUNNING=0
  for pid in "${PIDS[@]}"; do
    if pid_is_running "$pid"; then
      STILL_RUNNING=1
    fi
  done

  if [ "$STILL_RUNNING" -eq 0 ]; then
    rm -f "$PID_FILE"
    if systemctl_user_available; then
      systemctl --user reset-failed "$SERVICE_UNIT" 2>/dev/null || true
    fi
    echo "Stopped NoteNest."
    exit 0
  fi

  sleep 1
done

for pid in "${PIDS[@]}"; do
  kill -9 "$pid" 2>/dev/null || true
done

rm -f "$PID_FILE"
if systemctl_user_available; then
  systemctl --user reset-failed "$SERVICE_UNIT" 2>/dev/null || true
fi
echo "Stopped NoteNest with SIGKILL."
