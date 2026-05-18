# Triển khai VPS — thuemayanhlongkhanh.com

Hướng dẫn deploy production trên Linux (Ubuntu/Debian). Một domain: web + API (`/api`).

## Kiến trúc

| Thành phần | Cổng nội bộ | URL công khai |
|------------|-------------|---------------|
| Next.js (frontend) | 3001 | `https://thuemayanhlongkhanh.com` |
| NestJS (backend) | 3000 | `https://thuemayanhlongkhanh.com/api` |
| PostgreSQL | 5432 (localhost) | Không public |
| SePay webhook | — | `https://thuemayanhlongkhanh.com/api/payments/sepay/webhook` |

## 1. Chuẩn bị VPS

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl nginx certbot python3-certbot-nginx

# Node 20 (vd. NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# đăng xuất/đăng nhập lại để dùng docker không cần sudo

npm install -g pm2
```

**DNS:** A record `thuemayanhlongkhanh.com` → IP VPS (và `www` nếu cần, redirect về apex).

**Firewall:**

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 2. Clone & Postgres

```bash
sudo mkdir -p /var/www/thuemayanhlongkhanh
sudo chown $USER:$USER /var/www/thuemayanhlongkhanh
cd /var/www/thuemayanhlongkhanh
git clone <URL_REPO> .
docker compose up -d postgres
```

Production: đổi mật khẩu Postgres trong `docker-compose.yml` và cập nhật `DATABASE_URL` cho khớp.

## 3. Cấu hình env (một lần)

```bash
cd /var/www/thuemayanhlongkhanh
cp backend/.env.production.example backend/.env
cp frontend/.env.production.example frontend/.env.production
nano backend/.env          # SEPAY_*, DATABASE_URL, ADMIN_*, ADMIN_JWT_SECRET, ...
nano frontend/.env.production
chmod +x deploy/deploy.sh
```

**Admin:** đặt `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_JWT_SECRET` (≥16 ký tự) trong `backend/.env`. Truy cập `/admin` sẽ redirect `/admin/login`. Cookie `httpOnly` — API quản trị yêu cầu đăng nhập; flow khách (`/book`, webhook SePay) vẫn public.

Tùy chọn dữ liệu demo (xóa toàn bộ data cũ): `cd backend && npm run db:seed`

## 4. Deploy lần đầu

```bash
cd /var/www/thuemayanhlongkhanh
./deploy/deploy.sh
pm2 startup   # chạy lệnh PM2 in ra — tự khởi động khi reboot
```

Script [`deploy/deploy.sh`](../deploy/deploy.sh): `git pull` → Postgres → `npm ci` → Prisma migrate → build backend + frontend → `pm2 restart` (xem [`deploy/ecosystem.config.cjs`](../deploy/ecosystem.config.cjs)).

## 5. Nginx + SSL

```bash
# Tắt trang "Welcome to nginx" mặc định
sudo rm -f /etc/nginx/sites-enabled/default

sudo cp /var/www/thuemayanhlongkhanh/deploy/nginx-thuemayanhlongkhanh.com.conf \
  /etc/nginx/sites-available/thuemayanhlongkhanh.com
sudo ln -sf /etc/nginx/sites-available/thuemayanhlongkhanh.com \
  /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Mở http://thuemayanhlongkhanh.com — phải thấy app (không còn trang nginx mặc định).

HTTPS:

```bash
sudo certbot --nginx -d thuemayanhlongkhanh.com -d www.thuemayanhlongkhanh.com
```

Nếu dùng `www`:

```bash
sudo certbot --nginx -d thuemayanhlongkhanh.com -d www.thuemayanhlongkhanh.com
```

## 6. SePay

Trên [SePay](https://sepay.vn/) đăng ký webhook:

```text
https://thuemayanhlongkhanh.com/api/payments/sepay/webhook
```

Biến `SEPAY_*` trong `backend/.env` — xem [sepay-setup.md](./sepay-setup.md).

## 7. Kiểm tra

- https://thuemayanhlongkhanh.com — trang khách
- https://thuemayanhlongkhanh.com/book — đặt lịch
- https://thuemayanhlongkhanh.com/admin — quản trị
- https://thuemayanhlongkhanh.com/api/docs — Swagger API
- `pm2 status` — `thue-may-api` và `thue-may-web` online

## Cập nhật sau khi sửa code

### Cách A — Tự động (khuyến nghị): push GitHub → VPS deploy

1. Trên GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Ví dụ |
|--------|--------|
| `VPS_HOST` | IP hoặc `thuemayanhlongkhanh.com` |
| `VPS_USER` | `ubuntu` hoặc user SSH của bạn |
| `VPS_SSH_KEY` | Nội dung private key (PEM) — user trên VPS phải có quyền `git pull` trong thư mục app |
| `VPS_APP_DIR` | (tùy chọn) `/var/www/thuemayanhlongkhanh` |

2. Trên VPS, clone bằng **SSH deploy key** hoặc HTTPS + token để `git pull` không hỏi mật khẩu.

3. Push lên nhánh **`main`** → workflow [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) SSH vào VPS chạy `./deploy/deploy.sh`.

Nhánh deploy khác `main`: sửa `branches:` trong file workflow.

### Cách B — Thủ công trên VPS

```bash
cd /var/www/thuemayanhlongkhanh
./deploy/deploy.sh
```

(Một lệnh — đã gồm `git pull`. Nếu vừa `git pull` tay: `DEPLOY_SKIP_PULL=1 ./deploy/deploy.sh`.)

## Xử lý sự cố

| Triệu chứng | Kiểm tra |
|-------------|----------|
| Trang trắng / lỗi API | `NEXT_PUBLIC_API_URL` phải là `https://thuemayanhlongkhanh.com` và đã `npm run build` lại frontend |
| CORS | `FRONTEND_ORIGIN=https://thuemayanhlongkhanh.com` trong `backend/.env` |
| Webhook SePay không chạy | URL HTTPS, `SEPAY_WEBHOOK_API_KEY`, nội dung CK bắt đầu `SEVQR` |
| 502 Bad Gateway | `pm2 status`, Postgres `docker compose ps` |
