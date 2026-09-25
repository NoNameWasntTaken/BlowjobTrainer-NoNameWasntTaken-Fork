#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FIFO="/tmp/trainer.fifo"
PIDFILE="/tmp/trainer.pid"
READY="/tmp/trainer.ready"
LOG="/tmp/trainer.log"

cleanup() {
  if [[ -n "${PID:-}" ]] && kill -0 "$PID" 2>/dev/null; then
    kill "$PID" 2>/dev/null || true
  fi
  rm -f "$PIDFILE" "$READY"
}

fail() {
  echo "$1" >&2
  if [[ -f "$LOG" ]]; then
    echo "See $LOG for details:" >&2
    if [[ -n "${log_offset:-}" ]]; then
      tail -c +"$((log_offset + 1))" "$LOG" >&2 || true
    else
      tail -n 20 "$LOG" >&2 || true
    fi
  fi
  cleanup
  exit 1
}

if [[ -f "$PIDFILE" ]] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "already running (pid $(cat "$PIDFILE"))"
  exit 0
fi
rm -f "$PIDFILE" "$READY"

mkdir -p "$(dirname "$FIFO")"
[[ -p "$FIFO" ]] || mkfifo "$FIFO"
cd "$SCRIPT_DIR"

log_offset=0
if [[ -f "$LOG" ]]; then
  log_offset=$(wc -c < "$LOG")
fi

nohup python3 -u controller.py >>"$LOG" 2>&1 &
PID=$!
echo "$PID" > "$PIDFILE"

for _ in $(seq 1 150); do
  if ! kill -0 "$PID" 2>/dev/null; then
    fail "controller failed to start: could not connect to Arduino."
  fi
  if [[ -f "$READY" ]]; then
    echo "started pid $PID"
    exit 0
  fi
  sleep 0.2
done

fail "controller did not become ready (Arduino connection timed out)."
