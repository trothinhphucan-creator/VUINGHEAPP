#!/bin/bash
# PAH App — Server Update Script
# Chạy script này trên server để cập nhật app từ file tar mới
# Usage: bash /home/haichu/pah-app/scripts/update.sh

set -e
export PATH="$HOME/.npm-global/bin:$PATH"

APP_DIR="/home/haichu/pah-app"
TAR_FILE="/tmp/pah-app.tar.gz"

echo "=== PAH App Update Script ==="
echo "Time: $(date)"

if [ ! -f "$TAR_FILE" ]; then
  echo "❌ Không tìm thấy $TAR_FILE"
  exit 1
fi

# Preserve .env.local
cp "$APP_DIR/.env.local" /tmp/.env.local.bak 2>/dev/null && echo "✓ Backed up .env.local" || echo "⚠ No .env.local to backup"

# Extract to temp location
rm -rf /tmp/pah-app-update
mkdir /tmp/pah-app-update
tar -xzf "$TAR_FILE" -C /tmp/pah-app-update --strip-components=1
echo "✓ Extracted"

# Swap directories
rm -rf "$APP_DIR.old"
mv "$APP_DIR" "$APP_DIR.old"
mv /tmp/pah-app-update "$APP_DIR"

# Restore .env.local
cp /tmp/.env.local.bak "$APP_DIR/.env.local" 2>/dev/null && echo "✓ Restored .env.local" || echo "⚠ Remember to create .env.local"

# Install & build
cd "$APP_DIR"
echo "=== npm install ==="
npm install --production=false 2>&1 | tail -3

echo "=== npm build ==="
npm run build 2>&1 | tail -20

echo "=== Restarting PM2 ==="
pm2 restart pah-app
pm2 save

sleep 3
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3010)
if [ "$STATUS" = "200" ]; then
  echo "✅ App running! HTTP $STATUS"
  echo "🌐 https://hearingtest.vuinghe.com is live"
else
  echo "⚠ App returned HTTP $STATUS — check logs:"
  pm2 logs pah-app --lines 20
fi
