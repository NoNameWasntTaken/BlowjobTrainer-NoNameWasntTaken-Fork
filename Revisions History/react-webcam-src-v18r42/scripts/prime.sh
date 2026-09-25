#!/bin/bash
FIFO="/tmp/trainer.fifo"
PIDFILE="/tmp/trainer.pid"

if [[ ! -p "$FIFO" ]] || [[ ! -f "$PIDFILE" ]] || ! kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "trainer daemon not running" >&2
  exit 1
fi

echo "prime ${1:-3.0}" > "$FIFO"
