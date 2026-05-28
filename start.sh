#!/bin/bash
set -e

echo "=== Community Preparation Planning ==="
echo "Building frontend..."
cd "$(dirname "$0")/frontend"
npm install --silent
npm run build

echo "Starting server on port ${PORT:-3001}..."
cd ../backend
npm install --silent
exec npx ts-node src/index.ts
