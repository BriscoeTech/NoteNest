#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=script/server-common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/server-common.sh"

require_node_bin
mkdir -p "$RUNTIME_DIR"

APP_PID=""
APP_EXIT_CODE=""
APP_EXIT_SIGNAL=""

cleanup() {
  local exit_code="$?"
  local exit_message="NoteNest exited"

  if [ -n "${APP_EXIT_CODE:-}" ]; then
    exit_code="$APP_EXIT_CODE"
  fi

  if [ -z "${APP_EXIT_SIGNAL:-}" ] && [ "$exit_code" -gt 128 ]; then
    APP_EXIT_SIGNAL="$((exit_code - 128))"
  fi

  if [ -n "${APP_EXIT_SIGNAL:-}" ]; then
    exit_message="$exit_message after signal $APP_EXIT_SIGNAL"
  fi

  rm -f "$PID_FILE"

  if [ -f "$STATE_FILE" ]; then
    printf 'last_exit_at=%q\n' "$(date -Iseconds)" >>"$STATE_FILE"
    printf 'last_exit_code=%q\n' "$exit_code" >>"$STATE_FILE"
    printf 'last_exit_signal=%q\n' "${APP_EXIT_SIGNAL:-}" >>"$STATE_FILE"
    printf 'last_exit_message=%q\n' "$exit_message" >>"$STATE_FILE"
  fi

  printf '[%s] %s with code %s\n' "$(date -Iseconds)" "$exit_message" "$exit_code" >>"$LOG_FILE"
}

terminate() {
  local signal_name="$1"
  local signal_code="$2"

  APP_EXIT_SIGNAL="$signal_name"
  printf '[%s] NoteNest wrapper received SIG%s; forwarding to app pid %s\n' "$(date -Iseconds)" "$signal_name" "${APP_PID:-unknown}" >>"$LOG_FILE"

  if [ -n "${APP_PID:-}" ] && kill -0 "$APP_PID" 2>/dev/null; then
    kill "$APP_PID" 2>/dev/null || true
    wait "$APP_PID" 2>/dev/null || true
  fi

  exit "$signal_code"
}

trap 'terminate TERM 143' TERM
trap 'terminate INT 130' INT
trap cleanup EXIT

cd "$ROOT_DIR"

if [ ! -f "$ROOT_DIR/docs/index.html" ]; then
  printf '[%s] Built app not found at %s\n' "$(date -Iseconds)" "$ROOT_DIR/docs/index.html" >>"$LOG_FILE"
  exit 1
fi

printf '[%s] Starting NoteNest on http://%s:%s%s/ with %s\n' "$(date -Iseconds)" "$HOST" "$PORT" "$PATH_BASE" "$NODE_BIN" >>"$LOG_FILE"
"$NODE_BIN" "$ROOT_DIR/script/serve-built.mjs" >>"$LOG_FILE" 2>&1 &
APP_PID="$!"

printf '%s\n' "$APP_PID" >"$PID_FILE"
if [ -f "$STATE_FILE" ]; then
  {
    printf 'server_pid=%q\n' "$APP_PID"
    printf 'process_started_at=%q\n' "$(date -Iseconds)"
  } >>"$STATE_FILE"
else
  {
    printf 'managed_by=%q\n' "unknown"
    printf 'host=%q\n' "$HOST"
    printf 'port=%q\n' "$PORT"
    printf 'path_base=%q\n' "$PATH_BASE"
    printf 'health_url=%q\n' "$HEALTH_URL"
    printf 'frontend_url=%q\n' "$FRONTEND_URL"
    printf 'server_pid=%q\n' "$APP_PID"
    printf 'process_started_at=%q\n' "$(date -Iseconds)"
  } >"$STATE_FILE"
fi

set +e
wait "$APP_PID"
APP_EXIT_CODE="$?"
set -e
exit "$APP_EXIT_CODE"
