#!/usr/bin/env bash
set -euo pipefail

PID_FILE="/tmp/notenest-vite.pid"

PIDS="$(pgrep -f "vite.*dev" || true)"
if [[ -n "$PIDS" ]]; then
  echo "$PIDS" | xargs -r kill > /dev/null 2>&1 || true
  sleep 1
  STILL_RUNNING="$(echo "$PIDS" | xargs -r -I {} sh -c 'ps -p "{}" > /dev/null 2>&1 && echo "{}"' || true)"
  if [[ -n "$STILL_RUNNING" ]]; then
    echo "$STILL_RUNNING" | xargs -r kill -9 > /dev/null 2>&1 || true
  fi
  COUNT="$(echo "$PIDS" | wc -w | tr -d ' ')"
  rm -f "$PID_FILE"
  echo "Stopped $COUNT Vite dev server process(es)."
  exit 0
fi

rm -f "$PID_FILE"
echo "No running Vite dev server process found."
