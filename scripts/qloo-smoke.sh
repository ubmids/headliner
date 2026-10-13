#!/usr/bin/env bash
# Smoke-test every Qloo endpoint Headliner uses, validate shapes against the fixtures,
# flag empty results, and re-record real fixtures into fixtures/live/ (gitignored).
#
#   QLOO_API_KEY=... scripts/qloo-smoke.sh                  # full run (about 250 Qloo requests)
#   QLOO_API_KEY=... scripts/qloo-smoke.sh --no-record      # probes only (about 30 requests)
#   QLOO_API_KEY=... scripts/qloo-smoke.sh --artist "Khruangbin"
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -z "${QLOO_API_KEY:-}" ] && [ -f .env ]; then set -a; . ./.env; set +a; fi
if [ -z "${QLOO_API_KEY:-}" ]; then
  echo "QLOO_API_KEY is not set (export it or put it in .env). The app is still in fixture mode." >&2
  exit 2
fi
exec npx --yes tsx scripts/qloo-smoke.ts "$@"
