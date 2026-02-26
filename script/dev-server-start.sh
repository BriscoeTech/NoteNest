#!/usr/bin/env bash
set -euo pipefail

HOST="${1:-127.0.0.1}"
PORT="${2:-5000}"
PID_FILE="/tmp/notenest-vite.pid"
LOG_FILE="/tmp/notenest-vite.log"

if [[ -f "$PID_FILE" ]]; then
  PID="$(cat "$PID_FILE" || true)"
  if [[ -n "$PID" ]] && ps -p "$PID" > /dev/null 2>&1; then
    echo "Vite dev server already running (pid: $PID)."
    echo "Log: $LOG_FILE"
    exit 0
  fi
fi

nohup npm run dev -- --host "$HOST" --port "$PORT" > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

sleep 1
echo "Started Vite dev server (pid: $(cat "$PID_FILE"))."
echo "URL: http://$HOST:$PORT/"
echo "Log: $LOG_FILE"
