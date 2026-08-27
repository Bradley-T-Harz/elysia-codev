#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "--out" ]]; then
  [[ $# -eq 2 ]] || { printf '%s\n' 'Usage: scripts/package-vsix.sh [OUTPUT_PATH | --out OUTPUT_PATH]' >&2; exit 2; }
  OUTPUT_PATH="$2"
else
  [[ $# -le 1 ]] || { printf '%s\n' 'Usage: scripts/package-vsix.sh [OUTPUT_PATH | --out OUTPUT_PATH]' >&2; exit 2; }
  OUTPUT_PATH="${1:-elysia-codev-1.0.0.vsix}"
fi

npm run compile
npx --no-install vsce package --no-dependencies --out "$OUTPUT_PATH"
python3 scripts/normalize_vsix.py "$OUTPUT_PATH"
npm run verify:package -- "$OUTPUT_PATH"
