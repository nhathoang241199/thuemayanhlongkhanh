#!/usr/bin/env bash
# Deploy tuần tự mọi site trên VPS (git pull + build + PM2 mỗi thư mục).
#   ./deploy/deploy-all-sites.sh
#   DEPLOY_SKIP_PULL=1 ./deploy/deploy-all-sites.sh
#   VPS_APP_DIRS="/var/www/a /var/www/b" ./deploy/deploy-all-sites.sh
set -euo pipefail

if [[ -n "${VPS_APP_DIRS:-}" ]]; then
  read -ra SITES <<< "$VPS_APP_DIRS"
else
  SITES=(
    "/var/www/thuemayanhlongkhanh"
    "/var/www/thuemayanhbinhthanh"
  )
fi

for dir in "${SITES[@]}"; do
  if [[ ! -d "$dir/deploy" ]]; then
    echo "[deploy-all] SKIP (không tồn tại): $dir"
    continue
  fi
  echo "========== $(basename "$dir") =========="
  cd "$dir"
  if [[ "$dir" == *binhthanh* ]] && [[ -f deploy/ecosystem.binhthanh.config.cjs ]]; then
    export PM2_ECOSYSTEM="deploy/ecosystem.binhthanh.config.cjs"
    # Site thứ 2 dùng Postgres container của Long Khánh (cùng tên trong docker-compose.yml)
    export DEPLOY_SKIP_POSTGRES=1
  else
    unset PM2_ECOSYSTEM || true
    unset DEPLOY_SKIP_POSTGRES || true
  fi
  chmod +x deploy/deploy.sh
  ./deploy/deploy.sh
  echo ""
done

echo "========== PM2 (tất cả site) =========="
pm2 save
pm2 status
