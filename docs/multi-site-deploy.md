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
| Thư mục | `/var/www/thuemayanhlongkhanh` | `/var/www/thuemayanhanhbinhthanh` |
| Domain | `thuemayanhlongkhanh.com` | domain riêng |
| API / Web (PM2) | 3000 / 3001 | 3010 / 3011 |
| Postgres DB | `app` | `binhthanh` (tạo DB mới, có thể dùng chung container) |
| `frontend/.env.production` | `NEXT_PUBLIC_SITE_LOCATION_NAME=Long Khánh` + map LK | `Bình Thạnh` + map BT |

### Bước tóm tắt

1. Clone repo vào thư mục mới trên VPS.
2. `cp backend/.env.production.example backend/.env` — sửa `DATABASE_URL`, domain, SePay, admin.
3. `cp frontend/.env.production.example frontend/.env.production` — sửa `NEXT_PUBLIC_*`.
4. Tạo database PostgreSQL riêng; `npx prisma migrate deploy` trong `backend/`.
5. Copy & chỉnh [`deploy/ecosystem.config.cjs`](../deploy/ecosystem.config.cjs) (tên PM2 + cổng 3010/3011).
6. Nginx: `server_name` mới, `proxy_pass` tới cổng web/API tương ứng; `certbot`.
7. `./deploy/deploy.sh` và `pm2 start` (hoặc `pm2 restart`).

Chi tiết Nginx/SSL một site: [deploy-vps.md](./deploy-vps.md).

## GitHub Actions (nhiều site)

Workflow hiện tại ([`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)) chỉ deploy một `VPS_APP_DIR`. Để push `main` cập nhật **tất cả** site, mở rộng script SSH (deploy **tuần tự** để tránh hết RAM khi build):

```bash
for dir in /var/www/thuemayanhlongkhanh /var/www/thuemayanhanhbinhthanh; do
  (cd "$dir" && chmod +x deploy/deploy.sh && ./deploy/deploy.sh)
done
```

Mỗi thư mục giữ `.env` riêng; cùng code từ `git pull`.
