#!/usr/bin/env bash
set -euo pipefail

HOST="${1:-127.0.0.1}"
PORT="${2:-5000}"
PID_FILE="/tmp/notenest-vite.pid"

if [[ -f "$PID_FILE" ]]; then
  PID="$(cat "$PID_FILE" || true)"
  if [[ -n "$PID" ]] && ps -p "$PID" > /dev/null 2>&1; then
    kill "$PID" || true
    sleep 1
    if ps -p "$PID" > /dev/null 2>&1; then
      kill -9 "$PID" || true
    fi
    rm -f "$PID_FILE"
    echo "Stopped Vite dev server (pid: $PID)."
    exit 0
  fi
fi

pkill -f "vite dev --port $PORT --host $HOST" > /dev/null 2>&1 || true
rm -f "$PID_FILE"
echo "No running Vite dev server found for http://$HOST:$PORT/."
