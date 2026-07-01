#!/usr/bin/env bash

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${NOTENEST_ROOT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
APP_NAME="${NOTENEST_APP_NAME:-NoteNest}"
PORT="${NOTENEST_PORT:-5300}"
HOST="${NOTENEST_HOST:-0.0.0.0}"
PATH_BASE="${NOTENEST_PATH_BASE:-/NoteNest}"
if [ -n "$PATH_BASE" ] && [ "$PATH_BASE" != "/" ]; then
  PATH_BASE="/${PATH_BASE#/}"
  PATH_BASE="${PATH_BASE%/}"
else
  PATH_BASE=""
fi
RUNTIME_DIR="${NOTENEST_RUNTIME_DIR:-$ROOT_DIR/.runtime}"
LOG_FILE="${NOTENEST_LOG_FILE:-$RUNTIME_DIR/notenest.log}"
BUILD_LOG_FILE="${NOTENEST_BUILD_LOG_FILE:-$RUNTIME_DIR/notenest.build.log}"
PID_FILE="${NOTENEST_PID_FILE:-$RUNTIME_DIR/notenest.pid}"
STATE_FILE="${NOTENEST_STATE_FILE:-$RUNTIME_DIR/notenest.state}"
RESTART_STATE_FILE="${NOTENEST_RESTART_STATE_FILE:-$RUNTIME_DIR/notenest.restart.state}"
HEALTH_URL="${NOTENEST_HEALTH_URL:-http://127.0.0.1:${PORT}${PATH_BASE}/api/health}"
FRONTEND_URL="${NOTENEST_FRONTEND_URL:-http://127.0.0.1:${PORT}${PATH_BASE}/}"
NODE_BIN="${NOTENEST_NODE_BIN:-${NODE_BIN:-}}"
NPM_BIN="${NOTENEST_NPM_BIN:-${NPM_BIN:-}}"
START_TIMEOUT_SECONDS="${NOTENEST_START_TIMEOUT_SECONDS:-45}"
SERVICE_NAME="${NOTENEST_SERVICE_NAME:-notenest}"
SERVICE_UNIT="${NOTENEST_SERVICE_UNIT:-${SERVICE_NAME}.service}"
SYSTEMD_USER_DIR="${NOTENEST_SYSTEMD_USER_DIR:-$HOME/.config/systemd/user}"
SERVICE_FILE="${NOTENEST_SERVICE_FILE:-$SYSTEMD_USER_DIR/$SERVICE_UNIT}"

resolve_node_bin() {
  if [ -n "${NODE_BIN:-}" ] && [ -x "$NODE_BIN" ]; then
    export NODE_BIN
    return 0
  fi

  NODE_BIN="$(command -v node || true)"
  export NODE_BIN
}

require_node_bin() {
  resolve_node_bin

  if [ -z "${NODE_BIN:-}" ] || [ ! -x "$NODE_BIN" ]; then
    echo "node not found. Install Node.js or set NOTENEST_NODE_BIN."
    exit 1
  fi
}

resolve_npm_bin() {
  if [ -n "${NPM_BIN:-}" ] && command -v "$NPM_BIN" >/dev/null 2>&1; then
    export NPM_BIN
    return 0
  fi

  NPM_BIN="$(command -v npm || true)"
  export NPM_BIN
}

require_npm_bin() {
  resolve_npm_bin

  if [ -z "${NPM_BIN:-}" ]; then
    echo "npm not found. Install npm or set NOTENEST_NPM_BIN."
    exit 1
  fi
}

write_restart_state() {
  local status="$1"
  local message="${2:-}"

  mkdir -p "$RUNTIME_DIR"
  {
    printf 'status=%q\n' "$status"
    printf 'message=%q\n' "$message"
    printf 'updated_at=%q\n' "$(date -Iseconds)"
  } >"$RESTART_STATE_FILE"
}

systemctl_user_available() {
  command -v systemctl >/dev/null 2>&1 \
    && systemctl --user show-environment >/dev/null 2>&1
}

systemd_unit_escape_value() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

write_systemd_environment() {
  local name="$1"
  local value="$2"

  printf 'Environment="%s=%s"\n' "$name" "$(systemd_unit_escape_value "$value")"
}

write_service_unit() {
  require_node_bin
  mkdir -p "$SYSTEMD_USER_DIR"

  {
    printf '%s\n' '[Unit]'
    printf '%s\n' 'Description=NoteNest web app'
    printf '%s\n' 'After=network-online.target tailscaled.service'
    printf '%s\n' 'Wants=network-online.target'
    printf '%s\n' ''
    printf '%s\n' '[Service]'
    printf '%s\n' 'Type=simple'
    printf 'WorkingDirectory=%s\n' "$ROOT_DIR"
    write_systemd_environment NOTENEST_ROOT_DIR "$ROOT_DIR"
    write_systemd_environment NOTENEST_APP_NAME "$APP_NAME"
    write_systemd_environment NOTENEST_PORT "$PORT"
    write_systemd_environment NOTENEST_HOST "$HOST"
    write_systemd_environment NOTENEST_PATH_BASE "$PATH_BASE"
    write_systemd_environment NOTENEST_RUNTIME_DIR "$RUNTIME_DIR"
    write_systemd_environment NOTENEST_LOG_FILE "$LOG_FILE"
    write_systemd_environment NOTENEST_BUILD_LOG_FILE "$BUILD_LOG_FILE"
    write_systemd_environment NOTENEST_PID_FILE "$PID_FILE"
    write_systemd_environment NOTENEST_STATE_FILE "$STATE_FILE"
    write_systemd_environment NOTENEST_RESTART_STATE_FILE "$RESTART_STATE_FILE"
    write_systemd_environment NOTENEST_NODE_BIN "$NODE_BIN"
    printf 'ExecStart=%s/script/run-server.sh\n' "$ROOT_DIR"
    printf '%s\n' 'SuccessExitStatus=SIGTERM 143'
    printf '%s\n' 'Restart=always'
    printf '%s\n' 'RestartSec=2'
    printf '%s\n' 'KillMode=control-group'
    printf '%s\n' 'TimeoutStopSec=15'
    printf '%s\n' ''
    printf '%s\n' '[Install]'
    printf '%s\n' 'WantedBy=default.target'
  } >"$SERVICE_FILE"
}

pid_is_running() {
  local pid="$1"
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

pid_matches_app() {
  local pid="$1"
  local cmdline

  if ! pid_is_running "$pid"; then
    return 1
  fi

  cmdline="$(tr '\0' ' ' <"/proc/$pid/cmdline" 2>/dev/null || true)"
  [ -n "$cmdline" ] || return 1

  case "$cmdline" in
    *"$ROOT_DIR/script/serve-built.mjs"*|*"serve-built.mjs"*"NOTENEST_PORT=$PORT"*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

pid_listens_on_port() {
  local pid="$1"
  local port="${2:-$PORT}"

  command -v ss >/dev/null 2>&1 || return 0

  ss -ltnp "sport = :$port" 2>/dev/null \
    | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' \
    | grep -Fxq "$pid"
}
