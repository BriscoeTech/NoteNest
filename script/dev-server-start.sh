#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOST="${1:-0.0.0.0}"
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

get_network_ips() {
  if command -v hostname >/dev/null 2>&1; then
    hostname -I 2>/dev/null | tr ' ' '\n' | sed '/^$/d' | grep -vE '^(127\.|::1$)' || true
    return
  fi
  if command -v ip >/dev/null 2>&1; then
    ip -o addr show scope global | awk '{print $4}' | cut -d/ -f1 || true
  fi
}

print_urls() {
  local host="$1"
  local port="$2"
  local local_url="${3:-}"

  if [[ -n "$local_url" ]]; then
    echo "URL: $local_url"
  else
    echo "URL: http://$host:$port/"
  fi

  if [[ "$host" == "0.0.0.0" ]]; then
    local ips
    ips="$(get_network_ips)"
    if [[ -n "$ips" ]]; then
      while IFS= read -r ip; do
        [[ -n "$ip" ]] || continue
        echo "Network URL: http://$ip:$port/"
      done <<< "$ips"
    fi
  fi
}

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
  print_urls "$EXISTING_HOST" "$EXISTING_PORT"
  exit 0
fi

if command -v lsof >/dev/null 2>&1; then
  LISTENER_PID="$(lsof -t -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | head -n 1 || true)"
  if [[ -n "$LISTENER_PID" ]]; then
    echo "Vite dev server appears to already be running on port $PORT (pid: $LISTENER_PID) - ignoring request."
    echo "IP: $HOST"
    echo "Port: $PORT"
    print_urls "$HOST" "$PORT"
    exit 0
  fi
fi

if command -v setsid >/dev/null 2>&1; then
  setsid node_modules/.bin/vite dev --host "$HOST" --port "$PORT" < /dev/null > "$LOG_FILE" 2>&1 &
else
  nohup node_modules/.bin/vite dev --host "$HOST" --port "$PORT" < /dev/null > "$LOG_FILE" 2>&1 &
fi
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
  print_urls "$HOST" "$PORT" "$LOCAL_URL"
else
  print_urls "$HOST" "$PORT"
fi
echo "Log: $LOG_FILE"
