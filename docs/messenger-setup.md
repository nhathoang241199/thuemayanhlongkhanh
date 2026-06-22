# Facebook Messenger Bot

Bot tư vấn inbox fanpage — module `backend/src/messenger/`, webhook công khai tại:

```
https://thuemayanhlongkhanh.com/api/messenger/webhook
```

## Biến môi trường

Thêm vào `backend/.env` (xem `backend/.env.example`):

| Biến | Mô tả |
|------|--------|
| `MESSENGER_BOT_ENABLED` | `true` / `false` — tắt bot khi test |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Page Access Token từ Meta Developer |
| `FACEBOOK_VERIFY_TOKEN` | Chuỗi tự đặt khi verify webhook |
| `FACEBOOK_APP_SECRET` | App Secret — xác minh chữ ký webhook |
| `ANTHROPIC_API_KEY` | API key Claude |
| `ANTHROPIC_MODEL` | Mặc định `claude-sonnet-4-6` |
| `ADMIN_MESSENGER_PSID` | PSID admin nhận tin chuyển tiếp |

## Meta Developer — tạo app

1. Vào [developers.facebook.com](https://developers.facebook.com/) → **Create App**
2. Thêm product **Messenger**
3. **Messenger → Settings** → Connect Fanpage → generate **Page Access Token**
4. **Webhooks** → Callback URL:
   - Production: `https://thuemayanhlongkhanh.com/api/messenger/webhook`
   - Dev (ngrok): `https://xxxx.ngrok-free.app/api/messenger/webhook`
5. Verify Token = giá trị `FACEBOOK_VERIFY_TOKEN` trong `.env`
6. Subscribe fields: `messages`, `messaging_postbacks`
7. App ở chế độ **Development** chỉ nhắn được với admin/tester page

## Chạy local + ngrok

```bash
# Terminal 1 — backend
cd backend && npm run start:dev

# Terminal 2 — tunnel (giống SePay)
export NGROK_AUTHTOKEN=<token>
docker compose --profile ngrok up ngrok
```

Mở `http://localhost:4040` → copy URL HTTPS → dán vào Meta Webhooks.

Migration:

```bash
cd backend && npx prisma migrate deploy
```

## Luồng bot

- Quick reply: Xem giá / Check lịch / Quy định cọc / Gặp admin
- Câu hỏi tự do → Claude + tools (giá/lịch từ DB qua service nội bộ)
- Gõ `AD` hoặc bấm Gặp admin → chuyển `ADMIN_MESSENGER_PSID`
- Đặt lịch → bot gửi link `{FRONTEND_URL}/book`

## Deploy production

Bot chạy **cùng** PM2 backend — không cần port/nginx riêng. Sau khi deploy:

1. Thêm env Messenger + Anthropic trên VPS (`backend/.env`)
2. `npx prisma migrate deploy` trên VPS
3. Đăng ký webhook URL trên Meta
4. Test 10–20 câu hỏi mẫu trước khi bật auto-reply 24/7

## Checklist go-live

- [ ] `FACEBOOK_*` và `ANTHROPIC_API_KEY` đã set trên VPS
- [ ] Webhook verify thành công trên Meta
- [ ] Bot trả lời đúng giá máy (so với website)
- [ ] Check lịch trống khớp calendar website
- [ ] Escalate admin hoạt động
- [ ] Meta App chuyển Live (nếu cần)

## Lấy ADMIN_MESSENGER_PSID

1. Nhắn tin vào fanpage từ tài khoản admin
2. Graph API Explorer → `me/messages` hoặc xem webhook log `sender.id`
3. Copy PSID → `ADMIN_MESSENGER_PSID`
