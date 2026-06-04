#!/usr/bin/env bash
# Chạy trên VPS (root): cd /var/www/thuemayanhanhbinhthanh && sudo bash deploy/fix-binhthanh-branding-ssl.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/thuemayanhanhbinhthanh}"
DOMAIN="thuemayanhbinhthanh.com"
cd "$APP_DIR"

echo "[1/6] Nginx: server_name + proxy (3010/3011)..."
if [[ -f deploy/nginx-thuemayanhbinhthanh.com.conf ]]; then
  cp -f deploy/nginx-thuemayanhbinhthanh.com.conf "/etc/nginx/sites-available/${DOMAIN}"
else
  cat > "/etc/nginx/sites-available/${DOMAIN}" << 'NGINX_EOF'
server {
    listen 80;
    listen [::]:80;
    server_name thuemayanhbinhthanh.com www.thuemayanhbinhthanh.com;
    client_max_body_size 10M;
    location /api/ {
        proxy_pass http://127.0.0.1:3010/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
    location / {
        proxy_pass http://127.0.0.1:3011;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX_EOF
fi
ln -sf "/etc/nginx/sites-available/${DOMAIN}" "/etc/nginx/sites-enabled/${DOMAIN}"
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "[2/6] frontend/.env.production — branding Bình Thạnh..."
FE_ENV="$APP_DIR/frontend/.env.production"
touch "$FE_ENV"
set_env() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$FE_ENV" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$FE_ENV"
  else
    echo "${key}=${val}" >> "$FE_ENV"
  fi
}
set_env "NEXT_PUBLIC_API_URL" "https://${DOMAIN}"
set_env "NEXT_PUBLIC_SITE_LOCATION_NAME" "Bình Thạnh"
# Cập nhật map cửa hàng BT khi có link Google Maps:
# set_env "NEXT_PUBLIC_STORE_MAP_URL" "https://maps.app.goo.gl/..."

echo "[3/6] backend/.env — origin / public URL..."
BE_ENV="$APP_DIR/backend/.env"
for key in FRONTEND_ORIGIN FRONTEND_URL PUBLIC_API_URL; do
  if grep -q "^${key}=" "$BE_ENV" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=https://${DOMAIN}|" "$BE_ENV"
  else
    echo "${key}=https://${DOMAIN}" >> "$BE_ENV"
  fi
done

echo "[4/6] Frontend build (branding embed at build time)..."
cd "$APP_DIR/frontend"
npm run build

echo "[5/6] PM2 restart..."
cd "$APP_DIR"
pm2 restart binhthanh-api binhthanh-web
pm2 save

echo "[6/6] SSL (Let's Encrypt)..."
if command -v certbot >/dev/null; then
  certbot --nginx \
    -d "${DOMAIN}" -d "www.${DOMAIN}" \
    --non-interactive --agree-tos --register-unsafely-without-email \
    --redirect || true
  nginx -t && systemctl reload nginx
else
  echo "certbot not found — cài: apt install certbot python3-certbot-nginx"
fi

echo "Xong. Kiểm tra: https://${DOMAIN} — tiêu đề phải là Thuê máy ảnh Bình Thạnh."
