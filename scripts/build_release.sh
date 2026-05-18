#!/bin/bash
set -e
cd "$(dirname "$0")/.."
echo "[1/6] lint"
npm run lint
echo "[2/6] typecheck"
npm run typecheck
echo "[3/6] test"
npm run test:run
echo "[4/6] build"
rm -rf dist release
npm run build
echo "[5/6] manifest 検証"
node -e "const m=require('./dist/manifest.json'); if(!m.version)throw new Error('no version'); console.log('version='+m.version)"
echo "[6/6] zip"
mkdir -p release
cd dist
zip -r "../release/markwell-$(node -p "require('../package.json').version").zip" .
cd ..
ls -la release/
