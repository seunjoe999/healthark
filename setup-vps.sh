#!/bin/bash
# ── CompCare Hub — Initial VPS Setup ──────────────────────────────────────
# Run once as root on a fresh Ubuntu 22.04 InterServer VPS:
#   curl -sSL https://raw.githubusercontent.com/seunjoe999/healthark/main/setup-vps.sh | bash
# ---------------------------------------------------------------------------
set -e

DOMAIN="compcarehub.co.uk"
EMAIL="ijecynt@gmail.com"
APP_DIR="/opt/compcarehub"
GITHUB_REPO="https://github.com/seunjoe999/healthark.git"

echo "═══════════════════════════════════════════════"
echo "  CompCare Hub — VPS Setup"
echo "  Domain : $DOMAIN"
echo "  Dir    : $APP_DIR"
echo "═══════════════════════════════════════════════"

# ── 1. System update ────────────────────────────────────────────────────────
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git ufw

# ── 2. Docker ───────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable docker && systemctl start docker

# Docker Compose v2 (plugin)
if ! docker compose version &>/dev/null; then
  apt-get install -y docker-compose-plugin
fi

# ── 3. Firewall ─────────────────────────────────────────────────────────────
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ── 4. Clone repo ───────────────────────────────────────────────────────────
if [ -d "$APP_DIR" ]; then
  echo "Repo already cloned — pulling latest…"
  git -C "$APP_DIR" pull
else
  git clone "$GITHUB_REPO" "$APP_DIR"
fi

# ── 5. .env file ────────────────────────────────────────────────────────────
if [ ! -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  echo ""
  echo "⚠  Edit $APP_DIR/.env and fill in your secrets, then run:"
  echo "   $APP_DIR/deploy.sh"
  echo ""
fi

# ── 6. certbot/www directory (needed before first nginx start) ───────────────
mkdir -p "$APP_DIR/certbot/conf" "$APP_DIR/certbot/www"

# ── 7. SSL — initial HTTP-only nginx, then certbot ──────────────────────────
echo "Issuing SSL certificate for $DOMAIN …"
cd "$APP_DIR"

# Use init config (no SSL references yet)
cp nginx/nginx-init.conf nginx/nginx.conf

docker compose up -d app nginx

# Wait for nginx to be healthy
sleep 5

# Issue certificate
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  --email "$EMAIL" \
  --agree-tos --no-eff-email \
  -d "$DOMAIN" -d "www.$DOMAIN"

# Download recommended SSL options if not present
if [ ! -f "$APP_DIR/certbot/conf/options-ssl-nginx.conf" ]; then
  curl -sSL https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf \
    -o "$APP_DIR/certbot/conf/options-ssl-nginx.conf"
fi
if [ ! -f "$APP_DIR/certbot/conf/ssl-dhparams.pem" ]; then
  curl -sSL https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem \
    -o "$APP_DIR/certbot/conf/ssl-dhparams.pem"
fi

# Swap in full HTTPS nginx config
cp nginx/nginx.conf nginx/nginx-init.conf  # keep init as backup name
git checkout nginx/nginx.conf              # restore the HTTPS version from git

docker compose restart nginx

echo ""
echo "✅ Setup complete — CompCare Hub is live at https://$DOMAIN"
