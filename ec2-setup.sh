#!/bin/bash
# ============================================================
# Community Preparation Planning — EC2 Setup Script
# Target: Ubuntu 22.04 LTS (t2.micro free tier)
# Run as: bash ec2-setup.sh
# ============================================================
set -e

APP_DIR="/home/ubuntu/community-prep"
APP_PORT="3001"
GITHUB_REPO="https://github.com/Dave-TurnerATMA/RCC-Claude.git"
GITHUB_BRANCH="claude/focused-volta-rLmgU"
NODE_VERSION="20"

echo "======================================================"
echo " Community Preparation Planning — EC2 Setup"
echo "======================================================"

# ---- 1. System packages ----
echo "[1/7] Updating system packages..."
sudo apt-get update -qq
sudo apt-get install -y -qq git curl build-essential

# ---- 2. Node.js via NodeSource ----
echo "[2/7] Installing Node.js ${NODE_VERSION}..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash - -q
  sudo apt-get install -y -qq nodejs
fi
echo "  Node $(node -v) | npm $(npm -v)"

# ---- 3. Clone repo ----
echo "[3/7] Cloning repository..."
if [ -d "$APP_DIR" ]; then
  echo "  Directory exists, pulling latest..."
  cd "$APP_DIR" && git fetch origin && git reset --hard origin/$GITHUB_BRANCH
else
  git clone --branch "$GITHUB_BRANCH" "$GITHUB_REPO" "$APP_DIR"
fi

# ---- 4. Install dependencies ----
echo "[4/7] Installing dependencies..."
cd "$APP_DIR/backend"  && npm install --omit=dev --silent
cd "$APP_DIR/frontend" && npm install --silent

# ---- 5. Build frontend ----
echo "[5/7] Building frontend..."
cd "$APP_DIR/frontend" && npm run build

# ---- 6. Create .env file ----
echo "[6/7] Creating environment config..."
cat > "$APP_DIR/backend/.env" <<EOF
PORT=${APP_PORT}
# Optional: add your Anthropic API key to enable AI task insights
# ANTHROPIC_API_KEY=sk-ant-...
EOF

# ---- 7. Install PM2 and create service ----
echo "[7/7] Setting up PM2 process manager..."
sudo npm install -g pm2 --silent

cd "$APP_DIR/backend"

# Create PM2 ecosystem config
cat > "$APP_DIR/ecosystem.config.js" <<EOF
module.exports = {
  apps: [{
    name: 'community-prep',
    script: 'node_modules/.bin/ts-node',
    args: 'src/index.ts',
    cwd: '${APP_DIR}/backend',
    env: {
      PORT: '${APP_PORT}',
      NODE_ENV: 'production',
    },
    error_file: '${APP_DIR}/logs/err.log',
    out_file:   '${APP_DIR}/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    restart_delay: 3000,
    max_restarts: 10,
  }]
};
EOF

mkdir -p "$APP_DIR/logs"

# Start/restart the app
pm2 delete community-prep 2>/dev/null || true
pm2 start "$APP_DIR/ecosystem.config.js"
pm2 save

# Make PM2 start on reboot
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | sudo bash

echo ""
echo "======================================================"
echo " Setup complete!"
echo " App running at: http://$(curl -s ifconfig.me):${APP_PORT}"
echo ""
echo " Useful commands:"
echo "   pm2 status              — check if running"
echo "   pm2 logs community-prep — view logs"
echo "   pm2 restart community-prep"
echo "   bash $APP_DIR/update.sh — pull latest and restart"
echo "======================================================"
