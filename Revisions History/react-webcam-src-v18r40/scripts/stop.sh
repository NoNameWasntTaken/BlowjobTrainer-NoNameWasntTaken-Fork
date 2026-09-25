#!/bin/bash
set -euo pipefail

PIDFILE="/tmp/trainer.pid"

if [[ -f "$PIDFILE" ]]; then
  kill "$(cat "$PIDFILE")" 2>/dev/null || true
  rm -f "$PIDFILE"
fi
rm -f /tmp/trainer.ready
echo "stopped"
