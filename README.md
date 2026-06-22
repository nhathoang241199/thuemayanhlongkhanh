# Thuê máy ảnh Long Khánh

Monorepo: NestJS API (`backend/`), Next.js (`frontend/`), Postgres qua Docker Compose.

## Tài liệu

- [Triển khai VPS (thuemayanhlongkhanh.com)](docs/deploy-vps.md) — Nginx, PM2, SSL, SePay; script [`deploy/deploy.sh`](deploy/deploy.sh) + GitHub Actions.
- [SePay — chuyển khoản + webhook](docs/sepay-setup.md) — QR trong app, webhook xác nhận, ngrok khi dev.
- [Facebook Messenger bot](docs/messenger-setup.md) — webhook `/api/messenger/webhook`, Claude tư vấn inbox.
- [Trợ lý AI admin](docs/admin-assistant.md) — panel chat trong `/admin`, 10 tools thống kê shop.
- Mẫu biến môi trường API: [backend/.env.example](backend/.env.example).

## Chạy nhanh

- Database: `docker compose up -d postgres` (user/db mặc định xem `docker-compose.yml`).
- Backend: `cd backend && npm install && npx prisma migrate deploy && npm run start:dev`
- Frontend: `cd frontend && npm install && npm run dev`

## Ngrok (tùy chọn, webhook SePay tới localhost)

```bash
export NGROK_AUTHTOKEN=<token>
docker compose --profile ngrok up ngrok
```

Chi tiết: [docs/sepay-setup.md](docs/sepay-setup.md).
