#!/bin/bash
# ============================================================
# Community Preparation Planning — Update Script
# Run from the server to pull latest code and restart
# ============================================================
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
GITHUB_BRANCH="claude/focused-volta-rLmgU"

echo "Pulling latest code..."
git fetch origin
git reset --hard origin/$GITHUB_BRANCH

echo "Installing/updating dependencies..."
cd "$APP_DIR/backend"  && npm install --silent
cd "$APP_DIR/frontend" && npm install --silent

echo "Rebuilding..."
cd "$APP_DIR/frontend" && npm run build
cd "$APP_DIR/backend"  && npx tsc

echo "Restarting app..."
pm2 restart community-prep

pm2 status
echo "Done. App updated and restarted."
