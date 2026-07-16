#!/bin/bash
# ── CompCare Hub — Deploy / Update ────────────────────────────────────────
# Run on the VPS to pull latest code and rebuild:
#   cd /opt/compcarehub && ./deploy.sh
# ---------------------------------------------------------------------------
set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  CompCare Hub — Deploy"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Pull latest code
git pull origin main

# Build new image and restart with zero-downtime rolling update
docker compose build --no-cache app
docker compose up -d --no-deps app

# Reload nginx config (no restart = no downtime)
docker compose exec nginx nginx -s reload

echo "✅ Deploy complete"
docker compose ps
