#!/bin/bash
# Double-click this file to test Micro Fitness on your Mac.
# It starts a small web server for this folder and opens the test lab in
# your browser. Close the Terminal window to stop it.

cd "$(dirname "$0")" || exit 1
clear
echo "Micro Fitness test lab"
echo "----------------------"
echo

# Find a free port, starting at 8000.
PORT=8000
while lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do PORT=$((PORT + 1)); done

# Use Python if it's installed (without triggering Apple's install prompt);
# otherwise use the small Perl server that comes with this folder.
PY=""
if [ -x /opt/homebrew/bin/python3 ]; then PY=/opt/homebrew/bin/python3
elif [ -x /usr/local/bin/python3 ]; then PY=/usr/local/bin/python3
elif xcode-select -p >/dev/null 2>&1 && command -v python3 >/dev/null 2>&1; then PY=python3
fi

if [ -n "$PY" ]; then
  "$PY" -m http.server "$PORT" --bind 0.0.0.0 >/dev/null 2>&1 &
else
  /usr/bin/perl test/serve.pl "$PORT" . >/dev/null 2>&1 &
fi
SERVER=$!
trap 'kill "$SERVER" 2>/dev/null; echo; echo "Test lab stopped."; exit 0' INT TERM HUP EXIT

# Wait for the server to answer (up to about 5 seconds).
for _ in $(seq 1 50); do
  curl -s -o /dev/null "http://localhost:$PORT/" && break
  sleep 0.1
done
if ! curl -s -o /dev/null "http://localhost:$PORT/"; then
  echo "The test server didn't start. Try closing this window and double-clicking again."
  read -r -p "Press Return to close."
  exit 1
fi

# This Mac's address on the Wi-Fi, so a phone can open it too.
LAN=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)

URL="http://localhost:$PORT/test/"
[ -n "$LAN" ] && URL="$URL?lan=$LAN:$PORT"
open "$URL"

echo "The test lab is open in your browser:"
echo "  http://localhost:$PORT/test/"
if [ -n "$LAN" ]; then
  echo
  echo "To try it on your phone (same Wi-Fi), open:"
  echo "  http://$LAN:$PORT/"
fi
echo
echo "Leave this window open while you test."
echo "Close it, or press Control-C, to stop."
wait "$SERVER"
