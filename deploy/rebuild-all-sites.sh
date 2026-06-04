#!/usr/bin/env bash
# Chạy trên VPS (root): bash deploy/rebuild-all-sites.sh
# Build tuần tự Long Khánh → Bình Thạnh (tránh hết RAM khi npm run build).
set -euo pipefail

SITES=(
  "/var/www/thuemayanhlongkhanh"
  "/var/www/thuemayanhanhbinhthanh"
)

for dir in "${SITES[@]}"; do
  [[ -d "$dir/deploy" ]] || { echo "SKIP (không tồn tại): $dir"; continue; }
  echo "========== $(basename "$dir") =========="
  cd "$dir"
  export DEPLOY_SKIP_PULL=1
  ./deploy/deploy.sh
  echo ""
done

echo "========== PM2 =========="
pm2 status
pm2 save
