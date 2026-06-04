# Triển khai nhiều site (cùng codebase)

Một repo, nhiều shop (vd. Long Khánh, Bình Thạnh) — khác **domain**, **database**, **SePay**, và **branding frontend**.

## Branding theo địa điểm

Trong `frontend/.env.production` (mỗi thư mục deploy một file):

```env
NEXT_PUBLIC_SITE_LOCATION_NAME=Long Khánh
NEXT_PUBLIC_STORE_MAP_URL=https://maps.app.goo.gl/...
NEXT_PUBLIC_API_URL=https://your-domain.com
```

- Đổi env → **bắt buộc** `npm run build` lại frontend (`deploy/deploy.sh` đã làm).
- Không set → mặc định **Long Khánh** và map URL cửa hàng Long Khánh.
- Backend **không** có biến tên địa điểm; tách site bằng `DATABASE_URL`, `FRONTEND_ORIGIN`, `SEPAY_*`, v.v.

Xem [`frontend/.env.production.example`](../frontend/.env.production.example).

## Ví dụ: thêm site Bình Thạnh (cùng VPS)

| | Long Khánh | Bình Thạnh |
|--|------------|------------|
| Thư mục | `/var/www/thuemayanhlongkhanh` | `/var/www/thuemayanhbinhthanh` |
| Domain | `thuemayanhlongkhanh.com` | `thuemayanhbinhthanh.com` |
| API / Web (PM2) | 3000 / 3001 | 3010 / 3011 |
| Postgres DB | `app` | `binhthanh` (tạo DB mới, có thể dùng chung container) |
| `frontend/.env.production` | `NEXT_PUBLIC_SITE_LOCATION_NAME=Long Khánh` + map LK | `Bình Thạnh` + map BT |

### Bước tóm tắt

1. Clone repo vào thư mục mới trên VPS.
2. `cp backend/.env.production.example backend/.env` — **`DATABASE_URL` phải khác DB** (vd. `.../app` vs `.../binhthanh`). Nếu cùng DB → hai site dùng chung máy, đơn, khách.
3. `cp frontend/.env.production.example frontend/.env.production` — sửa `NEXT_PUBLIC_*`.
4. Tạo database PostgreSQL riêng; `npx prisma migrate deploy` trong `backend/`.
5. PM2: [`deploy/ecosystem.binhthanh.config.cjs`](../deploy/ecosystem.binhthanh.config.cjs) (API :3010, web :3011).
6. Nginx: [`deploy/nginx-thuemayanhbinhthanh.com.conf`](../deploy/nginx-thuemayanhbinhthanh.com.conf) — `server_name` **phải là domain thật**, không dùng placeholder; `certbot`.
7. `./deploy/deploy.sh` và `pm2 start` (hoặc `pm2 restart`).

Chi tiết Nginx/SSL một site: [deploy-vps.md](./deploy-vps.md).

## GitHub Actions (nhiều site)

Push nhánh **`main`** (hoặc **Actions → Deploy to VPS → Run workflow**) → [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) SSH vào VPS, chạy [`deploy/deploy-all-sites.sh`](../deploy/deploy-all-sites.sh) (**tuần tự** Long Khánh → Bình Thạnh).

**Site không lên bản mới?** Vào repo → **Actions** → workflow **Deploy to VPS** → xem run gần nhất (đỏ = lỗi SSH/secrets hoặc `deploy.sh` fail). Deploy thủ công trên VPS: `cd /var/www/thuemayanhlongkhanh && git pull && ./deploy/deploy-all-sites.sh`.

Secrets GitHub Actions:

| Secret | Bắt buộc | Mô tả |
|--------|----------|--------|
| `VPS_HOST` | Có | IP VPS |
| `VPS_USER` | Có | `root` |
| `VPS_SSH_KEY` | Có | Private key SSH |
| `VPS_APP_DIR` | Không | Thư mục để `git pull` script mới (mặc định `/var/www/thuemayanhlongkhanh`) |
| `VPS_APP_DIRS` | Không | Ghi đè danh sách thư mục deploy, vd. `/var/www/thuemayanhlongkhanh /var/www/thuemayanhbinhthanh` |

Trên VPS thủ công (không pull):

```bash
DEPLOY_SKIP_PULL=1 ./deploy/rebuild-all-sites.sh
```

Mỗi thư mục giữ `.env` riêng; cùng code từ `git pull` trên từng clone.
