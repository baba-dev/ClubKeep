#!/usr/bin/env bash
# Run ONLY on ephemeral hosted runners with synthetic CI/build settings.
# Builds can succeed even when the production Next.js standalone server crashes.
set -Eeuo pipefail
[[ -s .next/standalone/server.js ]] || { echo "Standalone build missing" >&2; exit 1; }
port="${CLUBKEEP_SMOKE_PORT:-43209}"
[[ "$port" =~ ^[0-9]{4,5}$ ]] || { echo "Invalid standalone smoke port" >&2; exit 1; }
logs="$(mktemp)"
pid=""
cleanup() {
  if [[ -n "$pid" ]]; then
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  fi
  rm -f "$logs"
}
trap cleanup EXIT

HOSTNAME=127.0.0.1 PORT="$port" NODE_ENV=production node .next/standalone/server.js >"$logs" 2>&1 &
pid=$!
for _ in $(seq 1 30); do
  if ! kill -0 "$pid" 2>/dev/null; then
    echo "Standalone crashed at startup:" >&2
    # The calling workflow must use synthetic CI/build-only secrets.
    tail -n 40 "$logs" >&2
    exit 1
  fi
  if curl --fail --silent --show-error --max-time 2 -o /dev/null "http://127.0.0.1:$port/auth/sign-in" 2>/dev/null &&
     curl --fail --silent --show-error --max-time 2 -o /dev/null "http://127.0.0.1:$port/api/auth/capabilities" 2>/dev/null; then
    # Prove the process stayed live through both requests.
    kill -0 "$pid"
    echo "Standalone startup + sign-in/capabilities smoke passed"
    exit 0
  fi
  sleep 1
done
echo "Standalone failed to serve authentication smoke endpoints:" >&2
tail -n 40 "$logs" >&2
exit 1
