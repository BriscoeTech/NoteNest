#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=script/server-common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/server-common.sh"

show_usage() {
  cat <<'EOF'
Usage:
  ./script/start-server.sh

Builds NoteNest, stops any existing server on the configured port, starts the
built app detached or through a user systemd service, and verifies the path-based
health and frontend routes.

Environment overrides:
  NOTENEST_PORT=5300
  NOTENEST_HOST=0.0.0.0
  NOTENEST_PATH_BASE=/NoteNest
  NOTENEST_HEALTH_URL=http://127.0.0.1:5300/NoteNest/api/health
  NOTENEST_FRONTEND_URL=http://127.0.0.1:5300/NoteNest/
EOF
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  show_usage
  exit 0
fi

if [ $# -gt 0 ]; then
  echo "Unknown argument: $1"
  show_usage
  exit 64
fi

require_node_bin
require_npm_bin
mkdir -p "$RUNTIME_DIR"

cd "$ROOT_DIR"
write_restart_state "building" "Building NoteNest before restart."
: >"$BUILD_LOG_FILE"

if ! "$NPM_BIN" run build >"$BUILD_LOG_FILE" 2>&1; then
  write_restart_state "failed" "Build failed; existing server was left untouched."
  echo "Build failed. Check $BUILD_LOG_FILE"
  tail -n 40 "$BUILD_LOG_FILE" 2>/dev/null || true
  exit 1
fi

if [ ! -f "$ROOT_DIR/docs/index.html" ]; then
  write_restart_state "failed" "Built application was not found."
  echo "Built application not found at $ROOT_DIR/docs/index.html"
  exit 1
fi

write_restart_state "stopping" "Stopping existing NoteNest processes."
"$ROOT_DIR/script/stop-server.sh"

: >"$LOG_FILE"
rm -f "$PID_FILE" "$STATE_FILE"

START_MODE="detached"
STARTER_PID=""

if systemctl_user_available; then
  write_restart_state "installing" "Refreshing NoteNest user service."
  write_service_unit
  systemctl --user daemon-reload
  systemctl --user enable "$SERVICE_UNIT" >/dev/null

  write_restart_state "starting" "Starting NoteNest user service."
  systemctl --user reset-failed "$SERVICE_UNIT" 2>/dev/null || true
  systemctl --user start "$SERVICE_UNIT"
  START_MODE="systemd"
else
  write_restart_state "starting" "Starting NoteNest detached wrapper."
  if command -v setsid >/dev/null 2>&1; then
    nohup setsid "$ROOT_DIR/script/run-server.sh" >>"$LOG_FILE" 2>&1 < /dev/null &
  else
    nohup "$ROOT_DIR/script/run-server.sh" >>"$LOG_FILE" 2>&1 < /dev/null &
  fi

  STARTER_PID="$!"
  disown "$STARTER_PID" 2>/dev/null || true
fi

for _ in $(seq 1 "$START_TIMEOUT_SECONDS"); do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1 && curl -fsS "$FRONTEND_URL" >/dev/null 2>&1; then
    SERVER_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
    {
      printf 'managed_by=%q\n' "$START_MODE"
      printf 'service_unit=%q\n' "$SERVICE_UNIT"
      printf 'service_file=%q\n' "$SERVICE_FILE"
      printf 'host=%q\n' "$HOST"
      printf 'port=%q\n' "$PORT"
      printf 'path_base=%q\n' "$PATH_BASE"
      printf 'health_url=%q\n' "$HEALTH_URL"
      printf 'frontend_url=%q\n' "$FRONTEND_URL"
      printf 'server_pid=%q\n' "$SERVER_PID"
      printf 'started_at=%q\n' "$(date -Iseconds)"
      printf 'last_verified_at=%q\n' "$(date -Iseconds)"
    } >"$STATE_FILE"

    write_restart_state "succeeded" "NoteNest is healthy."
    echo "Started NoteNest on http://${HOST}:${PORT}${PATH_BASE}/"
    if [ "$START_MODE" = "systemd" ]; then
      echo "service: $SERVICE_UNIT"
    fi
    if [ -n "$SERVER_PID" ]; then
      echo "pid: $SERVER_PID"
    fi
    echo "log: $LOG_FILE"
    echo "build log: $BUILD_LOG_FILE"
    exit 0
  fi

  if [ "$START_MODE" = "systemd" ]; then
    if ! systemctl --user is-active --quiet "$SERVICE_UNIT"; then
      write_restart_state "failed" "NoteNest service exited before becoming healthy."
      echo "NoteNest service exited before becoming healthy. Check $LOG_FILE"
      tail -n 40 "$LOG_FILE" 2>/dev/null || true
      exit 1
    fi
  elif ! pid_is_running "$STARTER_PID"; then
    write_restart_state "failed" "NoteNest exited before becoming healthy."
    echo "NoteNest exited before becoming healthy. Check $LOG_FILE"
    tail -n 40 "$LOG_FILE" 2>/dev/null || true
    exit 1
  fi

  sleep 1
done

write_restart_state "failed" "Timed out waiting for NoteNest health checks."
echo "Timed out waiting for NoteNest on http://${HOST}:${PORT}${PATH_BASE}/."
tail -n 40 "$LOG_FILE" 2>/dev/null || true
exit 1
