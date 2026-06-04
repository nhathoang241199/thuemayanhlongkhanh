#!/usr/bin/env bash
# Chạy trên VPS: DEPLOY_SKIP_PULL=1 ./deploy/rebuild-all-sites.sh
# (Bỏ qua git pull — chỉ rebuild + PM2.)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export DEPLOY_SKIP_PULL=1
exec "$ROOT/deploy/deploy-all-sites.sh"
