#!/bin/bash
# ============================================================
# Community Preparation Planning — Fresh Install Script
# Target : Ubuntu 22.04 LTS on AWS EC2 (or any Ubuntu server)
# Run as : bash install.sh
#
# What this script does:
#   1. Installs system packages (git, curl, build-essential, sqlite3)
#   2. Installs Node.js 20 via NodeSource
#   3. Clones the repository
#   4. Installs npm dependencies and builds the app
#   5. Creates a .env file (prompts for Anthropic API key)
#   6. Installs PM2, creates an ecosystem config, and starts the app
#   7. Configures PM2 to auto-start on reboot
#   8. (Optional) installs and configures Nginx as a reverse proxy
# ============================================================
set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
APP_DIR="/home/ubuntu/community-prep"
APP_PORT="3001"
GITHUB_REPO="https://github.com/Dave-TurnerATMA/RCC-Claude.git"
GITHUB_BRANCH="claude/zen-cori-U3olx"
NODE_VERSION="20"
SERVICE_USER="ubuntu"

# ── Colour helpers ─────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
die()     { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── Must not be run as root directly (needs ubuntu home) ──────────────────────
if [ "$EUID" -eq 0 ] && [ "${ALLOW_ROOT:-}" != "1" ]; then
  die "Run as the 'ubuntu' user, not root. Use: bash install.sh"
fi

echo ""
echo "======================================================"
echo "  Community Preparation Planning — Install Script"
echo "======================================================"
echo ""

# ── 1. System packages ─────────────────────────────────────────────────────────
info "[1/8] Installing system packages…"
sudo apt-get update -qq
sudo apt-get install -y -qq git curl build-essential sqlite3
success "System packages ready"

# ── 2. Node.js ─────────────────────────────────────────────────────────────────
info "[2/8] Checking Node.js ${NODE_VERSION}…"
if command -v node &>/dev/null && node -e "process.exit(parseInt(process.versions.node) >= ${NODE_VERSION} ? 0 : 1)" 2>/dev/null; then
  success "Node $(node -v) already installed"
else
  info "  Installing Node.js ${NODE_VERSION} via NodeSource…"
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x -o /tmp/nodesource_setup.sh
  sudo bash /tmp/nodesource_setup.sh -y >/dev/null
  rm -f /tmp/nodesource_setup.sh
  sudo apt-get install -y nodejs >/dev/null
  success "Node $(node -v) installed"
fi

# ── 3. Clone / update repo ────────────────────────────────────────────────────
info "[3/8] Cloning repository…"
if [ -d "$APP_DIR/.git" ]; then
  warn "  Directory $APP_DIR already exists — pulling latest from branch $GITHUB_BRANCH"
  cd "$APP_DIR"
  git fetch origin
  git checkout "$GITHUB_BRANCH"
  git reset --hard "origin/$GITHUB_BRANCH"
else
  git clone --branch "$GITHUB_BRANCH" "$GITHUB_REPO" "$APP_DIR"
fi
success "Repository at $APP_DIR"

# ── 4. Install npm dependencies ───────────────────────────────────────────────
info "[4/8] Installing npm dependencies…"
cd "$APP_DIR/backend"  && npm install --silent
cd "$APP_DIR/frontend" && npm install --silent
success "Dependencies installed"

# ── 5. Build frontend + compile backend ───────────────────────────────────────
info "[5/8] Building frontend and compiling TypeScript…"
cd "$APP_DIR/frontend" && npm run build
cd "$APP_DIR/backend"  && npx tsc
success "Build complete"

# ── 6. Environment file ───────────────────────────────────────────────────────
info "[6/8] Creating .env file…"
ENV_FILE="$APP_DIR/backend/.env"

# Prompt for Anthropic API key if not set in environment already
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo ""
  echo "  The Anthropic API key is required for:"
  echo "    • Spreadsheet schema inference"
  echo "    • Automatic translation of non-English text"
  echo "    • AI-powered task insights"
  echo ""
  read -rp "  Enter your Anthropic API key (sk-ant-...): " ANTHROPIC_API_KEY
  echo ""
fi

cat > "$ENV_FILE" <<EOF
PORT=${APP_PORT}
NODE_ENV=production
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
EOF
chmod 600 "$ENV_FILE"
success ".env written to $ENV_FILE"

# ── 7. PM2 process manager ────────────────────────────────────────────────────
info "[7/8] Setting up PM2…"
sudo npm install -g pm2 --silent

mkdir -p "$APP_DIR/logs" "$APP_DIR/backend/data"

cat > "$APP_DIR/ecosystem.config.js" <<ECOEOF
module.exports = {
  apps: [{
    name: 'community-prep',
    script: 'dist/index.js',
    cwd: '${APP_DIR}/backend',
    env: {
      PORT: '${APP_PORT}',
      NODE_ENV: 'production',
      ANTHROPIC_API_KEY: '${ANTHROPIC_API_KEY}',
    },
    error_file: '${APP_DIR}/logs/err.log',
    out_file:   '${APP_DIR}/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    restart_delay: 3000,
    max_restarts: 10,
  }]
};
ECOEOF

pm2 delete community-prep 2>/dev/null || true
pm2 start "$APP_DIR/ecosystem.config.js"
pm2 save

# Register PM2 to start on system boot
PM2_STARTUP=$(sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u "$SERVICE_USER" --hp "/home/$SERVICE_USER" 2>&1 | grep "^sudo" | tail -1 || true)
if [ -n "$PM2_STARTUP" ]; then
  eval "$PM2_STARTUP"
  success "PM2 configured to start on boot"
fi
success "PM2 started (app running on port $APP_PORT)"

# ── 8. Optional Nginx reverse proxy ──────────────────────────────────────────
info "[8/8] Nginx reverse proxy…"
echo ""
read -rp "  Install Nginx and proxy port 80 → $APP_PORT? [y/N]: " INSTALL_NGINX
if [[ "${INSTALL_NGINX,,}" == "y" ]]; then
  sudo apt-get install -y -qq nginx

  DOMAIN=""
  read -rp "  Enter domain/IP for server_name (leave blank for _): " DOMAIN
  SERVER_NAME="${DOMAIN:-_}"

  sudo tee /etc/nginx/sites-available/community-prep >/dev/null <<NGXEOF
server {
    listen 80;
    server_name ${SERVER_NAME};

    client_max_body_size 25M;

    location / {
        proxy_pass         http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
    }
}
NGXEOF

  sudo ln -sf /etc/nginx/sites-available/community-prep /etc/nginx/sites-enabled/community-prep
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo nginx -t && sudo systemctl reload nginx
  success "Nginx configured — app accessible on port 80"
else
  warn "Nginx skipped — app is only accessible on port $APP_PORT"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
PUBLIC_IP=$(curl -s --max-time 3 ifconfig.me 2>/dev/null || echo "<your-ip>")

echo ""
echo "======================================================"
echo -e "  ${GREEN}Install complete!${NC}"
echo ""
if [[ "${INSTALL_NGINX,,}" == "y" ]]; then
  echo "  App URL : http://${DOMAIN:-$PUBLIC_IP}"
else
  echo "  App URL : http://${PUBLIC_IP}:${APP_PORT}"
fi
echo ""
echo "  Useful commands:"
echo "    pm2 status                  — check if running"
echo "    pm2 logs community-prep     — live log stream"
echo "    pm2 restart community-prep  — restart the app"
echo "    bash $APP_DIR/update.sh     — pull latest code and restart"
echo ""
echo "  SQLite database:"
echo "    sqlite3 $APP_DIR/backend/data/community_prep.db"
echo "======================================================"
echo ""
