# Backend (NestJS)

API for Long Khanh camera rental: bookings, payments (SePay), Messenger webhook, ship orders, admin.

## Setup

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npm run start:dev
```

Default port: **3000**.

## Useful scripts

```bash
npm run start:dev   # watch mode
npm run build
npm run start:prod
npm test
```

## Docs

- Root [README](../README.md)
- [Messenger setup](../docs/messenger-setup.md)
- [SePay setup](../docs/sepay-setup.md)
- [VPS deploy](../docs/deploy-vps.md)
