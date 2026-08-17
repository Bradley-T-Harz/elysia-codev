#!/usr/bin/env bash
set -euo pipefail

OUTPUT_PATH="${1:-elysia-codev-0.1.0.vsix}"

npm run compile
npm run vscode:package -- --out "$OUTPUT_PATH"
npm run verify:package -- "$OUTPUT_PATH"
