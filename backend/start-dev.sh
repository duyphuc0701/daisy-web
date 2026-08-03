#!/usr/bin/env bash
# start-dev.sh — Start the DAISY backend detached from any terminal session.
# The process survives even when this script or the launching terminal exits.
#
# Usage:
#   ./start-dev.sh          → start in background
#   ./start-dev.sh --stop   → stop the running backend
#   ./start-dev.sh --logs   → tail the live log

set -euo pipefail

PIDFILE="/tmp/daisy-backend.pid"
LOGFILE="/tmp/daisy-backend.log"
PORT="${PORT:-5000}"

case "${1:-}" in
  --stop)
    if [[ -f "$PIDFILE" ]]; then
      PID=$(cat "$PIDFILE")
      kill "$PID" 2>/dev/null && echo "Stopped backend (PID $PID)" || echo "Process already stopped"
      rm -f "$PIDFILE"
    else
      fuser -k "${PORT}/tcp" 2>/dev/null && echo "Killed process on port $PORT" || echo "Nothing running on port $PORT"
    fi
    exit 0
    ;;
  --logs)
    tail -f "$LOGFILE"
    exit 0
    ;;
esac

# Kill any existing instance
fuser -k "${PORT}/tcp" 2>/dev/null || true
sleep 0.5

# Fully detach: setsid creates a new session, nohup ignores SIGHUP
setsid nohup node --max-old-space-size=256 index.js >> "$LOGFILE" 2>&1 &
PID=$!
echo $PID > "$PIDFILE"

sleep 2
if kill -0 "$PID" 2>/dev/null; then
  echo "✅ Backend started (PID $PID) — http://localhost:${PORT}"
  echo "   Logs: $LOGFILE"
  echo "   Stop: ./start-dev.sh --stop"
else
  echo "❌ Backend failed to start. Check $LOGFILE:"
  tail -20 "$LOGFILE"
  exit 1
fi
