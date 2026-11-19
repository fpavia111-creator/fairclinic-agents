#!/usr/bin/env bash
# Build helper: scaffold (keeps hand-written files), add safety evals, run evals and tests, write the README.
#   bash scripts/dev-agent.sh <name> "<description>" kw1,kw2
set -u
cd "$(dirname "$0")/.."
n=$1
node scripts/new-agent.mjs "$n" "$2" "$3" >/dev/null || exit 1
[ -d node_modules/$n ] || npm install --no-audit --no-fund >/dev/null 2>&1
node scripts/eval-safety.mjs "$n" | tail -1
(cd "packages/$n" && node "bin/$n.js" eval 2>&1 | grep -v '^PASS' ; timeout 300 npm test 2>&1 | grep -E '^ℹ (tests|fail)|^✖' | sort -u | head -12)
node scripts/readme-heads.mjs >/dev/null; timeout 120 node scripts/readme-sections.mjs "$n" 2>&1 | tail -1
