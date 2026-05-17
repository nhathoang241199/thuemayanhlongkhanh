#!/usr/bin/env bash
# Deploy production — chạy trên VPS từ thư mục gốc repo (hoặc gọi trực tiếp).
#   ./deploy/deploy.sh              # git pull + build + restart
#   DEPLOY_SKIP_PULL=1 ./deploy/deploy.sh   # bỏ qua git pull
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

log() { echo "[deploy] $*"; }
die() { echo "[deploy] ERROR: $*" >&2; exit 1; }

command -v node >/dev/null || die "Node.js chưa cài"
command -v npm >/dev/null || die "npm chưa cài"
command -v pm2 >/dev/null || die "pm2 chưa cài (npm i -g pm2)"
command -v docker >/dev/null || die "Docker chưa cài"

if [[ "${DEPLOY_SKIP_PULL:-0}" != "1" ]]; then
  log "git pull..."
  git pull --ff-only
fi

log "Postgres (docker compose)..."
docker compose up -d postgres

[[ -f backend/.env ]] || die "Thiếu backend/.env — cp backend/.env.production.example backend/.env"
[[ -f frontend/.env.production ]] || die "Thiếu frontend/.env.production — cp frontend/.env.production.example frontend/.env.production"

log "Backend: install, migrate, build..."
(
  cd backend
  npm ci
  npx prisma generate
  npx prisma migrate deploy
  npm run build
)
[[ -f backend/dist/src/main.js ]] || die "Backend build thất bại: thiếu backend/dist/src/main.js"

log "Frontend: install, build..."
(
  cd frontend
  npm ci
  npm run build
)

log "PM2 restart..."
cd "$ROOT"
pm2 startOrRestart deploy/ecosystem.config.cjs --update-env
pm2 save

log "Xong. Kiểm tra: pm2 status"
pm2 status
