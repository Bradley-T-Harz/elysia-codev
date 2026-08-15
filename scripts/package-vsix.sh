#!/usr/bin/env bash
set -euo pipefail

npm run compile
npm run vscode:package -- --out "${1:-elysia-codev-0.1.0.vsix}"
