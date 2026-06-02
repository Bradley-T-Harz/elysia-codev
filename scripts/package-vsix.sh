#!/usr/bin/env bash
set -euo pipefail

npm install
npm run compile
npm run vscode:package
