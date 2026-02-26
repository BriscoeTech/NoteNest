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

pkill -f "vite dev" > /dev/null 2>&1 || true

nohup npm run dev -- --host "$HOST" --port "$PORT" > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

for _ in {1..20}; do
  LOCAL_LINE="$(grep -m 1 "Local:" "$LOG_FILE" || true)"
  if [[ -n "$LOCAL_LINE" ]]; then
    break
  fi
  sleep 0.2
done

echo "Started Vite dev server (pid: $(cat "$PID_FILE"))."
if [[ -n "$LOCAL_LINE" ]]; then
  echo "$LOCAL_LINE"
else
  echo "URL: http://$HOST:$PORT/"
fi
echo "Log: $LOG_FILE"
