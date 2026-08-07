#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> lint"
npm run lint:all

echo "==> typecheck"
npm run typecheck

echo "==> test"
npm run test:all

echo "==> build (representative route: getLetters)"
npm run build-pkg -- getLetters

echo "==> preflight OK"
