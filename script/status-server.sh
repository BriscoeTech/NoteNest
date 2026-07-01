#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=script/server-common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/server-common.sh"

LAST_VERIFIED_AT=""
SERVER_PID=""
RESTART_STATUS=""
RESTART_MESSAGE=""
RESTART_UPDATED_AT=""

if [ -f "$STATE_FILE" ]; then
  # shellcheck disable=SC1090
  . "$STATE_FILE"
  LAST_VERIFIED_AT="${last_verified_at:-}"
  SERVER_PID="${server_pid:-}"
fi

if [ -f "$RESTART_STATE_FILE" ]; then
  # shellcheck disable=SC1090
  . "$RESTART_STATE_FILE"
  RESTART_STATUS="${status:-}"
  RESTART_MESSAGE="${message:-}"
  RESTART_UPDATED_AT="${updated_at:-}"
fi

if [ -n "$RESTART_STATUS" ]; then
  echo "restart status: $RESTART_STATUS"
  if [ -n "$RESTART_MESSAGE" ]; then
    echo "restart message: $RESTART_MESSAGE"
  fi
  if [ -n "$RESTART_UPDATED_AT" ]; then
    echo "restart updated: $RESTART_UPDATED_AT"
  fi
fi

if [ -f "$PID_FILE" ]; then
  PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if pid_matches_app "$PID" && pid_listens_on_port "$PID"; then
    echo "pid: $PID (running)"
  elif pid_matches_app "$PID"; then
    echo "pid: stale ($PID, not listening on port ${PORT})"
  elif pid_is_running "$PID"; then
    echo "pid: stale ($PID, not NoteNest)"
  elif [ -n "$LAST_VERIFIED_AT" ] && [ "$SERVER_PID" = "$PID" ]; then
    echo "pid: recorded ($PID), unable to verify directly from this environment"
  else
    echo "pid: stale ($PID)"
  fi
else
  echo "pid: none"
fi

if command -v ss >/dev/null 2>&1; then
  LISTENER="$(ss -ltn 2>/dev/null | rg ":${PORT}\\b" || true)"
  if [ -n "$LISTENER" ]; then
    echo "listener:"
    echo "$LISTENER"
  elif [ -n "$LAST_VERIFIED_AT" ]; then
    echo "listener: none on port ${PORT} (last verified ${LAST_VERIFIED_AT})"
  else
    echo "listener: none on port ${PORT}"
  fi
fi

SERVER_PROCESS="$(pgrep -af "$ROOT_DIR/script/serve-built.mjs|serve-built.mjs" || true)"
if [ -n "$SERVER_PROCESS" ]; then
  echo "process:"
  echo "$SERVER_PROCESS"
fi

if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
  echo "health: ok"
elif [ -n "$LAST_VERIFIED_AT" ]; then
  echo "health: unavailable from this environment (last verified ${LAST_VERIFIED_AT})"
else
  echo "health: unavailable"
fi

if curl -fsS "$FRONTEND_URL" >/dev/null 2>&1; then
  echo "frontend: ok"
elif [ -n "$LAST_VERIFIED_AT" ]; then
  echo "frontend: unavailable from this environment (last verified ${LAST_VERIFIED_AT})"
else
  echo "frontend: unavailable"
fi

echo "local frontend: $FRONTEND_URL"
echo "tailscale frontend: https://data.moray-notothen.ts.net${PATH_BASE}/"

if [ -n "$LAST_VERIFIED_AT" ]; then
  echo "last verified: $LAST_VERIFIED_AT"
fi

if [ -f "$LOG_FILE" ]; then
  echo "log tail:"
  tail -n 20 "$LOG_FILE"
fi
