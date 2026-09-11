# Long Khanh Camera Rental

Monorepo for a camera rental shop: NestJS API (`backend/`), Next.js web app (`frontend/`), Python AI chatbot (`ai-service/`), and Postgres via Docker Compose.

## Docs

- [VPS deploy (thuemayanhlongkhanh.com)](docs/deploy-vps.md) — Nginx, PM2, SSL, SePay; [`deploy/deploy.sh`](deploy/deploy.sh) + GitHub Actions.
- [SePay — bank transfer + webhook](docs/sepay-setup.md) — in-app QR, payment confirmation, ngrok for local dev.
- [Facebook Messenger bot](docs/messenger-setup.md) — webhook `/api/messenger/webhook`, MiniMax chatbot via ai-service.
- API env template: [backend/.env.example](backend/.env.example).

## Quick start

- Database: `docker compose up -d postgres` (default user/db in `docker-compose.yml`).
- AI service: `cd ai-service && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && cp .env.example .env && uvicorn app.main:app --reload --port 8000`
- Backend: `cd backend && npm install && npx prisma migrate deploy && npm run start:dev`
- Frontend: `cd frontend && npm install && npm run dev`

## Ngrok (optional — SePay webhook to localhost)

```bash
export NGROK_AUTHTOKEN=<token>
docker compose --profile ngrok up ngrok
```

Details: [docs/sepay-setup.md](docs/sepay-setup.md).
