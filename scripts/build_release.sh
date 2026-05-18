#!/usr/bin/env bash
set -euo pipefail

npm run build
rm -rf release
mkdir -p release
cp -r dist/. release/
