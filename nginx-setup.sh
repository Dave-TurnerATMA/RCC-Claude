#!/bin/bash
# ============================================================
# Community Preparation Planning — Nginx Setup (optional)
# Puts the app on port 80 so you don't need :3001 in the URL
# Run AFTER ec2-setup.sh
# ============================================================
set -e

APP_PORT="3001"
# Replace with your EC2 public DNS or IP, e.g. ec2-1-2-3-4.compute-1.amazonaws.com
SERVER_NAME="${1:-_}"

echo "Installing Nginx..."
sudo apt-get install -y -qq nginx

echo "Writing Nginx config..."
sudo tee /etc/nginx/sites-available/community-prep > /dev/null <<EOF
server {
    listen 80;
    server_name ${SERVER_NAME};

    # Increase upload size limit for file attachments
    client_max_body_size 50M;

    # Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    location / {
        proxy_pass         http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        proxy_pass http://127.0.0.1:${APP_PORT};
        expires 7d;
        add_header Cache-Control "public";
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/community-prep /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

PUBLIC_IP=$(curl -s ifconfig.me)
echo ""
echo "Nginx configured. App now accessible at:"
echo "  http://${PUBLIC_IP}"
echo ""
echo "To add a domain name, run:"
echo "  sudo bash nginx-setup.sh your-domain.com"
echo "  sudo apt install certbot python3-certbot-nginx"
echo "  sudo certbot --nginx -d your-domain.com"
