#!/bin/bash
# ============================================================
# Community Preparation Planning — Destroy & Reinstall Script
# WARNING: This will DELETE the database and all data!
# Run from the server to wipe and start fresh.
# ============================================================
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
GITHUB_BRANCH="claude/focused-volta-rLmgU"
DB_FILE="$APP_DIR/backend/community-prep.db"

echo "======================================================"
echo " DESTROY AND REINSTALL"
echo " WARNING: All data will be permanently deleted!"
echo "======================================================"
read -r -p "Are you sure? Type YES to continue: " confirm
if [ "$confirm" != "YES" ]; then
  echo "Aborted."
  exit 1
fi

# ---- Stop the app ----
echo "Stopping app..."
pm2 stop community-prep 2>/dev/null || true

# ---- Delete database ----
if [ -f "$DB_FILE" ]; then
  echo "Deleting database: $DB_FILE"
  rm -f "$DB_FILE"
else
  echo "No database found at $DB_FILE"
fi

# ---- Pull latest code ----
echo "Pulling latest code from $GITHUB_BRANCH..."
cd "$APP_DIR"
git fetch origin
git reset --hard origin/$GITHUB_BRANCH

# ---- Install dependencies ----
echo "Installing dependencies..."
cd "$APP_DIR/backend"  && npm install --silent
cd "$APP_DIR/frontend" && npm install --silent

# ---- Build ----
echo "Rebuilding..."
cd "$APP_DIR/frontend" && npm run build
cd "$APP_DIR/backend"  && npx tsc

# ---- Restart (DB will be recreated with seed data on startup) ----
echo "Restarting app (database will be seeded on first start)..."
pm2 restart community-prep 2>/dev/null || pm2 start "$APP_DIR/ecosystem.config.js"
pm2 save

pm2 status
echo ""
echo "======================================================"
echo " Done. App destroyed and reinstalled with fresh data."
echo "======================================================"
