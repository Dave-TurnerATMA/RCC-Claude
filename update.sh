#!/bin/bash
# ============================================================
# Community Preparation Planning — Update Script
# Run as : bash update.sh   (from any directory)
# ============================================================
set -euo pipefail

APP_DIR="/home/ubuntu/community-prep"
GITHUB_BRANCH="claude/zen-cori-U3olx"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
die()     { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

[ -d "$APP_DIR/.git" ] || die "App directory not found at $APP_DIR — run install.sh first"

echo ""
echo "======================================================"
echo "  Community Preparation Planning — Update"
echo "======================================================"

info "Pulling latest from $GITHUB_BRANCH…"
cd "$APP_DIR"
git fetch origin
git reset --hard "origin/$GITHUB_BRANCH"

info "Installing dependencies…"
cd "$APP_DIR/backend"  && npm install --silent
cd "$APP_DIR/frontend" && npm install --silent

info "Building frontend and compiling TypeScript…"
cd "$APP_DIR/frontend" && npm run build
cd "$APP_DIR/backend"  && npx tsc

info "Restarting app…"
pm2 restart community-prep
pm2 save

success "Update complete — app restarted"
echo ""
pm2 status community-prep
echo ""
