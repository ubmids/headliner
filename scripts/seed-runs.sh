#!/usr/bin/env bash
# Record finished live runs for the demo artists into seed/runs/ (gitignored), so a fresh serverless
# instance replays them instantly. Needs QLOO_API_KEY in the environment and no LLM_* variables
# (the run cache key includes the planner mode, and the demo host runs the deterministic planner).
#
#   QLOO_API_KEY=... QLOO_BASE_URL=https://hackathon.api.qloo.com scripts/seed-runs.sh
set -euo pipefail
cd "$(dirname "$0")/.."
: "${QLOO_API_KEY:?set QLOO_API_KEY}"
unset LLM_BASE_URL LLM_MODEL LLM_API_KEY
PORT=${PORT:-3199}
DATA_DIR=$(mktemp -d)
export DATA_DIR
npx next start -p "$PORT" -H 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true; rm -rf "$DATA_DIR"' EXIT
for _ in $(seq 1 60); do curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null && break; sleep 1; done
npx tsx scripts/warm-cache.ts "http://127.0.0.1:$PORT" \
  "Tyler Childers|north-america" "Noah Kahan|north-america" "Fontaines D.C.|uk-europe" \
  "Zach Bryan|north-america" "Bad Bunny|north-america" "Khruangbin|north-america" "Chappell Roan|north-america" \
  "Billie Eilish|north-america" "Olivia Rodrigo|north-america" "Morgan Wallen|north-america" "Taylor Swift|north-america" \
  "Kendrick Lamar|north-america" "Burna Boy|uk-europe" "Coldplay|uk-europe" "Arctic Monkeys|uk-europe" "Dua Lipa|uk-europe"
rm -rf seed/runs && mkdir -p seed && cp -R "$DATA_DIR/runs" seed/runs
echo "seed/runs: $(ls seed/runs | wc -l | tr -d ' ') files"
