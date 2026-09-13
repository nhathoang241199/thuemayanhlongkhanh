# Facebook Messenger Bot

Bot tư vấn inbox fanpage — module `backend/src/messenger/`, webhook công khai tại:

```
https://thuemayanhlongkhanh.com/api/messenger/webhook
```

Chat AI chạy trên **ai-service** (Python, LangGraph + MiniMax-M2.5). NestJS chỉ forward tin nhắn.

## Biến môi trường

### Backend (`backend/.env`)

| Biến | Mô tả |
|------|--------|
| `MESSENGER_BOT_ENABLED` | `true` / `false` — bot tự trả lời khách |
| `MESSENGER_LEARN_MODE` | `true` — bot **không** trả lời; ghi tin khách + câu shop trả trên Inbox để học (cần subscribe `message_echoes` trên Meta) |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Page Access Token từ Meta Developer |
| `FACEBOOK_VERIFY_TOKEN` | Chuỗi tự đặt khi verify webhook |
| `FACEBOOK_APP_SECRET` | App Secret — xác minh chữ ký webhook |
| `AI_SERVICE_URL` | URL ai-service (vd. `http://127.0.0.1:8000`) |
| `AI_SERVICE_TOKEN` | Token nội bộ Nest ↔ ai-service |
| `ADMIN_MESSENGER_PSID` | PSID admin nhận tin chuyển tiếp |

### AI service (`ai-service/.env`)

| Biến | Mô tả |
|------|--------|
| `MINIMAX_API_KEY` | API key MiniMax (chat) |
| `MINIMAX_MODEL` | Mặc định `MiniMax-M2.5` |
| `MINIMAX_BASE_URL` | Mặc định `https://api.minimax.io/v1` |
| `DATABASE_URL` | Cùng Postgres với backend |
| `AI_SERVICE_TOKEN` | Khớp với backend |
| `FRONTEND_URL` | Link đặt lịch bot gửi khách |

## Meta Developer — tạo app

1. Vào [developers.facebook.com](https://developers.facebook.com/) → **Create App**
2. Thêm product **Messenger**
3. **Messenger → Settings** → Connect Fanpage → generate **Page Access Token**
4. **Webhooks** → Callback URL:
   - Production: `https://thuemayanhlongkhanh.com/api/messenger/webhook`
   - Dev (ngrok): `https://xxxx.ngrok-free.app/api/messenger/webhook`
5. Verify Token = giá trị `FACEBOOK_VERIFY_TOKEN` trong `.env`
6. Subscribe fields: `messages`, `messaging_postbacks`, **`message_echoes`** (bắt buộc nếu bật chế độ học)
7. App ở chế độ **Development** chỉ nhắn được với admin/tester page

## Chạy local

```bash
# Terminal 1 — Postgres
docker compose up -d postgres

# Terminal 2 — ai-service
cd ai-service && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000

# Terminal 3 — backend
cd backend && npm run start:dev

# Terminal 4 — frontend (simulator /admin/terms)
cd frontend && npm run dev
```

Migration:

```bash
cd backend && npx prisma migrate deploy
```

## Chế độ học (shop tự chat, bot tắt)

Dùng khi bạn muốn tự trả lời khách một thời gian, hệ thống vẫn ghi lại để sau này cải thiện bot.

1. Trên VPS `backend/.env`:
   ```env
   MESSENGER_BOT_ENABLED=false
   MESSENGER_LEARN_MODE=true
   ```
2. Meta Developer → Webhooks → subscribe thêm **`message_echoes`** (hoặc dùng Graph API — xem bên dưới)
3. Trả lời khách bình thường trên **Facebook Inbox** (Page)
4. Admin → **Học Messenger** (`/admin/messenger-learn`) — xem cặp khách / câu bạn trả lời, duyệt mẫu tốt
5. Khi đủ mẫu: chuyển mẫu đã duyệt vào canned / few-shot → bật lại `MESSENGER_BOT_ENABLED=true`, `MESSENGER_LEARN_MODE=false`

### Subscribe `message_echoes` qua Graph API

Trên Meta Dashboard field có thể không hiện rõ — dùng API (Page Access Token):

```bash
curl -X POST "https://graph.facebook.com/v21.0/<PAGE_ID>/subscribed_apps\
?subscribed_fields=messages,messaging_postbacks,message_echoes\
&access_token=<PAGE_ACCESS_TOKEN>"
```

Kiểm tra:

```bash
curl "https://graph.facebook.com/v21.0/<PAGE_ID>/subscribed_apps?access_token=<PAGE_ACCESS_TOKEN>"
```

Phải thấy `message_echoes` trong `subscribed_fields`.

## Luồng bot

- Quick reply: Xem giá / Check lịch / Quy định cọc / Gặp admin
- Câu hỏi tự do → MiniMax + tools (giá/lịch/chính sách từ DB)
- Gõ `AD` hoặc bấm Gặp admin → chuyển `ADMIN_MESSENGER_PSID`
- Đặt lịch → bot gửi link `{FRONTEND_URL}/book`

## Deploy production

Bot chạy **NestJS + ai-service** qua PM2 (`thue-may-api`, `thue-may-ai`, `thue-may-web`). Sau khi deploy:

1. Thêm env Messenger + MiniMax (ai-service) trên VPS (`backend/.env`, `ai-service/.env`)
2. `npx prisma migrate deploy` trên VPS
3. Đăng ký webhook URL trên Meta
4. Test 10–20 câu hỏi mẫu trước khi bật auto-reply 24/7

## Checklist go-live

- [ ] `FACEBOOK_*`, `AI_SERVICE_*` đã set trên VPS
- [ ] `MINIMAX_API_KEY` đã set trong `ai-service/.env`
- [ ] `pm2 status` có `thue-may-ai` running
- [ ] Webhook verify thành công trên Meta
- [ ] Bot trả lời đúng giá máy (so với website)
- [ ] Check lịch trống khớp calendar website
- [ ] Escalate admin hoạt động
- [ ] Meta App chuyển Live (nếu cần)

## Lấy ADMIN_MESSENGER_PSID

1. Nhắn tin vào fanpage từ tài khoản admin
2. Graph API Explorer → `me/messages` hoặc xem webhook log `sender.id`
3. Copy PSID → `ADMIN_MESSENGER_PSID`

## Shipper gắn Messenger

Shipper không cần dán PSID tay. Họ nhắn fanpage:

- `SHIP 0900111222` — gắn SĐT shipper với Messenger hiện tại
- `HUY SHIP` — huỷ gắn

Messenger **không** gửi tin khi có đơn giao mới (tránh lẫn với cảnh báo cọc/giao của shop). Đơn mới hiện trên `/ship`; shipper có thể bật Web Push trên trang đó. Page chỉ nhắn shipper đã gắn khi khách **yêu cầu trả máy**. Chi tiết: `docs/local-ship-setup.md`.

## Test admin

Trang `/admin/terms` có **Giả lập chat Messenger** — gọi trực tiếp ai-service qua proxy `/ai-api`.

```bash
curl -s http://127.0.0.1:8000/v1/status
curl -s -X POST http://127.0.0.1:8000/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-Internal-Token: dev-secret" \
  -d '{"user_message":"Shop có Canon R50 không?","history":[]}'
```
