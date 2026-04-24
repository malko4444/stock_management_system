#!/usr/bin/env bash
set -e
echo "=== Installing dependencies ==="
npm install
echo "=== Building renderer ==="
npm run build:renderer
echo "=== Building installer ==="
npm run build
echo ""
echo "Installer is in ./release/"
