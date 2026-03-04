#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOST="${1:-127.0.0.1}"
PORT="${2:-5000}"
PID_FILE="/tmp/notenest-vite.pid"
LOG_FILE="/tmp/notenest-vite.log"
LOCK_DIR="/tmp/notenest-vite-start.lock"

cd "$PROJECT_ROOT"

for _ in {1..50}; do
  if mkdir "$LOCK_DIR" 2>/dev/null; then
    break
  fi
  sleep 0.1
done

if [[ ! -d "$LOCK_DIR" ]]; then
  echo "Another dev-server start is already in progress. Try again in a moment."
  exit 0
fi

cleanup_lock() {
  rmdir "$LOCK_DIR" 2>/dev/null || true
}
trap cleanup_lock EXIT

if [[ ! -f "package.json" ]]; then
  echo "Cannot find package.json in project root: $PROJECT_ROOT"
  exit 1
fi

if [[ ! -x "node_modules/.bin/vite" ]]; then
  echo "Missing local Vite binary at node_modules/.bin/vite"
  echo "Run: npm install"
  exit 1
fi

EXISTING_LINE="$(pgrep -af "vite.*dev|npm.*run[[:space:]]+dev" | head -n 1 || true)"
if [[ -n "$EXISTING_LINE" ]]; then
  EXISTING_PID="${EXISTING_LINE%% *}"
  EXISTING_CMD="${EXISTING_LINE#* }"
  EXISTING_HOST="$(echo "$EXISTING_CMD" | sed -nE 's/.*--host[[:space:]]+([^[:space:]]+).*/\1/p' | head -n 1)"
  EXISTING_PORT="$(echo "$EXISTING_CMD" | sed -nE 's/.*--port[[:space:]]+([0-9]+).*/\1/p' | head -n 1)"
  [[ -n "$EXISTING_HOST" ]] || EXISTING_HOST="$HOST"
  [[ -n "$EXISTING_PORT" ]] || EXISTING_PORT="$PORT"
  echo "Vite dev server already running (pid: $EXISTING_PID) - ignoring request."
  echo "IP: $EXISTING_HOST"
  echo "Port: $EXISTING_PORT"
  echo "URL: http://$EXISTING_HOST:$EXISTING_PORT/"
  exit 0
fi

if command -v lsof >/dev/null 2>&1; then
  LISTENER_PID="$(lsof -t -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | head -n 1 || true)"
  if [[ -n "$LISTENER_PID" ]]; then
    echo "Vite dev server appears to already be running on port $PORT (pid: $LISTENER_PID) - ignoring request."
    echo "IP: $HOST"
    echo "Port: $PORT"
    echo "URL: http://$HOST:$PORT/"
    exit 0
  fi
fi

nohup npm run dev -- --host "$HOST" --port "$PORT" > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

for _ in {1..40}; do
  LOCAL_LINE="$(grep -m 1 "Local:" "$LOG_FILE" || true)"
  if [[ -n "$LOCAL_LINE" ]]; then
    break
  fi
  if ! ps -p "$(cat "$PID_FILE")" > /dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

if ! ps -p "$(cat "$PID_FILE")" > /dev/null 2>&1; then
  echo "Failed to start Vite dev server."
  echo "Log: $LOG_FILE"
  tail -n 20 "$LOG_FILE" || true
  rm -f "$PID_FILE"
  exit 1
fi

echo "Started Vite dev server (pid: $(cat "$PID_FILE"))."
echo "IP: $HOST"
echo "Port: $PORT"
if [[ -n "$LOCAL_LINE" ]]; then
  LOCAL_URL="$(echo "$LOCAL_LINE" | sed -nE 's/.*(https?:\/\/[^[:space:]]+).*/\1/p' | head -n 1)"
  if [[ -n "$LOCAL_URL" ]]; then
    echo "URL: $LOCAL_URL"
  else
    echo "URL: http://$HOST:$PORT/"
  fi
else
  echo "URL: http://$HOST:$PORT/"
fi
echo "Log: $LOG_FILE"
